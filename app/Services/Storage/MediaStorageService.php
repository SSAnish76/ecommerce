<?php

declare(strict_types=1);

namespace App\Services\Storage;

use App\Models\MediaFile;
use App\Services\Storage\Drivers\LocalStorageDriver;
use App\Services\Storage\Drivers\S3StorageDriver;
use App\Services\Storage\Drivers\StorageDriverInterface;
use DateTimeInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class MediaStorageService
{
    /**
     * Map of registered storage driver instances.
     *
     * @var array<string, StorageDriverInterface>
     */
    protected array $drivers = [];

    public function __construct(
        protected StorageConfigurator $configurator,
        protected MediaOptimizer $optimizer,
        S3StorageDriver $s3Driver,
    ) {
        $this->register(new LocalStorageDriver('public'));
        $this->register(new LocalStorageDriver('local'));
        $this->register($s3Driver);
    }

    /**
     * Register a storage driver instance.
     */
    public function register(StorageDriverInterface $driver): self
    {
        $this->drivers[$driver->name()] = $driver;

        return $this;
    }

    /**
     * Determine whether a storage driver is registered.
     */
    public function hasDriver(string $name): bool
    {
        return isset($this->drivers[$name]);
    }

    /**
     * Access the storage configurator.
     */
    public function configurator(): StorageConfigurator
    {
        return $this->configurator;
    }

    /**
     * Access the media optimizer.
     */
    public function optimizer(): MediaOptimizer
    {
        return $this->optimizer;
    }

    /**
     * Get a registered storage driver by name or active default.
     *
     * @throws InvalidArgumentException
     */
    public function driver(?string $name = null): StorageDriverInterface
    {
        $driverName = $name ?? $this->configurator->resolveDefaultDisk();

        return $this->drivers[$driverName]
            ?? throw new InvalidArgumentException("Storage driver [{$driverName}] is not registered.");
    }

    /**
     * Store an uploaded file into designated storage driver and persist a MediaFile record.
     */
    public function store(
        UploadedFile $file,
        string $collection = 'default',
        ?string $userId = null,
        ?string $disk = null,
        ?string $customDirectory = null,
        bool $optimize = true,
    ): MediaFile {
        $driver = $this->driver($disk);
        $diskName = $driver->name();

        $originalName = $file->getClientOriginalName();
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin');
        $mimeType = $file->getMimeType() ?: 'application/octet-stream';

        // Optimize image in-place before storage if requested and supported
        if ($optimize && $this->optimizer->isEnabled() && $this->optimizer->isSupported($mimeType)) {
            $this->optimizer->optimizeUploadedFile($file);
        }

        $size = (int) $file->getSize();
        $realPath = $file->getRealPath();
        $hash = ($realPath && file_exists($realPath)) ? hash_file('sha256', $realPath) ?: null : null;

        $directory = $customDirectory !== null ? trim($customDirectory, '/') : 'media/'.date('Y/m');
        $filename = time().'_'.Str::random(8).'.'.$extension;

        $path = $driver->putFileAs($directory, $file, $filename);
        if ($path === false) {
            throw new RuntimeException("Failed to store file '{$originalName}' to storage driver '{$diskName}'.");
        }

        /** @var MediaFile */
        return MediaFile::create([
            'disk' => $diskName,
            'directory' => $directory,
            'filename' => $filename,
            'original_name' => $originalName,
            'mime_type' => $mimeType,
            'extension' => $extension,
            'size' => $size,
            'hash' => $hash,
            'collection' => $collection,
            'user_id' => $userId,
        ]);
    }

    /**
     * Get accessible public URL for the media file.
     */
    public function getUrl(MediaFile $media): string
    {
        return $this->driver($media->disk)->url($media->path, $media);
    }

    /**
     * Generate a temporary URL for private cloud buckets.
     */
    public function getTemporaryUrl(MediaFile $media, DateTimeInterface $expiration): string
    {
        return $this->driver($media->disk)->temporaryUrl($media->path, $expiration);
    }

    /**
     * Resolve a stored path, filename, or legacy URL into an absolute URL using current domain.
     */
    public function resolveUrl(?string $pathOrUrl, ?string $disk = null): ?string
    {
        if ($pathOrUrl === null || trim($pathOrUrl) === '') {
            return null;
        }

        $trimmed = trim($pathOrUrl);

        // If it's a media view route URL, extract identifier and re-resolve
        if (preg_match('~/media/view/([^/?#]+)~', $trimmed, $matches)) {
            $identifier = $matches[1];
            $media = $this->resolveMediaFileQuietly($identifier);
            if ($media) {
                return $this->getUrl($media);
            }

            return route('media.view', ['mediaFile' => $identifier]);
        }

        // If it's an external HTTP/HTTPS URL
        if (str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://')) {
            $parsed = parse_url($trimmed);
            $currentHost = request()?->getHost() ?: parse_url((string) config('app.url'), PHP_URL_HOST);
            $urlHost = $parsed['host'] ?? null;

            if ($urlHost && $currentHost && strcasecmp((string) $urlHost, (string) $currentHost) !== 0 && ! str_contains($trimmed, '/storage/')) {
                return $trimmed;
            }

            if (isset($parsed['path']) && str_starts_with($parsed['path'], '/storage/')) {
                $trimmed = substr($parsed['path'], strlen('/storage/'));
            }
        }

        $cleanPath = ltrim($trimmed, '/');

        // Look for matching MediaFile by filename or UUID
        $filename = basename($cleanPath);
        $media = MediaFile::query()
            ->where('filename', $filename)
            ->first();

        if ($media) {
            return $this->getUrl($media);
        }

        // If file exists on designated disk
        $driver = $this->driver($disk);
        if ($driver->exists($cleanPath)) {
            return $driver->url($cleanPath);
        }

        return asset('storage/'.$cleanPath);
    }

    /**
     * Normalize any URL, UUID, or path into a domain-agnostic relative storage path ('folder/filename').
     */
    public function normalizePath(?string $pathOrUrl): ?string
    {
        if ($pathOrUrl === null || trim($pathOrUrl) === '') {
            return null;
        }

        $value = trim($pathOrUrl);

        if (preg_match('~/media/view/([^/?#]+)~', $value, $matches)) {
            $identifier = $matches[1];
            $media = $this->resolveMediaFileQuietly($identifier);
            if ($media) {
                return $media->path;
            }

            return $identifier;
        }

        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value)) {
            $media = MediaFile::find($value);
            if ($media) {
                return $media->path;
            }
        }

        if (preg_match('~/storage/(.+)$~', $value, $matches)) {
            return ltrim($matches[1], '/');
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            $parsed = parse_url($value);
            $appHost = parse_url((string) config('app.url'), PHP_URL_HOST);
            $requestHost = request()?->getHost();
            $urlHost = $parsed['host'] ?? null;

            $isInternalHost = ($urlHost && ($urlHost === $appHost || $urlHost === $requestHost || $urlHost === 'localhost' || $urlHost === '127.0.0.1'));

            if (! $isInternalHost) {
                return $value;
            }

            $urlPath = ltrim($parsed['path'] ?? '', '/');
            if (str_starts_with($urlPath, 'storage/')) {
                return substr($urlPath, strlen('storage/'));
            }

            return $urlPath;
        }

        return ltrim($value, '/');
    }

    /**
     * Quietly resolve a MediaFile by ID or filename without throwing exceptions.
     */
    public function resolveMediaFileQuietly(string $identifier): ?MediaFile
    {
        $media = MediaFile::find($identifier);
        if ($media) {
            return $media;
        }

        $filename = basename($identifier);

        return MediaFile::query()
            ->where('filename', $filename)
            ->first();
    }

    /**
     * Delete the media database record and its physical storage file.
     */
    public function delete(MediaFile $media): bool
    {
        return (bool) $media->delete();
    }

    /**
     * Delete the physical file stored on disk.
     */
    public function deletePhysicalFile(MediaFile $media): bool
    {
        try {
            return $this->driver($media->disk)->delete($media->path);
        } catch (\Throwable $e) {
            Log::warning("Could not delete physical media file: {$media->path}", [
                'error' => $e->getMessage(),
                'media_id' => $media->id,
            ]);

            return false;
        }
    }
}

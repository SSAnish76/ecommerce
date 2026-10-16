<?php

declare(strict_types=1);

namespace App\Services\Storage;

use App\Models\MediaFile;
use App\Services\Storage\Drivers\LocalStorageDriver;
use App\Services\Storage\Drivers\S3StorageDriver;
use App\Services\Storage\Drivers\StorageDriverInterface;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;
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
     *
     * @param array<string, mixed> $meta
     */
    public function store(
        UploadedFile $file,
        string $collection = 'default',
        ?string $userId = null,
        array $meta = [],
        ?string $disk = null,
        ?string $customDirectory = null,
        bool $optimize = true,
    ): MediaFile {
        $driver = $this->driver($disk);
        $diskName = $driver->name();

        $originalName = $file->getClientOriginalName();
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin');
        $mimeType = $file->getMimeType() ?: 'application/octet-stream';

        // Optimize image if requested and supported
        if ($optimize && $this->optimizer->isEnabled() && $this->optimizer->isSupported($mimeType)) {
            $optMeta = $this->optimizer->optimizeUploadedFile($file);
            $meta = array_merge($meta, $optMeta);
        }

        $size = (int) $file->getSize();
        $realPath = $file->getRealPath();
        $hash = ($realPath && file_exists($realPath)) ? hash_file('sha256', $realPath) ?: null : null;

        $directory = $customDirectory !== null ? trim($customDirectory, '/') : 'media/'.date('Y/m');
        $uuid = (string) Str::uuid();
        $filename = $uuid.'.'.$extension;

        $path = $driver->putFileAs($directory, $file, $filename);
        if ($path === false) {
            throw new RuntimeException("Failed to store file '{$originalName}' to storage driver '{$diskName}'.");
        }

        return $this->createRecord([
            'id' => $uuid,
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
            'meta' => $meta,
        ]);
    }

    /**
     * Store raw file content into media storage.
     *
     * @param array<string, mixed> $meta
     */
    public function storeRaw(
        string $contents,
        string $originalName,
        string $mimeType,
        string $collection = 'default',
        ?string $userId = null,
        array $meta = [],
        ?string $disk = null,
    ): MediaFile {
        $driver = $this->driver($disk);
        $diskName = $driver->name();

        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION) ?: 'bin');
        $uuid = (string) Str::uuid();
        $filename = $uuid.'.'.$extension;
        $directory = 'media/'.date('Y/m');
        $filePath = $directory.'/'.$filename;

        $driver->put($filePath, $contents);

        return $this->createRecord([
            'id' => $uuid,
            'disk' => $diskName,
            'directory' => $directory,
            'filename' => $filename,
            'original_name' => $originalName,
            'mime_type' => $mimeType,
            'extension' => $extension,
            'size' => strlen($contents),
            'hash' => hash('sha256', $contents),
            'collection' => $collection,
            'user_id' => $userId,
            'meta' => $meta,
        ]);
    }

    /**
     * Internal helper to persist a MediaFile record.
     *
     * @param array<string, mixed> $attributes
     */
    protected function createRecord(array $attributes): MediaFile
    {
        if (empty($attributes['meta'])) {
            $attributes['meta'] = null;
        }

        /** @var MediaFile */
        return MediaFile::create($attributes);
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
     * Resolve a stored path, filename, or legacy URL into an absolute URL using the current domain and storage driver.
     */
    public function resolveUrl(?string $pathOrUrl, ?string $disk = null): ?string
    {
        if ($pathOrUrl === null || trim($pathOrUrl) === '') {
            return null;
        }

        $trimmed = trim($pathOrUrl);

        // If it's a media view route URL (even from an old host or localhost), extract identifier and re-resolve
        if (preg_match('~/media/view/([^/?#]+)~', $trimmed, $matches)) {
            $identifier = $matches[1];
            $media = $this->resolveMediaFileQuietly($identifier);
            if ($media) {
                return $this->getUrl($media);
            }

            return route('media.view', ['mediaFile' => $identifier]);
        }

        // If it's already an external HTTP/HTTPS URL
        if (str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://')) {
            $parsed = parse_url($trimmed);
            $currentHost = request()?->getHost() ?: parse_url((string) config('app.url'), PHP_URL_HOST);
            $urlHost = $parsed['host'] ?? null;

            // If it's not the same host, it's an external third-party URL (e.g., Unsplash)
            if ($urlHost && $currentHost && strcasecmp((string) $urlHost, (string) $currentHost) !== 0 && ! str_contains($trimmed, '/storage/')) {
                return $trimmed;
            }

            // If it's our own host with /storage/, strip host and prefix to relative path
            if (isset($parsed['path']) && str_starts_with($parsed['path'], '/storage/')) {
                $trimmed = substr($parsed['path'], strlen('/storage/'));
            }
        }

        $cleanPath = ltrim($trimmed, '/');

        // Look for matching MediaFile by filename or identifier
        $filename = basename($cleanPath);
        $media = MediaFile::query()
            ->where('filename', $filename)
            ->first();

        if ($media) {
            return $this->getUrl($media);
        }

        // If file exists on the designated disk
        $driver = $this->driver($disk);
        if ($driver->exists($cleanPath)) {
            return $driver->url($cleanPath);
        }

        // Fallback: public asset URL
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

        // 1. If it's a media view URL (e.g. http://localhost:8000/media/view/{id} or /media/view/{id})
        if (preg_match('~/media/view/([^/?#]+)~', $value, $matches)) {
            $identifier = $matches[1];
            $media = $this->resolveMediaFileQuietly($identifier);
            if ($media) {
                return $media->path;
            }

            return $identifier;
        }

        // 2. If it's a direct UUID of a MediaFile
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value)) {
            $media = MediaFile::find($value);
            if ($media) {
                return $media->path;
            }
        }

        // 3. If it's a local / storage URL (e.g. http://localhost/storage/media/2026/10/file.jpg or /storage/media/...)
        if (preg_match('~/storage/(.+)$~', $value, $matches)) {
            return ltrim($matches[1], '/');
        }

        // 4. If it's an absolute external third-party URL (e.g. Unsplash, external CDN)
        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            $parsed = parse_url($value);
            $appHost = parse_url((string) config('app.url'), PHP_URL_HOST);
            $requestHost = request()?->getHost();
            $urlHost = $parsed['host'] ?? null;

            $isInternalHost = ($urlHost && ($urlHost === $appHost || $urlHost === $requestHost || $urlHost === 'localhost' || $urlHost === '127.0.0.1'));

            if (! $isInternalHost) {
                // External 3rd party URL - preserve as is
                return $value;
            }

            // Internal host - extract path
            $urlPath = ltrim($parsed['path'] ?? '', '/');
            if (str_starts_with($urlPath, 'storage/')) {
                return substr($urlPath, strlen('storage/'));
            }

            return $urlPath;
        }

        // 5. Already a clean relative path ('folder/filename')
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

    /**
     * Attach a media file to an Eloquent model.
     */
    public function attachToModel(
        string|MediaFile $media,
        Model $model,
        string $collection = 'default',
    ): MediaFile {
        $mediaFile = $this->resolveMediaFile($media);

        $mediaFile->update([
            'mediable_type' => $model->getMorphClass(),
            'mediable_id' => (string) $model->getKey(),
            'collection' => $collection,
        ]);

        return $mediaFile;
    }

    /**
     * Detach a media file from its owning model.
     */
    public function detachFromModel(string|MediaFile $media): bool
    {
        return $this->resolveMediaFile($media)->update([
            'mediable_type' => null,
            'mediable_id' => null,
        ]);
    }

    /**
     * Resolve a MediaFile instance from UUID string or model.
     */
    public function resolveMediaFile(string|MediaFile $media): MediaFile
    {
        return $media instanceof MediaFile ? $media : MediaFile::findOrFail((string) $media);
    }

    /**
     * Prune unattached media files older than the specified hours.
     */
    public function pruneUnattached(int $hoursOld = 24): int
    {
        $unattached = MediaFile::query()
            ->unattached()
            ->olderThanHours($hoursOld)
            ->get();

        $count = 0;
        foreach ($unattached as $media) {
            if ($media->delete()) {
                $count++;
            }
        }

        return $count;
    }
}

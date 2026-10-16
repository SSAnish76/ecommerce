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
     * Get the base media URL for a specific driver.
     */
    public function baseUrl(?string $disk = null): string
    {
        return $this->driver($disk)->baseUrl();
    }

    /**
     * Strip the driver's media base URL from a given URL or path to save only relative path in database.
     */
    public function stripUrl(?string $urlOrPath, ?string $disk = null): ?string
    {
        if ($urlOrPath === null || trim($urlOrPath) === '') {
            return null;
        }

        $trimmed = trim($urlOrPath);
        $baseUrl = $this->baseUrl($disk);

        if (str_starts_with($trimmed, $baseUrl)) {
            return ltrim(substr($trimmed, strlen($baseUrl)), '/');
        }

        $parsedPath = parse_url($baseUrl, PHP_URL_PATH);
        if ($parsedPath && str_starts_with($trimmed, $parsedPath)) {
            return ltrim(substr($trimmed, strlen($parsedPath)), '/');
        }

        if (str_starts_with($trimmed, '/storage/')) {
            return ltrim(substr($trimmed, strlen('/storage/')), '/');
        }

        return ltrim($trimmed, '/');
    }

    /**
     * Append the driver's media base URL to a relative path when returning to frontend.
     */
    public function appendUrl(?string $path, ?string $disk = null): ?string
    {
        if ($path === null || trim($path) === '') {
            return null;
        }

        return $this->driver($disk)->url($path);
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

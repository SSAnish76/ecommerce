<?php

declare(strict_types=1);

namespace App\Services\Storage\Drivers;

use App\Models\MediaFile;
use App\Models\Setting;
use App\Services\Storage\StorageConfigurator;
use DateTimeInterface;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;

class S3StorageDriver implements StorageDriverInterface
{
    public function __construct(
        protected StorageConfigurator $configurator
    ) {}

    public function name(): string
    {
        return 's3';
    }

    public function isConfigured(): bool
    {
        $settings = Setting::getStorageSettings();
        $key = $settings['s3']['key'] ?? Config::get('filesystems.disks.s3.key');
        $bucket = $settings['s3']['bucket'] ?? Config::get('filesystems.disks.s3.bucket');

        return ! empty($key) && ! empty($bucket);
    }

    public function filesystem(): FilesystemAdapter
    {
        $this->configurator->configureDisk('s3');

        /** @var FilesystemAdapter */
        return Storage::disk('s3');
    }

    public function put(string $path, mixed $contents, array $options = []): bool
    {
        return $this->filesystem()->put($path, $contents, $options);
    }

    public function putFileAs(string $directory, UploadedFile|string $file, string $name, array $options = []): string|false
    {
        $targetFile = is_string($file) ? new File($file) : $file;

        return $this->filesystem()->putFileAs($directory, $targetFile, $name, $options);
    }

    public function get(string $path): ?string
    {
        return $this->exists($path) ? $this->filesystem()->get($path) : null;
    }

    /**
     * @return resource|null
     */
    public function readStream(string $path)
    {
        return $this->exists($path) ? $this->filesystem()->readStream($path) : null;
    }

    public function delete(string $path): bool
    {
        return $this->exists($path) ? (bool) $this->filesystem()->delete($path) : false;
    }

    public function exists(string $path): bool
    {
        try {
            return $this->filesystem()->exists($path);
        } catch (\Throwable) {
            return false;
        }
    }

    public function size(string $path): int
    {
        try {
            return (int) $this->filesystem()->size($path);
        } catch (\Throwable) {
            return 0;
        }
    }

    public function mimeType(string $path): ?string
    {
        try {
            return $this->filesystem()->mimeType($path) ?: null;
        } catch (\Throwable) {
            return null;
        }
    }

    public function baseUrl(): string
    {
        $settings = Setting::getStorageSettings();
        if (! empty($settings['s3']['url'])) {
            return rtrim((string) $settings['s3']['url'], '/');
        }

        $configUrl = Config::get('filesystems.disks.s3.url');
        if (! empty($configUrl)) {
            return rtrim((string) $configUrl, '/');
        }

        $bucket = $settings['s3']['bucket'] ?? Config::get('filesystems.disks.s3.bucket', '');
        $region = $settings['s3']['region'] ?? Config::get('filesystems.disks.s3.region', 'us-east-1');

        return "https://{$bucket}.s3.{$region}.amazonaws.com";
    }

    public function url(string $path, ?MediaFile $media = null): string
    {
        try {
            return $this->filesystem()->url($path);
        } catch (\Throwable) {
            return rtrim($this->baseUrl(), '/').'/'.ltrim($path, '/');
        }
    }

    public function temporaryUrl(string $path, DateTimeInterface $expiration, array $options = []): string
    {
        $fs = $this->filesystem();
        if (method_exists($fs, 'temporaryUrl')) {
            try {
                return $fs->temporaryUrl($path, $expiration, $options);
            } catch (\Throwable) {
                // fallback
            }
        }

        return $this->url($path);
    }
}

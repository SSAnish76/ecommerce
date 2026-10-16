<?php

declare(strict_types=1);

namespace App\Services\Storage\Drivers;

use App\Models\MediaFile;
use DateTimeInterface;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class LocalStorageDriver implements StorageDriverInterface
{
    public function __construct(
        protected string $disk = 'public'
    ) {}

    public function name(): string
    {
        return $this->disk;
    }

    public function isConfigured(): bool
    {
        return true;
    }

    public function filesystem(): FilesystemAdapter
    {
        /** @var FilesystemAdapter */
        return Storage::disk($this->disk);
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
        return $this->filesystem()->exists($path);
    }

    public function size(string $path): int
    {
        return $this->exists($path) ? (int) $this->filesystem()->size($path) : 0;
    }

    public function mimeType(string $path): ?string
    {
        return $this->exists($path) ? $this->filesystem()->mimeType($path) : null;
    }

    public function baseUrl(): string
    {
        return url('/media/view');
    }

    public function url(string $path, ?MediaFile $media = null): string
    {
        $identifier = $media?->id ?? basename($path);

        return rtrim($this->baseUrl(), '/').'/'.$identifier;
    }

    public function temporaryUrl(string $path, DateTimeInterface $expiration, array $options = []): string
    {
        return $this->url($path);
    }
}

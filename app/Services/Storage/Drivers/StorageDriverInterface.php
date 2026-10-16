<?php

declare(strict_types=1);

namespace App\Services\Storage\Drivers;

use App\Models\MediaFile;
use DateTimeInterface;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;

interface StorageDriverInterface
{
    /**
     * Get the unique name of this storage driver (e.g. 'public', 'local', 's3').
     */
    public function name(): string;

    /**
     * Check if this storage driver is configured and ready for use.
     */
    public function isConfigured(): bool;

    /**
     * Store raw content or resource at the specified path.
     *
     * @param string|resource $contents
     * @param array<string, mixed> $options
     */
    public function put(string $path, mixed $contents, array $options = []): bool;

    /**
     * Store an uploaded or local file with a specific filename in a directory.
     *
     * @param array<string, mixed> $options
     */
    public function putFileAs(string $directory, UploadedFile|string $file, string $name, array $options = []): string|false;

    /**
     * Retrieve the file contents as string.
     */
    public function get(string $path): ?string;

    /**
     * Get a readable resource stream for the file.
     *
     * @return resource|null
     */
    public function readStream(string $path);

    /**
     * Delete a file from storage.
     */
    public function delete(string $path): bool;

    /**
     * Determine if a file exists in storage.
     */
    public function exists(string $path): bool;

    /**
     * Get the size of a file in bytes.
     */
    public function size(string $path): int;

    /**
     * Get the MIME type of a file.
     */
    public function mimeType(string $path): ?string;

    /**
     * Get the base media URL for this storage driver.
     */
    public function baseUrl(): string;

    /**
     * Get the publicly accessible URL for a path.
     */
    public function url(string $path, ?MediaFile $media = null): string;

    /**
     * Generate a temporary signed URL for a path.
     *
     * @param array<string, mixed> $options
     */
    public function temporaryUrl(string $path, DateTimeInterface $expiration, array $options = []): string;

    /**
     * Get the underlying Laravel Filesystem disk instance.
     */
    public function filesystem(): Filesystem;
}

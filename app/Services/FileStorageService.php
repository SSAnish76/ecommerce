<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\MediaFile;
use App\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileStorageService
{
    public function store(UploadedFile $file, string $collection = 'default', ?string $userId = null, ?string $directory = null): MediaFile
    {
        $disk = $this->resolveDisk();
        $directory ??= 'media/'.now()->format('Y/m');
        $extension = strtolower($file->guessExtension() ?: 'bin');
        $filename = Str::uuid().'.'.$extension;
        $path = $directory.'/'.$filename;

        if (! Storage::disk($disk)->putFileAs($directory, $file, $filename, ['visibility' => 'public'])) {
            throw new \RuntimeException("Unable to save the uploaded file to disk [{$disk}].");
        }

        try {
            return MediaFile::create([
                'disk' => $disk,
                'directory' => $directory,
                'filename' => $filename,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                'extension' => $extension,
                'size' => Storage::disk($disk)->size($path),
                'hash' => ($file->getRealPath() ? hash_file('sha256', $file->getRealPath()) : false) ?: null,
                'collection' => Str::slug($collection) ?: 'default',
                'user_id' => $userId ?? auth()->id(),
            ]);
        } catch (\Throwable $exception) {
            Storage::disk($disk)->delete($path);
            throw $exception;
        }
    }

    public function delete(MediaFile $mediaFile): void
    {
        $this->configureDisk($mediaFile->disk);
        $disk = Storage::disk($mediaFile->disk);

        if ($disk->exists($mediaFile->path) && ! $disk->delete($mediaFile->path)) {
            throw new \RuntimeException('The stored file could not be deleted.');
        }

        $mediaFile->delete();
    }

    public function resolveDisk(): string
    {
        $settings = Setting::getStorageSettings();
        $disk = $settings['default_disk'] ?? config('filesystems.default', 'local');

        $this->configureDisk($disk, $settings);

        return $disk;
    }

    public function configureDisk(string $disk, ?array $settings = null): void
    {
        $settings ??= Setting::getStorageSettings();

        if ($disk === 's3') {
            $s3 = $settings['s3'];
            Config::set('filesystems.disks.s3.key', $s3['key']);
            Config::set('filesystems.disks.s3.secret', $s3['secret']);
            Config::set('filesystems.disks.s3.region', $s3['region'] ?: 'us-east-1');
            Config::set('filesystems.disks.s3.bucket', $s3['bucket']);

            Config::set('filesystems.disks.s3.url', $s3['url'] ?: null);
            Config::set('filesystems.disks.s3.endpoint', $s3['endpoint'] ?: null);
            Config::set('filesystems.disks.s3.use_path_style_endpoint', $s3['endpoint'] !== '');

            Storage::purge('s3');
        }
    }

    public function maxUploadKilobytes(): int
    {
        $configured = Setting::get('storage_max_upload_kb');

        return is_numeric($configured) && (int) $configured > 0
            ? (int) $configured
            : (int) (config('filesystems.max_upload_size', 25 * 1024 * 1024) / 1024);
    }
}

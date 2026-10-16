<?php

declare(strict_types=1);

namespace App\Services\Storage;

use App\Models\Setting;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;

class StorageConfigurator
{
    /**
     * Resolve the active storage disk specified in settings or fallback.
     */
    public function resolveDefaultDisk(): string
    {
        $settings = Setting::getStorageSettings();
        $disk = $settings['default_disk'] ?? 'public';

        $this->configureDisk($disk, $settings);

        return $disk;
    }

    /**
     * Dynamically configure filesystems config with database storage settings.
     *
     * @param array{
     *     default_disk?: string,
     *     s3?: array{
     *         key?: string,
     *         secret?: string,
     *         region?: string,
     *         bucket?: string,
     *         url?: string,
     *         endpoint?: string
     *     }
     * } $settings
     */
    public function configureDisk(string $disk, ?array $settings = null): void
    {
        $settings ??= Setting::getStorageSettings();

        if ($disk === 's3' && ! empty($settings['s3']['key'])) {
            $s3Config = $settings['s3'];

            Config::set('filesystems.disks.s3.key', $s3Config['key'] ?? '');
            Config::set('filesystems.disks.s3.secret', $s3Config['secret'] ?? '');
            Config::set('filesystems.disks.s3.region', ! empty($s3Config['region']) ? $s3Config['region'] : 'us-east-1');
            Config::set('filesystems.disks.s3.bucket', $s3Config['bucket'] ?? '');

            if (! empty($s3Config['url'])) {
                Config::set('filesystems.disks.s3.url', $s3Config['url']);
            }

            if (! empty($s3Config['endpoint'])) {
                Config::set('filesystems.disks.s3.endpoint', $s3Config['endpoint']);
                Config::set('filesystems.disks.s3.use_path_style_endpoint', true);
            }

            Storage::purge('s3');
        }
    }

    /**
     * Get the configured filesystem disk instance.
     */
    public function disk(?string $disk = null): Filesystem
    {
        $diskName = $disk ?? $this->resolveDefaultDisk();
        $this->configureDisk($diskName);

        return Storage::disk($diskName);
    }

    /**
     * Get maximum allowed upload size in kilobytes from settings or default.
     */
    public function getMaxUploadKilobytes(): int
    {
        $custom = Setting::get('storage_max_upload_kb');

        if (is_numeric($custom) && (int) $custom > 0) {
            return (int) $custom;
        }

        // Default 25MB (25600 KB)
        return 25600;
    }
}

<?php

declare(strict_types=1);

namespace App\Services\Storage;

use App\Models\Setting;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

class MediaOptimizer
{
    /**
     * Supported MIME types for media optimization via GD.
     *
     * @var list<string>
     */
    protected array $supportedMimeTypes = [
        'image/jpeg',
        'image/pjpeg',
        'image/png',
        'image/webp',
        'image/gif',
    ];

    /**
     * Determine if a MIME type is supported for optimization.
     */
    public function isSupported(string $mimeType): bool
    {
        return extension_loaded('gd') && in_array(strtolower($mimeType), $this->supportedMimeTypes, true);
    }

    /**
     * Determine whether media optimization is globally enabled.
     */
    public function isEnabled(): bool
    {
        return (bool) Setting::get('media_optimization_enabled', true) && extension_loaded('gd');
    }

    /**
     * Optimize an UploadedFile in-place before storage and return metadata.
     *
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    public function optimizeUploadedFile(UploadedFile $file, array $options = []): array
    {
        $realPath = $file->getRealPath();
        $mimeType = $file->getMimeType() ?: 'application/octet-stream';

        if (! $realPath || ! file_exists($realPath) || ! $this->isEnabled() || ! $this->isSupported($mimeType)) {
            $dimensions = $realPath ? @getimagesize($realPath) : false;
            $w = $dimensions ? (int) $dimensions[0] : 0;
            $h = $dimensions ? (int) $dimensions[1] : 0;

            return $w > 0 && $h > 0
                ? ['width' => $w, 'height' => $h, 'aspect_ratio' => round($w / max(1, $h), 2), 'optimized' => false]
                : ['optimized' => false];
        }

        return $this->optimizeFile($realPath, $mimeType, $options);
    }

    /**
     * Optimize an image file on disk in-place.
     *
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    public function optimizeFile(string $filePath, string $mimeType, array $options = []): array
    {
        $originalSize = (int) @filesize($filePath);
        $maxWidth = (int) ($options['max_width'] ?? 2048);
        $maxHeight = (int) ($options['max_height'] ?? 2048);
        $quality = (int) ($options['quality'] ?? 82);

        try {
            $dimensions = @getimagesize($filePath);
            if (! $dimensions) {
                return ['optimized' => false];
            }

            $origWidth = (int) $dimensions[0];
            $origHeight = (int) $dimensions[1];
            if ($origWidth <= 0 || $origHeight <= 0) {
                return ['optimized' => false];
            }

            $raw = @file_get_contents($filePath);
            if (! $raw) {
                return ['width' => $origWidth, 'height' => $origHeight, 'aspect_ratio' => round($origWidth / $origHeight, 2), 'optimized' => false];
            }

            $image = @imagecreatefromstring($raw);
            if (! $image instanceof GdImage) {
                return ['width' => $origWidth, 'height' => $origHeight, 'aspect_ratio' => round($origWidth / $origHeight, 2), 'optimized' => false];
            }

            $needsResize = ($origWidth > $maxWidth || $origHeight > $maxHeight);
            $targetWidth = $origWidth;
            $targetHeight = $origHeight;

            if ($needsResize) {
                $scaleRatio = min($maxWidth / $origWidth, $maxHeight / $origHeight);
                $targetWidth = max(1, (int) round($origWidth * $scaleRatio));
                $targetHeight = max(1, (int) round($origHeight * $scaleRatio));

                $resized = imagecreatetruecolor($targetWidth, $targetHeight);
                if (in_array($mimeType, ['image/png', 'image/webp', 'image/gif'], true)) {
                    imagealphablending($resized, false);
                    imagesavealpha($resized, true);
                    $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
                    if ($transparent !== false) {
                        imagefilledrectangle($resized, 0, 0, $targetWidth, $targetHeight, $transparent);
                    }
                }

                imagecopyresampled($resized, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $origWidth, $origHeight);
                imagedestroy($image);
                $image = $resized;
            }

            $temp = tempnam(sys_get_temp_dir(), 'opt_');
            if ($temp === false) {
                imagedestroy($image);

                return ['width' => $origWidth, 'height' => $origHeight, 'aspect_ratio' => round($origWidth / $origHeight, 2), 'optimized' => false];
            }

            $saved = match ($mimeType) {
                'image/jpeg', 'image/pjpeg' => imagejpeg($image, $temp, $quality),
                'image/png' => (function () use ($image, $temp): bool {
                    imagealphablending($image, false);
                    imagesavealpha($image, true);

                    return imagepng($image, $temp, 8);
                })(),
                'image/webp' => imagewebp($image, $temp, $quality),
                'image/gif' => imagegif($image, $temp),
                default => false,
            };

            imagedestroy($image);

            $aspectRatio = round($targetWidth / max(1, $targetHeight), 2);

            if ($saved) {
                $newSize = (int) filesize($temp);
                if ($newSize < $originalSize || $needsResize) {
                    copy($temp, $filePath);
                    @unlink($temp);

                    $savedBytes = max(0, $originalSize - $newSize);
                    $savedPct = $originalSize > 0 ? round(($savedBytes / $originalSize) * 100, 2) : 0.0;

                    return [
                        'width' => $targetWidth,
                        'height' => $targetHeight,
                        'aspect_ratio' => $aspectRatio,
                        'optimized' => true,
                        'original_size' => $originalSize,
                        'optimized_size' => $newSize,
                        'saved_bytes' => $savedBytes,
                        'saved_percentage' => $savedPct,
                    ];
                }
            }

            @unlink($temp);

            return [
                'width' => $origWidth,
                'height' => $origHeight,
                'aspect_ratio' => round($origWidth / $origHeight, 2),
                'optimized' => false,
            ];
        } catch (\Throwable $e) {
            Log::warning("Media optimization failed gracefully for {$filePath}: {$e->getMessage()}");

            return ['optimized' => false];
        }
    }
}

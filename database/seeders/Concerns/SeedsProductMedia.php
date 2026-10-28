<?php

declare(strict_types=1);

namespace Database\Seeders\Concerns;

use App\Models\MediaFile;

trait SeedsProductMedia
{
    /**
     * Ensure a physical sample image exists on disk and register it in MediaFile.
     */
    protected function ensureProductMedia(
        string $filename,
        string $title,
        string $brandName,
        string $hexBg = '#0f172a'
    ): MediaFile {
        $dir = storage_path('app/public/media/products');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $filePath = "{$dir}/{$filename}";
        if (! file_exists($filePath) && extension_loaded('gd')) {
            $img = imagecreatetruecolor(800, 800);

            $cleanHex = ltrim($hexBg, '#');
            if (strlen($cleanHex) === 3) {
                $cleanHex = "{$cleanHex[0]}{$cleanHex[0]}{$cleanHex[1]}{$cleanHex[1]}{$cleanHex[2]}{$cleanHex[2]}";
            }
            $cleanHex = str_pad($cleanHex, 6, '0');

            $r = (int) hexdec(substr($cleanHex, 0, 2));
            $g = (int) hexdec(substr($cleanHex, 2, 2));
            $b = (int) hexdec(substr($cleanHex, 4, 2));

            $bg = imagecolorallocate($img, $r, $g, $b);
            imagefill($img, 0, 0, $bg);

            $innerCard = imagecolorallocate(
                $img,
                (int) min(255, $r + 18),
                (int) min(255, $g + 18),
                (int) min(255, $b + 22)
            );
            imagefilledrectangle($img, 50, 50, 750, 750, $innerCard);

            $white = imagecolorallocate($img, 248, 250, 252);
            $muted = imagecolorallocate($img, 148, 163, 184);
            $border = imagecolorallocate($img, 51, 65, 85);

            imagerectangle($img, 50, 50, 750, 750, $border);
            imagerectangle($img, 70, 70, 730, 730, $border);

            imagestring($img, 5, 90, 100, strtoupper($brandName), $white);
            imagestring($img, 5, 90, 130, substr($title, 0, 36), $white);
            imagestring($img, 3, 90, 170, 'Genuine High-Performance Hardware', $muted);

            for ($x = 100; $x <= 700; $x += 60) {
                imageline($img, $x, 220, $x, 650, $border);
            }
            for ($y = 220; $y <= 650; $y += 60) {
                imageline($img, 100, $y, 700, $y, $border);
            }

            $badgeBg = imagecolorallocate($img, 15, 23, 42);
            imagefilledrectangle($img, 160, 380, 640, 480, $badgeBg);
            imagerectangle($img, 160, 380, 640, 480, $white);
            imagestring($img, 5, 190, 420, substr($title, 0, 32), $white);

            imagejpeg($img, $filePath, 90);
            imagedestroy($img);
        }

        $size = file_exists($filePath) ? filesize($filePath) : 10240;

        return MediaFile::firstOrCreate(
            ['filename' => $filename],
            [
                'disk' => 'public',
                'directory' => 'media/products',
                'original_name' => $filename,
                'mime_type' => 'image/jpeg',
                'extension' => 'jpg',
                'size' => $size,
                'collection' => 'products',
            ]
        );
    }
}


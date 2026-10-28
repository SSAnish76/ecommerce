<?php

declare(strict_types=1);

namespace Database\Seeders\Concerns;

use App\Models\MediaFile;

trait SeedsProductMedia
{
    /**
     * Live Unsplash/Picsum download URLs keyed by seeder filename.
     * Each URL returns a real product-relevant photo (800×800 JPEG).
     *
     * @var array<string, string>
     */
    private array $productImageUrls = [
        // ── Smartphones ─────────────────────────────────────────────────────────
        'samsung-s24-ultra-titanium.jpg'       => 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&h=800&fit=crop&q=85',
        'samsung-s24-ultra-spen.jpg'           => 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=800&fit=crop&q=85',
        'apple-iphone-16-pro-max-natural.jpg'  => 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=800&h=800&fit=crop&q=85',
        'apple-iphone-16-pro-max-camera.jpg'   => 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=800&fit=crop&q=85',
        'google-pixel-9-pro-obsidian.jpg'      => 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop&q=85',
        'google-pixel-9-pro-camera-bar.jpg'    => 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800&h=800&fit=crop&q=85',
        'samsung-galaxy-z-fold-6-silver.jpg'   => 'https://images.unsplash.com/photo-1678911820864-e5c67e784b62?w=800&h=800&fit=crop&q=85',
        'samsung-galaxy-z-fold-6-unfolded.jpg' => 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&h=800&fit=crop&q=85',

        // ── Laptops & Computers ──────────────────────────────────────────────────
        'apple-macbook-pro-16-space-black.jpg' => 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop&q=85',
        'apple-macbook-pro-16-keyboard.jpg'    => 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=800&fit=crop&q=85',
        'dell-xps-16-platinum.jpg'             => 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&h=800&fit=crop&q=85',
        'dell-xps-16-keyboard.jpg'             => 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&h=800&fit=crop&q=85',
        'lenovo-legion-pro-7i-onyx.jpg'        => 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&h=800&fit=crop&q=85',
        'lenovo-legion-pro-7i-rear.jpg'        => 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=800&fit=crop&q=85',
        'asus-rog-zephyrus-g14-eclipse-gray.jpg' => 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&h=800&fit=crop&q=85',
        'asus-rog-zephyrus-g14-slash-light.jpg'  => 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=800&fit=crop&q=85',

        // ── Audio & Footwear ─────────────────────────────────────────────────────
        'sony-wh-1000xm5.jpg'   => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&q=85',
        'nike-air-max-alpha.jpg' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&q=85',
    ];

    /**
     * Ensure a physical product image exists on disk and register it in MediaFile.
     *
     * Priority:
     *  1. File already exists on disk → skip download/generation.
     *  2. A live URL is mapped for this filename → attempt HTTP download.
     *  3. Fallback → generate a branded GD placeholder image.
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

        if (! file_exists($filePath)) {
            $downloaded = $this->downloadProductImage($filename, $filePath);

            if (! $downloaded) {
                $this->generatePlaceholderImage($filePath, $title, $brandName, $hexBg);
            }
        }

        $size = file_exists($filePath) ? filesize($filePath) : 10240;

        return MediaFile::firstOrCreate(
            ['filename' => $filename],
            [
                'disk'          => 'public',
                'directory'     => 'media/products',
                'original_name' => $filename,
                'mime_type'     => 'image/jpeg',
                'extension'     => 'jpg',
                'size'          => $size,
                'collection'    => 'products',
            ]
        );
    }

    /**
     * Attempt to download a real product image from the live URL map.
     *
     * @return bool True when the file was successfully saved to disk.
     */
    private function downloadProductImage(string $filename, string $destPath): bool
    {
        $url = $this->productImageUrls[$filename] ?? null;

        if ($url === null) {
            return false;
        }

        $context = stream_context_create([
            'http' => [
                'method'          => 'GET',
                'timeout'         => 15,
                'follow_location' => true,
                'user_agent'      => 'Mozilla/5.0 (compatible; Laravel-Seeder/1.0)',
                'header'          => "Accept: image/jpeg,image/*\r\n",
            ],
            'ssl' => [
                'verify_peer'      => true,
                'verify_peer_name' => true,
            ],
        ]);

        $imageData = @file_get_contents($url, false, $context);

        if ($imageData === false || strlen($imageData) < 1024) {
            return false;
        }

        return file_put_contents($destPath, $imageData) !== false;
    }

    /**
     * Generate a branded GD placeholder image when no live download is available.
     */
    private function generatePlaceholderImage(
        string $filePath,
        string $title,
        string $brandName,
        string $hexBg
    ): void {
        if (! extension_loaded('gd')) {
            return;
        }

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

        $white  = imagecolorallocate($img, 248, 250, 252);
        $muted  = imagecolorallocate($img, 148, 163, 184);
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
}


<?php

declare(strict_types=1);

namespace App\Services;

use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class QrCodeService
{
    /**
     * Generate an SVG representation of a QR Code.
     */
    public static function generateSvg(string $text, int $size = 200, int $margin = 1): string
    {
        $renderer = new ImageRenderer(
            new RendererStyle($size, $margin),
            new SvgImageBackEnd
        );

        $svg = (new Writer($renderer))->writeString($text);

        return trim(substr($svg, (int) strpos($svg, "\n") + 1));
    }

    /**
     * Generate Data URI of SVG QR code.
     */
    public static function generateSvgDataUri(string $text, int $size = 200, int $margin = 1): string
    {
        $svg = self::generateSvg($text, $size, $margin);

        return 'data:image/svg+xml;utf8,'.rawurlencode($svg);
    }
}

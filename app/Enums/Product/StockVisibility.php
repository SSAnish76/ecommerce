<?php

declare(strict_types=1);

namespace App\Enums\Product;

use App\Enums\Concerns\HasEnumHelpers;

enum StockVisibility: string
{
    use HasEnumHelpers;

    case Hide = 'hide';
    case Badge = 'badge';
    case Backorder = 'backorder';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Badge => "Display product with 'Sold Out' badge (Recommended)",
            self::Hide => 'Hide product completely from catalog storefront',
            self::Backorder => 'Allow customers to backorder',
        };
    }
}

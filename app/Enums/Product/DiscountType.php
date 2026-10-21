<?php

declare(strict_types=1);

namespace App\Enums\Product;

use App\Enums\Concerns\HasEnumHelpers;

enum DiscountType: string
{
    use HasEnumHelpers;

    case Percentage = 'percentage';
    case Fixed = 'fixed';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Percentage => 'Percentage (%)',
            self::Fixed => 'Fixed Amount',
        };
    }
}

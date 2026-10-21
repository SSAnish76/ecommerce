<?php

declare(strict_types=1);

namespace App\Enums\Coupon;

use App\Enums\Concerns\HasEnumHelpers;

enum CouponType: string
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
            self::Percentage => 'Percentage Discount (%)',
            self::Fixed => 'Fixed Amount Discount',
        };
    }
}

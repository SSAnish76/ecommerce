<?php

declare(strict_types=1);

namespace App\Enums\Coupon;

use App\Enums\Concerns\HasEnumHelpers;

enum CouponApplyTo: string
{
    use HasEnumHelpers;

    case All = 'all';
    case Products = 'products';
    case Categories = 'categories';
    case Collections = 'collections';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::All => 'Entire Store (All Products)',
            self::Products => 'Specific Products',
            self::Categories => 'Specific Categories',
            self::Collections => 'Specific Collections',
        };
    }
}

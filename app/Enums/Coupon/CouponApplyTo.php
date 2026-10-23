<?php

declare(strict_types=1);

namespace App\Enums\Coupon;

use App\Enums\Concerns\HasEnumHelpers;

enum CouponApplyTo: string
{
    use HasEnumHelpers;

    case All = 'all';
    case Products = 'products';
    case Brands = 'brands';
    case Categories = 'categories';
    case Collections = 'collections';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::All => 'All Products (Entire Store)',
            self::Products => 'Specific Products',
            self::Brands => 'Specific Brands',
            self::Categories => 'Specific Categories',
            self::Collections => 'Specific Collections',
        };
    }

    /**
     * Get options list suitable for UI select dropdowns (without collections).
     *
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return [
            ['value' => self::All->value, 'label' => self::All->label()],
            ['value' => self::Products->value, 'label' => self::Products->label()],
            ['value' => self::Brands->value, 'label' => self::Brands->label()],
            ['value' => self::Categories->value, 'label' => self::Categories->label()],
        ];
    }
}

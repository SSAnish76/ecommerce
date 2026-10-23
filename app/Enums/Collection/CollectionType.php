<?php

declare(strict_types=1);

namespace App\Enums\Collection;

use App\Enums\Concerns\HasEnumHelpers;

enum CollectionType: string
{
    use HasEnumHelpers;

    case Product = 'product';
    case Brand = 'brand';
    case Category = 'category';
    case Other = 'other';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Product => 'Product Collection',
            self::Brand => 'Brand Showcase',
            self::Category => 'Category Group',
            self::Other => 'Other',
        };
    }
}

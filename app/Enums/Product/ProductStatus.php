<?php

declare(strict_types=1);

namespace App\Enums\Product;

use App\Enums\Concerns\HasEnumHelpers;

enum ProductStatus: string
{
    use HasEnumHelpers;

    case Draft = 'draft';
    case Active = 'active';
    case Inactive = 'inactive';
    case Archived = 'archived';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Active => 'Active',
            self::Inactive => 'Inactive',
            self::Archived => 'Archived',
        };
    }
}

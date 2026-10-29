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

    /**
     * Determine if product with this status is active.
     */
    public function isActive(): bool
    {
        return $this === self::Active;
    }

    /**
     * Determine if product with this status is draft.
     */
    public function isDraft(): bool
    {
        return $this === self::Draft;
    }

    /**
     * Determine if product with this status is archived.
     */
    public function isArchived(): bool
    {
        return $this === self::Archived;
    }

    /**
     * Determine if products with this status are eligible for customer purchase.
     */
    public function isPurchasable(): bool
    {
        return $this === self::Active;
    }
}

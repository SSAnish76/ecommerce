<?php

declare(strict_types=1);

namespace App\Enums\Customer;

use App\Enums\Concerns\HasEnumHelpers;

enum CustomerStatus: string
{
    use HasEnumHelpers;

    case Active = 'active';
    case Inactive = 'inactive';
    case Suspended = 'suspended';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Inactive => 'Inactive',
            self::Suspended => 'Suspended',
        };
    }
}

<?php

declare(strict_types=1);

namespace App\Enums\Product;

use App\Enums\Concerns\HasEnumHelpers;

enum LocationAvailabilityType: string
{
    use HasEnumHelpers;

    case All = 'all';
    case Radius = 'radius';
    case Pincode = 'pincode';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::All => 'Available Everywhere',
            self::Radius => 'Radius-Based Delivery (Km)',
            self::Pincode => 'Specific Postal Codes',
        };
    }
}

<?php

declare(strict_types=1);

namespace App\Enums\Address;

use App\Enums\Concerns\HasEnumHelpers;

enum AddressType: string
{
    use HasEnumHelpers;

    case Shipping = 'shipping';
    case Billing = 'billing';
    case Home = 'home';
    case Office = 'office';
    case Other = 'other';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Shipping => 'Shipping Address',
            self::Billing => 'Billing Address',
            self::Home => 'Home',
            self::Office => 'Office',
            self::Other => 'Other',
        };
    }
}

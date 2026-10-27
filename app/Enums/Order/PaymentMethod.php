<?php

declare(strict_types=1);

namespace App\Enums\Order;

use App\Enums\Concerns\HasEnumHelpers;

enum PaymentMethod: string
{
    use HasEnumHelpers;

    case Cod = 'cod';
    case Card = 'card';
    case Wire = 'wire';
    case Stripe = 'stripe';
    case Paypal = 'paypal';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Cod => 'Cash on Delivery (COD)',
            self::Card => 'Credit / Debit Card',
            self::Wire => 'Bank Wire Transfer',
            self::Stripe => 'Stripe',
            self::Paypal => 'PayPal',
        };
    }
}

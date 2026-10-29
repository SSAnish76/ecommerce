<?php

declare(strict_types=1);

namespace App\Enums\Order;

use App\Enums\Concerns\HasEnumHelpers;

enum PaymentMethod: string
{
    use HasEnumHelpers;

    case Cod = 'cod';
    case Card = 'card';
    case Stripe = 'stripe';
    case Paypal = 'paypal';
    case Razorpay = 'razorpay';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Cod => 'Cash on Delivery (COD)',
            self::Card => 'Credit / Debit Card',
            self::Stripe => 'Stripe',
            self::Paypal => 'PayPal',
            self::Razorpay => 'Razorpay',
        };
    }
}

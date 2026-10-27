<?php

declare(strict_types=1);

namespace App\Enums\Order;

use App\Enums\Concerns\HasEnumHelpers;

enum PaymentStatus: string
{
    use HasEnumHelpers;

    case Pending = 'pending';
    case Paid = 'paid';
    case Failed = 'failed';
    case Refunded = 'refunded';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Paid => 'Paid',
            self::Failed => 'Failed',
            self::Refunded => 'Refunded',
        };
    }
}

<?php

declare(strict_types=1);

namespace App\Enums\Order;

use App\Enums\Concerns\HasEnumHelpers;

enum OrderStatus: string
{
    use HasEnumHelpers;

    case Pending = 'pending';
    case Processing = 'processing';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    /**
     * Get user-friendly label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Processing => 'Processing',
            self::Shipped => 'Shipped',
            self::Delivered => 'Delivered',
            self::Completed => 'Completed',
            self::Cancelled => 'Cancelled',
        };
    }

    /**
     * Determine if an order with this status can be cancelled by a customer.
     */
    public function isCancellable(): bool
    {
        return match ($this) {
            self::Pending, self::Processing => true,
            default => false,
        };
    }
}

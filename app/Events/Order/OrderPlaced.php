<?php

declare(strict_types=1);

namespace App\Events\Order;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderPlaced implements ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     *
     * @param array{
     *     order_number: string,
     *     customer_name: string,
     *     customer_email: string,
     *     total: float|int|string,
     *     currency?: string,
     *     items: list<array{name: string, quantity: int, price: float|int|string}>,
     *     payment_method?: string,
     *     shipping_address?: string
     * } $orderData
     */
    public function __construct(
        public array $orderData,
    ) {}
}

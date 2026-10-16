<?php

declare(strict_types=1);

namespace App\Events\Inventory;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LowStockDetected implements ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     *
     * @param array{
     *     id: string|int,
     *     name: string,
     *     sku: string,
     *     stock_quantity: int
     * } $productData
     */
    public function __construct(
        public array $productData,
        public int $currentStock,
        public int $threshold,
    ) {}
}

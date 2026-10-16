<?php

declare(strict_types=1);

namespace App\Events\Review;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProductReviewSubmitted implements ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     *
     * @param array{
     *     review_id?: string|int,
     *     product_name: string,
     *     customer_name: string,
     *     customer_email?: string,
     *     rating: int,
     *     comment: string
     * } $reviewData
     */
    public function __construct(
        public array $reviewData,
    ) {}
}

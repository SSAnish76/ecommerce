<?php

declare(strict_types=1);

namespace App\Mail\Review;

use App\Services\NotificationDispatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewReviewAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
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

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "New Product Review: {$this->reviewData['product_name']} ({$this->reviewData['rating']}/5 Stars)",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $store = app(NotificationDispatcher::class)->getStoreInfo();

        return new Content(
            view: 'emails.review.new-review',
            with: [
                'review' => $this->reviewData,
                'store' => $store,
                'headerSubtitle' => 'Product Feedback Alert',
            ],
        );
    }
}

<?php

declare(strict_types=1);

namespace App\Mail\Order;

use App\Services\NotificationDispatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdatedMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     *
     * @param array{
     *     order_number: string,
     *     customer_name: string,
     *     customer_email: string,
     *     total: float|int|string,
     *     tracking_number?: ?string,
     *     notes?: ?string
     * } $orderData
     */
    public function __construct(
        public array $orderData,
        public string $previousStatus,
        public string $newStatus,
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Order #{$this->orderData['order_number']} Status: " . ucfirst($this->newStatus),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $store = app(NotificationDispatcher::class)->getStoreInfo();

        return new Content(
            view: 'emails.order.status-updated',
            with: [
                'order' => $this->orderData,
                'previousStatus' => $this->previousStatus,
                'newStatus' => $this->newStatus,
                'store' => $store,
                'headerSubtitle' => 'Order Status Notification',
            ],
        );
    }
}

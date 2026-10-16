<?php

declare(strict_types=1);

namespace App\Mail\Order;

use App\Services\NotificationDispatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderCancelledMail extends Mailable
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
     *     refund_status?: ?string
     * } $orderData
     */
    public function __construct(
        public array $orderData,
        public string $reason,
        public bool $isAdminNotification = false,
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $prefix = $this->isAdminNotification ? '[Admin Alert] ' : '';

        return new Envelope(
            subject: "{$prefix}Order #{$this->orderData['order_number']} Cancelled",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $store = app(NotificationDispatcher::class)->getStoreInfo();

        return new Content(
            view: 'emails.order.cancelled',
            with: [
                'order' => $this->orderData,
                'reason' => $this->reason,
                'isAdminNotification' => $this->isAdminNotification,
                'store' => $store,
                'headerSubtitle' => 'Order Cancellation Notice',
            ],
        );
    }
}

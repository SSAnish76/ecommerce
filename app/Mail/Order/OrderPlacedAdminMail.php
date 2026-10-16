<?php

declare(strict_types=1);

namespace App\Mail\Order;

use App\Services\NotificationDispatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderPlacedAdminMail extends Mailable
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
     *     currency?: string,
     *     items: list<array{name: string, quantity: int, price: float|int|string}>,
     *     payment_method?: string,
     *     shipping_address?: string
     * } $orderData
     */
    public function __construct(
        public array $orderData,
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New Order Received: #' . $this->orderData['order_number'],
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $store = app(NotificationDispatcher::class)->getStoreInfo();

        return new Content(
            view: 'emails.order.placed-admin',
            with: [
                'order' => $this->orderData,
                'store' => $store,
                'headerSubtitle' => 'Store Administrator Order Alert',
            ],
        );
    }
}

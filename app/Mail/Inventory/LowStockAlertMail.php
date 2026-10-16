<?php

declare(strict_types=1);

namespace App\Mail\Inventory;

use App\Services\NotificationDispatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LowStockAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
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

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Low Stock Alert: {$this->productData['name']} ({$this->currentStock} remaining)",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $store = app(NotificationDispatcher::class)->getStoreInfo();

        return new Content(
            view: 'emails.inventory.low-stock',
            with: [
                'product' => $this->productData,
                'currentStock' => $this->currentStock,
                'threshold' => $this->threshold,
                'store' => $store,
                'headerSubtitle' => 'Inventory Management Alert',
            ],
        );
    }
}

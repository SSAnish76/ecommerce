<?php

declare(strict_types=1);

namespace App\Mail\System;

use App\Services\NotificationDispatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     *
     * @param array<string, mixed> $context
     */
    public function __construct(
        public string $alertSubject,
        public string $alertMessage,
        public array $context = [],
        public string $level = 'info',
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[System Alert] {$this->alertSubject}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $store = app(NotificationDispatcher::class)->getStoreInfo();

        return new Content(
            view: 'emails.system.admin-alert',
            with: [
                'alertSubject' => $this->alertSubject,
                'alertMessage' => $this->alertMessage,
                'context' => $this->context,
                'level' => $this->level,
                'store' => $store,
                'headerSubtitle' => 'System Operation Notice',
            ],
        );
    }
}

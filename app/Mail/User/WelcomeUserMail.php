<?php

declare(strict_types=1);

namespace App\Mail\User;

use App\Models\User;
use App\Services\NotificationDispatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeUserMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public User $user,
        public ?string $initialPassword = null,
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to ' . (app(NotificationDispatcher::class)->getStoreInfo()['name']),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $store = app(NotificationDispatcher::class)->getStoreInfo();

        return new Content(
            view: 'emails.user.welcome',
            with: [
                'user' => $this->user,
                'initialPassword' => $this->initialPassword,
                'loginUrl' => route('admin.login'),
                'store' => $store,
                'headerSubtitle' => 'Account Registration & Setup',
            ],
        );
    }
}

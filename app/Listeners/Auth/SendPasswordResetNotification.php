<?php

declare(strict_types=1);

namespace App\Listeners\Auth;

use App\Events\Auth\PasswordResetRequested;
use App\Listeners\BaseNotificationListener;
use App\Mail\Auth\PasswordResetMail;

class SendPasswordResetNotification extends BaseNotificationListener
{
    /**
     * Handle the event across all enabled channels.
     */
    public function handle(PasswordResetRequested $event): void
    {
        $this->email()->send(
            $event->user->email,
            new PasswordResetMail($event->user, $event->token, $event->resetUrl),
        );
    }
}

<?php

declare(strict_types=1);

namespace App\Listeners\System;

use App\Events\System\AdminAlertTriggered;
use App\Listeners\BaseNotificationListener;
use App\Mail\System\AdminAlertMail;

class SendAdminAlertNotification extends BaseNotificationListener
{
    /**
     * Handle the event across all enabled channels.
     */
    public function handle(AdminAlertTriggered $event): void
    {
        // 1. Email Alert Channel
        $this->email()->send(
            $this->adminEmail(),
            new AdminAlertMail($event->subject, $event->message, $event->context, $event->level),
        );

        // 2. In-App / Push Alert Channel
        $this->push()->send(
            'admin',
            "[{$event->level}] {$event->subject}",
            $event->message,
            $event->context,
        );
    }
}

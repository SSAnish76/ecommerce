<?php

declare(strict_types=1);

namespace App\Listeners\User;

use App\Events\User\UserCreated;
use App\Listeners\BaseNotificationListener;
use App\Mail\User\WelcomeUserMail;

class SendWelcomeNotification extends BaseNotificationListener
{
    /**
     * Handle the event across all enabled channels.
     */
    public function handle(UserCreated $event): void
    {
        $user = $event->user;
        $storeName = $this->storeInfo()['name'];

        // 1. Email Channel - Welcome Email
        $this->email()->send(
            $user->email,
            new WelcomeUserMail($user, $event->initialPassword),
            'notify_new_customer_welcome_email',
        );

        // 2. SMS Channel (if user phone is configured)
        if (! empty($user->phone)) {
            $this->sms()->send(
                (string) $user->phone,
                "Welcome to {$storeName}! Your account has been created successfully.",
                'notify_new_customer_welcome_sms',
            );
        }

        // 3. Push / In-App Notification Channel
        $this->push()->send(
            $user->id,
            "Welcome to {$storeName}",
            'Your account has been setup and is ready to use.',
            ['type' => 'welcome', 'user_id' => $user->id],
        );
    }
}

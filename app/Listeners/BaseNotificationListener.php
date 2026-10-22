<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Services\NotificationDispatcher;
use App\Services\Channels\ChannelInterface;
use App\Services\Channels\EmailChannel;
use App\Services\Channels\PushChannel;
use App\Services\Channels\SmsChannel;
use Illuminate\Mail\Mailable;

abstract class BaseNotificationListener
{
    /**
     * Create the base listener with auto-wired NotificationDispatcher.
     */
    public function __construct(
        protected NotificationDispatcher $notifications,
    ) {}

    /**
     * Access the email channel directly.
     */
    protected function email(): EmailChannel
    {
        return $this->notifications->email();
    }

    /**
     * Access the SMS channel directly.
     */
    protected function sms(): SmsChannel
    {
        return $this->notifications->sms();
    }

    /**
     * Access the push notification channel directly.
     */
    protected function push(): PushChannel
    {
        return $this->notifications->push();
    }

    /**
     * Access any registered channel by name.
     */
    protected function channel(string $name): ChannelInterface
    {
        return $this->notifications->channel($name);
    }

    /**
     * Helper to dispatch an email notification.
     *
     * @param string|list<string> $to
     */
    protected function sendEmail(
        string|array $to,
        Mailable $mailable,
        ?string $settingKey = null,
        bool $sync = false,
    ): bool {
        return $this->notifications->sendEmail($to, $mailable, $settingKey, $sync);
    }

    /**
     * Helper to dispatch an SMS notification.
     */
    protected function sendSms(
        string $to,
        string $message,
        ?string $settingKey = null,
        bool $sync = false,
    ): bool {
        return $this->notifications->sendSms($to, $message, $settingKey, $sync);
    }

    /**
     * Helper to dispatch a Push or In-App notification.
     *
     * @param array<string, mixed> $payload
     */
    protected function sendPush(
        string|int $recipientId,
        string $title,
        string $body,
        array $payload = [],
        ?string $settingKey = null,
        bool $sync = false,
    ): bool {
        return $this->notifications->sendPush($recipientId, $title, $body, $payload, $settingKey, $sync);
    }

    /**
     * Get the store administrator's alert email address or addresses.
     *
     * @return string|list<string>
     */
    protected function adminEmail(): string|array
    {
        return $this->notifications->adminEmail();
    }

    /**
     * Get store information to embed across notification channels.
     *
     * @return array{
     *     name: string,
     *     legal_name: string,
     *     email: string,
     *     phone: string,
     *     address: string,
     *     currency: string,
     *     website_url: string,
     *     logo_url: string|null
     * }
     */
    protected function storeInfo(): array
    {
        return $this->notifications->getStoreInfo();
    }
}

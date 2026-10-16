<?php

declare(strict_types=1);

namespace App\Services\Channels;

use App\Jobs\SendPushNotificationJob;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;

class PushChannel implements ChannelInterface
{
    /**
     * Get the unique identifier for this channel.
     */
    public function name(): string
    {
        return 'push';
    }

    /**
     * Determine whether push / in-app notifications are globally enabled.
     */
    public function isPushEnabled(): bool
    {
        return (bool) Setting::get('enable_in_app_notifications', true);
    }

    /**
     * Determine whether push notifications are enabled globally and for a specific key.
     */
    public function isEnabled(?string $settingKey = null): bool
    {
        if ($settingKey !== null && ! (bool) Setting::get($settingKey, true)) {
            return false;
        }

        return $this->isPushEnabled();
    }

    /**
     * Dispatch a Push / In-App notification to the queue or execute synchronously.
     *
     * @param array<string, mixed> $payload
     */
    public function send(
        string|int $recipientId,
        string $title,
        string $body,
        array $payload = [],
        ?string $settingKey = null,
        bool $sync = false,
    ): bool {
        if (! $this->isEnabled($settingKey)) {
            Log::info("Push notification skipped: setting '{$settingKey}' or push is disabled.", [
                'recipient' => $recipientId,
                'title' => $title,
            ]);

            return false;
        }

        $sync
            ? SendPushNotificationJob::dispatchSync($recipientId, $title, $body, $payload)
            : SendPushNotificationJob::dispatch($recipientId, $title, $body, $payload);

        return true;
    }

    /**
     * Deliver the push / in-app notification (called by SendPushNotificationJob during queue processing).
     *
     * @param array<string, mixed> $payload
     */
    public function deliver(
        string|int $recipientId,
        string $title,
        string $body,
        array $payload = [],
    ): bool {
        if (! $this->isPushEnabled()) {
            Log::info('Push notification skipped: enable_in_app_notifications is disabled.', [
                'recipient' => $recipientId,
                'title' => $title,
            ]);

            return false;
        }

        Log::info('Push notification dispatched.', [
            'recipient' => $recipientId,
            'title' => $title,
            'body' => $body,
            'payload' => $payload,
        ]);

        return true;
    }
}

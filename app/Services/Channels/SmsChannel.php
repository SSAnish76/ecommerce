<?php

declare(strict_types=1);

namespace App\Services\Channels;

use App\Enums\Setting\SmsProvider;
use App\Jobs\SendSmsJob;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;

class SmsChannel implements ChannelInterface
{
    /**
     * Get the unique identifier for this channel.
     */
    public function name(): string
    {
        return 'sms';
    }

    /**
     * Determine whether SMS notifications are globally enabled.
     */
    public function isSmsEnabled(): bool
    {
        return (bool) Setting::get('enable_order_sms_notifications', false);
    }

    /**
     * Determine whether SMS notifications are enabled globally and for a specific key.
     */
    public function isEnabled(?string $settingKey = null): bool
    {
        if ($settingKey !== null && ! (bool) Setting::get($settingKey, true)) {
            return false;
        }

        return $this->isSmsEnabled();
    }

    /**
     * Dispatch an SMS notification to the queue or execute synchronously.
     */
    public function send(
        string $to,
        string $message,
        ?string $settingKey = null,
        bool $sync = false,
    ): bool {
        if (! $this->isEnabled($settingKey)) {
            Log::info("SMS notification skipped: setting '{$settingKey}' or SMS is disabled.", [
                'recipient' => $to,
            ]);

            return false;
        }

        $cleanRecipient = trim($to);
        if ($cleanRecipient === '') {
            return false;
        }

        $sync
            ? SendSmsJob::dispatchSync($cleanRecipient, $message)
            : SendSmsJob::dispatch($cleanRecipient, $message);

        return true;
    }

    /**
     * Deliver the SMS message via provider (called by SendSmsJob during queue processing).
     */
    public function deliver(string $to, string $message): bool
    {
        if (! $this->isSmsEnabled()) {
            Log::info('SMS notification skipped: enable_order_sms_notifications is disabled.', [
                'recipient' => $to,
            ]);

            return false;
        }

        $sms = Setting::getSmsSettings();

        Log::info('Dispatching SMS notification via configured provider.', [
            'provider' => $sms['provider'],
            'from' => $sms['from_number'],
            'to' => $to,
            'message_length' => strlen($message),
        ]);

        return true;
    }
}

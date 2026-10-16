<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Setting;
use App\Models\Store;
use App\Services\Channels\ChannelInterface;
use App\Services\Channels\EmailChannel;
use App\Services\Channels\PushChannel;
use App\Services\Channels\SmsChannel;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Config;
use InvalidArgumentException;

class NotificationDispatcher
{
    /**
     * Map of registered notification channel instances.
     *
     * @var array<string, ChannelInterface>
     */
    protected array $channels = [];

    /**
     * In-memory cache for store information across calls.
     *
     * @var array{
     *     name: string,
     *     legal_name: string,
     *     email: string,
     *     phone: string,
     *     address: string,
     *     currency: string,
     *     website_url: string,
     *     logo_url: string|null
     * }|null
     */
    private ?array $storeInfoCache = null;

    /**
     * In-memory cache for admin alert email address.
     */
    private ?string $adminEmailCache = null;

    /**
     * Create a new notification dispatcher instance.
     */
    public function __construct(
        EmailChannel $email,
        SmsChannel $sms,
        PushChannel $push,
    ) {
        $this->register($email);
        $this->register($sms);
        $this->register($push);
    }

    /**
     * Register a notification channel.
     */
    public function register(ChannelInterface $channel): self
    {
        $this->channels[$channel->name()] = $channel;

        return $this;
    }

    /**
     * Determine whether a channel is registered.
     */
    public function has(string $name): bool
    {
        return isset($this->channels[$name]);
    }

    /**
     * Get a registered channel by name.
     *
     * @throws InvalidArgumentException
     */
    public function channel(string $name): ChannelInterface
    {
        return $this->channels[$name] ?? throw new InvalidArgumentException("Notification channel [{$name}] is not registered.");
    }

    /**
     * Access the email channel directly.
     */
    public function email(): EmailChannel
    {
        /** @var EmailChannel */
        return $this->channel('email');
    }

    /**
     * Access the SMS channel directly.
     */
    public function sms(): SmsChannel
    {
        /** @var SmsChannel */
        return $this->channel('sms');
    }

    /**
     * Access the push notification channel directly.
     */
    public function push(): PushChannel
    {
        /** @var PushChannel */
        return $this->channel('push');
    }

    /**
     * Get all registered channels.
     *
     * @return array<string, ChannelInterface>
     */
    public function all(): array
    {
        return $this->channels;
    }

    /**
     * Alias to get this dispatcher managing channels.
     */
    public function channels(): self
    {
        return $this;
    }

    /**
     * Get the configured administrator alert email address (memoized).
     */
    public function adminEmail(): string
    {
        return $this->adminEmailCache ??= $this->email()->getAdminAlertEmail();
    }

    /**
     * Get store information across notification channels (memoized).
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
    public function getStoreInfo(): array
    {
        if ($this->storeInfoCache !== null) {
            return $this->storeInfoCache;
        }

        $store = Store::current();

        $addressParts = array_filter([
            $store->address_line1,
            $store->address_line2,
            $store->city,
            $store->state,
            $store->postal_code,
            $store->country,
        ]);

        return $this->storeInfoCache = [
            'name' => $store->name ?: (string) Config::get('app.name', 'E-Commerce Store'),
            'legal_name' => $store->legal_name ?: ($store->name ?: 'E-Commerce Inc.'),
            'email' => $store->email ?: 'support@store.com',
            'phone' => $store->phone ?: '',
            'address' => implode(', ', $addressParts),
            'currency' => $store->currency ?: (string) Setting::get('currency_symbol', '$'),
            'website_url' => $store->website_url ?: url('/'),
            'logo_url' => $store->logo_url,
        ];
    }

    /**
     * Flush in-memory runtime caches.
     */
    public function flushCache(): void
    {
        $this->storeInfoCache = null;
        $this->adminEmailCache = null;
    }

    /**
     * Helper to dispatch an email notification.
     *
     * @param string|list<string> $to
     */
    public function sendEmail(
        string|array $to,
        Mailable $mailable,
        ?string $settingKey = null,
        bool $sync = false,
    ): bool {
        return $this->email()->send($to, $mailable, $settingKey, $sync);
    }

    /**
     * Helper to dispatch an SMS notification.
     */
    public function sendSms(
        string $to,
        string $message,
        ?string $settingKey = null,
        bool $sync = false,
    ): bool {
        return $this->sms()->send($to, $message, $settingKey, $sync);
    }

    /**
     * Helper to dispatch a Push / In-App notification.
     *
     * @param array<string, mixed> $payload
     */
    public function sendPush(
        string|int $recipientId,
        string $title,
        string $body,
        array $payload = [],
        ?string $settingKey = null,
        bool $sync = false,
    ): bool {
        return $this->push()->send($recipientId, $title, $body, $payload, $settingKey, $sync);
    }
}

<?php

declare(strict_types=1);

namespace App\Services\Channels;

use App\Jobs\SendEmailJob;
use App\Models\Setting;
use App\Models\Store;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailChannel implements ChannelInterface
{
    /**
     * Get the unique identifier for this channel.
     */
    public function name(): string
    {
        return 'email';
    }

    /**
     * Determine whether email notifications are globally enabled.
     */
    public function isEmailNotificationEnabled(): bool
    {
        return (bool) Setting::get('enable_email_notifications', true);
    }

    /**
     * Determine whether a specific notification setting type is enabled.
     */
    public function isNotificationEnabled(string $settingKey, bool $default = true): bool
    {
        if (! $this->isEmailNotificationEnabled()) {
            return false;
        }

        return (bool) Setting::get($settingKey, $default);
    }

    /**
     * Determine whether email notifications are enabled globally and for a specific key.
     */
    public function isEnabled(?string $settingKey = null): bool
    {
        if (! $this->isEmailNotificationEnabled()) {
            return false;
        }

        if ($settingKey !== null && ! $this->isNotificationEnabled($settingKey)) {
            return false;
        }

        return true;
    }

    /**
     * Get the configured administrator alert email address.
     */
    public function getAdminAlertEmail(): string
    {
        $email = (string) Setting::get('admin_alert_email', '');

        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $email;
        }

        $storeEmail = (string) Store::current()->email;
        if ($storeEmail !== '' && filter_var($storeEmail, FILTER_VALIDATE_EMAIL)) {
            return $storeEmail;
        }

        return (string) Config::get('mail.from.address', 'admin@example.com');
    }

    /**
     * Get system sender name and address.
     *
     * @return array{address: string, name: string}
     */
    public function getSenderDetails(): array
    {
        $mail = Setting::getMailSettings();

        $name = $mail['from_name'];
        if ($name === '') {
            $name = (string) Store::current()->name;
        }
        if ($name === '') {
            $name = (string) Config::get('mail.from.name', config('app.name', 'E-Commerce Store'));
        }

        $address = $mail['from_address'];
        if ($address === '' || ! filter_var($address, FILTER_VALIDATE_EMAIL)) {
            $address = (string) Config::get('mail.from.address', 'noreply@example.com');
        }

        return [
            'address' => $address,
            'name' => $name,
        ];
    }

    /**
     * Apply runtime mail configuration from database settings.
     */
    public function applyRuntimeMailSettings(): void
    {
        if (app()->runningUnitTests()) {
            return;
        }

        $mail = Setting::getMailSettings();

        if ($mail['mailer'] !== '') {
            Config::set('mail.default', $mail['mailer']);
        }

        if ($mail['host'] !== '') {
            Config::set('mail.mailers.smtp.host', $mail['host']);
        }

        if ($mail['port'] > 0) {
            Config::set('mail.mailers.smtp.port', $mail['port']);
        }

        if ($mail['username'] !== '') {
            Config::set('mail.mailers.smtp.username', $mail['username']);
        }

        if ($mail['password'] !== '') {
            Config::set('mail.mailers.smtp.password', $mail['password']);
        }

        $scheme = match (strtolower((string) $mail['encryption'])) {
            'ssl', 'smtps' => 'smtps',
            default => null,
        };
        Config::set('mail.mailers.smtp.scheme', $scheme);

        $sender = $this->getSenderDetails();
        Config::set('mail.from.address', $sender['address']);
        Config::set('mail.from.name', $sender['name']);
    }

    /**
     * Dispatch an email notification to the queue or execute synchronously.
     *
     * @param string|list<string> $to
     */
    public function send(
        string|array $to,
        Mailable $mailable,
        ?string $settingKey = null,
        bool $sync = false,
    ): bool {
        if (! $this->isEnabled($settingKey)) {
            Log::info("Email notification skipped: setting '{$settingKey}' or email is disabled.", [
                'recipient' => $to,
                'mailable' => get_class($mailable),
            ]);

            return false;
        }

        if (is_string($to) && ! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        if (is_array($to)) {
            $validRecipients = array_filter(
                $to,
                static fn ($email): bool => is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL) !== false,
            );

            if (empty($validRecipients)) {
                return false;
            }
        }

        $sync
            ? SendEmailJob::dispatchSync($to, $mailable)
            : SendEmailJob::dispatch($to, $mailable);

        return true;
    }

    /**
     * Deliver the email message (called by SendEmailJob during queue processing).
     *
     * @param string|list<string> $to
     */
    public function deliver(string|array $to, Mailable $mailable): void
    {
        if (! $this->isEmailNotificationEnabled()) {
            Log::info('SendEmailJob skipped: Email notifications are globally disabled in settings.', [
                'recipient' => $to,
                'mailable' => get_class($mailable),
            ]);

            return;
        }

        $this->applyRuntimeMailSettings();

        Mail::to($to)->send($mailable);

        Log::info('Email sent successfully via queued job.', [
            'recipient' => $to,
            'mailable' => get_class($mailable),
        ]);
    }
}

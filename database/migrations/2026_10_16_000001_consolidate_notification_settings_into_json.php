<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('settings')) {
            return;
        }

        $mailKeys = [
            'mail_mailer' => 'mailer',
            'mail_host' => 'host',
            'mail_port' => 'port',
            'mail_username' => 'username',
            'mail_password' => 'password',
            'mail_encryption' => 'encryption',
            'mail_from_name' => 'from_name',
            'mail_from_address' => 'from_address',
        ];

        $existingMailRows = DB::table('settings')
            ->whereIn('key', array_keys($mailKeys))
            ->pluck('value', 'key');

        $mailConfig = [
            'mailer' => (string) ($existingMailRows['mail_mailer'] ?? 'smtp'),
            'host' => (string) ($existingMailRows['mail_host'] ?? 'smtp.mailtrap.io'),
            'port' => isset($existingMailRows['mail_port']) ? (int) $existingMailRows['mail_port'] : 587,
            'username' => (string) ($existingMailRows['mail_username'] ?? 'store_smtp_user'),
            'password' => (string) ($existingMailRows['mail_password'] ?? 'secret_smtp_pass'),
            'encryption' => (string) ($existingMailRows['mail_encryption'] ?? 'tls'),
            'from_name' => (string) ($existingMailRows['mail_from_name'] ?? 'E-Commerce Store'),
            'from_address' => (string) ($existingMailRows['mail_from_address'] ?? 'notifications@example.com'),
        ];

        DB::table('settings')->updateOrInsert(
            ['key' => 'mail_settings'],
            [
                'value' => json_encode($mailConfig, JSON_THROW_ON_ERROR),
                'group' => 'notifications',
                'type' => 'json',
                'label' => 'Email Notification & SMTP Configuration',
                'description' => 'Configured mail driver, SMTP credentials, encryption, and outbound sender headers',
                'updated_at' => now(),
            ]
        );

        DB::table('settings')->whereIn('key', array_keys($mailKeys))->delete();

        $smsKeys = [
            'sms_provider' => 'provider',
            'sms_username' => 'username',
            'sms_password' => 'password',
            'sms_from_number' => 'from_number',
        ];

        $existingSmsRows = DB::table('settings')
            ->whereIn('key', array_keys($smsKeys))
            ->pluck('value', 'key');

        $smsConfig = [
            'provider' => (string) ($existingSmsRows['sms_provider'] ?? 'twilio'),
            'username' => (string) ($existingSmsRows['sms_username'] ?? 'AC_twilio_account_sid_sample'),
            'password' => (string) ($existingSmsRows['sms_password'] ?? 'secret_sms_auth_token'),
            'from_number' => (string) ($existingSmsRows['sms_from_number'] ?? '+15550192834'),
        ];

        DB::table('settings')->updateOrInsert(
            ['key' => 'sms_settings'],
            [
                'value' => json_encode($smsConfig, JSON_THROW_ON_ERROR),
                'group' => 'notifications',
                'type' => 'json',
                'label' => 'SMS Gateway Provider & API Credentials',
                'description' => 'Provider credentials, API keys, secrets, and approved sender ID for customer SMS',
                'updated_at' => now(),
            ]
        );

        DB::table('settings')->whereIn('key', array_keys($smsKeys))->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('settings')) {
            return;
        }

        $mailRow = DB::table('settings')->where('key', 'mail_settings')->first();
        if ($mailRow && $mailRow->value) {
            $mailConfig = json_decode((string) $mailRow->value, true) ?: [];

            $rows = [
                ['key' => 'mail_mailer', 'value' => $mailConfig['mailer'] ?? 'smtp', 'type' => 'string', 'label' => 'Mail Transport Protocol'],
                ['key' => 'mail_host', 'value' => $mailConfig['host'] ?? 'smtp.mailtrap.io', 'type' => 'string', 'label' => 'SMTP Host Server'],
                ['key' => 'mail_port', 'value' => (string) ($mailConfig['port'] ?? 587), 'type' => 'integer', 'label' => 'SMTP Port'],
                ['key' => 'mail_username', 'value' => $mailConfig['username'] ?? '', 'type' => 'string', 'label' => 'SMTP Username'],
                ['key' => 'mail_password', 'value' => $mailConfig['password'] ?? '', 'type' => 'string', 'label' => 'SMTP Password'],
                ['key' => 'mail_encryption', 'value' => $mailConfig['encryption'] ?? 'tls', 'type' => 'string', 'label' => 'SMTP Encryption'],
                ['key' => 'mail_from_name', 'value' => $mailConfig['from_name'] ?? 'E-Commerce Store', 'type' => 'string', 'label' => 'Email Sender Name'],
                ['key' => 'mail_from_address', 'value' => $mailConfig['from_address'] ?? 'notifications@example.com', 'type' => 'string', 'label' => 'Email Sender Address'],
            ];

            foreach ($rows as $row) {
                DB::table('settings')->updateOrInsert(
                    ['key' => $row['key']],
                    array_merge($row, ['group' => 'notifications', 'updated_at' => now()])
                );
            }

            DB::table('settings')->where('key', 'mail_settings')->delete();
        }

        $smsRow = DB::table('settings')->where('key', 'sms_settings')->first();
        if ($smsRow && $smsRow->value) {
            $smsConfig = json_decode((string) $smsRow->value, true) ?: [];

            $rows = [
                ['key' => 'sms_provider', 'value' => $smsConfig['provider'] ?? 'twilio', 'type' => 'string', 'label' => 'SMS Gateway Provider'],
                ['key' => 'sms_username', 'value' => $smsConfig['username'] ?? '', 'type' => 'string', 'label' => 'SMS Account SID / API Key'],
                ['key' => 'sms_password', 'value' => $smsConfig['password'] ?? '', 'type' => 'string', 'label' => 'SMS Auth Token / Secret'],
                ['key' => 'sms_from_number', 'value' => $smsConfig['from_number'] ?? '', 'type' => 'string', 'label' => 'SMS Outbound Sender Number'],
            ];

            foreach ($rows as $row) {
                DB::table('settings')->updateOrInsert(
                    ['key' => $row['key']],
                    array_merge($row, ['group' => 'notifications', 'updated_at' => now()])
                );
            }

            DB::table('settings')->where('key', 'sms_settings')->delete();
        }
    }
};

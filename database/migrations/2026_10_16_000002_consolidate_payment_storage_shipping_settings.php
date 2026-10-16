<?php

declare(strict_types=1);

use App\Models\Setting;
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

        // 1. Consolidate Payment Gateways & Methods
        $legacyPayments = DB::table('settings')
            ->whereIn('key', [
                'payment_cod_enabled',
                'payment_stripe_enabled',
                'payment_paypal_enabled',
                'payment_bank_transfer_enabled',
            ])
            ->pluck('value', 'key');

        $paymentConfig = [
            'stripe' => [
                'enabled' => filter_var($legacyPayments['payment_stripe_enabled'] ?? '1', FILTER_VALIDATE_BOOLEAN),
                'publishable_key' => 'pk_test_sample_stripe_publishable_key',
                'secret_key' => Setting::encryptSensitive('sk_test_sample_stripe_secret_key'),
                'webhook_secret' => Setting::encryptSensitive('whsec_sample_webhook_secret'),
            ],
            'paypal' => [
                'enabled' => filter_var($legacyPayments['payment_paypal_enabled'] ?? '1', FILTER_VALIDATE_BOOLEAN),
                'mode' => 'sandbox',
                'client_id' => 'sample_paypal_client_id',
                'client_secret' => Setting::encryptSensitive('sample_paypal_client_secret'),
            ],
            'cod' => [
                'enabled' => filter_var($legacyPayments['payment_cod_enabled'] ?? '1', FILTER_VALIDATE_BOOLEAN),
                'instructions' => 'Pay cash to delivery courier on parcel arrival.',
            ],
            'bank_transfer' => [
                'enabled' => filter_var($legacyPayments['payment_bank_transfer_enabled'] ?? '0', FILTER_VALIDATE_BOOLEAN),
                'bank_name' => 'First National Commercial Bank',
                'account_name' => 'Store Retail Operations LLC',
                'account_number' => '1234567890',
                'routing_number' => '021000021',
                'swift_code' => 'FNALUS33',
                'instructions' => 'Please include your Order ID as the wire transfer reference.',
            ],
        ];

        DB::table('settings')->updateOrInsert(
            ['key' => 'payment_settings'],
            [
                'value' => json_encode($paymentConfig, JSON_THROW_ON_ERROR),
                'group' => 'payment',
                'type' => 'json',
                'label' => 'Payment Gateway Configurations',
                'description' => 'Configured payment providers, credentials, webhooks, and manual checkout methods',
                'updated_at' => now(),
            ]
        );

        DB::table('settings')->whereIn('key', [
            'payment_cod_enabled',
            'payment_stripe_enabled',
            'payment_paypal_enabled',
            'payment_bank_transfer_enabled',
        ])->delete();

        // 2. Storage Settings
        $storageConfig = [
            'default_disk' => 'public',
            's3' => [
                'key' => 'AKIAIOSFODNN7EXAMPLE',
                'secret' => Setting::encryptSensitive('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'),
                'region' => 'us-east-1',
                'bucket' => 'store-production-uploads',
                'url' => '',
                'endpoint' => '',
            ],
        ];

        DB::table('settings')->updateOrInsert(
            ['key' => 'storage_settings'],
            [
                'value' => json_encode($storageConfig, JSON_THROW_ON_ERROR),
                'group' => 'storage',
                'type' => 'json',
                'label' => 'Storage & File Delivery',
                'description' => 'Default asset filesystem disk and Amazon S3 or S3-compatible cloud credentials',
                'updated_at' => now(),
            ]
        );

        // 3. Shipping Settings
        $shippingConfig = [
            'default_method' => 'flat_rate',
            'flat_rate' => [
                'cost' => 10.00,
            ],
            'free_shipping' => [
                'enabled' => true,
                'min_order_amount' => 100.00,
            ],
            'carrier' => [
                'provider' => 'none',
                'account_number' => '',
                'api_key' => '',
                'api_secret' => Setting::encryptSensitive(''),
            ],
        ];

        DB::table('settings')->updateOrInsert(
            ['key' => 'shipping_settings'],
            [
                'value' => json_encode($shippingConfig, JSON_THROW_ON_ERROR),
                'group' => 'shipping',
                'type' => 'json',
                'label' => 'Shipping & Delivery Rates',
                'description' => 'Standard shipping rates, free delivery thresholds, and live courier carrier API settings',
                'updated_at' => now(),
            ]
        );

        // 4. Ensure existing mail and sms passwords are encrypted at rest
        $mailRow = DB::table('settings')->where('key', 'mail_settings')->first();
        if ($mailRow && $mailRow->value) {
            $mail = json_decode((string) $mailRow->value, true) ?: [];
            if (! empty($mail['password']) && ! str_starts_with($mail['password'], 'enc:')) {
                $mail['password'] = Setting::encryptSensitive($mail['password']);
                DB::table('settings')->where('key', 'mail_settings')->update([
                    'value' => json_encode($mail, JSON_THROW_ON_ERROR),
                    'updated_at' => now(),
                ]);
            }
        }

        $smsRow = DB::table('settings')->where('key', 'sms_settings')->first();
        if ($smsRow && $smsRow->value) {
            $sms = json_decode((string) $smsRow->value, true) ?: [];
            if (! empty($sms['password']) && ! str_starts_with($sms['password'], 'enc:')) {
                $sms['password'] = Setting::encryptSensitive($sms['password']);
                DB::table('settings')->where('key', 'sms_settings')->update([
                    'value' => json_encode($sms, JSON_THROW_ON_ERROR),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('settings')) {
            return;
        }

        $payRow = DB::table('settings')->where('key', 'payment_settings')->first();
        if ($payRow && $payRow->value) {
            $pay = json_decode((string) $payRow->value, true) ?: [];

            $rows = [
                ['key' => 'payment_cod_enabled', 'value' => ($pay['cod']['enabled'] ?? true) ? '1' : '0', 'type' => 'boolean', 'label' => 'Cash on Delivery (COD)'],
                ['key' => 'payment_stripe_enabled', 'value' => ($pay['stripe']['enabled'] ?? true) ? '1' : '0', 'type' => 'boolean', 'label' => 'Credit / Debit Card (Stripe)'],
                ['key' => 'payment_paypal_enabled', 'value' => ($pay['paypal']['enabled'] ?? true) ? '1' : '0', 'type' => 'boolean', 'label' => 'PayPal Checkout'],
                ['key' => 'payment_bank_transfer_enabled', 'value' => ($pay['bank_transfer']['enabled'] ?? false) ? '1' : '0', 'type' => 'boolean', 'label' => 'Direct Bank Wire Transfer'],
            ];

            foreach ($rows as $row) {
                DB::table('settings')->updateOrInsert(
                    ['key' => $row['key']],
                    array_merge($row, ['group' => 'payment', 'updated_at' => now()])
                );
            }

            DB::table('settings')->where('key', 'payment_settings')->delete();
        }

        DB::table('settings')->whereIn('key', ['storage_settings', 'shipping_settings'])->delete();
    }
};

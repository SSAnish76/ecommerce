<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\Product\StockVisibility;
use App\Enums\Setting\CurrencyPosition;
use App\Enums\Setting\MailDriver;
use App\Enums\Setting\MailEncryption;
use App\Enums\Setting\SmsProvider;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\Constants;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    /**
     * Display the comprehensive store and platform settings page.
     */
    public function index(): Response
    {
        return Inertia::render('Admin/Settings', [
            'settings' => Setting::getAllKeyValues(),
            'timezones' => Constants::timezones(),
            'currencies' => Constants::currencies(),
        ]);
    }

    /**
     * Update e-commerce and system settings.
     */
    public function update(Request $request): RedirectResponse
    {
        /** @var array<string, mixed> $input */
        $input = $request->validate([
            'currency_code' => ['required', 'string', 'max:10'],
            'currency_symbol' => ['required', 'string', 'max:10'],
            'currency_position' => ['required', Rule::enum(CurrencyPosition::class)],
            'currency_decimals' => ['required', 'integer', 'min:0', 'max:4'],
            'timezone' => ['required', 'string', 'max:80'],
            'date_format' => ['required', 'string', 'max:30'],
            'time_format' => ['required', 'string', 'max:30'],

            'force_two_factor_all_admins' => ['required', 'boolean'],
            'session_lifetime_minutes' => ['required', 'integer', 'min:15', 'max:1440'],
            'max_login_attempts' => ['required', 'integer', 'min:3', 'max:20'],
            'lockout_duration_minutes' => ['required', 'integer', 'min:1', 'max:180'],
            'require_strong_passwords' => ['required', 'boolean'],

            'order_prefix' => ['required', 'string', 'max:20'],
            'order_number_start' => ['required', 'integer', 'min:1'],
            'min_order_amount' => ['required', 'numeric', 'min:0'],
            'allow_customer_cancellation' => ['required', 'boolean'],

            'low_stock_threshold' => ['required', 'integer', 'min:0'],
            'out_of_stock_visibility' => ['required', Rule::enum(StockVisibility::class)],
            'enable_customer_reviews' => ['required', 'boolean'],
            'auto_approve_reviews' => ['required', 'boolean'],

            'payment_cod_enabled' => ['sometimes', 'boolean'],
            'payment_stripe_enabled' => ['sometimes', 'boolean'],
            'payment_stripe_publishable_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_stripe_secret_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_stripe_webhook_secret' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_paypal_enabled' => ['sometimes', 'boolean'],
            'payment_paypal_mode' => ['sometimes', 'nullable', 'string', 'in:sandbox,live'],
            'payment_paypal_client_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_paypal_client_secret' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_bank_transfer_enabled' => ['sometimes', 'boolean'],
            'payment_bank_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'payment_bank_account_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'payment_bank_account_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'payment_bank_routing_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'payment_bank_swift_code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'payment_bank_instructions' => ['sometimes', 'nullable', 'string', 'max:500'],

            'storage_default_disk' => ['sometimes', 'nullable', 'string', 'in:local,public,s3'],
            'storage_s3_key' => ['sometimes', 'nullable', 'string', 'max:150'],
            'storage_s3_secret' => ['sometimes', 'nullable', 'string', 'max:255'],
            'storage_s3_region' => ['sometimes', 'nullable', 'string', 'max:80'],
            'storage_s3_bucket' => ['sometimes', 'nullable', 'string', 'max:150'],
            'storage_s3_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'storage_s3_endpoint' => ['sometimes', 'nullable', 'string', 'max:255'],

            'shipping_default_method' => ['sometimes', 'nullable', 'string', 'max:50'],
            'shipping_flat_rate_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'shipping_free_shipping_enabled' => ['sometimes', 'boolean'],
            'shipping_free_shipping_min_order' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'shipping_carrier_provider' => ['sometimes', 'nullable', 'string', 'max:50'],
            'shipping_carrier_account_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'shipping_carrier_api_key' => ['sometimes', 'nullable', 'string', 'max:150'],
            'shipping_carrier_api_secret' => ['sometimes', 'nullable', 'string', 'max:255'],

            'mail_mailer' => ['sometimes', 'nullable', 'string', Rule::enum(MailDriver::class)],
            'mail_host' => ['sometimes', 'nullable', 'string', 'max:150'],
            'mail_port' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:65535'],
            'mail_username' => ['sometimes', 'nullable', 'string', 'max:150'],
            'mail_password' => ['sometimes', 'nullable', 'string', 'max:255'],
            'mail_encryption' => ['sometimes', 'nullable', 'string', Rule::enum(MailEncryption::class)],

            'sms_provider' => ['sometimes', 'nullable', 'string', Rule::enum(SmsProvider::class)],
            'sms_username' => ['sometimes', 'nullable', 'string', 'max:150'],
            'sms_password' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sms_from_number' => ['sometimes', 'nullable', 'string', 'max:50'],

            'mail_from_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'mail_from_address' => ['sometimes', 'nullable', 'email', 'max:120'],
            'admin_alert_email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'enable_email_notifications' => ['sometimes', 'boolean'],
            'enable_in_app_notifications' => ['sometimes', 'boolean'],
            'enable_order_sms_notifications' => ['sometimes', 'boolean'],
            'notify_order_placed_customer' => ['sometimes', 'boolean'],
            'notify_order_placed_admin' => ['sometimes', 'boolean'],
            'notify_order_status_updated' => ['sometimes', 'boolean'],
            'notify_order_cancelled' => ['sometimes', 'boolean'],
            'notify_low_stock_admin' => ['sometimes', 'boolean'],
            'notify_new_customer_welcome' => ['sometimes', 'boolean'],
            'notify_new_review_admin' => ['sometimes', 'boolean'],

            'maintenance_mode' => ['required', 'boolean'],
            'maintenance_notice' => ['nullable', 'string', 'max:500'],
            'allow_admin_bypass_maintenance' => ['required', 'boolean'],
        ]);

        // 1. Bundle Payment Gateways & Methods
        $paymentKeys = [
            'payment_cod_enabled', 'payment_stripe_enabled', 'payment_stripe_publishable_key', 'payment_stripe_secret_key', 'payment_stripe_webhook_secret',
            'payment_paypal_enabled', 'payment_paypal_mode', 'payment_paypal_client_id', 'payment_paypal_client_secret',
            'payment_bank_transfer_enabled', 'payment_bank_name', 'payment_bank_account_name', 'payment_bank_account_number', 'payment_bank_routing_number', 'payment_bank_swift_code', 'payment_bank_instructions',
        ];

        $existingPayment = Setting::getPaymentSettings();
        $paymentSettings = [
            'stripe' => [
                'enabled' => isset($input['payment_stripe_enabled']) ? (bool) $input['payment_stripe_enabled'] : $existingPayment['stripe']['enabled'],
                'publishable_key' => $input['payment_stripe_publishable_key'] ?? $existingPayment['stripe']['publishable_key'],
                'secret_key' => ! empty($input['payment_stripe_secret_key']) ? $input['payment_stripe_secret_key'] : $existingPayment['stripe']['secret_key'],
                'webhook_secret' => ! empty($input['payment_stripe_webhook_secret']) ? $input['payment_stripe_webhook_secret'] : $existingPayment['stripe']['webhook_secret'],
            ],
            'paypal' => [
                'enabled' => isset($input['payment_paypal_enabled']) ? (bool) $input['payment_paypal_enabled'] : $existingPayment['paypal']['enabled'],
                'mode' => $input['payment_paypal_mode'] ?? $existingPayment['paypal']['mode'],
                'client_id' => $input['payment_paypal_client_id'] ?? $existingPayment['paypal']['client_id'],
                'client_secret' => ! empty($input['payment_paypal_client_secret']) ? $input['payment_paypal_client_secret'] : $existingPayment['paypal']['client_secret'],
            ],
            'cod' => [
                'enabled' => isset($input['payment_cod_enabled']) ? (bool) $input['payment_cod_enabled'] : $existingPayment['cod']['enabled'],
                'instructions' => $input['payment_cod_instructions'] ?? $existingPayment['cod']['instructions'],
            ],
            'bank_transfer' => [
                'enabled' => isset($input['payment_bank_transfer_enabled']) ? (bool) $input['payment_bank_transfer_enabled'] : $existingPayment['bank_transfer']['enabled'],
                'bank_name' => $input['payment_bank_name'] ?? $existingPayment['bank_transfer']['bank_name'],
                'account_name' => $input['payment_bank_account_name'] ?? $existingPayment['bank_transfer']['account_name'],
                'account_number' => $input['payment_bank_account_number'] ?? $existingPayment['bank_transfer']['account_number'],
                'routing_number' => $input['payment_bank_routing_number'] ?? $existingPayment['bank_transfer']['routing_number'],
                'swift_code' => $input['payment_bank_swift_code'] ?? $existingPayment['bank_transfer']['swift_code'],
                'instructions' => $input['payment_bank_instructions'] ?? $existingPayment['bank_transfer']['instructions'],
            ],
        ];

        // 2. Bundle Storage Settings
        $storageKeys = [
            'storage_default_disk', 'storage_s3_key', 'storage_s3_secret', 'storage_s3_region', 'storage_s3_bucket', 'storage_s3_url', 'storage_s3_endpoint',
        ];

        $existingStorage = Setting::getStorageSettings();
        $storageSettings = [
            'default_disk' => $input['storage_default_disk'] ?? $existingStorage['default_disk'],
            's3' => [
                'key' => $input['storage_s3_key'] ?? $existingStorage['s3']['key'],
                'secret' => ! empty($input['storage_s3_secret']) ? $input['storage_s3_secret'] : $existingStorage['s3']['secret'],
                'region' => $input['storage_s3_region'] ?? $existingStorage['s3']['region'],
                'bucket' => $input['storage_s3_bucket'] ?? $existingStorage['s3']['bucket'],
                'url' => $input['storage_s3_url'] ?? $existingStorage['s3']['url'],
                'endpoint' => $input['storage_s3_endpoint'] ?? $existingStorage['s3']['endpoint'],
            ],
        ];

        // 3. Bundle Shipping Settings
        $shippingKeys = [
            'shipping_default_method', 'shipping_flat_rate_cost', 'shipping_free_shipping_enabled', 'shipping_free_shipping_min_order',
            'shipping_carrier_provider', 'shipping_carrier_account_number', 'shipping_carrier_api_key', 'shipping_carrier_api_secret',
        ];

        $existingShipping = Setting::getShippingSettings();
        $shippingSettings = [
            'default_method' => $input['shipping_default_method'] ?? $existingShipping['default_method'],
            'flat_rate' => [
                'cost' => isset($input['shipping_flat_rate_cost']) ? (float) $input['shipping_flat_rate_cost'] : $existingShipping['flat_rate']['cost'],
            ],
            'free_shipping' => [
                'enabled' => isset($input['shipping_free_shipping_enabled']) ? (bool) $input['shipping_free_shipping_enabled'] : $existingShipping['free_shipping']['enabled'],
                'min_order_amount' => isset($input['shipping_free_shipping_min_order']) ? (float) $input['shipping_free_shipping_min_order'] : $existingShipping['free_shipping']['min_order_amount'],
            ],
            'carrier' => [
                'provider' => $input['shipping_carrier_provider'] ?? $existingShipping['carrier']['provider'],
                'account_number' => $input['shipping_carrier_account_number'] ?? $existingShipping['carrier']['account_number'],
                'api_key' => $input['shipping_carrier_api_key'] ?? $existingShipping['carrier']['api_key'],
                'api_secret' => ! empty($input['shipping_carrier_api_secret']) ? $input['shipping_carrier_api_secret'] : $existingShipping['carrier']['api_secret'],
            ],
        ];

        // 4. Bundle Notifications (Mail & SMS)
        $mailKeys = ['mail_mailer', 'mail_host', 'mail_port', 'mail_username', 'mail_password', 'mail_encryption', 'mail_from_name', 'mail_from_address'];
        $smsKeys = ['sms_provider', 'sms_username', 'sms_password', 'sms_from_number'];

        $existingMail = Setting::getMailSettings();
        $mailSettings = [
            'mailer' => $input['mail_mailer'] ?? $existingMail['mailer'],
            'host' => $input['mail_host'] ?? $existingMail['host'],
            'port' => isset($input['mail_port']) ? (int) $input['mail_port'] : $existingMail['port'],
            'username' => $input['mail_username'] ?? $existingMail['username'],
            'password' => ! empty($input['mail_password']) ? $input['mail_password'] : $existingMail['password'],
            'encryption' => $input['mail_encryption'] ?? $existingMail['encryption'],
            'from_name' => $input['mail_from_name'] ?? $existingMail['from_name'],
            'from_address' => $input['mail_from_address'] ?? $existingMail['from_address'],
        ];

        $existingSms = Setting::getSmsSettings();
        $smsSettings = [
            'provider' => $input['sms_provider'] ?? $existingSms['provider'],
            'username' => $input['sms_username'] ?? $existingSms['username'],
            'password' => ! empty($input['sms_password']) ? $input['sms_password'] : $existingSms['password'],
            'from_number' => $input['sms_from_number'] ?? $existingSms['from_number'],
        ];

        // Remove legacy individual keys from input so they are not saved as individual rows
        $legacyKeys = array_merge($paymentKeys, $storageKeys, $shippingKeys, $mailKeys, $smsKeys);
        foreach ($legacyKeys as $key) {
            unset($input[$key]);
        }

        // Delete any obsolete individual rows from settings table
        Setting::whereIn('key', $legacyKeys)->delete();

        // Save grouped configurations as json rows (automatically encrypts sensitive keys)
        $input['payment_settings'] = $paymentSettings;
        $input['storage_settings'] = $storageSettings;
        $input['shipping_settings'] = $shippingSettings;
        $input['mail_settings'] = $mailSettings;
        $input['sms_settings'] = $smsSettings;

        Setting::setMany($input);

        return redirect()->back()->with('success', 'Global E-Commerce & Platform settings updated successfully.');
    }
}

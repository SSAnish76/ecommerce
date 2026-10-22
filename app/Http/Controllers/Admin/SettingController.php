<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\Product\StockVisibility;
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
            'currency_code' => ['sometimes', 'required', 'string', 'max:10'],
            'currency_symbol' => ['sometimes', 'required', 'string', 'max:10'],
            'currency_decimals' => ['sometimes', 'required', 'integer', 'min:0', 'max:4'],
            'timezone' => ['sometimes', 'required', 'string', 'max:80'],

            'force_two_factor_all_admins' => ['sometimes', 'required', 'boolean'],

            'order_prefix' => ['sometimes', 'required', 'string', 'max:20'],
            'order_number_start' => ['sometimes', 'required', 'integer', 'min:1'],
            'allow_customer_cancellation' => ['sometimes', 'required', 'boolean'],

            'low_stock_threshold' => ['sometimes', 'required', 'integer', 'min:0'],
            'out_of_stock_visibility' => ['sometimes', 'required', Rule::enum(StockVisibility::class)],
            'enable_customer_reviews' => ['sometimes', 'required', 'boolean'],
            'auto_approve_reviews' => ['sometimes', 'required', 'boolean'],

            'payment_cod_enabled' => ['sometimes', 'boolean'],
            'payment_cod_instructions' => ['sometimes', 'nullable', 'string', 'max:500'],
            'payment_stripe_enabled' => ['sometimes', 'boolean'],
            'payment_stripe_publishable_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_stripe_secret_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_stripe_webhook_secret' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_paypal_enabled' => ['sometimes', 'boolean'],
            'payment_paypal_mode' => ['sometimes', 'nullable', 'string', 'in:sandbox,live'],
            'payment_paypal_client_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_paypal_client_secret' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_razorpay_enabled' => ['sometimes', 'boolean'],
            'payment_razorpay_key_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_razorpay_key_secret' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_razorpay_webhook_secret' => ['sometimes', 'nullable', 'string', 'max:255'],

            'storage_default_disk' => ['sometimes', 'nullable', 'string', 'in:local,public,s3'],
            'storage_s3_key' => ['sometimes', 'nullable', 'string', 'max:150'],
            'storage_s3_secret' => ['sometimes', 'nullable', 'string', 'max:255'],
            'storage_s3_region' => ['sometimes', 'nullable', 'string', 'max:80'],
            'storage_s3_bucket' => ['sometimes', 'nullable', 'string', 'max:150'],
            'storage_s3_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'storage_s3_endpoint' => ['sometimes', 'nullable', 'string', 'max:255'],

            'shipping_carrier_provider' => ['sometimes', 'nullable', 'string', 'max:50'],
            'shipping_carrier_account_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'shipping_carrier_api_key' => ['sometimes', 'nullable', 'string', 'max:150'],
            'shipping_carrier_api_secret' => ['sometimes', 'nullable', 'string', 'max:255'],

            'mail_host' => ['sometimes', 'nullable', 'string', 'max:150'],
            'mail_port' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:65535'],
            'mail_username' => ['sometimes', 'nullable', 'string', 'max:150'],
            'mail_password' => ['sometimes', 'nullable', 'string', 'max:255'],
            'mail_encryption' => ['sometimes', 'nullable', 'string', Rule::enum(MailEncryption::class)],
            'mail_from_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'mail_from_address' => ['sometimes', 'nullable', 'email', 'max:120'],

            'sms_provider' => ['sometimes', 'nullable', 'string', Rule::enum(SmsProvider::class)],
            'sms_username' => ['sometimes', 'nullable', 'string', 'max:150'],
            'sms_password' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sms_from_number' => ['sometimes', 'nullable', 'string', 'max:50'],

            'enable_order_sms_notifications' => ['sometimes', 'boolean'],
            'notify_order_placed_customer' => ['sometimes', 'boolean'],
            'notify_order_placed_admin' => ['sometimes', 'boolean'],
            'notify_order_status_updated' => ['sometimes', 'boolean'],
            'notify_order_cancelled' => ['sometimes', 'boolean'],
            'notify_low_stock_admin' => ['sometimes', 'boolean'],
            'notify_new_customer_welcome' => ['sometimes', 'boolean'],
            'notify_new_review_admin' => ['sometimes', 'boolean'],
        ]);

        // 1. Bundle Payment Gateways & Methods
        $paymentKeys = [
            'payment_cod_enabled', 'payment_cod_instructions',
            'payment_stripe_enabled', 'payment_stripe_publishable_key', 'payment_stripe_secret_key', 'payment_stripe_webhook_secret',
            'payment_paypal_enabled', 'payment_paypal_mode', 'payment_paypal_client_id', 'payment_paypal_client_secret',
            'payment_razorpay_enabled', 'payment_razorpay_key_id', 'payment_razorpay_key_secret', 'payment_razorpay_webhook_secret',
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
            'razorpay' => [
                'enabled' => isset($input['payment_razorpay_enabled']) ? (bool) $input['payment_razorpay_enabled'] : ($existingPayment['razorpay']['enabled'] ?? false),
                'key_id' => $input['payment_razorpay_key_id'] ?? ($existingPayment['razorpay']['key_id'] ?? ''),
                'key_secret' => ! empty($input['payment_razorpay_key_secret']) ? $input['payment_razorpay_key_secret'] : ($existingPayment['razorpay']['key_secret'] ?? ''),
                'webhook_secret' => ! empty($input['payment_razorpay_webhook_secret']) ? $input['payment_razorpay_webhook_secret'] : ($existingPayment['razorpay']['webhook_secret'] ?? ''),
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
            'shipping_carrier_provider', 'shipping_carrier_account_number', 'shipping_carrier_api_key', 'shipping_carrier_api_secret',
        ];

        $existingShipping = Setting::getShippingSettings();
        $shippingSettings = [
            'carrier' => [
                'provider' => $input['shipping_carrier_provider'] ?? $existingShipping['carrier']['provider'],
                'account_number' => $input['shipping_carrier_account_number'] ?? $existingShipping['carrier']['account_number'],
                'api_key' => $input['shipping_carrier_api_key'] ?? $existingShipping['carrier']['api_key'],
                'api_secret' => ! empty($input['shipping_carrier_api_secret']) ? $input['shipping_carrier_api_secret'] : $existingShipping['carrier']['api_secret'],
            ],
        ];

        // 4. Bundle Notifications (Mail & SMS)
        $mailKeys = ['mail_host', 'mail_port', 'mail_username', 'mail_password', 'mail_encryption', 'mail_from_name', 'mail_from_address'];
        $smsKeys = ['sms_provider', 'sms_username', 'sms_password', 'sms_from_number'];

        $existingMail = Setting::getMailSettings();
        $mailSettings = [
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
        $legacyKeys = array_merge(
            $paymentKeys,
            $storageKeys,
            $shippingKeys,
            $mailKeys,
            $smsKeys,
            [
                'currency_position',
                'session_lifetime_minutes',
                'max_login_attempts',
                'lockout_duration_minutes',
                'require_strong_passwords',
                'min_order_amount',
                'payment_bank_transfer_enabled',
                'payment_bank_name',
                'payment_bank_account_name',
                'payment_bank_account_number',
                'payment_bank_routing_number',
                'payment_bank_swift_code',
                'payment_bank_instructions',
                'shipping_default_method',
                'shipping_flat_rate_cost',
                'shipping_free_shipping_enabled',
                'shipping_free_shipping_min_order',
                'mail_mailer',
                'admin_alert_email',
                'enable_email_notifications',
                'enable_in_app_notifications',
                'maintenance_mode',
                'maintenance_notice',
                'allow_admin_bypass_maintenance',
            ]
        );
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

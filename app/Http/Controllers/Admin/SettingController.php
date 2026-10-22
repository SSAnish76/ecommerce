<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\Product\StockVisibility;
use App\Enums\Setting\MailEncryption;
use App\Enums\Setting\SmsProvider;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
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
            'roles' => Role::query()->select('id', 'name')->orderBy('name')->get(),
            'staffUsers' => User::query()->select('id', 'name', 'email', 'role_id')->orderBy('name')->get(),
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

            'shipping_fedex_enabled' => ['sometimes', 'boolean'],
            'shipping_fedex_account_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'shipping_fedex_api_key' => ['sometimes', 'nullable', 'string', 'max:150'],
            'shipping_fedex_api_secret' => ['sometimes', 'nullable', 'string', 'max:255'],

            'shipping_ups_enabled' => ['sometimes', 'boolean'],
            'shipping_ups_account_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'shipping_ups_api_key' => ['sometimes', 'nullable', 'string', 'max:150'],
            'shipping_ups_api_secret' => ['sometimes', 'nullable', 'string', 'max:255'],

            'shipping_dhl_enabled' => ['sometimes', 'boolean'],
            'shipping_dhl_account_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'shipping_dhl_api_key' => ['sometimes', 'nullable', 'string', 'max:150'],
            'shipping_dhl_api_secret' => ['sometimes', 'nullable', 'string', 'max:255'],

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

            // Customer Event Notification Triggers (Email & SMS independent channels)
            'notify_order_placed_customer_email' => ['sometimes', 'boolean'],
            'notify_order_placed_customer_sms' => ['sometimes', 'boolean'],
            'notify_order_status_updated_email' => ['sometimes', 'boolean'],
            'notify_order_status_updated_sms' => ['sometimes', 'boolean'],
            'notify_order_delivered_customer_email' => ['sometimes', 'boolean'],
            'notify_order_delivered_customer_sms' => ['sometimes', 'boolean'],
            'notify_order_cancelled_customer_email' => ['sometimes', 'boolean'],
            'notify_order_cancelled_customer_sms' => ['sometimes', 'boolean'],
            'notify_new_customer_welcome_email' => ['sometimes', 'boolean'],
            'notify_new_customer_welcome_sms' => ['sometimes', 'boolean'],

            // Admin & Staff Notification Triggers (Email & SMS independent channels)
            'notify_order_placed_admin_email' => ['sometimes', 'boolean'],
            'notify_order_placed_admin_sms' => ['sometimes', 'boolean'],
            'notify_order_cancelled_admin_email' => ['sometimes', 'boolean'],
            'notify_order_cancelled_admin_sms' => ['sometimes', 'boolean'],
            'notify_low_stock_admin_email' => ['sometimes', 'boolean'],
            'notify_low_stock_admin_sms' => ['sometimes', 'boolean'],
            'notify_new_review_admin_email' => ['sometimes', 'boolean'],
            'notify_new_review_admin_sms' => ['sometimes', 'boolean'],

            // Admin & Staff Alerts Recipient Routing
            'admin_alert_recipient_type' => ['sometimes', 'nullable', 'string', 'in:email,roles,users'],
            'admin_alert_email' => ['sometimes', 'nullable', 'string', 'max:255'],
            'admin_alert_roles' => ['sometimes', 'nullable', 'array'],
            'admin_alert_roles.*' => ['string'],
            'admin_alert_users' => ['sometimes', 'nullable', 'array'],
            'admin_alert_users.*' => ['string'],
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
            'shipping_fedex_enabled', 'shipping_fedex_account_number', 'shipping_fedex_api_key', 'shipping_fedex_api_secret',
            'shipping_ups_enabled', 'shipping_ups_account_number', 'shipping_ups_api_key', 'shipping_ups_api_secret',
            'shipping_dhl_enabled', 'shipping_dhl_account_number', 'shipping_dhl_api_key', 'shipping_dhl_api_secret',
            'shipping_carrier_provider', 'shipping_carrier_account_number', 'shipping_carrier_api_key', 'shipping_carrier_api_secret',
        ];

        $existingShipping = Setting::getShippingSettings();

        $fedexEnabled = isset($input['shipping_fedex_enabled'])
            ? (bool) $input['shipping_fedex_enabled']
            : (isset($input['shipping_carrier_provider']) ? $input['shipping_carrier_provider'] === 'fedex' : ($existingShipping['fedex']['enabled'] ?? false));

        $upsEnabled = isset($input['shipping_ups_enabled'])
            ? (bool) $input['shipping_ups_enabled']
            : (isset($input['shipping_carrier_provider']) ? $input['shipping_carrier_provider'] === 'ups' : ($existingShipping['ups']['enabled'] ?? false));

        $dhlEnabled = isset($input['shipping_dhl_enabled'])
            ? (bool) $input['shipping_dhl_enabled']
            : (isset($input['shipping_carrier_provider']) ? $input['shipping_carrier_provider'] === 'dhl' : ($existingShipping['dhl']['enabled'] ?? false));

        $fedexAccount = $input['shipping_fedex_account_number']
            ?? (isset($input['shipping_carrier_provider']) && $input['shipping_carrier_provider'] === 'fedex' ? ($input['shipping_carrier_account_number'] ?? '') : ($existingShipping['fedex']['account_number'] ?? ''));

        $fedexKey = $input['shipping_fedex_api_key']
            ?? (isset($input['shipping_carrier_provider']) && $input['shipping_carrier_provider'] === 'fedex' ? ($input['shipping_carrier_api_key'] ?? '') : ($existingShipping['fedex']['api_key'] ?? ''));

        $fedexSecret = ! empty($input['shipping_fedex_api_secret'])
            ? $input['shipping_fedex_api_secret']
            : (isset($input['shipping_carrier_provider']) && $input['shipping_carrier_provider'] === 'fedex' && ! empty($input['shipping_carrier_api_secret']) ? $input['shipping_carrier_api_secret'] : ($existingShipping['fedex']['api_secret'] ?? ''));

        $upsAccount = $input['shipping_ups_account_number']
            ?? (isset($input['shipping_carrier_provider']) && $input['shipping_carrier_provider'] === 'ups' ? ($input['shipping_carrier_account_number'] ?? '') : ($existingShipping['ups']['account_number'] ?? ''));

        $upsKey = $input['shipping_ups_api_key']
            ?? (isset($input['shipping_carrier_provider']) && $input['shipping_carrier_provider'] === 'ups' ? ($input['shipping_carrier_api_key'] ?? '') : ($existingShipping['ups']['api_key'] ?? ''));

        $upsSecret = ! empty($input['shipping_ups_api_secret'])
            ? $input['shipping_ups_api_secret']
            : (isset($input['shipping_carrier_provider']) && $input['shipping_carrier_provider'] === 'ups' && ! empty($input['shipping_carrier_api_secret']) ? $input['shipping_carrier_api_secret'] : ($existingShipping['ups']['api_secret'] ?? ''));

        $dhlAccount = $input['shipping_dhl_account_number']
            ?? (isset($input['shipping_carrier_provider']) && $input['shipping_carrier_provider'] === 'dhl' ? ($input['shipping_carrier_account_number'] ?? '') : ($existingShipping['dhl']['account_number'] ?? ''));

        $dhlKey = $input['shipping_dhl_api_key']
            ?? (isset($input['shipping_carrier_provider']) && $input['shipping_carrier_provider'] === 'dhl' ? ($input['shipping_carrier_api_key'] ?? '') : ($existingShipping['dhl']['api_key'] ?? ''));

        $dhlSecret = ! empty($input['shipping_dhl_api_secret'])
            ? $input['shipping_dhl_api_secret']
            : (isset($input['shipping_carrier_provider']) && $input['shipping_carrier_provider'] === 'dhl' && ! empty($input['shipping_carrier_api_secret']) ? $input['shipping_carrier_api_secret'] : ($existingShipping['dhl']['api_secret'] ?? ''));

        $primaryProvider = $fedexEnabled ? 'fedex' : ($upsEnabled ? 'ups' : ($dhlEnabled ? 'dhl' : ($input['shipping_carrier_provider'] ?? 'none')));
        $primaryAccount = match ($primaryProvider) {
            'fedex' => $fedexAccount,
            'ups' => $upsAccount,
            'dhl' => $dhlAccount,
            default => '',
        };
        $primaryKey = match ($primaryProvider) {
            'fedex' => $fedexKey,
            'ups' => $upsKey,
            'dhl' => $dhlKey,
            default => '',
        };
        $primarySecret = match ($primaryProvider) {
            'fedex' => $fedexSecret,
            'ups' => $upsSecret,
            'dhl' => $dhlSecret,
            default => '',
        };

        $shippingSettings = [
            'carrier' => [
                'provider' => $primaryProvider,
                'account_number' => $primaryAccount,
                'api_key' => $primaryKey,
                'api_secret' => $primarySecret,
            ],
            'fedex' => [
                'enabled' => $fedexEnabled,
                'account_number' => $fedexAccount,
                'api_key' => $fedexKey,
                'api_secret' => $fedexSecret,
            ],
            'ups' => [
                'enabled' => $upsEnabled,
                'account_number' => $upsAccount,
                'api_key' => $upsKey,
                'api_secret' => $upsSecret,
            ],
            'dhl' => [
                'enabled' => $dhlEnabled,
                'account_number' => $dhlAccount,
                'api_key' => $dhlKey,
                'api_secret' => $dhlSecret,
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
                'enable_email_notifications',
                'enable_in_app_notifications',
                'maintenance_mode',
                'maintenance_notice',
                'allow_admin_bypass_maintenance',
                'notify_order_placed_customer',
                'notify_order_placed_admin',
                'notify_order_status_updated',
                'notify_order_cancelled',
                'notify_low_stock_admin',
                'notify_new_customer_welcome',
                'notify_new_review_admin',
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

        // Filter admin alert recipient settings: ONLY save the active option's data
        if (isset($input['admin_alert_recipient_type'])) {
            $recipientType = $input['admin_alert_recipient_type'];
            if ($recipientType === 'email') {
                $input['admin_alert_roles'] = [];
                $input['admin_alert_users'] = [];
            } elseif ($recipientType === 'roles') {
                $input['admin_alert_users'] = [];
                $input['admin_alert_email'] = '';
            } elseif ($recipientType === 'users') {
                $input['admin_alert_roles'] = [];
                $input['admin_alert_email'] = '';
            }
        }

        Setting::setMany($input);

        return redirect()->back()->with('success', 'Global E-Commerce & Platform settings updated successfully.');
    }
}

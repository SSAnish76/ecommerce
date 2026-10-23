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
     * Keys grouped into JSON settings or legacy obsolete keys that should not exist as individual DB rows.
     *
     * @var list<string>
     */
    private const OBSOLETE_OR_GROUPED_KEYS = [
        // Payment individual keys
        'payment_cod_enabled', 'payment_cod_instructions',
        'payment_stripe_enabled', 'payment_stripe_publishable_key', 'payment_stripe_secret_key', 'payment_stripe_webhook_secret',
        'payment_paypal_enabled', 'payment_paypal_mode', 'payment_paypal_client_id', 'payment_paypal_client_secret',
        'payment_razorpay_enabled', 'payment_razorpay_key_id', 'payment_razorpay_key_secret', 'payment_razorpay_webhook_secret',
        'payment_bank_transfer_enabled', 'payment_bank_name', 'payment_bank_account_name', 'payment_bank_account_number',
        'payment_bank_routing_number', 'payment_bank_swift_code', 'payment_bank_instructions',

        // Storage individual keys
        'storage_default_disk', 'storage_s3_key', 'storage_s3_secret', 'storage_s3_region',
        'storage_s3_bucket', 'storage_s3_url', 'storage_s3_endpoint',

        // Shipping individual keys
        'shipping_fedex_enabled', 'shipping_fedex_account_number', 'shipping_fedex_api_key', 'shipping_fedex_api_secret',
        'shipping_ups_enabled', 'shipping_ups_account_number', 'shipping_ups_api_key', 'shipping_ups_api_secret',
        'shipping_dhl_enabled', 'shipping_dhl_account_number', 'shipping_dhl_api_key', 'shipping_dhl_api_secret',
        'shipping_carrier_provider', 'shipping_carrier_account_number', 'shipping_carrier_api_key', 'shipping_carrier_api_secret',
        'shipping_default_method', 'shipping_flat_rate_cost', 'shipping_free_shipping_enabled', 'shipping_free_shipping_min_order',

        // Mail & SMS individual keys
        'mail_host', 'mail_port', 'mail_username', 'mail_password', 'mail_encryption', 'mail_from_name', 'mail_from_address', 'mail_mailer',
        'sms_provider', 'sms_username', 'sms_password', 'sms_from_number',

        // Obsolete legacy individual settings
        'currency_position', 'session_lifetime_minutes', 'max_login_attempts', 'lockout_duration_minutes',
        'require_strong_passwords', 'min_order_amount', 'enable_email_notifications', 'enable_in_app_notifications',
        'maintenance_mode', 'maintenance_notice', 'allow_admin_bypass_maintenance',
        'notify_order_placed_customer', 'notify_order_placed_admin', 'notify_order_status_updated',
        'notify_order_cancelled', 'notify_low_stock_admin', 'notify_new_customer_welcome', 'notify_new_review_admin',
    ];

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
            'stock_visibility_options' => StockVisibility::options(),
            'mail_encryption_options' => MailEncryption::options(),
            'sms_provider_options' => SmsProvider::options(),
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

            'notify_order_placed_admin_email' => ['sometimes', 'boolean'],
            'notify_order_placed_admin_sms' => ['sometimes', 'boolean'],
            'notify_order_cancelled_admin_email' => ['sometimes', 'boolean'],
            'notify_order_cancelled_admin_sms' => ['sometimes', 'boolean'],
            'notify_low_stock_admin_email' => ['sometimes', 'boolean'],
            'notify_low_stock_admin_sms' => ['sometimes', 'boolean'],
            'notify_new_review_admin_email' => ['sometimes', 'boolean'],
            'notify_new_review_admin_sms' => ['sometimes', 'boolean'],

            'admin_alert_recipient_type' => ['sometimes', 'nullable', 'string', 'in:email,roles,users'],
            'admin_alert_email' => ['sometimes', 'nullable', 'string', 'max:255'],
            'admin_alert_roles' => ['sometimes', 'nullable', 'array'],
            'admin_alert_roles.*' => ['string'],
            'admin_alert_users' => ['sometimes', 'nullable', 'array'],
            'admin_alert_users.*' => ['string'],
        ]);

        // Save grouped configurations as json rows
        $input['payment_settings'] = $this->buildPaymentSettings($input);
        $input['storage_settings'] = $this->buildStorageSettings($input);
        $input['shipping_settings'] = $this->buildShippingSettings($input);
        $input['mail_settings'] = $this->buildMailSettings($input);
        $input['sms_settings'] = $this->buildSmsSettings($input);

        // Remove individual keys from input so they are not saved as individual rows
        $input = array_diff_key($input, array_flip(self::OBSOLETE_OR_GROUPED_KEYS));

        // Delete any obsolete individual rows from settings table
        Setting::whereIn('key', self::OBSOLETE_OR_GROUPED_KEYS)->delete();

        // Filter admin alert recipient settings: ONLY save the active option's data
        if (isset($input['admin_alert_recipient_type'])) {
            match ($input['admin_alert_recipient_type']) {
                'email' => $input = array_merge($input, ['admin_alert_roles' => [], 'admin_alert_users' => []]),
                'roles' => $input = array_merge($input, ['admin_alert_users' => [], 'admin_alert_email' => '']),
                'users' => $input = array_merge($input, ['admin_alert_roles' => [], 'admin_alert_email' => '']),
                default => null,
            };
        }

        Setting::setMany($input);

        return redirect()->back()->with('success', 'Global E-Commerce & Platform settings updated successfully.');
    }

    /**
     * Build payment settings array preserving credentials if unmodified.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function buildPaymentSettings(array $input): array
    {
        $existing = Setting::getPaymentSettings();

        return [
            'stripe' => [
                'enabled' => isset($input['payment_stripe_enabled']) ? (bool) $input['payment_stripe_enabled'] : $existing['stripe']['enabled'],
                'publishable_key' => $input['payment_stripe_publishable_key'] ?? $existing['stripe']['publishable_key'],
                'secret_key' => ! empty($input['payment_stripe_secret_key']) ? $input['payment_stripe_secret_key'] : $existing['stripe']['secret_key'],
                'webhook_secret' => ! empty($input['payment_stripe_webhook_secret']) ? $input['payment_stripe_webhook_secret'] : $existing['stripe']['webhook_secret'],
            ],
            'paypal' => [
                'enabled' => isset($input['payment_paypal_enabled']) ? (bool) $input['payment_paypal_enabled'] : $existing['paypal']['enabled'],
                'mode' => $input['payment_paypal_mode'] ?? $existing['paypal']['mode'],
                'client_id' => $input['payment_paypal_client_id'] ?? $existing['paypal']['client_id'],
                'client_secret' => ! empty($input['payment_paypal_client_secret']) ? $input['payment_paypal_client_secret'] : $existing['paypal']['client_secret'],
            ],
            'cod' => [
                'enabled' => isset($input['payment_cod_enabled']) ? (bool) $input['payment_cod_enabled'] : $existing['cod']['enabled'],
                'instructions' => $input['payment_cod_instructions'] ?? $existing['cod']['instructions'],
            ],
            'razorpay' => [
                'enabled' => isset($input['payment_razorpay_enabled']) ? (bool) $input['payment_razorpay_enabled'] : ($existing['razorpay']['enabled'] ?? false),
                'key_id' => $input['payment_razorpay_key_id'] ?? ($existing['razorpay']['key_id'] ?? ''),
                'key_secret' => ! empty($input['payment_razorpay_key_secret']) ? $input['payment_razorpay_key_secret'] : ($existing['razorpay']['key_secret'] ?? ''),
                'webhook_secret' => ! empty($input['payment_razorpay_webhook_secret']) ? $input['payment_razorpay_webhook_secret'] : ($existing['razorpay']['webhook_secret'] ?? ''),
            ],
        ];
    }

    /**
     * Build storage settings array preserving credentials if unmodified.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function buildStorageSettings(array $input): array
    {
        $existing = Setting::getStorageSettings();

        return [
            'default_disk' => $input['storage_default_disk'] ?? $existing['default_disk'],
            's3' => [
                'key' => $input['storage_s3_key'] ?? $existing['s3']['key'],
                'secret' => ! empty($input['storage_s3_secret']) ? $input['storage_s3_secret'] : $existing['s3']['secret'],
                'region' => $input['storage_s3_region'] ?? $existing['s3']['region'],
                'bucket' => $input['storage_s3_bucket'] ?? $existing['s3']['bucket'],
                'url' => $input['storage_s3_url'] ?? $existing['s3']['url'],
                'endpoint' => $input['storage_s3_endpoint'] ?? $existing['s3']['endpoint'],
            ],
        ];
    }

    /**
     * Build shipping settings array for multi-carrier and primary carrier.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function buildShippingSettings(array $input): array
    {
        $existing = Setting::getShippingSettings();
        $legacyProvider = $input['shipping_carrier_provider'] ?? null;
        $carriers = ['fedex', 'ups', 'dhl'];

        $settings = [];
        $firstEnabled = null;

        foreach ($carriers as $carrier) {
            $isLegacyMatch = $legacyProvider === $carrier;
            $enabled = isset($input["shipping_{$carrier}_enabled"])
                ? (bool) $input["shipping_{$carrier}_enabled"]
                : ($isLegacyMatch || ($existing[$carrier]['enabled'] ?? false));

            $account = $input["shipping_{$carrier}_account_number"]
                ?? ($isLegacyMatch ? ($input['shipping_carrier_account_number'] ?? '') : ($existing[$carrier]['account_number'] ?? ''));

            $apiKey = $input["shipping_{$carrier}_api_key"]
                ?? ($isLegacyMatch ? ($input['shipping_carrier_api_key'] ?? '') : ($existing[$carrier]['api_key'] ?? ''));

            $secretInput = $input["shipping_{$carrier}_api_secret"] ?? ($isLegacyMatch ? ($input['shipping_carrier_api_secret'] ?? '') : '');
            $secret = ! empty($secretInput) ? $secretInput : ($existing[$carrier]['api_secret'] ?? '');

            $settings[$carrier] = [
                'enabled' => $enabled,
                'account_number' => $account,
                'api_key' => $apiKey,
                'api_secret' => $secret,
            ];

            if ($enabled && $firstEnabled === null) {
                $firstEnabled = $carrier;
            }
        }

        $primaryProvider = $firstEnabled ?? ($legacyProvider ?? ($existing['carrier']['provider'] ?? 'none'));
        $primaryCarrier = $settings[$primaryProvider] ?? ($existing['carrier'] ?? [
            'account_number' => '',
            'api_key' => '',
            'api_secret' => '',
        ]);

        $settings['carrier'] = [
            'provider' => $primaryProvider,
            'account_number' => $primaryCarrier['account_number'] ?? '',
            'api_key' => $primaryCarrier['api_key'] ?? '',
            'api_secret' => $primaryCarrier['api_secret'] ?? '',
        ];

        return $settings;
    }

    /**
     * Build mail settings array preserving password if unmodified.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function buildMailSettings(array $input): array
    {
        $existing = Setting::getMailSettings();

        return [
            'host' => $input['mail_host'] ?? $existing['host'],
            'port' => isset($input['mail_port']) ? (int) $input['mail_port'] : $existing['port'],
            'username' => $input['mail_username'] ?? $existing['username'],
            'password' => ! empty($input['mail_password']) ? $input['mail_password'] : $existing['password'],
            'encryption' => $input['mail_encryption'] ?? $existing['encryption'],
            'from_name' => $input['mail_from_name'] ?? $existing['from_name'],
            'from_address' => $input['mail_from_address'] ?? $existing['from_address'],
        ];
    }

    /**
     * Build SMS settings array preserving password if unmodified.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function buildSmsSettings(array $input): array
    {
        $existing = Setting::getSmsSettings();

        return [
            'provider' => $input['sms_provider'] ?? $existing['provider'],
            'username' => $input['sms_username'] ?? $existing['username'],
            'password' => ! empty($input['sms_password']) ? $input['sms_password'] : $existing['password'],
            'from_number' => $input['sms_from_number'] ?? $existing['from_number'],
        ];
    }
}

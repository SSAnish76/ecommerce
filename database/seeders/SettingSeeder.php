<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaultSettings = [
            // ================= 1. Localization, Currency & Timestamps =================
            [
                'key' => 'currency_code',
                'value' => 'USD',
                'group' => 'localization',
                'type' => 'string',
                'label' => 'Default Store Currency Code',
                'description' => 'Standard ISO 4217 3-letter currency code (e.g. USD, EUR, INR)',
            ],
            [
                'key' => 'currency_symbol',
                'value' => '$',
                'group' => 'localization',
                'type' => 'string',
                'label' => 'Currency Symbol',
                'description' => 'Visual currency symbol displayed in product prices',
            ],
            [
                'key' => 'currency_position',
                'value' => 'prefix',
                'group' => 'localization',
                'type' => 'string',
                'label' => 'Currency Symbol Position',
                'description' => 'Prefix ($100) or Suffix (100 €)',
            ],
            [
                'key' => 'currency_decimals',
                'value' => '2',
                'group' => 'localization',
                'type' => 'integer',
                'label' => 'Currency Decimals',
                'description' => 'Number of decimal digits shown in prices (e.g. 2 for 99.99, 0 for 100)',
            ],
            [
                'key' => 'timezone',
                'value' => 'UTC',
                'group' => 'localization',
                'type' => 'string',
                'label' => 'System Timezone',
                'description' => 'Timezone used for order timestamps, audit logs, and reports',
            ],
            [
                'key' => 'date_format',
                'value' => 'Y-m-d',
                'group' => 'localization',
                'type' => 'string',
                'label' => 'Date Display Format',
                'description' => 'Standard date format across administrative dashboard and reports',
            ],
            [
                'key' => 'time_format',
                'value' => 'h:i A',
                'group' => 'localization',
                'type' => 'string',
                'label' => 'Time Display Format',
                'description' => '12-hour (h:i A) or 24-hour (H:i) timestamp presentation',
            ],

            // ================= 3. Platform Security & Two-Factor Authentication =================
            [
                'key' => 'force_two_factor_all_admins',
                'value' => '1',
                'group' => 'security',
                'type' => 'boolean',
                'label' => 'Require 2FA For Admin Access',
                'description' => 'Block admin dashboard access until TOTP 2FA is verified',
            ],
            [
                'key' => 'session_lifetime_minutes',
                'value' => '120',
                'group' => 'security',
                'type' => 'integer',
                'label' => 'Admin Session Lifetime',
                'description' => 'Duration in minutes before inactive admin session expires',
            ],
            [
                'key' => 'max_login_attempts',
                'value' => '5',
                'group' => 'security',
                'type' => 'integer',
                'label' => 'Max Login Failures',
                'description' => 'Number of failed attempts before temporary IP/account lockout',
            ],
            [
                'key' => 'lockout_duration_minutes',
                'value' => '15',
                'group' => 'security',
                'type' => 'integer',
                'label' => 'Lockout Duration',
                'description' => 'Temporary lockout duration in minutes after failed attempts',
            ],
            [
                'key' => 'require_strong_passwords',
                'value' => '1',
                'group' => 'security',
                'type' => 'boolean',
                'label' => 'Enforce Complex Passwords',
                'description' => 'Require min 8 characters with letters, numbers, and symbols',
            ],

            // ================= 4. Orders & Checkout =================
            [
                'key' => 'order_prefix',
                'value' => 'ORD-',
                'group' => 'orders',
                'type' => 'string',
                'label' => 'Order Number Prefix',
                'description' => 'Prefix prepended to sequential order numbers (e.g. ORD-1001)',
            ],
            [
                'key' => 'order_number_start',
                'value' => '1001',
                'group' => 'orders',
                'type' => 'integer',
                'label' => 'Order Number Starting Counter',
                'description' => 'Next sequential order starting integer',
            ],
            [
                'key' => 'min_order_amount',
                'value' => '10.00',
                'group' => 'orders',
                'type' => 'float',
                'label' => 'Minimum Order Value',
                'description' => 'Minimum cart subtotal required to proceed to checkout',
            ],
            [
                'key' => 'allow_customer_cancellation',
                'value' => '1',
                'group' => 'orders',
                'type' => 'boolean',
                'label' => 'Allow Customer Cancellation',
                'description' => 'Allow customers to cancel orders before processing begins',
            ],

            // ================= 5. Products & Inventory =================
            [
                'key' => 'low_stock_threshold',
                'value' => '5',
                'group' => 'products',
                'type' => 'integer',
                'label' => 'Low Stock Alert Threshold',
                'description' => 'Units remaining when low-stock warning badges & emails trigger',
            ],
            [
                'key' => 'out_of_stock_visibility',
                'value' => 'badge',
                'group' => 'products',
                'type' => 'string',
                'label' => 'Out of Stock Behavior',
                'description' => 'How out-of-stock items are treated: hide (Hide), badge (Show Sold Out), backorder (Allow backorder)',
            ],
            [
                'key' => 'enable_customer_reviews',
                'value' => '1',
                'group' => 'products',
                'type' => 'boolean',
                'label' => 'Customer Product Reviews',
                'description' => 'Enable verified buyer reviews and star ratings on product pages',
            ],
            [
                'key' => 'auto_approve_reviews',
                'value' => '0',
                'group' => 'products',
                'type' => 'boolean',
                'label' => 'Auto-Approve Reviews',
                'description' => 'Automatically publish reviews without manual admin moderation',
            ],

            // ================= 6. Payment Gateways & Methods =================
            [
                'key' => 'payment_settings',
                'value' => json_encode([
                    'stripe' => [
                        'enabled' => true,
                        'publishable_key' => 'pk_test_sample_stripe_publishable_key',
                        'secret_key' => Setting::encryptSensitive('sk_test_sample_stripe_secret_key'),
                        'webhook_secret' => Setting::encryptSensitive('whsec_sample_webhook_secret'),
                    ],
                    'paypal' => [
                        'enabled' => true,
                        'mode' => 'sandbox',
                        'client_id' => 'sample_paypal_client_id',
                        'client_secret' => Setting::encryptSensitive('sample_paypal_client_secret'),
                    ],
                    'cod' => [
                        'enabled' => true,
                        'instructions' => 'Pay cash to delivery courier on parcel arrival.',
                    ],
                    'bank_transfer' => [
                        'enabled' => false,
                        'bank_name' => 'First National Commercial Bank',
                        'account_name' => 'Store Retail Operations LLC',
                        'account_number' => '1234567890',
                        'routing_number' => '021000021',
                        'swift_code' => 'FNALUS33',
                        'instructions' => 'Please include your Order ID as the wire transfer reference.',
                    ],
                ], JSON_THROW_ON_ERROR),
                'group' => 'payment',
                'type' => 'json',
                'label' => 'Payment Gateway Configurations',
                'description' => 'Configured payment providers, credentials, webhooks, and manual checkout methods',
            ],

            // ================= 7. Storage & Cloud Assets =================
            [
                'key' => 'storage_settings',
                'value' => json_encode([
                    'default_disk' => 'public',
                    's3' => [
                        'key' => 'AKIAIOSFODNN7EXAMPLE',
                        'secret' => Setting::encryptSensitive('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'),
                        'region' => 'us-east-1',
                        'bucket' => 'store-production-uploads',
                        'url' => '',
                        'endpoint' => '',
                    ],
                ], JSON_THROW_ON_ERROR),
                'group' => 'storage',
                'type' => 'json',
                'label' => 'Storage & File Delivery',
                'description' => 'Default asset filesystem disk and Amazon S3 or S3-compatible cloud credentials',
            ],

            // ================= 8. Shipping & Delivery =================
            [
                'key' => 'shipping_settings',
                'value' => json_encode([
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
                ], JSON_THROW_ON_ERROR),
                'group' => 'shipping',
                'type' => 'json',
                'label' => 'Shipping & Delivery Rates',
                'description' => 'Standard shipping rates, free delivery thresholds, and live courier carrier API settings',
            ],

            // ================= 9. Notifications & Communication =================
            [
                'key' => 'mail_settings',
                'value' => json_encode([
                    'mailer' => 'smtp',
                    'host' => 'smtp.mailtrap.io',
                    'port' => 587,
                    'username' => 'store_smtp_user',
                    'password' => Setting::encryptSensitive('secret_smtp_pass'),
                    'encryption' => 'tls',
                    'from_name' => 'E-Commerce Store',
                    'from_address' => 'notifications@example.com',
                ], JSON_THROW_ON_ERROR),
                'group' => 'notifications',
                'type' => 'json',
                'label' => 'Email Notification & SMTP Configuration',
                'description' => 'Configured mail driver, SMTP credentials, encryption, and outbound sender headers',
            ],
            [
                'key' => 'sms_settings',
                'value' => json_encode([
                    'provider' => 'twilio',
                    'username' => 'AC_twilio_account_sid_sample',
                    'password' => Setting::encryptSensitive('secret_sms_auth_token'),
                    'from_number' => '+15550192834',
                ], JSON_THROW_ON_ERROR),
                'group' => 'notifications',
                'type' => 'json',
                'label' => 'SMS Gateway Provider & API Credentials',
                'description' => 'Provider credentials, API keys, secrets, and approved sender ID for customer SMS',
            ],
            [
                'key' => 'admin_alert_email',
                'value' => 'admin@example.com',
                'group' => 'notifications',
                'type' => 'string',
                'label' => 'Admin Alert Recipient Email',
                'description' => 'Primary administrative email inbox where store alerts and orders are routed',
            ],
            [
                'key' => 'enable_email_notifications',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Enable Automated Email Notifications',
                'description' => 'Master switch for sending system transactional and alert emails',
            ],
            [
                'key' => 'enable_in_app_notifications',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Enable In-App Admin Notifications',
                'description' => 'Show notification bell and popup alert toasts inside admin dashboard',
            ],
            [
                'key' => 'enable_order_sms_notifications',
                'value' => '0',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Enable SMS Alerts',
                'description' => 'Send SMS text messages for order shipment and dispatch',
            ],
            [
                'key' => 'notify_order_placed_customer',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Email Customer: Order Confirmation',
                'description' => 'Send instant email receipt to customer immediately upon checkout',
            ],
            [
                'key' => 'notify_order_placed_admin',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Email Admin: New Order Received',
                'description' => 'Send order alert email to admin email when a customer places an order',
            ],
            [
                'key' => 'notify_order_status_updated',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Email Customer: Order Status Updates',
                'description' => 'Notify customer when order transitions to Processing, Shipped, or Delivered',
            ],
            [
                'key' => 'notify_order_cancelled',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Email: Order Cancellation & Refund',
                'description' => 'Send cancellation notifications to customer and store administrator',
            ],
            [
                'key' => 'notify_low_stock_admin',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Email Admin: Low Stock Inventory Warning',
                'description' => 'Send alert email when product inventory quantity drops below threshold',
            ],
            [
                'key' => 'notify_new_customer_welcome',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Email Customer: Welcome & Account Setup',
                'description' => 'Send onboarding welcome email when customer creates an account',
            ],
            [
                'key' => 'notify_new_review_admin',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Email Admin: New Product Review Submitted',
                'description' => 'Send notification to admin when customer writes a product review',
            ],

            // ================= 8. Operations & Maintenance =================
            [
                'key' => 'maintenance_mode',
                'value' => '0',
                'group' => 'maintenance',
                'type' => 'boolean',
                'label' => 'Store Maintenance Mode',
                'description' => 'Put customer-facing storefront offline for updates',
            ],
            [
                'key' => 'maintenance_notice',
                'value' => 'We are currently performing scheduled maintenance to improve your shopping experience. Please check back shortly!',
                'group' => 'maintenance',
                'type' => 'string',
                'label' => 'Maintenance Notice Message',
                'description' => 'Message displayed to visitors when storefront is in maintenance',
            ],
            [
                'key' => 'allow_admin_bypass_maintenance',
                'value' => '1',
                'group' => 'maintenance',
                'type' => 'boolean',
                'label' => 'Allow Admin Bypass',
                'description' => 'Logged-in administrators can browse store even in maintenance mode',
            ],
        ];

        foreach ($defaultSettings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }

        Setting::whereIn('key', [
            'mail_mailer',
            'mail_host',
            'mail_port',
            'mail_username',
            'mail_password',
            'mail_encryption',
            'mail_from_name',
            'mail_from_address',
            'sms_provider',
            'sms_username',
            'sms_password',
            'sms_from_number',
            'payment_cod_enabled',
            'payment_stripe_enabled',
            'payment_paypal_enabled',
            'payment_bank_transfer_enabled',
        ])->delete();

        Setting::clearCache();
    }
}

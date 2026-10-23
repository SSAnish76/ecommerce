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
            // ================= 1. Storefront & Localization =================
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
                'key' => 'force_two_factor_all_admins',
                'value' => '1',
                'group' => 'security',
                'type' => 'boolean',
                'label' => 'Require 2FA For Admin Access',
                'description' => 'Block admin dashboard access until TOTP 2FA is verified',
            ],
            [
                'key' => 'menu_delivery_mode',
                'value' => 'api',
                'group' => 'system',
                'type' => 'string',
                'label' => 'Navigation Menu Delivery Mode',
                'description' => 'Navigation delivery strategy: api (REST API + LocalStorage) or inertia (Shared props)',
            ],

            // ================= 2. Orders & Checkout =================
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
                'key' => 'allow_customer_cancellation',
                'value' => '1',
                'group' => 'orders',
                'type' => 'boolean',
                'label' => 'Allow Customer Cancellation',
                'description' => 'Allow customers to cancel orders before processing begins',
            ],

            // ================= 3. Products & Inventory =================
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

            // ================= 4. Payment Gateways & Methods =================
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
                    'razorpay' => [
                        'enabled' => false,
                        'key_id' => 'rzp_test_sample_key_id',
                        'key_secret' => Setting::encryptSensitive('sample_razorpay_secret_key'),
                        'webhook_secret' => Setting::encryptSensitive('sample_razorpay_webhook_secret'),
                    ],
                ], JSON_THROW_ON_ERROR),
                'group' => 'payment',
                'type' => 'json',
                'label' => 'Payment Gateway Configurations',
                'description' => 'Configured payment providers, credentials, webhooks, and manual checkout methods',
            ],

            // ================= 5. Storage & Cloud Assets =================
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

            // ================= 6. Shipping & Delivery =================
            [
                'key' => 'shipping_settings',
                'value' => json_encode([
                    'carrier' => [
                        'provider' => 'none',
                        'account_number' => '',
                        'api_key' => '',
                        'api_secret' => Setting::encryptSensitive(''),
                    ],
                    'fedex' => [
                        'enabled' => false,
                        'account_number' => '',
                        'api_key' => '',
                        'api_secret' => Setting::encryptSensitive(''),
                    ],
                    'ups' => [
                        'enabled' => false,
                        'account_number' => '',
                        'api_key' => '',
                        'api_secret' => Setting::encryptSensitive(''),
                    ],
                    'dhl' => [
                        'enabled' => false,
                        'account_number' => '',
                        'api_key' => '',
                        'api_secret' => Setting::encryptSensitive(''),
                    ],
                ], JSON_THROW_ON_ERROR),
                'group' => 'shipping',
                'type' => 'json',
                'label' => 'Shipping & Delivery Rates',
                'description' => 'Live courier carrier API settings and credentials',
            ],

            // ================= 7. Notifications & Communication =================
            [
                'key' => 'mail_settings',
                'value' => json_encode([
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
                'description' => 'SMTP credentials, encryption, and outbound sender headers',
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
                'key' => 'enable_order_sms_notifications',
                'value' => '0',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Enable SMS Alerts',
                'description' => 'Send SMS text messages for order shipment and dispatch',
            ],
            [
                'key' => 'notify_order_placed_customer_email',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Customer Email: Order Confirmation',
                'description' => 'Send instant email receipt to customer immediately upon checkout',
            ],
            [
                'key' => 'notify_order_placed_customer_sms',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Customer SMS: Order Confirmation',
                'description' => 'Send order confirmation text message to customer mobile',
            ],
            [
                'key' => 'notify_order_status_updated_email',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Customer Email: Order Dispatched & Tracking',
                'description' => 'Notify customer when order transitions to Shipped or In Transit',
            ],
            [
                'key' => 'notify_order_status_updated_sms',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Customer SMS: Order Dispatched & Tracking',
                'description' => 'Send shipping tracking SMS to customer mobile',
            ],
            [
                'key' => 'notify_order_delivered_customer_email',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Customer Email: Order Delivered',
                'description' => 'Send email confirmation when shipment is marked as delivered',
            ],
            [
                'key' => 'notify_order_delivered_customer_sms',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Customer SMS: Order Delivered',
                'description' => 'Send SMS notification when parcel is successfully delivered',
            ],
            [
                'key' => 'notify_order_cancelled_customer_email',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Customer Email: Order Cancellation & Refund',
                'description' => 'Send cancellation and refund confirmation email to customer',
            ],
            [
                'key' => 'notify_order_cancelled_customer_sms',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Customer SMS: Order Cancellation & Refund',
                'description' => 'Send cancellation SMS update to customer mobile',
            ],
            [
                'key' => 'notify_new_customer_welcome_email',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Customer Email: Welcome & Account Setup',
                'description' => 'Send onboarding welcome email when customer creates an account',
            ],
            [
                'key' => 'notify_new_customer_welcome_sms',
                'value' => '0',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Customer SMS: Welcome & Account Setup',
                'description' => 'Send welcoming SMS text to newly registered customer',
            ],
            [
                'key' => 'notify_order_placed_admin_email',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Admin Email: New Order Received',
                'description' => 'Send order alert email to administrator when customer completes purchase',
            ],
            [
                'key' => 'notify_order_placed_admin_sms',
                'value' => '0',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Admin SMS: New Order Received',
                'description' => 'Send instant SMS alert to store admin on new customer purchase',
            ],
            [
                'key' => 'notify_order_cancelled_admin_email',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Admin Email: Order Cancelled',
                'description' => 'Alert store administrator when an order is cancelled',
            ],
            [
                'key' => 'notify_order_cancelled_admin_sms',
                'value' => '0',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Admin SMS: Order Cancelled',
                'description' => 'Send SMS text to store admin when an order is cancelled',
            ],
            [
                'key' => 'notify_low_stock_admin_email',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Admin Email: Low Stock Inventory Warning',
                'description' => 'Send alert email when product inventory quantity drops below threshold',
            ],
            [
                'key' => 'notify_low_stock_admin_sms',
                'value' => '0',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Admin SMS: Low Stock Inventory Warning',
                'description' => 'Send urgent SMS alert when product inventory quantity drops below threshold',
            ],
            [
                'key' => 'notify_new_review_admin_email',
                'value' => '1',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Admin Email: New Product Review Submitted',
                'description' => 'Send notification to admin when customer writes a product review',
            ],
            [
                'key' => 'notify_new_review_admin_sms',
                'value' => '0',
                'group' => 'notifications',
                'type' => 'boolean',
                'label' => 'Admin SMS: New Product Review Submitted',
                'description' => 'Send SMS alert to store manager on new customer review',
            ],

            // ================= 8. Admin Alert Routing =================
            [
                'key' => 'admin_alert_recipient_type',
                'value' => 'email',
                'group' => 'notifications',
                'type' => 'string',
                'label' => 'Admin Alert Recipient Mode',
                'description' => 'Target for staff notifications: email, roles, or users',
            ],
            [
                'key' => 'admin_alert_email',
                'value' => 'admin@example.com',
                'group' => 'notifications',
                'type' => 'string',
                'label' => 'Admin Alert Email Recipient',
                'description' => 'Dedicated staff email address to receive administrative order and stock notifications',
            ],
            [
                'key' => 'admin_alert_roles',
                'value' => '[]',
                'group' => 'notifications',
                'type' => 'json',
                'label' => 'Admin Alert Target Roles',
                'description' => 'Staff role IDs to receive admin email notifications',
            ],
            [
                'key' => 'admin_alert_users',
                'value' => '[]',
                'group' => 'notifications',
                'type' => 'json',
                'label' => 'Admin Alert Target Users',
                'description' => 'Specific staff user IDs to receive admin email notifications',
            ],
        ];

        foreach ($defaultSettings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }

        // Purge any obsolete keys that may exist
        Setting::whereIn('key', [
            'currency_position',
            'session_lifetime_minutes',
            'max_login_attempts',
            'lockout_duration_minutes',
            'require_strong_passwords',
            'min_order_amount',
            'enable_email_notifications',
            'enable_in_app_notifications',
            'maintenance_mode',
            'maintenance_notice',
            'allow_admin_bypass_maintenance',
            'shipping_default_method',
            'shipping_flat_rate_cost',
            'shipping_free_shipping_enabled',
            'shipping_free_shipping_min_order',
            'payment_bank_transfer_enabled',
            'payment_bank_name',
            'payment_bank_account_name',
            'payment_bank_account_number',
            'payment_bank_routing_number',
            'payment_bank_swift_code',
            'payment_bank_instructions',
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
            'notify_order_placed_customer',
            'notify_order_placed_admin',
            'notify_order_status_updated',
            'notify_order_cancelled',
            'notify_low_stock_admin',
            'notify_new_customer_welcome',
            'notify_new_review_admin',
        ])->delete();

        Setting::clearCache();
    }
}

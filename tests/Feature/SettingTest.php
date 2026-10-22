<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RolesAndPermissionsSeeder::class,
            SettingSeeder::class,
        ]);

        $this->adminUser = User::where('email', 'admin@example.com')->first();
    }

    /**
     * Test unauthenticated access to settings redirects to login.
     */
    public function test_guest_cannot_access_settings(): void
    {
        $response = $this->get('/admin/settings');
        $response->assertRedirect('/admin/login');
    }

    /**
     * Test authenticated admin can render settings page.
     */
    public function test_admin_can_view_settings_page(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/admin/settings');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Settings')
            ->has('settings')
            ->has('timezones')
            ->has('currencies')
        );
    }

    /**
     * Test authenticated admin can update global e-commerce settings.
     */
    public function test_admin_can_update_global_ecommerce_settings(): void
    {
        $payload = [
            'currency_code' => 'EUR',
            'currency_symbol' => '€',
            'currency_decimals' => 2,
            'timezone' => 'Europe/Paris',

            'force_two_factor_all_admins' => true,

            'order_prefix' => 'MM-',
            'order_number_start' => 5000,
            'allow_customer_cancellation' => false,

            'low_stock_threshold' => 10,
            'out_of_stock_visibility' => 'badge',
            'enable_customer_reviews' => true,
            'auto_approve_reviews' => true,

            'payment_cod_enabled' => false,
            'payment_cod_instructions' => 'Payment upon delivery.',
            'payment_stripe_enabled' => true,
            'payment_stripe_publishable_key' => 'pk_live_custom123',
            'payment_stripe_secret_key' => 'sk_live_custom456',
            'payment_stripe_webhook_secret' => 'whsec_custom789',
            'payment_paypal_enabled' => true,
            'payment_paypal_mode' => 'live',
            'payment_paypal_client_id' => 'paypal_client_abc',
            'payment_paypal_client_secret' => 'paypal_secret_xyz',
            'payment_razorpay_enabled' => true,
            'payment_razorpay_key_id' => 'rzp_live_test123',
            'payment_razorpay_key_secret' => 'rzp_secret_key_456',
            'payment_razorpay_webhook_secret' => 'rzp_whsec_789',

            'storage_default_disk' => 's3',
            'storage_s3_key' => 'AKIA_CUSTOM',
            'storage_s3_secret' => 'SECRET_CUSTOM_KEY',
            'storage_s3_region' => 'eu-west-1',
            'storage_s3_bucket' => 'custom-store-bucket',
            'storage_s3_url' => '',
            'storage_s3_endpoint' => '',

            'shipping_carrier_provider' => 'fedex',
            'shipping_carrier_account_number' => '12345678',
            'shipping_carrier_api_key' => 'fedex_key_123',
            'shipping_carrier_api_secret' => 'fedex_secret_999',

            'mail_host' => 'smtp.postmarkapp.com',
            'mail_port' => 587,
            'mail_username' => 'postmark_key_123',
            'mail_password' => 'postmark_secret_456',
            'mail_encryption' => 'tls',

            'sms_provider' => 'twilio',
            'sms_username' => 'AC_real_account_sid',
            'sms_password' => 'real_auth_token_789',
            'sms_from_number' => '+15559876543',

            'mail_from_name' => 'Premium Store Dispatch',
            'mail_from_address' => 'store@example.com',
            'enable_order_sms_notifications' => true,
            'notify_order_placed_customer_email' => true,
            'notify_order_placed_customer_sms' => true,
            'notify_order_placed_admin_email' => true,
            'notify_order_placed_admin_sms' => false,
            'notify_order_status_updated_email' => true,
            'notify_order_status_updated_sms' => true,
            'notify_order_delivered_customer_email' => true,
            'notify_order_delivered_customer_sms' => true,
            'notify_order_cancelled_customer_email' => true,
            'notify_order_cancelled_customer_sms' => true,
            'notify_low_stock_admin_email' => true,
            'notify_low_stock_admin_sms' => false,
            'notify_new_customer_welcome_email' => true,
            'notify_new_customer_welcome_sms' => false,
            'notify_new_review_admin_email' => true,
            'notify_new_review_admin_sms' => false,
        ];

        $response = $this->actingAs($this->adminUser)->post('/admin/settings', $payload);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        // Verify values were persisted in database
        $this->assertSame('EUR', Setting::get('currency_code'));
        $this->assertSame('€', Setting::get('currency_symbol'));
        $this->assertSame('Europe/Paris', Setting::get('timezone'));
        $this->assertTrue(Setting::get('force_two_factor_all_admins'));
        $this->assertSame('MM-', Setting::get('order_prefix'));
        $this->assertSame('smtp.postmarkapp.com', Setting::get('mail_host'));
        $this->assertSame(587, Setting::get('mail_port'));
        $this->assertSame('postmark_key_123', Setting::get('mail_username'));
        $this->assertSame('twilio', Setting::get('sms_provider'));
        $this->assertSame('AC_real_account_sid', Setting::get('sms_username'));
        $this->assertSame('Premium Store Dispatch', Setting::get('mail_from_name'));
        $this->assertSame('store@example.com', Setting::get('mail_from_address'));
        $this->assertTrue(Setting::get('notify_order_placed_customer_email'));
        $this->assertTrue(Setting::get('notify_low_stock_admin_email'));

        // Verify payment, storage, shipping, mail, and SMS are stored as JSON rows
        $this->assertDatabaseHas('settings', ['key' => 'payment_settings', 'type' => 'json']);
        $this->assertDatabaseHas('settings', ['key' => 'storage_settings', 'type' => 'json']);
        $this->assertDatabaseHas('settings', ['key' => 'shipping_settings', 'type' => 'json']);
        $this->assertDatabaseHas('settings', ['key' => 'mail_settings', 'type' => 'json']);
        $this->assertDatabaseHas('settings', ['key' => 'sms_settings', 'type' => 'json']);

        // Verify obsolete individual rows are deleted from the settings table
        $this->assertDatabaseMissing('settings', ['key' => 'payment_stripe_enabled']);
        $this->assertDatabaseMissing('settings', ['key' => 'payment_cod_enabled']);
        $this->assertDatabaseMissing('settings', ['key' => 'mail_host']);
        $this->assertDatabaseMissing('settings', ['key' => 'mail_username']);
        $this->assertDatabaseMissing('settings', ['key' => 'sms_username']);
        $this->assertDatabaseMissing('settings', ['key' => 'sms_password']);
        $this->assertDatabaseMissing('settings', ['key' => 'currency_position']);
        $this->assertDatabaseMissing('settings', ['key' => 'min_order_amount']);
        $this->assertDatabaseMissing('settings', ['key' => 'maintenance_mode']);

        // Verify secrets are encrypted at rest in raw DB storage
        $rawPaymentRow = \Illuminate\Support\Facades\DB::table('settings')->where('key', 'payment_settings')->value('value');
        $rawPaymentData = json_decode((string) $rawPaymentRow, true);
        $this->assertStringStartsWith('enc:', $rawPaymentData['stripe']['secret_key']);
        $this->assertStringStartsWith('enc:', $rawPaymentData['stripe']['webhook_secret']);
        $this->assertStringStartsWith('enc:', $rawPaymentData['paypal']['client_secret']);
        $this->assertStringStartsWith('enc:', $rawPaymentData['razorpay']['key_secret']);
        $this->assertStringStartsWith('enc:', $rawPaymentData['razorpay']['webhook_secret']);

        $rawStorageRow = \Illuminate\Support\Facades\DB::table('settings')->where('key', 'storage_settings')->value('value');
        $rawStorageData = json_decode((string) $rawStorageRow, true);
        $this->assertStringStartsWith('enc:', $rawStorageData['s3']['secret']);

        $rawShippingRow = \Illuminate\Support\Facades\DB::table('settings')->where('key', 'shipping_settings')->value('value');
        $rawShippingData = json_decode((string) $rawShippingRow, true);
        $this->assertStringStartsWith('enc:', $rawShippingData['carrier']['api_secret']);

        $rawMailRow = \Illuminate\Support\Facades\DB::table('settings')->where('key', 'mail_settings')->value('value');
        $rawMailData = json_decode((string) $rawMailRow, true);
        $this->assertStringStartsWith('enc:', $rawMailData['password']);

        // Verify decrypted access via typed helper methods
        $paymentSettings = Setting::getPaymentSettings();
        $this->assertTrue($paymentSettings['stripe']['enabled']);
        $this->assertSame('sk_live_custom456', $paymentSettings['stripe']['secret_key']);
        $this->assertSame('paypal_secret_xyz', $paymentSettings['paypal']['client_secret']);
        $this->assertTrue($paymentSettings['razorpay']['enabled']);
        $this->assertSame('rzp_live_test123', $paymentSettings['razorpay']['key_id']);
        $this->assertSame('rzp_secret_key_456', $paymentSettings['razorpay']['key_secret']);
        $this->assertSame('rzp_whsec_789', $paymentSettings['razorpay']['webhook_secret']);
        $this->assertTrue(Setting::get('payment_stripe_enabled'));
        $this->assertFalse(Setting::get('payment_cod_enabled'));
        $this->assertTrue(Setting::get('payment_razorpay_enabled'));

        $storageSettings = Setting::getStorageSettings();
        $this->assertSame('s3', $storageSettings['default_disk']);
        $this->assertSame('SECRET_CUSTOM_KEY', $storageSettings['s3']['secret']);
        $this->assertSame('custom-store-bucket', $storageSettings['s3']['bucket']);

        $shippingSettings = Setting::getShippingSettings();
        $this->assertSame('fedex_secret_999', $shippingSettings['carrier']['api_secret']);

        $mailSettings = Setting::getMailSettings();
        $this->assertSame('smtp.postmarkapp.com', $mailSettings['host']);
        $this->assertSame('postmark_key_123', $mailSettings['username']);
        $this->assertSame('postmark_secret_456', $mailSettings['password']);
        $this->assertSame('smtp.postmarkapp.com', Setting::get('mail_settings.host'));

        $smsSettings = Setting::getSmsSettings();
        $this->assertSame('AC_real_account_sid', $smsSettings['username']);
        $this->assertSame('real_auth_token_789', $smsSettings['password']);
        $this->assertSame('twilio', Setting::get('sms_settings.provider'));
    }

    /**
     * Test admin can view store profile page.
     */
    public function test_admin_can_view_store_profile_page(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/admin/store');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Store')
            ->has('store')
        );
    }

    /**
     * Test admin can update store profile details.
     */
    public function test_admin_can_update_store_profile(): void
    {
        $payload = [
            'name' => 'Mega Mart Flagship Store',
            'legal_name' => 'Mega Mart Retail Corporation LLC',
            'email' => 'contact@megamart.com',
            'phone' => '+1 (555) 999-8888',
            'address_line1' => '500 Retail Ave, Suite 10',
            'address_line2' => 'Building B',
            'city' => 'Chicago',
            'state' => 'IL',
            'postal_code' => '60601',
            'country' => 'United States',
            'logo_url' => 'https://example.com/logo.png',
            'favicon_url' => 'https://example.com/favicon.ico',
            'tax_number' => 'US-EIN-123456789',
            'description' => 'Official flagship store description.',
            'website_url' => 'https://megamart.com',
            'status' => \App\Enums\Store\StoreStatus::Active->value,
        ];

        $response = $this->actingAs($this->adminUser)->put('/admin/store', $payload);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $this->assertDatabaseHas('stores', [
            'name' => 'Mega Mart Flagship Store',
            'email' => 'contact@megamart.com',
            'city' => 'Chicago',
        ]);
    }

    /**
     * Test admin can access personal profile page.
     */
    /**
     * Test admin can configure multiple shipping carriers simultaneously.
     */
    public function test_admin_can_configure_multiple_shipping_carriers_simultaneously(): void
    {
        $payload = [
            'shipping_fedex_enabled' => true,
            'shipping_fedex_account_number' => 'FDX-112233',
            'shipping_fedex_api_key' => 'fedex_key_multi',
            'shipping_fedex_api_secret' => 'fedex_secret_multi',

            'shipping_ups_enabled' => true,
            'shipping_ups_account_number' => 'UPS-445566',
            'shipping_ups_api_key' => 'ups_key_multi',
            'shipping_ups_api_secret' => 'ups_secret_multi',

            'shipping_dhl_enabled' => true,
            'shipping_dhl_account_number' => 'DHL-778899',
            'shipping_dhl_api_key' => 'dhl_key_multi',
            'shipping_dhl_api_secret' => 'dhl_secret_multi',
        ];

        $response = $this->actingAs($this->adminUser)->post('/admin/settings', $payload);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $shippingSettings = Setting::getShippingSettings();
        $this->assertTrue($shippingSettings['fedex']['enabled']);
        $this->assertSame('FDX-112233', $shippingSettings['fedex']['account_number']);
        $this->assertSame('fedex_secret_multi', $shippingSettings['fedex']['api_secret']);

        $this->assertTrue($shippingSettings['ups']['enabled']);
        $this->assertSame('UPS-445566', $shippingSettings['ups']['account_number']);
        $this->assertSame('ups_secret_multi', $shippingSettings['ups']['api_secret']);

        $this->assertTrue($shippingSettings['dhl']['enabled']);
        $this->assertSame('DHL-778899', $shippingSettings['dhl']['account_number']);
        $this->assertSame('dhl_secret_multi', $shippingSettings['dhl']['api_secret']);

        $this->assertTrue(Setting::get('shipping_fedex_enabled'));
        $this->assertTrue(Setting::get('shipping_ups_enabled'));
        $this->assertTrue(Setting::get('shipping_dhl_enabled'));
    }

    /**
     * Test admin alert recipient settings only saves data for the active chosen target option.
     */
    public function test_admin_alert_recipient_settings_only_persists_chosen_option_data(): void
    {
        // 1. Save with 'roles' option chosen
        $payloadRoles = [
            'admin_alert_recipient_type' => 'roles',
            'admin_alert_roles' => ['1', '2'],
            'admin_alert_users' => ['5', '6'],
            'admin_alert_email' => 'leftover@example.com',
        ];

        $response = $this->actingAs($this->adminUser)->post('/admin/settings', $payloadRoles);
        $response->assertSessionHasNoErrors();

        $this->assertSame('roles', Setting::get('admin_alert_recipient_type'));
        $this->assertSame(['1', '2'], Setting::get('admin_alert_roles'));
        $this->assertSame([], Setting::get('admin_alert_users'));
        $this->assertSame('', Setting::get('admin_alert_email'));

        // 2. Save with 'users' option chosen
        $payloadUsers = [
            'admin_alert_recipient_type' => 'users',
            'admin_alert_roles' => ['1'],
            'admin_alert_users' => ['9'],
            'admin_alert_email' => 'another@example.com',
        ];

        $response = $this->actingAs($this->adminUser)->post('/admin/settings', $payloadUsers);
        $response->assertSessionHasNoErrors();

        $this->assertSame('users', Setting::get('admin_alert_recipient_type'));
        $this->assertSame(['9'], Setting::get('admin_alert_users'));
        $this->assertSame([], Setting::get('admin_alert_roles'));
        $this->assertSame('', Setting::get('admin_alert_email'));

        // 3. Save with 'email' option chosen
        $payloadEmail = [
            'admin_alert_recipient_type' => 'email',
            'admin_alert_email' => 'alerts@mycustomdomain.com',
            'admin_alert_roles' => ['3'],
            'admin_alert_users' => ['10'],
        ];

        $response = $this->actingAs($this->adminUser)->post('/admin/settings', $payloadEmail);
        $response->assertSessionHasNoErrors();

        $this->assertSame('email', Setting::get('admin_alert_recipient_type'));
        $this->assertSame('alerts@mycustomdomain.com', Setting::get('admin_alert_email'));
        $this->assertSame([], Setting::get('admin_alert_roles'));
        $this->assertSame([], Setting::get('admin_alert_users'));
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EssentialsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Helper to create and authenticate a super administrator.
     */
    protected function authenticateAdmin(): User
    {
        $this->seed();

        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
            ]
        );

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin'], ['is_system' => true]);
        if ($admin->role_id !== $superAdmin->id) {
            $admin->assignRole($superAdmin);
        }

        return $admin;
    }

    /**
     * Test admin essentials endpoint returns all enums and constants.
     */
    public function test_admin_essentials_returns_all_enums_and_constants(): void
    {
        $admin = $this->authenticateAdmin();

        $response = $this->actingAs($admin)->getJson('/admin/essentials');

        $response->assertOk()
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'modules' => [
                        'activity' => ['activity_status'],
                        'menu' => ['menu_status'],
                        'order' => ['order_status'],
                        'product' => ['stock_visibility'],
                        'setting' => [
                            'currency_position',
                            'mail_driver',
                            'mail_encryption',
                            'sms_provider',
                        ],
                        'store' => ['store_status'],
                        'user' => ['role_status', 'user_status'],
                    ],
                    'enums' => [
                        'activity_status',
                        'currency_position',
                        'mail_driver',
                        'mail_encryption',
                        'menu_status',
                        'order_status',
                        'role_status',
                        'sms_provider',
                        'stock_visibility',
                        'store_status',
                        'user_status',
                    ],
                    'constants' => [
                        'timezones',
                        'currencies',
                        'currencies_map',
                        'vital_permissions',
                    ],
                ],
            ]);

        $smsProvider = $response->json('data.modules.setting.sms_provider');
        $this->assertContains('twilio', $smsProvider['values']);
        $this->assertContains('vonage', $smsProvider['values']);
        $this->assertContains('aws_sns', $smsProvider['values']);
    }

    /**
     * Test admin essentials endpoint can filter by specific module.
     */
    public function test_admin_essentials_can_filter_by_module(): void
    {
        $admin = $this->authenticateAdmin();

        $response = $this->actingAs($admin)->getJson('/admin/essentials?module=setting');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'module' => 'setting',
            ])
            ->assertJsonStructure([
                'success',
                'module',
                'data' => [
                    'currency_position',
                    'mail_driver',
                    'mail_encryption',
                    'sms_provider',
                ],
            ]);
    }

    /**
     * Test admin essentials endpoint returns successful response for authenticated administrator.
     */
    public function test_admin_essentials_accessible_for_authenticated_admin(): void
    {
        $admin = $this->authenticateAdmin();

        $response = $this->actingAs($admin)->getJson('/admin/essentials');

        $response->assertOk()
            ->assertJson(['success' => true]);
    }

    /**
     * Test that any newly created enum file in app/Enums is automatically discovered without changing code.
     */
    public function test_dynamically_discovers_newly_added_enum_files(): void
    {
        $admin = $this->authenticateAdmin();

        $dummyDir = app_path('Enums/Payment');
        $dummyFile = $dummyDir.'/PaymentStatus.php';

        if (! is_dir($dummyDir)) {
            mkdir($dummyDir, 0755, true);
        }

        $code = <<<'PHP'
<?php

declare(strict_types=1);

namespace App\Enums\Payment;

enum PaymentStatus: string
{
    case Paid = 'paid';
    case Unpaid = 'unpaid';
    case Refunded = 'refunded';
}
PHP;

        file_put_contents($dummyFile, $code);

        try {
            $response = $this->actingAs($admin)->getJson('/admin/essentials');

            $response->assertOk();
            $this->assertNotNull($response->json('data.modules.payment.payment_status'));
            $this->assertEquals(['paid', 'unpaid', 'refunded'], $response->json('data.modules.payment.payment_status.values'));
        } finally {
            if (file_exists($dummyFile)) {
                unlink($dummyFile);
            }
            if (is_dir($dummyDir)) {
                rmdir($dummyDir);
            }
        }
    }

    /**
     * Test public storefront essentials endpoint returns optimized customer payload.
     */
    public function test_user_frontend_essentials_endpoint_returns_storefront_data(): void
    {
        $response = $this->getJson('/api/user/essentials');

        $response->assertOk()
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'data' => [
                    'store' => [
                        'name',
                        'email',
                        'logo_url',
                        'favicon_url',
                    ],
                    'settings' => [
                        'currency_code',
                        'currency_symbol',
                        'currency_decimals',
                        'timezone',
                    ],
                    'payment_gateways' => [
                        'cod',
                        'stripe',
                        'paypal',
                    ],
                    'shipping',
                    'enums' => [
                        'address' => [
                            'address_type',
                        ],
                        'order' => [
                            'order_status',
                            'payment_status',
                            'payment_method',
                        ],
                        'coupon' => [
                            'coupon_type',
                            'coupon_apply_to',
                        ],
                        'product' => [
                            'stock_visibility',
                            'discount_type',
                        ],
                        'setting' => [
                            'currency_position',
                        ],
                    ],
                    'constants' => [
                        'currencies',
                        'currencies_map',
                        'timezones',
                    ],
                ],
            ]);

        // Verify that enums contain the options array with 'value' and 'label'
        $addressTypeOptions = $response->json('data.enums.address.address_type');
        $this->assertIsArray($addressTypeOptions);
        $this->assertNotEmpty($addressTypeOptions);
        $this->assertArrayHasKey('value', $addressTypeOptions[0]);
        $this->assertArrayHasKey('label', $addressTypeOptions[0]);

        // Security assertions: Admin-only and sensitive secrets must NOT be exposed
        $this->assertArrayNotHasKey('vital_permissions', $response->json('data.constants'));
        $this->assertArrayNotHasKey('sms_provider', $response->json('data.enums'));
        $this->assertArrayNotHasKey('mail_driver', $response->json('data.enums'));
        $this->assertArrayNotHasKey('secret_key', $response->json('data.payment_gateways.stripe'));
        $this->assertArrayNotHasKey('client_secret', $response->json('data.payment_gateways.paypal'));

        // Disabled gateways are not exposed for display purpose
        $this->assertArrayNotHasKey('razorpay', $response->json('data.payment_gateways'));
    }

    /**
     * Test newly added public setting in database automatically appears in storefront essentials without code change.
     */
    public function test_user_frontend_automatically_includes_new_public_setting_added_in_database(): void
    {
        \App\Models\Setting::create([
            'key' => 'announcement_bar_text',
            'value' => 'Get 20% discount on your first order!',
            'group' => 'storefront',
            'type' => 'string',
            'is_public' => true,
        ]);
        \App\Models\Setting::clearCache();

        $response = $this->getJson('/api/user/essentials');

        $response->assertOk()
            ->assertJsonPath('data.settings.announcement_bar_text', 'Get 20% discount on your first order!');
    }

    /**
     * Test newly added payment gateway in database automatically appears in storefront essentials with secrets masked.
     */
    public function test_user_frontend_automatically_reflects_new_payment_gateway_added_in_database(): void
    {
        $existing = \App\Models\Setting::getPaymentSettings();
        $existing['apple_pay'] = [
            'enabled' => true,
            'name' => 'Apple Pay Express',
            'merchant_id' => 'merchant.com.mystore',
            'merchant_secret' => 'enc:super_secret_credentials',
        ];

        \App\Models\Setting::updateOrCreate(
            ['key' => 'payment_settings'],
            [
                'value' => json_encode($existing),
                'type' => 'json',
                'group' => 'payment',
                'is_public' => false,
            ]
        );
        \App\Models\Setting::clearCache();

        $response = $this->getJson('/api/user/essentials');

        $response->assertOk()
            ->assertJsonPath('data.payment_gateways.apple_pay.name', 'Apple Pay Express')
            ->assertJsonPath('data.payment_gateways.apple_pay.merchant_id', 'merchant.com.mystore');

        $this->assertArrayNotHasKey('merchant_secret', $response->json('data.payment_gateways.apple_pay'));
    }

    /**
     * Test newly configured enum in database automatically appears in storefront essentials without code change.
     */
    public function test_user_frontend_automatically_reflects_new_enum_configured_in_database(): void
    {
        $frontendEnums = [
            'address' => ['address_type'],
            'order' => ['order_status'],
            'store' => ['store_status'],
        ];

        \App\Models\Setting::updateOrCreate(
            ['key' => 'frontend_enums'],
            [
                'value' => json_encode($frontendEnums),
                'type' => 'json',
                'group' => 'system',
                'is_public' => false,
            ]
        );
        \App\Models\Setting::clearCache();

        $response = $this->getJson('/api/user/essentials');

        $response->assertOk();
        $storeStatusOptions = $response->json('data.enums.store.store_status');
        $this->assertIsArray($storeStatusOptions);
        $this->assertNotEmpty($storeStatusOptions);
        $this->assertArrayHasKey('value', $storeStatusOptions[0]);
        $this->assertArrayHasKey('label', $storeStatusOptions[0]);
    }
}

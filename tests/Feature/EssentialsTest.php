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
     * Test public API essentials endpoint returns all enums and constants.
     */
    public function test_api_essentials_returns_all_enums_and_constants(): void
    {
        $response = $this->getJson('/api/essentials');

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
                        'date_formats',
                        'time_formats',
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
     * Test essentials endpoint can filter by specific module.
     */
    public function test_api_essentials_can_filter_by_module(): void
    {
        $response = $this->getJson('/api/essentials?module=setting');

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

        $response = $this->actingAs($admin)->getJson('/admin/essentials');

        $response->assertOk()
            ->assertJson(['success' => true]);
    }

    /**
     * Test that any newly created enum file in app/Enums is automatically discovered without changing code.
     */
    public function test_dynamically_discovers_newly_added_enum_files(): void
    {
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
            $response = $this->getJson('/api/essentials');

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
}

<?php

namespace Tests\Feature;

use App\Models\Menu;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Setting;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DatabaseMigrationsAndSeedersTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test schema structure created by consolidated migrations.
     */
    public function test_database_schema_has_all_expected_tables_and_no_legacy_tables(): void
    {
        // Expected tables
        $this->assertTrue(Schema::hasTable('users'));
        $this->assertTrue(Schema::hasTable('password_reset_tokens'));
        $this->assertTrue(Schema::hasTable('sessions'));
        $this->assertTrue(Schema::hasTable('personal_access_tokens'));
        $this->assertTrue(Schema::hasTable('menus'));
        $this->assertTrue(Schema::hasTable('roles'));
        $this->assertTrue(Schema::hasTable('role_user'));
        $this->assertTrue(Schema::hasTable('menu_role'));
        $this->assertTrue(Schema::hasTable('role_permissions'));
        $this->assertTrue(Schema::hasTable('stores'));
        $this->assertTrue(Schema::hasTable('settings'));

        // Legacy tables removed
        $this->assertFalse(Schema::hasTable('permissions'));
        $this->assertFalse(Schema::hasTable('permission_role'));

        // Menus table columns
        $this->assertTrue(Schema::hasColumn('menus', 'slug'));
        $this->assertTrue(Schema::hasColumn('menus', 'parent_slug'));
        $this->assertTrue(Schema::hasColumn('menus', 'sort_order'));
        $this->assertTrue(Schema::hasColumn('menus', 'is_crud'));
        $this->assertTrue(Schema::hasColumn('menus', 'is_import_export'));
        $this->assertFalse(Schema::hasColumn('menus', 'section'));
    }

    /**
     * Test DatabaseSeeder runs successfully and populates database with all components.
     */
    public function test_database_seeder_executes_completely(): void
    {
        $this->seed(DatabaseSeeder::class);

        // Menus seeded
        $this->assertGreaterThan(0, Menu::count());
        $this->assertDatabaseHas('menus', ['slug' => 'dashboard']);
        $this->assertDatabaseHas('menus', ['slug' => 'products']);

        // Roles and permissions seeded
        $this->assertGreaterThan(0, Role::count());
        $this->assertDatabaseHas('roles', ['name' => 'Super Admin']);
        $this->assertGreaterThan(0, RolePermission::count());

        // Store profile seeded
        $this->assertDatabaseHas('stores', ['email' => 'support@store.com']);

        // Settings seeded
        $this->assertDatabaseHas('settings', ['key' => 'currency_code']);

        // Users seeded
        $this->assertDatabaseHas('users', ['email' => 'admin@example.com']);
        $this->assertGreaterThanOrEqual(4, User::count());
    }

    /**
     * Test all model factories function correctly.
     */
    public function test_all_model_factories_create_valid_instances(): void
    {
        // User factory
        $user = User::factory()->create();
        $this->assertNotNull($user->id);
        $this->assertDatabaseHas('users', ['id' => $user->id]);

        // Role factory
        $role = Role::factory()->create();
        $this->assertNotNull($role->id);
        $this->assertDatabaseHas('roles', ['id' => $role->id]);

        $systemRole = Role::factory()->system()->create();
        $this->assertTrue($systemRole->is_system);

        // Menu factory
        $menu = Menu::factory()->crud()->importExport()->create();
        $this->assertNotNull($menu->slug);
        $this->assertTrue($menu->is_crud);
        $this->assertTrue($menu->is_import_export);

        $childMenu = Menu::factory()->childOf($menu)->create();
        $this->assertSame($menu->slug, $childMenu->parent_slug);

        // RolePermission factory
        $rolePermission = RolePermission::factory()->fullAccess()->create([
            'role_id' => $role->id,
            'menu_slug' => $menu->slug,
        ]);
        $this->assertNotNull($rolePermission->id);
        $this->assertTrue($rolePermission->can_view);
        $this->assertTrue($rolePermission->can_add);

        // Store factory
        $store = Store::factory()->create();
        $this->assertNotNull($store->id);
        $this->assertDatabaseHas('stores', ['id' => $store->id]);

        // Setting factory
        $setting = Setting::factory()->create();
        $this->assertNotNull($setting->key);
        $this->assertDatabaseHas('settings', ['key' => $setting->key]);
    }
}

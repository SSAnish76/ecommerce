<?php

namespace Tests\Feature;

use App\Models\Menu;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MenuAndRolePermissionTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->adminUser = User::where('email', 'admin@example.com')->first();
    }

    /**
     * Test menu seeder creates parent-child menus with slug as primary key and no section column.
     */
    public function test_menu_seeder_seeds_parent_child_menus_without_section_column(): void
    {
        $this->assertFalse(Schema::hasColumn('menus', 'section'));
        $this->assertTrue(Schema::hasColumn('menus', 'parent_slug'));
        $this->assertTrue(Schema::hasColumn('menus', 'sort_order'));
        $this->assertTrue(Schema::hasColumn('menus', 'is_crud'));
        $this->assertTrue(Schema::hasColumn('menus', 'is_import_export'));

        // Root menus
        $this->assertDatabaseHas('menus', [
            'slug' => 'dashboard',
            'name' => 'Dashboard',
            'sort_order' => 'A01',
            'parent_slug' => null,
        ]);
        $this->assertDatabaseHas('menus', [
            'slug' => 'catalog',
            'name' => 'Catalog',
            'parent_slug' => null,
        ]);

        // Child menus
        $this->assertDatabaseHas('menus', [
            'slug' => 'analytics',
            'name' => 'Analytics',
            'parent_slug' => 'dashboard',
        ]);
        $this->assertDatabaseHas('menus', [
            'slug' => 'products',
            'name' => 'Products',
            'parent_slug' => 'catalog',
            'is_crud' => true,
        ]);

        $dashboard = Menu::find('dashboard');
        $this->assertNotNull($dashboard);
        $this->assertTrue($dashboard->children()->where('slug', 'analytics')->exists());

        $catalog = Menu::find('catalog');
        $this->assertNotNull($catalog);
        $this->assertTrue($catalog->children()->where('slug', 'products')->exists());
    }

    /**
     * Test RolePermission table exists and seeds correctly.
     */
    public function test_role_permissions_are_seeded_correctly(): void
    {
        $this->assertTrue(Schema::hasTable('role_permissions'));
        $this->assertFalse(Schema::hasTable('permissions'));
        $this->assertFalse(Schema::hasTable('permission_role'));

        $superAdmin = Role::where('name', 'Super Admin')->first();
        $this->assertNotNull($superAdmin);

        $superAdminPerm = RolePermission::where('role_id', $superAdmin->id)
            ->where('menu_slug', 'products')
            ->first();

        $this->assertNotNull($superAdminPerm);
        $this->assertTrue($superAdminPerm->can_view);
        $this->assertTrue($superAdminPerm->can_create);
        $this->assertTrue($superAdminPerm->can_update);
        $this->assertTrue($superAdminPerm->can_delete);
        $this->assertTrue($superAdminPerm->can_import);
        $this->assertTrue($superAdminPerm->can_export);
    }

    /**
     * Test user allowedMenus and permission checking via RolePermission.
     */
    public function test_user_permissions_resolved_via_role_permissions(): void
    {
        $editorRole = Role::where('name', 'Editor')->first();
        $this->assertNotNull($editorRole);

        $editorUser = User::factory()->create();
        $editorUser->assignRole($editorRole);

        // Editor has can_view on users and dashboard, but not can_create or can_delete
        $this->assertTrue($editorUser->hasPermission('users.view'));
        $this->assertFalse($editorUser->hasPermission('users.create'));
        $this->assertFalse($editorUser->hasPermission('users.delete'));
    }

    /**
     * Test admin can view roles index page with roles and available menus.
     */
    public function test_admin_can_view_roles_index_page(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/admin/roles');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Roles/Index')
            ->has('roles')
            ->has('available_menus')
            ->has('filters')
        );
    }

    /**
     * Test admin can view roles create page.
     */
    public function test_admin_can_view_roles_create_page(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/admin/roles/create');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Roles/CreateOrEdit')
            ->where('role', null)
            ->has('available_menus')
        );
    }

    /**
     * Test admin can view roles edit page.
     */
    public function test_admin_can_view_roles_edit_page(): void
    {
        $managerRole = Role::where('name', 'Manager')->first();
        $this->assertNotNull($managerRole);

        $response = $this->actingAs($this->adminUser)->get("/admin/roles/{$managerRole->id}/edit");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Roles/CreateOrEdit')
            ->has('role')
            ->where('role.id', $managerRole->id)
            ->has('available_menus')
        );
    }

    /**
     * Test updating a role syncs menus and RolePermissions matrix.
     */
    public function test_updating_role_syncs_menus_and_role_permissions(): void
    {
        $managerRole = Role::where('name', 'Manager')->first();
        $this->assertNotNull($managerRole);

        $response = $this->actingAs($this->adminUser)->put("/admin/roles/{$managerRole->id}", [
            'name' => 'Store Operations Lead',
            'menu_slugs' => ['dashboard', 'products'],
            'role_permissions' => [
                'products' => [
                    'can_view' => true,
                    'can_create' => true,
                    'can_update' => true,
                    'can_delete' => false,
                    'can_import' => true,
                    'can_export' => true,
                ],
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $managerRole->refresh();
        $this->assertSame('Store Operations Lead', $managerRole->name);
        $this->assertEqualsCanonicalizing(['dashboard', 'products'], $managerRole->menus->pluck('slug')->all());

        $productPerm = RolePermission::where('role_id', $managerRole->id)
            ->where('menu_slug', 'products')
            ->first();

        $this->assertNotNull($productPerm);
        $this->assertTrue($productPerm->can_view);
        $this->assertTrue($productPerm->can_create);
        $this->assertTrue($productPerm->can_update);
        $this->assertFalse($productPerm->can_delete);
        $this->assertTrue($productPerm->can_import);
        $this->assertTrue($productPerm->can_export);
    }

    /**
     * Test creating a new role with custom RolePermission matrix.
     */
    public function test_creating_new_role_with_role_permissions(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/admin/roles', [
            'name' => 'Inventory Auditor',
            'menu_slugs' => ['dashboard', 'inventory'],
            'role_permissions' => [
                'inventory' => [
                    'can_view' => true,
                    'can_create' => false,
                    'can_update' => true,
                    'can_delete' => false,
                    'can_import' => true,
                    'can_export' => true,
                ],
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $role = Role::where('name', 'Inventory Auditor')->first();
        $this->assertNotNull($role);
        $this->assertEqualsCanonicalizing(['dashboard', 'inventory'], $role->menus->pluck('slug')->all());

        $invPerm = RolePermission::where('role_id', $role->id)->where('menu_slug', 'inventory')->first();
        $this->assertNotNull($invPerm);
        $this->assertTrue($invPerm->can_view);
        $this->assertFalse($invPerm->can_create);
        $this->assertTrue($invPerm->can_update);
    }

    /**
     * Test deleting a role and protection of system roles.
     */
    public function test_deleting_role_and_protection_of_system_roles(): void
    {
        $superAdmin = Role::where('name', 'Super Admin')->first();
        $response = $this->actingAs($this->adminUser)->delete("/admin/roles/{$superAdmin->id}");
        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertDatabaseHas('roles', ['name' => 'Super Admin']);

        $customRole = Role::create(['name' => 'Temporary Staff']);
        RolePermission::create([
            'role_id' => $customRole->id,
            'menu_slug' => 'dashboard',
            'can_view' => true,
        ]);

        $deleteResponse = $this->actingAs($this->adminUser)->delete("/admin/roles/{$customRole->id}");
        $deleteResponse->assertRedirect();
        $deleteResponse->assertSessionHas('success');
        $this->assertDatabaseMissing('roles', ['name' => 'Temporary Staff']);
        $this->assertDatabaseMissing('role_permissions', ['role_id' => $customRole->id]);
    }

    /**
     * Test Menu::roleMenuData returns cached role menus with attached permissions.
     */
    public function test_role_menu_data_is_cached_and_scoped_per_role(): void
    {
        $editorRole = Role::where('name', 'Editor')->first();
        $this->assertNotNull($editorRole);

        $editorUser = User::factory()->create();
        $editorUser->assignRole($editorRole);

        $menus = Menu::roleMenuData($editorUser);
        $this->assertIsArray($menus);

        // Editor has access to dashboard and users, but each menu has permissions attached
        $menuSlugs = collect($menus)->pluck('slug')->all();
        $this->assertContains('dashboard', $menuSlugs);
        $this->assertContains('users', $menuSlugs);

        $usersMenu = collect($menus)->firstWhere('slug', 'users');
        $this->assertNotNull($usersMenu);
        $this->assertArrayHasKey('permissions', $usersMenu);
        $this->assertTrue($usersMenu['permissions']['can_view']);
        $this->assertFalse($usersMenu['permissions']['can_create']);

        // Check super admin gets full permissions
        $superAdminMenus = Menu::roleMenuData($this->adminUser);
        $this->assertNotEmpty($superAdminMenus);
        $adminUsersMenu = collect($superAdminMenus)->firstWhere('slug', 'users');
        $this->assertTrue($adminUsersMenu['permissions']['can_create']);
    }

    /**
     * Test Inertia request sharing delivers only menus without duplicate props.
     */
    public function test_inertia_requests_share_simplified_role_menu_and_permissions(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/admin');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('menus')
            ->missing('navigation_menus')
            ->missing('auth.user.role_permissions')
            ->missing('auth.user.permissions')
            ->missing('auth.user.allowed_menus')
        );
    }
}


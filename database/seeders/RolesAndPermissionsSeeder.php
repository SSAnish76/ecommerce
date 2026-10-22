<?php

namespace Database\Seeders;

use App\Enums\Menu\MenuStatus;
use App\Enums\User\UserStatus;
use App\Models\Menu;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Ensure parent-child menus exist
        $this->call(MenuSeeder::class);

        $menus = Menu::query()->where('status', MenuStatus::Active)->get();

        // 2. Define Roles
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin'], ['is_system' => true]);
        $superAdmin->update(['is_system' => true]);

        $admin = Role::firstOrCreate(['name' => 'Admin']);
        $manager = Role::firstOrCreate(['name' => 'Manager']);
        $editor = Role::firstOrCreate(['name' => 'Editor']);

        // 3. Helper to synchronize RolePermission matrix
        $syncRolePermissions = function (Role $role, array $allowedSlugs = [], bool $isFullAccess = false, bool $isViewOnly = false) use ($menus): void {
            RolePermission::where('role_id', $role->id)->delete();

            $targetMenus = $isFullAccess
                ? $menus
                : $menus->filter(fn (Menu $m) => in_array($m->slug, $allowedSlugs, true));

            foreach ($targetMenus as $menu) {
                if ($isViewOnly) {
                    RolePermission::create([
                        'role_id' => $role->id,
                        'menu_slug' => $menu->slug,
                        'can_view' => true,
                        'can_add' => false,
                        'can_update' => false,
                        'can_delete' => false,
                        'can_import' => false,
                        'can_export' => false,
                    ]);
                } else {
                    RolePermission::create([
                        'role_id' => $role->id,
                        'menu_slug' => $menu->slug,
                        'can_view' => true,
                        'can_add' => (bool) $menu->is_crud,
                        'can_update' => (bool) $menu->is_crud,
                        'can_delete' => $isFullAccess ? (bool) $menu->is_crud : ($menu->slug !== 'roles' && (bool) $menu->is_crud),
                        'can_import' => (bool) $menu->is_import_export,
                        'can_export' => (bool) $menu->is_import_export,
                    ]);
                }
            }
        };

        // Super Admin - Full Universal Access
        $syncRolePermissions($superAdmin, [], true);

        // Admin - Operational modules
        $syncRolePermissions($admin, $menus->pluck('slug')->all(), false);

        // Manager - Daily operations
        $managerMenuSlugs = [
            'dashboard', 'analytics',
            'catalog', 'products', 'categories', 'brands', 'inventory', 'attributes', 'collections',
            'sales', 'orders', 'customers', 'coupons',
            'platform', 'store', 'settings', 'profile',
        ];
        $syncRolePermissions($manager, $managerMenuSlugs, false);

        // Editor - View access on dashboard and users
        $editorMenuSlugs = ['dashboard', 'users'];
        $syncRolePermissions($editor, $editorMenuSlugs, false, true);

        // 4. Ensure default admin user exists with Super Admin role
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'status' => UserStatus::Active,
                'role_id' => $superAdmin->id,
            ]
        );

        if ($adminUser->role_id !== $superAdmin->id) {
            $adminUser->update(['role_id' => $superAdmin->id]);
        }
    }
}

<?php

namespace Database\Seeders;

use App\Enums\Menu\MenuStatus;
use App\Models\Menu;
use Illuminate\Database\Seeder;

class MenuSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $menus = [
            // 1. Dashboard (Root) & Children
            [
                'slug' => 'dashboard',
                'parent_slug' => null,
                'name' => 'Dashboard',
                'description' => 'Real-time sales, order velocity and telemetry',
                'href' => '/admin',
                'icon' => 'LayoutDashboard',
                'sort_order' => 'A01',
                'is_crud' => false,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'analytics',
                'parent_slug' => 'dashboard',
                'name' => 'Analytics',
                'description' => 'Business intelligence, revenue reports and metrics',
                'href' => '/admin/analytics',
                'icon' => 'BarChart3',
                'sort_order' => 'A02',
                'is_crud' => false,
                'is_import_export' => true,
                'status' => MenuStatus::Active,
            ],

            // 2. Catalog (Root) & Children
            [
                'slug' => 'catalog',
                'parent_slug' => null,
                'name' => 'Catalog',
                'description' => 'Product catalog and inventory management',
                'href' => '/admin/products',
                'icon' => 'ShoppingBag',
                'sort_order' => 'B01',
                'is_crud' => false,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'products',
                'parent_slug' => 'catalog',
                'name' => 'Products',
                'description' => 'Manage storefront product listings, inventory and pricing',
                'href' => '/admin/products',
                'icon' => 'ShoppingBag',
                'sort_order' => 'B02',
                'is_crud' => true,
                'is_import_export' => true,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'categories',
                'parent_slug' => 'catalog',
                'name' => 'Categories',
                'description' => 'Taxonomy classification and nested categories',
                'href' => '/admin/categories',
                'icon' => 'FolderTree',
                'sort_order' => 'B03',
                'is_crud' => true,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'brands',
                'parent_slug' => 'catalog',
                'name' => 'Brands',
                'description' => 'Brand directory, logos and manufacturer identity',
                'href' => '/admin/brands',
                'icon' => 'Sparkles',
                'sort_order' => 'B04',
                'is_crud' => true,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'inventory',
                'parent_slug' => 'catalog',
                'name' => 'Inventory',
                'description' => 'Warehouse stock levels and replenishment alerts',
                'href' => '/admin/inventory',
                'icon' => 'Boxes',
                'sort_order' => 'B05',
                'is_crud' => true,
                'is_import_export' => true,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'attributes',
                'parent_slug' => 'catalog',
                'name' => 'Attributes',
                'description' => 'Global variant attributes (Color, Size, RAM, Storage)',
                'href' => '/admin/attributes',
                'icon' => 'Sliders',
                'sort_order' => 'B06',
                'is_crud' => true,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'collections',
                'parent_slug' => 'catalog',
                'name' => 'Collections',
                'description' => 'Curated product groupings (Trending, Most Viewed, Seasonal)',
                'href' => '/admin/collections',
                'icon' => 'Layers',
                'sort_order' => 'B07',
                'is_crud' => true,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],

            // 3. Sales & Fulfillment (Root) & Children
            [
                'slug' => 'sales',
                'parent_slug' => null,
                'name' => 'Sales',
                'description' => 'Orders, customers and promotional discounts',
                'href' => '/admin/orders',
                'icon' => 'ShoppingCart',
                'sort_order' => 'C01',
                'is_crud' => false,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'orders',
                'parent_slug' => 'sales',
                'name' => 'Orders',
                'description' => 'Order processing, packing status and invoice dispatch',
                'href' => '/admin/orders',
                'icon' => 'ShoppingCart',
                'sort_order' => 'C02',
                'is_crud' => true,
                'is_import_export' => true,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'customers',
                'parent_slug' => 'sales',
                'name' => 'Customers',
                'description' => 'Buyer profiles, order history and lifetime value',
                'href' => '/admin/customers',
                'icon' => 'UserCheck',
                'sort_order' => 'C03',
                'is_crud' => true,
                'is_import_export' => true,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'coupons',
                'parent_slug' => 'sales',
                'name' => 'Coupons & Deals',
                'description' => 'Promotional discount campaigns and vouchers',
                'href' => '/admin/coupons',
                'icon' => 'TicketPercent',
                'sort_order' => 'C04',
                'is_crud' => true,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],

            // 4. Administration (Root) & Children
            [
                'slug' => 'administration',
                'parent_slug' => null,
                'name' => 'Administration',
                'description' => 'Staff access and role permissions control',
                'href' => '/admin/users',
                'icon' => 'Shield',
                'sort_order' => 'D01',
                'is_crud' => false,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'users',
                'parent_slug' => 'administration',
                'name' => 'Users',
                'description' => 'Manage administrator and staff user credentials',
                'href' => '/admin/users',
                'icon' => 'Users',
                'sort_order' => 'D02',
                'is_crud' => true,
                'is_import_export' => true,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'roles',
                'parent_slug' => 'administration',
                'name' => 'Roles',
                'description' => 'Define staff roles and configure accessible operational modules',
                'href' => '/admin/roles',
                'icon' => 'Shield',
                'sort_order' => 'D03',
                'is_crud' => true,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],

            // 5. Platform & Settings (Root) & Children
            [
                'slug' => 'platform',
                'parent_slug' => null,
                'name' => 'Store & Settings',
                'description' => 'Platform settings, store profile and administrator security',
                'href' => '/admin/settings',
                'icon' => 'Settings',
                'sort_order' => 'E01',
                'is_crud' => false,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'store',
                'parent_slug' => 'platform',
                'name' => 'Store Profile',
                'description' => 'Manage storefront brand, identity and address',
                'href' => '/admin/store',
                'icon' => 'Store',
                'sort_order' => 'E02',
                'is_crud' => true,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'settings',
                'parent_slug' => 'platform',
                'name' => 'System Settings',
                'description' => 'Platform configuration, currency and payments',
                'href' => '/admin/settings',
                'icon' => 'Settings',
                'sort_order' => 'E03',
                'is_crud' => true,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],
            [
                'slug' => 'profile',
                'parent_slug' => 'platform',
                'name' => 'Admin Profile',
                'description' => 'Personal administrator account security and two-factor auth',
                'href' => '/admin/profile',
                'icon' => 'ShieldCheck',
                'sort_order' => 'E04',
                'is_crud' => true,
                'is_import_export' => false,
                'status' => MenuStatus::Active,
            ],
        ];

        // Seed parents first, then children to satisfy foreign key constraint
        $parents = array_filter($menus, fn ($m) => $m['parent_slug'] === null);
        $children = array_filter($menus, fn ($m) => $m['parent_slug'] !== null);

        foreach ($parents as $menuData) {
            Menu::updateOrCreate(
                ['slug' => $menuData['slug']],
                $menuData
            );
        }

        foreach ($children as $menuData) {
            Menu::updateOrCreate(
                ['slug' => $menuData['slug']],
                $menuData
            );
        }
    }
}

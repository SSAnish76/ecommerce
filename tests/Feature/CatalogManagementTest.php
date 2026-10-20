<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->adminUser = User::where('email', 'admin@example.com')->firstOrFail();
    }

    public function test_admin_can_view_brands_index(): void
    {
        Brand::factory()->count(3)->create();

        $response = $this->actingAs($this->adminUser)->get('/admin/brands');

        $response->assertStatus(200);
    }

    public function test_admin_can_create_brand(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/admin/brands', [
            'name' => 'Logitech',
            'website' => 'https://logitech.com',
            'description' => 'Computer peripherals and gaming hardware',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('brands', ['name' => 'Logitech', 'slug' => 'logitech']);
    }

    public function test_admin_can_view_categories_index(): void
    {
        Category::factory()->count(3)->create();

        $response = $this->actingAs($this->adminUser)->get('/admin/categories');

        $response->assertStatus(200);
    }

    public function test_admin_can_create_category_and_subcategory(): void
    {
        $parent = Category::factory()->create(['name' => 'Computers']);

        $response = $this->actingAs($this->adminUser)->post('/admin/categories', [
            'parent_id' => $parent->id,
            'name' => 'Laptops',
            'description' => 'Portable computers',
            'is_active' => true,
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('categories', [
            'name' => 'Laptops',
            'parent_id' => $parent->id,
        ]);
    }

    public function test_admin_can_view_products_index_and_create_page(): void
    {
        Product::factory()->count(2)->create();

        $indexRes = $this->actingAs($this->adminUser)->get('/admin/products');
        $indexRes->assertStatus(200);

        $createRes = $this->actingAs($this->adminUser)->get('/admin/products/create');
        $createRes->assertStatus(200);
    }

    public function test_admin_can_create_product_with_variants_and_images(): void
    {
        $brand = Brand::factory()->create();
        $category = Category::factory()->create();

        $response = $this->actingAs($this->adminUser)->post('/admin/products', [
            'name' => 'Mechanical Gaming Keyboard',
            'sku' => 'KEY-MECH-RGB',
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'mrp' => 149.99,
            'retail_price' => 129.99,
            'sale_price' => 99.99,
            'discount_percentage' => 33.33,
            'stock_quantity' => 50,
            'low_stock_threshold' => 10,
            'has_variants' => true,
            'status' => 'active',
            'images' => [
                ['image_path' => 'https://example.com/keyboard.jpg', 'alt_text' => 'Keyboard Front', 'is_primary' => true],
            ],
            'variants' => [
                ['sku' => 'KEY-MECH-RED', 'name' => 'Red Switch', 'price' => 99.99, 'stock_quantity' => 25],
                ['sku' => 'KEY-MECH-BLU', 'name' => 'Blue Switch', 'price' => 99.99, 'stock_quantity' => 25],
            ],
        ]);

        $response->assertRedirect('/admin/products');
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('products', ['sku' => 'KEY-MECH-RGB']);
        $this->assertDatabaseHas('product_images', ['image_path' => 'https://example.com/keyboard.jpg']);
        $this->assertDatabaseHas('product_variants', ['sku' => 'KEY-MECH-RED']);
    }

    public function test_admin_can_view_inventory_and_update_stock(): void
    {
        $product = Product::factory()->create(['stock_quantity' => 20]);

        $indexRes = $this->actingAs($this->adminUser)->get('/admin/inventory');
        $indexRes->assertStatus(200);

        $updateRes = $this->actingAs($this->adminUser)->put("/admin/inventory/product/{$product->id}", [
            'stock_quantity' => 45,
            'low_stock_threshold' => 8,
        ]);

        $updateRes->assertSessionHas('success');
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'stock_quantity' => 45,
            'low_stock_threshold' => 8,
        ]);
    }
}

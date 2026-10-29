<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\Product\ProductStatus;
use App\Enums\Product\StockVisibility;
use App\Models\Brand;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StockVisibilityTest extends TestCase
{
    use RefreshDatabase;

    protected Customer $customer;
    protected Category $category;
    protected Brand $brand;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = Customer::create([
            'name' => 'Alice Shopper',
            'email' => 'alice@example.com',
            'phone' => '+1987654321',
            'password' => Hash::make('secret123'),
            'status' => 'active',
        ]);

        $this->brand = Brand::create([
            'name' => 'Acme Inc',
            'slug' => 'acme-inc',
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Gadgets',
            'slug' => 'gadgets',
            'is_active' => true,
        ]);
    }

    /**
     * Test badge visibility displays sold out product but prevents adding to cart.
     */
    public function test_badge_visibility_shows_product_in_catalog_but_blocks_cart_addition(): void
    {
        $product = Product::create([
            'name' => 'Out of Stock Badge Item',
            'slug' => 'badge-item',
            'sku' => 'BADGE-001',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'retail_price' => 50.00,
            'sale_price' => null,
            'stock_quantity' => 0,
            'stock_visibility' => StockVisibility::Badge,
            'status' => ProductStatus::Active,
        ]);

        // Catalog listing should include product
        $catalogResponse = $this->getJson('/api/user/products');
        $catalogResponse->assertOk()
            ->assertJsonFragment([
                'id' => $product->id,
                'is_in_stock' => false,
                'stock_visibility' => 'badge',
                'allows_backorder' => false,
            ]);

        // Adding to cart should fail due to insufficient stock
        Sanctum::actingAs($this->customer);
        $cartResponse = $this->postJson('/api/user/cart', [
            'product_id' => $product->id,
            'quantity' => 1,
        ]);

        $cartResponse->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => "Insufficient stock for 'Out of Stock Badge Item'. Only 0 available.",
            ]);
    }

    /**
     * Test hide visibility completely hides out of stock product from catalog and prevents cart addition.
     */
    public function test_hide_visibility_hides_product_from_catalog_and_blocks_cart(): void
    {
        $product = Product::create([
            'name' => 'Hidden Out of Stock Item',
            'slug' => 'hidden-item',
            'sku' => 'HIDE-001',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'retail_price' => 75.00,
            'stock_quantity' => 0,
            'stock_visibility' => StockVisibility::Hide,
            'status' => ProductStatus::Active,
        ]);

        // Catalog listing should NOT include product
        $catalogResponse = $this->getJson('/api/user/products');
        $catalogResponse->assertOk()
            ->assertJsonMissing(['id' => $product->id]);

        // Direct product detail endpoint returns 400
        $detailResponse = $this->getJson("/api/user/products/{$product->slug}");
        $detailResponse->assertStatus(400);

        // Attempting to add to cart returns 400
        Sanctum::actingAs($this->customer);
        $cartResponse = $this->postJson('/api/user/cart', [
            'product_id' => $product->id,
            'quantity' => 1,
        ]);

        $cartResponse->assertStatus(400);
    }

    /**
     * Test backorder visibility allows adding to cart and updating beyond available stock.
     */
    public function test_backorder_visibility_allows_cart_and_marks_backorder_status(): void
    {
        $product = Product::create([
            'name' => 'Backorderable Item',
            'slug' => 'backorder-item',
            'sku' => 'BO-001',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'retail_price' => 120.00,
            'stock_quantity' => 2,
            'stock_visibility' => StockVisibility::Backorder,
            'status' => ProductStatus::Active,
        ]);

        // Catalog shows allows_backorder
        $catalogResponse = $this->getJson('/api/user/products');
        $catalogResponse->assertOk()
            ->assertJsonFragment([
                'id' => $product->id,
                'allows_backorder' => true,
                'stock_visibility' => 'backorder',
            ]);

        Sanctum::actingAs($this->customer);

        // Adding 5 units when only 2 are in stock succeeds on backorder
        $cartResponse = $this->postJson('/api/user/cart', [
            'product_id' => $product->id,
            'quantity' => 5,
        ]);

        $cartResponse->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'cart' => [
                        'summary' => [
                            'total_quantity' => 5,
                        ],
                    ],
                ],
            ]);

        $cartItemId = $cartResponse->json('data.item_added.id');

        // Check cart list returns backorder flags
        $listResponse = $this->getJson('/api/user/cart');
        $listResponse->assertOk()
            ->assertJsonFragment([
                'id' => $cartItemId,
                'quantity' => 5,
                'available_stock' => 2,
                'is_in_stock' => false,
                'allows_backorder' => true,
                'is_backorder' => true,
            ]);

        // Updating to 10 units succeeds
        $updateResponse = $this->putJson("/api/user/cart/{$cartItemId}", [
            'quantity' => 10,
        ]);

        $updateResponse->assertOk()
            ->assertJsonFragment([
                'total_quantity' => 10,
            ]);
    }

    /**
     * Test global out_of_stock_visibility setting applies to default products.
     */
    public function test_global_setting_controls_default_product_behavior(): void
    {
        // Set global setting to hide
        Setting::updateOrCreate(
            ['key' => 'out_of_stock_visibility'],
            [
                'value' => 'hide',
                'group' => 'products',
                'type' => 'string',
                'label' => 'Out-of-Stock Catalog Visibility',
            ]
        );
        Setting::clearCache();

        $product = Product::create([
            'name' => 'Default Product When Global Hide',
            'slug' => 'global-hide-item',
            'sku' => 'GH-001',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'retail_price' => 40.00,
            'stock_quantity' => 0,
            'stock_visibility' => StockVisibility::Badge, // default badge, but global is hide
            'status' => ProductStatus::Active,
        ]);

        $this->assertEquals(StockVisibility::Hide, $product->effectiveStockVisibility());
        $this->assertTrue($product->shouldHideWhenOutOfStock());

        // Catalog hides it
        $catalogResponse = $this->getJson('/api/user/products');
        $catalogResponse->assertOk()
            ->assertJsonMissing(['id' => $product->id]);

        // Direct product view 400s
        $this->getJson("/api/user/products/{$product->slug}")->assertStatus(400);

        // Reset global setting to badge
        Setting::updateOrCreate(
            ['key' => 'out_of_stock_visibility'],
            ['value' => 'badge']
        );
        Setting::clearCache();

        $this->assertEquals(StockVisibility::Badge, $product->fresh()->effectiveStockVisibility());
        $this->assertFalse($product->fresh()->shouldHideWhenOutOfStock());

        $this->getJson("/api/user/products/{$product->slug}")->assertOk();
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\Product\ProductStatus;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StorefrontTest extends TestCase
{
    use RefreshDatabase;

    public function test_storefront_catalog_can_be_rendered(): void
    {
        $category = Category::create([
            'name' => 'Audio',
            'slug' => 'audio',
            'is_active' => true,
        ]);

        $brand = Brand::create([
            'name' => 'Sony',
            'slug' => 'sony',
            'is_active' => true,
        ]);

        Product::create([
            'name' => 'Wireless Headphones',
            'slug' => 'wireless-headphones',
            'sku' => 'WH-1000',
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'retail_price' => 299.99,
            'sale_price' => 249.99,
            'stock_quantity' => 15,
            'status' => ProductStatus::Active,
        ]);

        $response = $this->get(route('shop.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Shop/Index')
            ->has('products.data', 1)
            ->has('categories', 1)
            ->has('brands', 1)
        );
    }

    public function test_storefront_catalog_filters_by_search_and_category(): void
    {
        $category = Category::create([
            'name' => 'Smartphones',
            'slug' => 'smartphones',
            'is_active' => true,
        ]);

        Product::create([
            'name' => 'Pixel 9 Pro',
            'slug' => 'pixel-9-pro',
            'sku' => 'PIX-009',
            'category_id' => $category->id,
            'retail_price' => 999.00,
            'stock_quantity' => 10,
            'status' => ProductStatus::Active,
        ]);

        $response = $this->get('/shop?category=smartphones&search=Pixel');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Shop/Index')
            ->has('products.data', 1)
        );
    }

    public function test_customer_can_checkout_product_via_shop_checkout(): void
    {
        $product = Product::create([
            'name' => 'Mechanical Keyboard',
            'slug' => 'mechanical-keyboard',
            'sku' => 'KB-001',
            'retail_price' => 120.00,
            'sale_price' => 100.00,
            'stock_quantity' => 10,
            'has_variants' => false,
            'status' => ProductStatus::Active,
        ]);

        $response = $this->postJson(route('shop.checkout'), [
            'customer_name' => 'Alex Kumar',
            'customer_email' => 'alex@example.com',
            'customer_phone' => '+1234567890',
            'shipping_address' => '456 Main St, San Francisco, CA 94105',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                ],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('orders', [
            'customer_name' => 'Alex Kumar',
            'customer_email' => 'alex@example.com',
            'status' => 'pending',
            'payment_method' => 'cod',
        ]);

        $this->assertDatabaseHas('order_items', [
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => 100.00,
            'subtotal' => 200.00,
        ]);

        // Inventory deduction check
        $this->assertEquals(8, $product->fresh()->stock_quantity);
    }

    public function test_customer_can_checkout_variant_product_with_auto_variant_fallback(): void
    {
        $product = Product::create([
            'name' => 'Wireless Mouse',
            'slug' => 'wireless-mouse',
            'sku' => 'MS-001',
            'retail_price' => 50.00,
            'sale_price' => 45.00,
            'stock_quantity' => 20,
            'has_variants' => true,
            'status' => ProductStatus::Active,
        ]);

        $variant = \App\Models\ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Matte Black',
            'sku' => 'MS-001-BLK',
            'price' => 50.00,
            'sale_price' => 45.00,
            'stock_quantity' => 15,
            'is_active' => true,
        ]);

        $response = $this->postJson(route('shop.checkout'), [
            'customer_name' => 'Priya Devi',
            'customer_email' => 'priya@example.com',
            'shipping_address' => '789 Grand Avenue, San Jose, CA',
            'payment_method' => 'card',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('order_items', [
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'variant_name' => 'Matte Black',
            'quantity' => 1,
        ]);

        $this->assertEquals(14, $variant->fresh()->stock_quantity);
    }

    public function test_authenticated_customer_checkout_links_customer_id(): void
    {
        $customer = \App\Models\Customer::create([
            'name' => 'Meena Sundaram',
            'email' => 'meena@example.com',
            'phone' => '+1555123456',
            'password' => \Illuminate\Support\Facades\Hash::make('SecretPass123!'),
            'status' => 'active',
        ]);

        $token = $customer->createToken('test-customer-token')->plainTextToken;

        $product = Product::create([
            'name' => 'Desk Lamp LED',
            'slug' => 'desk-lamp-led',
            'sku' => 'LAMP-01',
            'retail_price' => 35.00,
            'sale_price' => 30.00,
            'stock_quantity' => 50,
            'has_variants' => false,
            'status' => ProductStatus::Active,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson(route('shop.checkout'), [
                'customer_name' => 'Meena Sundaram',
                'customer_email' => 'meena@example.com',
                'shipping_address' => '100 University Ave, Palo Alto, CA',
                'payment_method' => 'cod',
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('orders', [
            'customer_id' => $customer->id,
            'customer_email' => 'meena@example.com',
            'status' => 'pending',
        ]);
    }

    public function test_admin_logged_in_session_does_not_cause_foreign_key_violation_on_checkout(): void
    {
        // Admin user in users table
        $admin = \App\Models\User::factory()->create();

        $product = Product::create([
            'name' => 'Bluetooth Speaker',
            'slug' => 'bluetooth-speaker',
            'sku' => 'SPK-99',
            'retail_price' => 70.00,
            'sale_price' => 60.00,
            'stock_quantity' => 30,
            'has_variants' => false,
            'status' => ProductStatus::Active,
        ]);

        // Simulate request while admin session is active
        $response = $this->actingAs($admin, 'web')
            ->postJson(route('shop.checkout'), [
                'customer_name' => 'Guest Shopper',
                'customer_email' => 'guest.shopper@example.com',
                'shipping_address' => '222 Pine St, Seattle, WA',
                'payment_method' => 'cod',
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        // Customer ID should NOT be the admin user UUID (which would violate FK)
        $this->assertDatabaseHas('orders', [
            'customer_name' => 'Guest Shopper',
            'customer_email' => 'guest.shopper@example.com',
            'customer_id' => null,
        ]);
    }
}

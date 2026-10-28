<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Database\Seeders\AttributeSeeder;
use Database\Seeders\MenuSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductVariantSystemTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(MenuSeeder::class);
        $this->seed(AttributeSeeder::class);
        $this->adminUser = User::where('email', 'admin@example.com')->firstOrFail();
    }

    public function test_admin_can_view_attributes_index(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/admin/attributes');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Attributes')
            ->has('attributes')
        );
    }

    public function test_admin_can_create_custom_attribute_and_values(): void
    {
        $payload = [
            'name' => 'Material',
            'code' => 'material',
            'type' => 'button',
            'is_active' => true,
            'sort_order' => 10,
            'values' => [
                ['value' => 'Titanium', 'label' => 'Titanium Grade 5', 'is_active' => true, 'sort_order' => 1],
                ['value' => 'Ceramic', 'label' => 'Polished Ceramic', 'is_active' => true, 'sort_order' => 2],
            ],
        ];

        $response = $this->actingAs($this->adminUser)->post('/admin/attributes', $payload);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('attributes', ['code' => 'material', 'name' => 'Material']);
        $this->assertDatabaseHas('attribute_values', ['value' => 'Titanium']);
        $this->assertDatabaseHas('attribute_values', ['value' => 'Ceramic']);
    }

    public function test_admin_can_quick_create_attribute_value_via_api(): void
    {
        /** @var Attribute $colorAttr */
        $colorAttr = Attribute::where('code', 'color')->firstOrFail();

        $response = $this->actingAs($this->adminUser)->postJson("/admin/attributes/{$colorAttr->id}/quick-value", [
            'value' => 'Midnight Emerald',
            'color_code' => '#064e3b',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $this->assertDatabaseHas('attribute_values', [
            'attribute_id' => $colorAttr->id,
            'value' => 'Midnight Emerald',
            'color_code' => '#064e3b',
        ]);
    }

    public function test_admin_can_create_product_with_dynamic_attributes_and_variants(): void
    {
        $category = Category::factory()->create();
        $brand = Brand::factory()->create();

        /** @var Attribute $colorAttr */
        $colorAttr = Attribute::where('code', 'color')->firstOrFail();
        /** @var Attribute $storageAttr */
        $storageAttr = Attribute::where('code', 'storage')->firstOrFail();

        $redVal = AttributeValue::where('attribute_id', $colorAttr->id)
            ->where('value', 'Crimson Red')
            ->firstOrFail();

        $storage128 = AttributeValue::where('attribute_id', $storageAttr->id)
            ->where('value', '128GB')
            ->firstOrFail();

        $storage256 = AttributeValue::where('attribute_id', $storageAttr->id)
            ->where('value', '256GB')
            ->firstOrFail();

        $payload = [
            'name' => 'Flagship Ultra Phone',
            'slug' => 'flagship-ultra-phone',
            'sku' => 'PHONE-ULTRA',
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'mrp' => 1199.00,
            'retail_price' => 999.00,
            'stock_quantity' => 0,
            'low_stock_threshold' => 5,
            'status' => 'active',
            'has_variants' => true,
            'stock_visibility' => 'badge',
            'location_availability_type' => 'all',
            'attribute_ids' => [$colorAttr->id, $storageAttr->id],
            'attribute_value_ids' => [$redVal->id, $storage128->id, $storage256->id],
            'variants' => [
                [
                    'sku' => 'PHONE-RED-128',
                    'name' => 'Flagship Ultra - Crimson Red / 128GB',
                    'price' => 999.00,
                    'mrp' => 1199.00,
                    'stock_quantity' => 20,
                    'low_stock_threshold' => 5,
                    'is_active' => true,
                    'attributes' => ['Color' => 'Crimson Red', 'Storage' => '128GB'],
                    'attribute_value_ids' => [$redVal->id, $storage128->id],
                ],
                [
                    'sku' => 'PHONE-RED-256',
                    'name' => 'Flagship Ultra - Crimson Red / 256GB',
                    'price' => 1099.00,
                    'mrp' => 1299.00,
                    'stock_quantity' => 15,
                    'low_stock_threshold' => 5,
                    'is_active' => true,
                    'attributes' => ['Color' => 'Crimson Red', 'Storage' => '256GB'],
                    'attribute_value_ids' => [$redVal->id, $storage256->id],
                ],
            ],
        ];

        $response = $this->actingAs($this->adminUser)->post('/admin/products', $payload);

        $response->assertSessionHas('success');

        /** @var Product $product */
        $product = Product::where('slug', 'flagship-ultra-phone')->firstOrFail();
        $this->assertEquals(35, $product->stock_quantity); // 20 + 15
        $this->assertCount(2, $product->attributes);
        $this->assertCount(3, $product->attributeValues);
        $this->assertCount(2, $product->variants);

        $this->assertDatabaseHas('product_variants', [
            'product_id' => $product->id,
            'sku' => 'PHONE-RED-128',
            'stock_quantity' => 20,
        ]);
    }

    public function test_customer_can_view_product_detail_page_with_variants(): void
    {
        $category = Category::factory()->create();
        $product = Product::factory()->create([
            'category_id' => $category->id,
            'status' => 'active',
            'has_variants' => true,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'PROD-VAR-1',
            'name' => 'Variant One',
            'price' => 149.00,
            'stock_quantity' => 10,
            'is_active' => true,
            'attributes' => ['Size' => 'XL'],
        ]);

        $response = $this->get("/product/{$product->slug}");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Shop/ProductDetail')
            ->has('product.variants')
        );
    }

    public function test_customer_checkout_atomically_deducts_variant_and_product_stock(): void
    {
        $product = Product::factory()->create([
            'status' => 'active',
            'has_variants' => true,
            'stock_quantity' => 50,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'SHIRT-BLU-M',
            'name' => 'Cotton Shirt - Blue / M',
            'price' => 45.00,
            'stock_quantity' => 12,
            'is_active' => true,
            'attributes' => ['Color' => 'Blue', 'Size' => 'M'],
        ]);

        $payload = [
            'customer_name' => 'Jane Customer',
            'customer_email' => 'jane@example.com',
            'customer_phone' => '+1234567890',
            'shipping_address' => '123 Market St, Suite 400, San Francisco, CA',
            'payment_method' => 'cod',
            'notes' => 'Leave at front door',
            'items' => [
                [
                    'product_id' => $product->id,
                    'product_variant_id' => $variant->id,
                    'quantity' => 3,
                ],
            ],
        ];

        $response = $this->postJson('/checkout', $payload);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Assert variant stock decremented: 12 - 3 = 9
        $this->assertEquals(9, $variant->fresh()->stock_quantity);

        // Assert parent product stock decremented: 50 - 3 = 47
        $this->assertEquals(47, $product->fresh()->stock_quantity);

        // Assert order and order item created
        $order = Order::where('customer_email', 'jane@example.com')->firstOrFail();
        $this->assertEquals(135.00, (float) $order->total_amount);
        $this->assertEquals('pending', $order->status->value);

        $this->assertDatabaseHas('order_items', [
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'sku' => 'SHIRT-BLU-M',
            'quantity' => 3,
            'price' => 45.00,
            'subtotal' => 135.00,
        ]);
    }

    public function test_checkout_fails_on_insufficient_stock(): void
    {
        $product = Product::factory()->create([
            'status' => 'active',
            'has_variants' => true,
            'stock_quantity' => 2,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'LIMITED-EDITION',
            'name' => 'Limited Variant',
            'price' => 500.00,
            'stock_quantity' => 2,
            'is_active' => true,
        ]);

        $payload = [
            'customer_name' => 'Bob Buyer',
            'customer_email' => 'bob@example.com',
            'shipping_address' => '456 Main St',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $product->id,
                    'product_variant_id' => $variant->id,
                    'quantity' => 5, // Exceeds available 2
                ],
            ],
        ];

        $response = $this->postJson('/checkout', $payload);

        $response->assertStatus(422);
        $response->assertJson(['success' => false]);
        $this->assertEquals(2, $variant->fresh()->stock_quantity); // Stock remains unchanged
    }

    public function test_admin_order_cancellation_restocks_variant_and_product_inventory(): void
    {
        $product = Product::factory()->create(['stock_quantity' => 10]);
        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'RESTOCK-VAR',
            'name' => 'Restock Item',
            'price' => 100.00,
            'stock_quantity' => 5,
            'is_active' => true,
        ]);

        $order = Order::create([
            'order_number' => 'ORD-TEST-RESTOCK',
            'customer_name' => 'Alice Test',
            'customer_email' => 'alice@example.com',
            'shipping_address' => '789 Elm St',
            'status' => 'pending',
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'subtotal' => 200.00,
            'total_amount' => 200.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'product_name' => $product->name,
            'variant_name' => $variant->name,
            'sku' => $variant->sku,
            'price' => 100.00,
            'quantity' => 2,
            'subtotal' => 200.00,
        ]);

        // Cancel order via admin
        $response = $this->actingAs($this->adminUser)->patch("/admin/orders/{$order->id}/status", [
            'status' => 'cancelled',
        ]);

        $response->assertSessionHas('success');
        $this->assertEquals('cancelled', $order->fresh()->status->value);

        // Restocked: variant 5 + 2 = 7; product 10 + 2 = 12
        $this->assertEquals(7, $variant->fresh()->stock_quantity);
        $this->assertEquals(12, $product->fresh()->stock_quantity);
    }
}

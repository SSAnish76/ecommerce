<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\Product\ProductStatus;
use App\Models\Address;
use App\Models\Brand;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Collection;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Models\Wishlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerApiTest extends TestCase
{
    use RefreshDatabase;

    protected Customer $customer;
    protected Product $product;
    protected Product $variantProduct;
    protected ProductVariant $variant;
    protected Category $category;
    protected Brand $brand;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = Customer::create([
            'name' => 'Jane Customer',
            'email' => 'jane@example.com',
            'phone' => '+1234567890',
            'password' => Hash::make('password123'),
            'status' => 'active',
        ]);

        $this->brand = Brand::create([
            'name' => 'Acme Brand',
            'slug' => 'acme-brand',
            'is_active' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Electronics',
            'slug' => 'electronics',
            'is_active' => true,
        ]);

        $this->product = Product::create([
            'name' => 'Smart Gadget Pro',
            'slug' => 'smart-gadget-pro',
            'sku' => 'SGP-001',
            'short_description' => 'A wonderful smart gadget for modern homes.',
            'description' => 'Full specifications and details for smart gadget.',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'retail_price' => 199.99,
            'sale_price' => 149.99,
            'stock_quantity' => 20,
            'has_variants' => false,
            'status' => ProductStatus::Active,
        ]);

        $this->variantProduct = Product::create([
            'name' => 'Smart Phone Pro',
            'slug' => 'smart-phone-pro',
            'sku' => 'SPP-001',
            'short_description' => 'A wonderful smart phone.',
            'description' => 'Full specifications and details for smart phone.',
            'brand_id' => $this->brand->id,
            'category_id' => $this->category->id,
            'retail_price' => 299.99,
            'sale_price' => 249.99,
            'stock_quantity' => 20,
            'has_variants' => true,
            'status' => ProductStatus::Active,
        ]);

        $this->variant = ProductVariant::create([
            'product_id' => $this->variantProduct->id,
            'name' => 'Midnight Black / 128GB',
            'sku' => 'SPP-001-BLK-128',
            'price' => 219.99,
            'sale_price' => 169.99,
            'stock_quantity' => 10,
            'is_active' => true,
        ]);
    }

    /**
     * Test customer registration.
     */
    public function test_customer_can_register(): void
    {
        $response = $this->postJson('/api/user/auth/register', [
            'name' => 'New Customer',
            'email' => 'newcustomer@example.com',
            'phone' => '+1987654321',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ]);

        $response->assertCreated()
            ->assertJson([
                'success' => true,
                'message' => 'Registration successful!',
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'access_token',
                    'refresh_token',
                    'token_type',
                ],
            ]);

        $this->assertDatabaseHas('customers', ['email' => 'newcustomer@example.com']);
        $this->assertDatabaseMissing('users', ['email' => 'newcustomer@example.com']);
    }

    /**
     * Test customer login with valid credentials.
     */
    public function test_customer_can_login(): void
    {
        $response = $this->postJson('/api/user/auth/login', [
            'email' => 'jane@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Login successful!',
            ])
            ->assertJsonStructure([
                'data' => ['access_token', 'refresh_token', 'token_type'],
            ]);
    }

    /**
     * Test customer cannot login with incorrect password.
     */
    public function test_customer_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/user/auth/login', [
            'email' => 'jane@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
            ]);
    }

    /**
     * Test customer profile and profile update.
     */
    public function test_authenticated_customer_can_view_and_update_profile(): void
    {
        Sanctum::actingAs($this->customer);
        $response = $this->getJson('/api/user/auth/profile');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'customer' => [
                        'email' => 'jane@example.com',
                    ],
                ],
            ]);

        $updateResponse = $this->putJson('/api/user/auth/profile', [
            'name' => 'Jane Updated',
            'email' => 'jane.updated@example.com',
            'phone' => '+1122334455',
        ]);

        $updateResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Jane Updated',
                    'email' => 'jane.updated@example.com',
                ],
            ]);

        $this->assertDatabaseHas('customers', ['email' => 'jane.updated@example.com']);
    }

    /**
     * Test products catalog listing, detail, and related products including is_wishlist functionality.
     */
    public function test_can_list_and_view_products(): void
    {
        // 1. Guest view should have is_wishlist = false
        $listResponse = $this->getJson('/api/user/products');
        $listResponse->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'slug', 'sku', 'effective_price', 'brand', 'category', 'is_wishlist'],
                ],
                'pagination' => ['total', 'current_page', 'last_page'],
            ]);
        $this->assertFalse($listResponse->json('data.0.is_wishlist'));

        // Verify simple variant details in product listing
        $variantProductItem = collect($listResponse->json('data'))->firstWhere('id', $this->variantProduct->id);
        $this->assertNotNull($variantProductItem);
        $this->assertTrue($variantProductItem['has_variants']);
        $this->assertCount(1, $variantProductItem['variants']);
        $this->assertEquals($this->variant->id, $variantProductItem['variants'][0]['id']);
        $this->assertEquals('Midnight Black / 128GB', $variantProductItem['variants'][0]['name']);
        $this->assertEquals('SPP-001-BLK-128', $variantProductItem['variants'][0]['sku']);
        $this->assertEquals(169.99, $variantProductItem['variants'][0]['effective_price']);
        $this->assertTrue($variantProductItem['variants'][0]['is_in_stock']);

        $simpleProductItem = collect($listResponse->json('data'))->firstWhere('id', $this->product->id);
        $this->assertNotNull($simpleProductItem);
        $this->assertFalse($simpleProductItem['has_variants']);
        $this->assertEmpty($simpleProductItem['variants']);

        $detailResponse = $this->getJson("/api/user/products/{$this->product->slug}");
        $detailResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $this->product->id,
                    'slug' => 'smart-gadget-pro',
                    'effective_price' => 149.99,
                    'is_wishlist' => false,
                ],
            ]);

        // 2. Authenticated customer who wishlisted the product should have is_wishlist = true
        Wishlist::create([
            'customer_id' => $this->customer->id,
            'product_id' => $this->product->id,
        ]);

        Sanctum::actingAs($this->customer);

        $authListResponse = $this->getJson('/api/user/products');
        $authListResponse->assertOk();
        $matched = collect($authListResponse->json('data'))->firstWhere('id', $this->product->id);
        $this->assertNotNull($matched);
        $this->assertTrue($matched['is_wishlist']);

        $authDetailResponse = $this->getJson("/api/user/products/{$this->product->slug}");
        $authDetailResponse->assertOk()
            ->assertJson([
                'data' => [
                    'id' => $this->product->id,
                    'is_wishlist' => true,
                ],
            ]);

        $relatedResponse = $this->getJson("/api/user/products/{$this->product->id}/related");
        $relatedResponse->assertOk()->assertJson(['success' => true]);
    }

    /**
     * Test product listing does not trigger N+1 queries when products have variants.
     */
    public function test_product_listing_does_not_trigger_n_plus_one_queries_with_variants(): void
    {
        // Create 5 additional products with multiple variants
        for ($i = 1; $i <= 5; $i++) {
            $p = Product::create([
                'name' => "Batch Product {$i}",
                'slug' => "batch-product-{$i}",
                'sku' => "BP-00{$i}",
                'brand_id' => $this->brand->id,
                'category_id' => $this->category->id,
                'retail_price' => 100.00,
                'sale_price' => 80.00,
                'stock_quantity' => 10,
                'has_variants' => true,
                'status' => ProductStatus::Active,
            ]);

            ProductVariant::create([
                'product_id' => $p->id,
                'name' => "Variant A {$i}",
                'sku' => "BP-00{$i}-VA",
                'price' => 100.00,
                'stock_quantity' => 5,
                'is_active' => true,
            ]);

            ProductVariant::create([
                'product_id' => $p->id,
                'name' => "Variant B {$i}",
                'sku' => "BP-00{$i}-VB",
                'price' => 110.00,
                'stock_quantity' => 5,
                'is_active' => true,
            ]);
        }

        \Illuminate\Support\Facades\DB::flushQueryLog();
        \Illuminate\Support\Facades\DB::enableQueryLog();

        $response = $this->getJson('/api/user/products?per_page=20');
        $response->assertOk();

        $queries = \Illuminate\Support\Facades\DB::getQueryLog();
        \Illuminate\Support\Facades\DB::disableQueryLog();

        // 1 count query, 1 select products query, 1 brands, 1 categories, 1 primaryImage, 1 variants
        // Total should be small and constant (<= 8 queries for all products)
        $this->assertLessThanOrEqual(8, count($queries), 'N+1 detected in product listing with variants. Total queries: ' . count($queries));
    }

    /**
     * Test categories listing and detail.
     */
    public function test_can_list_and_view_categories(): void
    {
        $response = $this->getJson('/api/user/categories');
        $response->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'slug'],
                ],
            ]);

        $detailResponse = $this->getJson("/api/user/categories/{$this->category->slug}");
        $detailResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'category' => ['slug' => 'electronics'],
                ],
            ]);
    }

    /**
     * Test collections listing and detail.
     */
    public function test_can_list_and_view_collections(): void
    {
        $collection = Collection::create([
            'name' => 'Featured Deals',
            'slug' => 'featured-deals',
            'type' => 'product',
            'is_active' => true,
        ]);
        $collection->products()->attach($this->product->id);

        $response = $this->getJson('/api/user/collections');
        $response->assertOk()->assertJson(['success' => true]);

        $detailResponse = $this->getJson("/api/user/collections/{$collection->slug}");
        $detailResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'collection' => ['slug' => 'featured-deals'],
                ],
            ]);
    }

    /**
     * Test search and suggestions.
     */
    public function test_can_search_products_and_get_suggestions(): void
    {
        $searchResponse = $this->getJson('/api/user/search?q=Gadget');
        $searchResponse->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonCount(1, 'data');

        $suggestResponse = $this->getJson('/api/user/search/suggestions?q=Gadget');
        $suggestResponse->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'data' => ['products', 'categories', 'brands'],
            ]);
    }

    /**
     * Test wishlist add, toggle, check, and remove.
     */
    public function test_customer_can_manage_wishlist(): void
    {
        Sanctum::actingAs($this->customer);

        // Add
        $addResponse = $this->postJson('/api/user/wishlist', [
            'product_id' => $this->product->id,
        ]);
        $addResponse->assertCreated()
            ->assertJson([
                'success' => true,
                'data' => ['in_wishlist' => true],
            ]);

        // Check
        $checkResponse = $this->getJson("/api/user/wishlist/check/{$this->product->id}");
        $checkResponse->assertOk()
            ->assertJson([
                'data' => ['in_wishlist' => true],
            ]);

        // List
        $listResponse = $this->getJson('/api/user/wishlist');
        $listResponse->assertOk()
            ->assertJsonCount(1, 'data');

        // Toggle (should remove)
        $toggleResponse = $this->postJson('/api/user/wishlist/toggle', [
            'product_id' => $this->product->id,
        ]);
        $toggleResponse->assertOk()
            ->assertJson([
                'data' => ['in_wishlist' => false],
            ]);

        $this->assertDatabaseMissing('wishlists', [
            'customer_id' => $this->customer->id,
            'product_id' => $this->product->id,
        ]);
    }

    /**
     * Test customer cart management.
     */
    public function test_customer_can_manage_cart(): void
    {
        Sanctum::actingAs($this->customer);

        // Attempting to add product with variants without variant id should fail
        $variantRequiredResponse = $this->postJson('/api/user/cart', [
            'product_id' => $this->variantProduct->id,
            'quantity' => 1,
        ]);
        $variantRequiredResponse->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'This product has variants. Please select a variant to add to cart.',
            ]);

        // Attempting to add standard product with mismatched variant id should fail in validation
        $standardWithVariantResponse = $this->postJson('/api/user/cart', [
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 1,
        ]);
        $standardWithVariantResponse->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Validation failed.',
                'error' => [
                    'product_variant_id' => [
                        'Selected variant is not valid for this product or unavailable.',
                    ],
                ],
            ]);

        // Add standard product
        $addResponse = $this->postJson('/api/user/cart', [
            'product_id' => $this->product->id,
            'quantity' => 2,
        ]);
        $addResponse->assertCreated()
            ->assertJson([
                'success' => true,
                'data' => [
                    'cart' => [
                        'summary' => [
                            'total_quantity' => 2,
                            'subtotal' => 299.98,
                        ],
                    ],
                ],
            ]);

        $cartItemId = $addResponse->json('data.item_added.id');

        // Add variant item
        $addVariantResponse = $this->postJson('/api/user/cart', [
            'product_id' => $this->variantProduct->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 1,
        ]);
        $addVariantResponse->assertCreated();

        // Update quantity
        $updateResponse = $this->putJson("/api/user/cart/{$cartItemId}", [
            'quantity' => 3,
        ]);
        $updateResponse->assertOk()
            ->assertJson([
                'data' => [
                    'summary' => [
                        'total_quantity' => 4, // 3 product + 1 variant
                    ],
                ],
            ]);

        // Remove single item
        $removeResponse = $this->deleteJson("/api/user/cart/{$cartItemId}");
        $removeResponse->assertOk()
            ->assertJson([
                'data' => [
                    'summary' => [
                        'total_quantity' => 1,
                    ],
                ],
            ]);

        // Clear cart
        $clearResponse = $this->deleteJson('/api/user/cart');
        $clearResponse->assertOk()
            ->assertJson([
                'data' => [
                    'summary' => [
                        'total_quantity' => 0,
                        'subtotal' => 0.0,
                    ],
                ],
            ]);
    }

    /**
     * Test customer address CRUD.
     */
    public function test_customer_can_manage_addresses(): void
    {
        Sanctum::actingAs($this->customer);

        // Create address
        $createResponse = $this->postJson('/api/user/addresses', [
            'name' => 'Jane Doe Home',
            'phone' => '+15551234567',
            'type' => 'shipping',
            'address_line_1' => '123 Market St',
            'city' => 'San Francisco',
            'state' => 'CA',
            'postal_code' => '94103',
            'country' => 'United States',
            'is_default' => true,
        ]);

        $createResponse->assertCreated()
            ->assertJson([
                'success' => true,
                'data' => [
                    'city' => 'San Francisco',
                    'is_default' => true,
                ],
            ]);

        $addressId = $createResponse->json('data.id');

        // List
        $listResponse = $this->getJson('/api/user/addresses');
        $listResponse->assertOk()
            ->assertJsonCount(1, 'data');

        // Update
        $updateResponse = $this->putJson("/api/user/addresses/{$addressId}", [
            'address_line_1' => '456 Grand Ave',
        ]);
        $updateResponse->assertOk()
            ->assertJson([
                'data' => [
                    'address_line_1' => '456 Grand Ave',
                ],
            ]);

        // Delete
        $deleteResponse = $this->deleteJson("/api/user/addresses/{$addressId}");
        $deleteResponse->assertOk();
        $this->assertDatabaseMissing('addresses', ['id' => $addressId]);
    }

    /**
     * Test checkout summary calculation and coupon validation.
     */
    public function test_checkout_summary_and_coupon_application(): void
    {
        Sanctum::actingAs($this->customer);

        // Add item to cart first
        $this->postJson('/api/user/cart', [
            'product_id' => $this->product->id,
            'quantity' => 2,
        ]);

        // Summary with address input and use_cart
        $summaryResponse = $this->postJson('/api/user/checkout/summary', [
            'use_cart' => true,
            'address_line_1' => '100 Broadway',
            'city' => 'New York',
            'postal_code' => '10001',
            'billing_same_as_shipping' => true,
        ]);

        $summaryResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'totals' => [
                        'subtotal' => 299.98,
                        'total' => 309.98,
                    ],
                ],
            ]);

        $this->assertStringContainsString('100 Broadway', $summaryResponse->json('data.shipping_address'));
        $this->assertStringContainsString('100 Broadway', $summaryResponse->json('data.billing_address'));
    }

    /**
     * Test complete checkout placement, stock decrement, and order cancellation.
     */
    public function test_complete_checkout_placement_and_cancellation(): void
    {
        Sanctum::actingAs($this->customer);

        $initialProductStock = $this->product->stock_quantity; // 20
        $initialVariantStock = $this->variant->stock_quantity; // 10

        // Place order directly
        $checkoutResponse = $this->postJson('/api/user/checkout', [
            'shipping_address' => '789 Sunset Blvd, Los Angeles, CA 90028',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $this->variantProduct->id,
                    'product_variant_id' => $this->variant->id,
                    'quantity' => 2,
                ],
                [
                    'product_id' => $this->product->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $checkoutResponse->assertCreated()
            ->assertJson([
                'success' => true,
            ]);

        $orderNumber = $checkoutResponse->json('data.order.order_number');
        $this->assertNotNull($orderNumber);

        // Verify stock decremented
        $this->assertEquals($initialVariantStock - 2, $this->variant->fresh()->stock_quantity);

        // View order details
        $orderDetailResponse = $this->getJson("/api/user/orders/{$orderNumber}");
        $orderDetailResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_number' => $orderNumber,
                    'status' => 'pending',
                ],
            ]);

        // Cancel order and verify stock restoration
        $cancelResponse = $this->postJson("/api/user/orders/{$orderNumber}/cancel", [
            'reason' => 'Changed my mind',
        ]);

        $cancelResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'cancelled',
                ],
            ]);

        $this->assertEquals($initialVariantStock, $this->variant->fresh()->stock_quantity);
    }

    /**
     * Test checkout generates sequential order number based on configured settings.
     */
    public function test_checkout_generates_sequential_order_number_from_settings(): void
    {
        Sanctum::actingAs($this->customer);

        Setting::set('order_prefix', 'INV-', 'orders', 'string');
        Setting::set('order_number_start', 7500, 'orders', 'integer');

        $response1 = $this->postJson('/api/user/checkout', [
            'shipping_address' => '123 Test St, Boston, MA',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $response1->assertCreated();
        $this->assertSame('INV-7500', $response1->json('data.order.order_number'));

        $response2 = $this->postJson('/api/user/checkout', [
            'shipping_address' => '123 Test St, Boston, MA',
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $response2->assertCreated();
        $this->assertSame('INV-7501', $response2->json('data.order.order_number'));
    }

    /**
     * Test checkout saves address for future use and supports separate billing address.
     */
    public function test_checkout_saves_address_for_future_use_and_supports_billing_address(): void
    {
        Sanctum::actingAs($this->customer);

        // 1. Checkout with new address and save_address = true, and separate billing address
        $response = $this->postJson('/api/user/checkout', [
            'address_line_1' => '456 Elm St',
            'city' => 'Seattle',
            'state' => 'WA',
            'postal_code' => '98101',
            'country' => 'United States',
            'phone' => '+15559998888',
            'save_address' => true,
            'billing_same_as_shipping' => false,
            'billing_address' => '789 Commercial Blvd, Chicago, IL 60601',
            'save_billing_address' => true,
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertCreated()
            ->assertJson([
                'success' => true,
            ]);

        $orderData = $response->json('data.order');
        $this->assertStringContainsString('456 Elm St', $orderData['shipping_address']);
        $this->assertStringContainsString('789 Commercial Blvd', $orderData['billing_address']);
        $this->assertSame($this->customer->name, $orderData['customer_name']);
        $this->assertSame($this->customer->email, $orderData['customer_email']);

        // Assert address saved to addresses table for future use
        $this->assertDatabaseHas('addresses', [
            'customer_id' => $this->customer->id,
            'address_line_1' => '456 Elm St',
            'city' => 'Seattle',
            'postal_code' => '98101',
            'type' => 'shipping',
            'is_default' => true,
        ]);

        $this->assertDatabaseHas('addresses', [
            'customer_id' => $this->customer->id,
            'type' => 'billing',
        ]);

        // 2. Subsequent checkout using the saved address via shipping_address_id
        $savedAddress = Address::where('customer_id', $this->customer->id)->where('type', 'shipping')->firstOrFail();

        $subsequentResponse = $this->postJson('/api/user/checkout', [
            'shipping_address_id' => $savedAddress->id,
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $subsequentResponse->assertCreated();
        $this->assertSame($savedAddress->formatted_address, $subsequentResponse->json('data.order.shipping_address'));
        // Billing defaults to shipping when billing_same_as_shipping is not specified
        $this->assertSame($savedAddress->formatted_address, $subsequentResponse->json('data.order.billing_address'));
    }

    /**
     * Test generic JSON structure for unauthenticated requests with 401 code.
     */
    public function test_unauthenticated_request_returns_generic_error_structure_with_401(): void
    {
        $response = $this->withHeaders(['Accept' => 'application/json'])
            ->get('/api/user/auth/profile');

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Unauthenticated.',
                'error' => 'Unauthenticated.',
            ]);

        // Also test with invalid Bearer token
        $invalidTokenResponse = $this->withHeaders([
            'Accept' => 'application/json',
            'Authorization' => 'Bearer 999|invalidTokenStringMock',
        ])->get('/api/user/auth/profile');

        $invalidTokenResponse->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Unauthenticated.',
                'error' => 'Unauthenticated.',
            ]);

        // Test with expired Bearer token
        $expiredToken = $this->customer->createToken(
            name: 'test-expired-token',
            abilities: ['access-api'],
            expiresAt: now()->subMinute()
        )->plainTextToken;

        $expiredTokenResponse = $this->withHeaders([
            'Accept' => 'application/json',
            'Authorization' => 'Bearer '.$expiredToken,
        ])->get('/api/user/auth/profile');

        $expiredTokenResponse->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Access token has expired.',
                'error' => 'Access token has expired.',
            ]);
    }

    /**
     * Test login and register return access and refresh tokens with expiration.
     */
    public function test_auth_returns_access_and_refresh_tokens_with_expiration(): void
    {
        $loginResponse = $this->postJson('/api/user/auth/login', [
            'email' => 'jane@example.com',
            'password' => 'password123',
        ]);

        $loginResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'access_token',
                    'refresh_token',
                    'token_type',
                    'expires_in',
                    'expires_at',
                ],
            ]);

        $this->assertEquals('Bearer', $loginResponse->json('data.token_type'));
        $this->assertGreaterThan(0, $loginResponse->json('data.expires_in'));
        $this->assertNotEmpty($loginResponse->json('data.refresh_token'));
    }

    /**
     * Test refresh token exchange and rotation.
     */
    public function test_customer_can_refresh_tokens_using_valid_refresh_token(): void
    {
        $loginResponse = $this->postJson('/api/user/auth/login', [
            'email' => 'jane@example.com',
            'password' => 'password123',
        ]);

        $refreshToken = $loginResponse->json('data.refresh_token');
        $oldAccessToken = $loginResponse->json('data.access_token');

        // Exchange refresh token for new tokens
        $refreshResponse = $this->postJson('/api/user/auth/refresh', [
            'refresh_token' => $refreshToken,
        ]);

        $refreshResponse->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Token refreshed successfully.',
            ])
            ->assertJsonStructure([
                'data' => [
                    'access_token',
                    'refresh_token',
                    'token_type',
                    'expires_in',
                    'expires_at',
                ],
            ]);

        $newAccessToken = $refreshResponse->json('data.access_token');
        $newRefreshToken = $refreshResponse->json('data.refresh_token');

        $this->assertNotEquals($refreshToken, $newRefreshToken);

        // Access API with new access token
        $profileResponse = $this->withHeaders([
            'Authorization' => "Bearer {$newAccessToken}",
        ])->getJson('/api/user/auth/profile');

        $profileResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'customer' => [
                        'email' => 'jane@example.com',
                    ],
                ],
            ]);

        // Old refresh token must be rotated/revoked and unusable
        $reuseResponse = $this->postJson('/api/user/auth/refresh', [
            'refresh_token' => $refreshToken,
        ]);

        $reuseResponse->assertStatus(401)
            ->assertJson([
                'success' => false,
            ]);
    }

    /**
     * Test using a refresh token on protected resource routes returns 403 forbidden.
     */
    public function test_refresh_token_cannot_access_resource_endpoints(): void
    {
        $loginResponse = $this->postJson('/api/user/auth/login', [
            'email' => 'jane@example.com',
            'password' => 'password123',
        ]);

        $refreshToken = $loginResponse->json('data.refresh_token');

        $forbiddenResponse = $this->withHeaders([
            'Authorization' => "Bearer {$refreshToken}",
        ])->getJson('/api/user/auth/profile');

        $forbiddenResponse->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);
    }

    /**
     * Test refresh fails when refresh token is missing or invalid.
     */
    public function test_refresh_fails_with_invalid_or_missing_token(): void
    {
        // Missing token
        $missingResponse = $this->postJson('/api/user/auth/refresh', []);
        $missingResponse->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Refresh token is required.',
            ]);

        // Invalid token
        $invalidResponse = $this->postJson('/api/user/auth/refresh', [
            'refresh_token' => '99999|invalidString',
        ]);
        $invalidResponse->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Invalid refresh token.',
            ]);
    }
    /**
     * Test retrieval of available order statuses enum list via essentials API.
     */
    public function test_customer_can_retrieve_order_statuses(): void
    {
        Sanctum::actingAs($this->customer);

        $response = $this->getJson('/api/user/essentials');
        $response->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonFragment(['value' => 'pending', 'label' => 'Pending'])
            ->assertJsonFragment(['value' => 'cancelled', 'label' => 'Cancelled']);
    }

    /**
     * Test order filtering by status enum and validation of invalid status.
     */
    public function test_customer_order_status_filtering_and_validation(): void
    {
        Sanctum::actingAs($this->customer);

        // Valid enum filter
        $validResponse = $this->getJson('/api/user/orders?status=pending');
        $validResponse->assertOk()
            ->assertJson(['success' => true]);

        // Invalid enum value should return 400 validation error
        $invalidResponse = $this->getJson('/api/user/orders?status=non_existent_status');
        $invalidResponse->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Validation failed.',
            ]);
    }
}


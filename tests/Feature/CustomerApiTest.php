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
            'status' => ProductStatus::Active,
        ]);

        $this->variant = ProductVariant::create([
            'product_id' => $this->product->id,
            'name' => 'Midnight Black / 128GB',
            'sku' => 'SGP-001-BLK-128',
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
     * Test products catalog listing, detail, and related products.
     */
    public function test_can_list_and_view_products(): void
    {
        $listResponse = $this->getJson('/api/user/products');
        $listResponse->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'slug', 'sku', 'effective_price', 'brand', 'category'],
                ],
                'pagination' => ['total', 'current_page', 'last_page'],
            ]);

        $detailResponse = $this->getJson("/api/user/products/{$this->product->slug}");
        $detailResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $this->product->id,
                    'slug' => 'smart-gadget-pro',
                    'effective_price' => 149.99,
                ],
            ]);

        $relatedResponse = $this->getJson("/api/user/products/{$this->product->id}/related");
        $relatedResponse->assertOk()->assertJson(['success' => true]);
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
            'product_id' => $this->product->id,
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

        // Summary without coupon
        $summaryResponse = $this->postJson('/api/user/checkout/summary', [
            'use_cart' => true,
        ]);

        $summaryResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'totals' => [
                        'subtotal' => 299.98,
                        'total' => 299.98,
                    ],
                ],
            ]);
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
                    'product_id' => $this->product->id,
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
}


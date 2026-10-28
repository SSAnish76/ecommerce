<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\Coupon\CouponApplyTo;
use App\Enums\Coupon\CouponType;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\CouponService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->adminUser = User::where('email', 'admin@example.com')->firstOrFail();
    }

    public function test_admin_can_view_coupons_index(): void
    {
        Coupon::create([
            'code' => 'TEST10',
            'name' => 'Test 10%',
            'type' => CouponType::Percentage,
            'value' => 10,
            'applies_to' => CouponApplyTo::All,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)->get('/admin/coupons');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Coupons/Index')
            ->has('coupons.data', 1)
        );
    }

    public function test_admin_can_create_percentage_coupon(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/admin/coupons', [
            'code' => 'summer25',
            'name' => 'Summer Sale 25%',
            'description' => 'Seasonal promo code',
            'type' => 'percentage',
            'value' => 25,
            'min_order_amount' => 100,
            'max_discount_amount' => 50,
            'applies_to' => 'all',
            'is_active' => true,
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('coupons', [
            'code' => 'SUMMER25',
            'name' => 'Summer Sale 25%',
            'type' => 'percentage',
            'value' => 25.00,
            'min_order_amount' => 100.00,
            'max_discount_amount' => 50.00,
            'applies_to' => 'all',
            'is_active' => true,
        ]);
    }

    public function test_admin_can_create_fixed_coupon_for_products(): void
    {
        $product = Product::factory()->create(['name' => 'Headphones']);

        $response = $this->actingAs($this->adminUser)->post('/admin/coupons', [
            'code' => 'FIXED30',
            'name' => 'Save $30 on Headphones',
            'type' => 'fixed',
            'value' => 30,
            'applies_to' => 'products',
            'product_ids' => [$product->id],
            'is_active' => true,
        ]);

        $response->assertSessionHas('success');
        $coupon = Coupon::where('code', 'FIXED30')->firstOrFail();
        $this->assertTrue($coupon->products->contains('id', $product->id));
    }

    public function test_admin_can_update_coupon(): void
    {
        $coupon = Coupon::create([
            'code' => 'OLDCODE',
            'name' => 'Old Title',
            'type' => CouponType::Fixed,
            'value' => 15,
            'applies_to' => CouponApplyTo::All,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)->put("/admin/coupons/{$coupon->id}", [
            'code' => 'NEWCODE',
            'name' => 'New Title',
            'type' => 'percentage',
            'value' => 20,
            'applies_to' => 'all',
            'is_active' => false,
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('coupons', [
            'id' => $coupon->id,
            'code' => 'NEWCODE',
            'name' => 'New Title',
            'type' => 'percentage',
            'value' => 20.00,
            'is_active' => false,
        ]);
    }

    public function test_admin_can_toggle_coupon_status(): void
    {
        $coupon = Coupon::create([
            'code' => 'TOGGLEME',
            'name' => 'Toggle Status Test',
            'type' => CouponType::Percentage,
            'value' => 10,
            'applies_to' => CouponApplyTo::All,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)->patch("/admin/coupons/{$coupon->id}/toggle-status");

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('coupons', [
            'id' => $coupon->id,
            'is_active' => false,
        ]);
    }

    public function test_admin_can_delete_coupon(): void
    {
        $coupon = Coupon::create([
            'code' => 'DELETE1',
            'name' => 'To Be Deleted',
            'type' => CouponType::Fixed,
            'value' => 5,
            'applies_to' => CouponApplyTo::All,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)->delete("/admin/coupons/{$coupon->id}");

        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('coupons', ['id' => $coupon->id]);
    }

    public function test_coupon_service_calculates_discount_with_caps(): void
    {
        $coupon = Coupon::create([
            'code' => 'CAPTEST',
            'name' => 'Cap Test 50%',
            'type' => CouponType::Percentage,
            'value' => 50,
            'min_order_amount' => 100,
            'max_discount_amount' => 60,
            'applies_to' => CouponApplyTo::All,
            'is_active' => true,
        ]);

        $service = app(CouponService::class);

        // Subtotal below min order
        $lowResult = $service->validate('CAPTEST', 80.00);
        $this->assertFalse($lowResult['valid']);

        // Subtotal 200: 50% is 100, capped at 60
        $validResult = $service->validate('CAPTEST', 200.00);
        $this->assertTrue($validResult['valid']);
        $this->assertEquals(60.00, $validResult['discount']);
    }

    public function test_coupon_service_rejects_expired_coupons(): void
    {
        Coupon::create([
            'code' => 'EXPIRED',
            'name' => 'Expired Coupon',
            'type' => CouponType::Percentage,
            'value' => 10,
            'expires_at' => now()->subDay(),
            'applies_to' => CouponApplyTo::All,
            'is_active' => true,
        ]);

        $service = app(CouponService::class);
        $result = $service->validate('EXPIRED', 100.00);

        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('expired', strtolower($result['message']));
    }

    public function test_storefront_checkout_with_coupon_applies_discount_and_records_usage(): void
    {
        $product = Product::factory()->create([
            'name' => 'Smart Watch',
            'retail_price' => 200.00,
            'sale_price' => 200.00,
            'stock_quantity' => 10,
            'status' => 'active',
        ]);

        $coupon = Coupon::create([
            'code' => 'WATCH20',
            'name' => 'Watch Discount 20%',
            'type' => CouponType::Percentage,
            'value' => 20,
            'applies_to' => CouponApplyTo::All,
            'usage_limit' => 10,
            'times_used' => 0,
            'is_active' => true,
        ]);

        $response = $this->postJson('/checkout', [
            'customer_name' => 'John Doe',
            'customer_email' => 'john@example.com',
            'customer_phone' => '1234567890',
            'shipping_address' => '123 Main St, New York',
            'payment_method' => 'cod',
            'coupon_code' => 'WATCH20',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);

        // Check order recorded discount
        // 20% of 200 is 40. Total should be 160.
        $this->assertDatabaseHas('orders', [
            'customer_email' => 'john@example.com',
            'subtotal' => 200.00,
            'coupon_code' => 'WATCH20',
            'discount_amount' => 40.00,
            'total' => 160.00,
        ]);

        // Check coupon times_used incremented
        $this->assertEquals(1, $coupon->fresh()->times_used);

        // Check CouponUsage record
        $this->assertDatabaseHas('coupon_usages', [
            'coupon_id' => $coupon->id,
            'customer_email' => 'john@example.com',
            'discount_amount' => 40.00,
        ]);
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\Address\AddressType;
use App\Enums\Customer\CustomerStatus;
use App\Enums\Order\OrderStatus;
use App\Enums\Order\PaymentStatus;
use App\Models\Address;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminCustomerAndOrderManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->adminUser = User::where('email', 'admin@example.com')->firstOrFail();
    }

    public function test_admin_can_view_customers_list(): void
    {
        Customer::create([
            'name' => 'Alice Customer',
            'email' => 'alice@example.com',
            'phone' => '+15551234567',
            'password' => Hash::make('password123'),
            'status' => CustomerStatus::Active,
        ]);

        $response = $this->actingAs($this->adminUser)->get('/admin/customers');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Customers')
            ->has('customers.data', 1)
            ->where('customers.data.0.name', 'Alice Customer')
            ->has('metrics')
        );
    }

    public function test_admin_can_create_customer_with_primary_address(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/admin/customers', [
            'name' => 'Bob Builder',
            'email' => 'bob@example.com',
            'phone' => '+15559876543',
            'status' => 'active',
            'password' => 'secretPassword123!',
            'address_line_1' => '742 Evergreen Terrace',
            'city' => 'Springfield',
            'state' => 'OR',
            'postal_code' => '97477',
            'country' => 'United States',
        ]);

        $response->assertRedirect('/admin/customers');

        $this->assertDatabaseHas('customers', [
            'name' => 'Bob Builder',
            'email' => 'bob@example.com',
        ]);

        $customer = Customer::where('email', 'bob@example.com')->firstOrFail();

        $this->assertDatabaseHas('addresses', [
            'customer_id' => $customer->id,
            'address_line_1' => '742 Evergreen Terrace',
            'is_default' => 1,
        ]);
    }

    public function test_admin_can_view_customer_detail_page(): void
    {
        $customer = Customer::create([
            'name' => 'Carol Danvers',
            'email' => 'carol@example.com',
            'password' => Hash::make('secret123'),
            'status' => CustomerStatus::Active,
        ]);

        $address = $customer->addresses()->create([
            'type' => AddressType::Home->value,
            'name' => 'Carol Danvers',
            'address_line_1' => '100 Captain Marvel Way',
            'city' => 'Boston',
            'postal_code' => '02101',
            'country' => 'United States',
            'is_default' => true,
        ]);

        $order = Order::create([
            'customer_id' => $customer->id,
            'order_number' => 'ORD-TEST-9001',
            'customer_name' => 'Carol Danvers',
            'customer_email' => 'carol@example.com',
            'shipping_address' => '100 Captain Marvel Way, Boston, MA 02101',
            'subtotal' => 100.00,
            'total' => 110.00,
            'status' => OrderStatus::Processing,
            'payment_status' => PaymentStatus::Paid,
            'payment_method' => 'stripe',
        ]);

        $response = $this->actingAs($this->adminUser)->get("/admin/customers/{$customer->id}");

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Customers/Show')
            ->where('customer.id', $customer->id)
            ->where('customer.name', 'Carol Danvers')
            ->has('customer.addresses', 1)
            ->has('orders.data', 1)
            ->where('orders.data.0.order_number', 'ORD-TEST-9001')
        );
    }

    public function test_admin_can_update_customer_profile(): void
    {
        $customer = Customer::create([
            'name' => 'Old Name',
            'email' => 'old@example.com',
            'password' => Hash::make('password123'),
            'status' => CustomerStatus::Active,
        ]);

        $response = $this->actingAs($this->adminUser)->put("/admin/customers/{$customer->id}", [
            'name' => 'New Name',
            'email' => 'new@example.com',
            'phone' => '+15550001111',
            'status' => 'inactive',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'name' => 'New Name',
            'email' => 'new@example.com',
            'status' => 'inactive',
        ]);
    }

    public function test_admin_can_toggle_customer_status(): void
    {
        $customer = Customer::create([
            'name' => 'Toggle Customer',
            'email' => 'toggle@example.com',
            'password' => Hash::make('password123'),
            'status' => CustomerStatus::Active,
        ]);

        $response = $this->actingAs($this->adminUser)->patch("/admin/customers/{$customer->id}/toggle-status");
        $response->assertRedirect();

        $this->assertEquals(CustomerStatus::Inactive, $customer->fresh()->status);
    }

    public function test_admin_can_manage_customer_addresses(): void
    {
        $customer = Customer::create([
            'name' => 'David Miller',
            'email' => 'david@example.com',
            'password' => Hash::make('password123'),
            'status' => CustomerStatus::Active,
        ]);

        // Add Address
        $addResponse = $this->actingAs($this->adminUser)->post("/admin/customers/{$customer->id}/addresses", [
            'type' => 'billing',
            'name' => 'David Miller',
            'phone' => '+15553334444',
            'address_line_1' => '500 Market St',
            'city' => 'San Francisco',
            'state' => 'CA',
            'postal_code' => '94105',
            'country' => 'United States',
            'is_default' => true,
        ]);

        $addResponse->assertRedirect();
        $address = Address::where('customer_id', $customer->id)->firstOrFail();
        $this->assertTrue($address->is_default);
        $this->assertEquals('500 Market St', $address->address_line_1);

        // Update Address
        $updateResponse = $this->actingAs($this->adminUser)->put("/admin/customers/{$customer->id}/addresses/{$address->id}", [
            'type' => 'shipping',
            'name' => 'David Miller Updated',
            'address_line_1' => '600 Market St Suite 200',
            'city' => 'San Francisco',
            'state' => 'CA',
            'postal_code' => '94105',
            'country' => 'United States',
            'is_default' => true,
        ]);

        $updateResponse->assertRedirect();
        $this->assertEquals('600 Market St Suite 200', $address->fresh()->address_line_1);

        // Add second address and set default
        $this->actingAs($this->adminUser)->post("/admin/customers/{$customer->id}/addresses", [
            'type' => 'office',
            'name' => 'David Miller Work',
            'address_line_1' => '100 Pine St',
            'city' => 'San Francisco',
            'postal_code' => '94111',
            'country' => 'United States',
            'is_default' => false,
        ]);

        $secondAddress = Address::where('customer_id', $customer->id)->where('address_line_1', '100 Pine St')->firstOrFail();
        $this->assertFalse($secondAddress->is_default);

        $this->actingAs($this->adminUser)->patch("/admin/customers/{$customer->id}/addresses/{$secondAddress->id}/default");
        $this->assertTrue($secondAddress->fresh()->is_default);
        $this->assertFalse($address->fresh()->is_default);

        // Delete address
        $deleteResponse = $this->actingAs($this->adminUser)->delete("/admin/customers/{$customer->id}/addresses/{$secondAddress->id}");
        $deleteResponse->assertRedirect();
        $this->assertDatabaseMissing('addresses', ['id' => $secondAddress->id]);
    }

    public function test_admin_can_view_separate_order_detail_page(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-DETAIL-100',
            'customer_name' => 'Emily Thorne',
            'customer_email' => 'emily@example.com',
            'shipping_address' => '789 Hampton Road, Southampton, NY',
            'subtotal' => 200.00,
            'total' => 215.00,
            'status' => OrderStatus::Pending,
            'payment_status' => PaymentStatus::Pending,
            'payment_method' => 'stripe',
        ]);

        $response = $this->actingAs($this->adminUser)->get("/admin/orders/{$order->id}");

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Orders/Show')
            ->where('order.id', $order->id)
            ->where('order.order_number', 'ORD-DETAIL-100')
            ->has('statuses')
            ->has('paymentSummary')
        );
    }

    public function test_admin_can_update_order_status_order_wise(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-STATUS-200',
            'customer_name' => 'Frank Castle',
            'customer_email' => 'frank@example.com',
            'shipping_address' => '123 Hell\'s Kitchen, New York, NY',
            'subtotal' => 50.00,
            'total' => 50.00,
            'status' => OrderStatus::Pending,
            'payment_status' => PaymentStatus::Paid,
            'payment_method' => 'stripe',
        ]);

        $response = $this->actingAs($this->adminUser)->patch("/admin/orders/{$order->id}/status", [
            'status' => 'processing',
        ]);

        $response->assertRedirect();
        $this->assertEquals(OrderStatus::Processing, $order->fresh()->status);
    }

    public function test_admin_can_cancel_order_with_inventory_restock(): void
    {
        $product = Product::factory()->create(['stock_quantity' => 10]);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'stock_quantity' => 5,
        ]);

        $order = Order::create([
            'order_number' => 'ORD-CANCEL-300',
            'customer_name' => 'Gordon Freeman',
            'customer_email' => 'gordon@example.com',
            'shipping_address' => 'Black Mesa Research Facility, NM',
            'subtotal' => 80.00,
            'total' => 85.00,
            'status' => OrderStatus::Processing,
            'payment_status' => PaymentStatus::Pending,
            'payment_method' => 'cod',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'product_name' => $product->name,
            'variant_name' => 'Default Variant',
            'sku' => 'SKU-TEST-01',
            'price' => 80.00,
            'quantity' => 2,
            'subtotal' => 80.00,
        ]);

        $response = $this->actingAs($this->adminUser)->post("/admin/orders/{$order->id}/cancel", [
            'reason' => 'Customer requested change of shipping address before dispatch',
        ]);

        $response->assertRedirect();
        $this->assertEquals(OrderStatus::Cancelled, $order->fresh()->status);

        // Verify inventory restoration
        $this->assertEquals(12, $product->fresh()->stock_quantity);
        $this->assertEquals(7, $variant->fresh()->stock_quantity);
    }

    public function test_admin_can_issue_refund_for_order(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-REFUND-400',
            'customer_name' => 'Helena Wayne',
            'customer_email' => 'helena@example.com',
            'shipping_address' => 'Gotham City Hall',
            'subtotal' => 150.00,
            'total' => 150.00,
            'status' => OrderStatus::Completed,
            'payment_status' => PaymentStatus::Paid,
            'payment_method' => 'cod',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'transaction_id' => 'tx_paid_123',
            'gateway' => 'cod',
            'amount' => 150.00,
            'currency' => 'USD',
            'status' => PaymentStatus::Paid,
            'type' => 'charge',
            'paid_at' => now(),
        ]);

        $response = $this->actingAs($this->adminUser)->post("/admin/orders/{$order->id}/refund", [
            'amount' => 150.00,
            'reason' => 'Customer returned defective item',
            'mark_cancelled' => true,
        ]);

        $response->assertRedirect();

        // Verify order payment status is refunded and order is cancelled
        $this->assertEquals(PaymentStatus::Refunded, $order->fresh()->payment_status);
        $this->assertEquals(OrderStatus::Cancelled, $order->fresh()->status);

        // Verify refund payment transaction was created
        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'type' => 'refund',
            'amount' => 150.00,
            'status' => 'refunded',
        ]);
    }
}


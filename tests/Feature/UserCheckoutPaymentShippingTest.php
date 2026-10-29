<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\Order\OrderStatus;
use App\Enums\Order\PaymentStatus;
use App\Enums\Product\ProductStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserCheckoutPaymentShippingTest extends TestCase
{
    use RefreshDatabase;

    protected Customer $customer;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed basic settings
        Setting::set('currency_code', 'USD');
        Setting::set('currency_symbol', '$');
        Setting::set('payment_cod_enabled', true);
        Setting::set('payment_stripe_enabled', true);
        Setting::set('payment_stripe_secret_key', 'sk_test_123');
        Setting::set('payment_stripe_publishable_key', 'pk_test_123');
        Setting::set('shipping_flat_rate_enabled', true);
        Setting::set('shipping_flat_rate_cost', 15.00);
        Setting::set('shipping_free_shipping_enabled', true);
        Setting::set('shipping_free_min_amount', 100.00);
        Setting::set('shipping_fedex_enabled', true);
        Setting::set('allow_customer_cancellation', true);

        $this->customer = Customer::create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '+1555123456',
            'password' => Hash::make('password123'),
            'status' => 'active',
        ]);

        $this->product = Product::create([
            'name' => 'Wireless Headphones',
            'slug' => 'wireless-headphones',
            'sku' => 'WH-001',
            'retail_price' => 50.00,
            'sale_price' => 50.00,
            'stock_quantity' => 10,
            'status' => ProductStatus::Active,
        ]);
    }

    /**
     * Test getting dynamic shipping rates.
     */
    public function test_customer_can_retrieve_shipping_rates(): void
    {
        Sanctum::actingAs($this->customer);

        $response = $this->postJson('/api/user/checkout/shipping-rates', [
            'shipping_address' => '123 Tech Lane, San Francisco, CA 94105',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Shipping rates calculated successfully.',
            ]);

        $rates = $response->json('data.rates');
        $this->assertIsArray($rates);
        $this->assertNotEmpty($rates);

        $carriers = array_column($rates, 'carrier');
        $this->assertContains('flat_rate', $carriers);
    }

    /**
     * Test checkout creates an order, books shipping, and creates a separate payment record.
     */
    public function test_checkout_records_payment_in_separate_table_and_books_carrier(): void
    {
        Sanctum::actingAs($this->customer);

        $checkoutResponse = $this->postJson('/api/user/checkout', [
            'shipping_address' => '456 Market St, San Francisco, CA',
            'billing_address' => '456 Market St, San Francisco, CA',
            'payment_method' => 'cod',
            'shipping_carrier' => 'flat_rate',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 2,
                ],
            ],
        ]);

        $checkoutResponse->assertCreated()
            ->assertJson([
                'success' => true,
            ]);

        $orderData = $checkoutResponse->json('data.order');
        $orderNumber = $orderData['order_number'];

        // Verify order attributes
        $order = Order::where('order_number', $orderNumber)->firstOrFail();
        $this->assertEquals('flat_rate', $order->shipping_carrier);
        $this->assertNotNull($order->tracking_number);

        // Verify separate payments table has the transaction record
        $payment = Payment::where('order_id', $order->id)->first();
        $this->assertNotNull($payment, 'Payment transaction record was not found in payments table.');
        $this->assertEquals($this->customer->id, $payment->customer_id);
        $this->assertEquals('cod', $payment->gateway);
        $this->assertEquals((float) $order->total, (float) $payment->amount);
        $this->assertEquals(PaymentStatus::Pending, $payment->status);
        $this->assertEquals('charge', $payment->type);

        // Verify order detail API returns payment and shipping info
        $orderResponse = $this->getJson("/api/user/orders/{$orderNumber}");
        $orderResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_number' => $orderNumber,
                    'shipping_carrier' => 'flat_rate',
                    'tracking_number' => $order->tracking_number,
                ],
            ]);

        $paymentsList = $orderResponse->json('data.payments');
        $this->assertCount(1, $paymentsList);
        $this->assertEquals('cod', $paymentsList[0]['gateway']);
        $this->assertEquals($payment->id, $paymentsList[0]['id']);
    }

    /**
     * Test live tracking shipment endpoint.
     */
    public function test_customer_can_track_order_shipment(): void
    {
        Sanctum::actingAs($this->customer);

        $order = Order::create([
            'order_number' => 'ORD-TRACK-001',
            'customer_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'customer_email' => $this->customer->email,
            'customer_phone' => $this->customer->phone,
            'shipping_address' => '789 Elm St',
            'billing_address' => '789 Elm St',
            'status' => OrderStatus::Processing,
            'payment_status' => PaymentStatus::Paid,
            'payment_method' => 'stripe',
            'shipping_carrier' => 'fedex',
            'tracking_number' => 'FDX-TEST-12345',
            'subtotal' => 100.00,
            'total' => 115.00,
        ]);

        $trackResponse = $this->getJson("/api/user/orders/{$order->order_number}/track");
        $trackResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_number' => 'ORD-TRACK-001',
                    'shipping_carrier' => 'fedex',
                    'carrier_label' => 'FedEx',
                    'tracking_number' => 'FDX-TEST-12345',
                ],
            ]);

        $this->assertNotEmpty($trackResponse->json('data.status'));
    }

    /**
     * Test verifying payment marks transaction and order as paid.
     */
    public function test_verify_payment_updates_transaction_and_order_status(): void
    {
        Sanctum::actingAs($this->customer);

        $order = Order::create([
            'order_number' => 'ORD-VERIFY-001',
            'customer_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'customer_email' => $this->customer->email,
            'customer_phone' => $this->customer->phone,
            'shipping_address' => '789 Elm St',
            'billing_address' => '789 Elm St',
            'status' => OrderStatus::Pending,
            'payment_status' => PaymentStatus::Pending,
            'payment_method' => 'stripe',
            'subtotal' => 50.00,
            'total' => 50.00,
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'transaction_id' => 'ch_stripe_pending',
            'gateway' => 'stripe',
            'amount' => 50.00,
            'currency' => 'USD',
            'status' => PaymentStatus::Pending,
            'type' => 'charge',
        ]);

        $verifyResponse = $this->postJson('/api/user/checkout/verify-payment', [
            'order_id' => $order->id,
            'gateway' => 'stripe',
            'transaction_id' => 'ch_stripe_pending',
        ]);

        $verifyResponse->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Payment verified successfully.',
            ]);

        $this->assertEquals(PaymentStatus::Paid, $payment->fresh()->status);
        $this->assertEquals(PaymentStatus::Paid, $order->fresh()->payment_status);
        $this->assertNotNull($payment->fresh()->paid_at);
    }

    /**
     * Test order cancellation triggers refund record in payments table.
     */
    public function test_order_cancellation_records_refund_in_payments_table(): void
    {
        Sanctum::actingAs($this->customer);

        $order = Order::create([
            'order_number' => 'ORD-CANCEL-REFUND-001',
            'customer_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'customer_email' => $this->customer->email,
            'customer_phone' => $this->customer->phone,
            'shipping_address' => '789 Elm St',
            'billing_address' => '789 Elm St',
            'status' => OrderStatus::Pending,
            'payment_status' => PaymentStatus::Paid,
            'payment_method' => 'stripe',
            'shipping_carrier' => 'flat_rate',
            'tracking_number' => 'TRK-FLAT-001',
            'subtotal' => 50.00,
            'total' => 50.00,
        ]);

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'transaction_id' => 'tx_stripe_charge_123',
            'gateway' => 'stripe',
            'amount' => 50.00,
            'currency' => 'USD',
            'status' => PaymentStatus::Paid,
            'type' => 'charge',
            'paid_at' => now(),
        ]);

        $cancelResponse = $this->postJson("/api/user/orders/{$order->order_number}/cancel", [
            'reason' => 'Ordered by mistake',
        ]);

        $cancelResponse->assertOk()
            ->assertJson([
                'success' => true,
            ]);

        $this->assertEquals(OrderStatus::Cancelled, $order->fresh()->status);
        $this->assertEquals(PaymentStatus::Refunded, $order->fresh()->payment_status);

        // Verify refund payment record exists in payments table
        $refundRecord = Payment::where('order_id', $order->id)
            ->where('type', 'refund')
            ->first();

        $this->assertNotNull($refundRecord, 'Refund payment entry was not created in payments table.');
        $this->assertEquals(PaymentStatus::Refunded, $refundRecord->status);
        $this->assertEquals(50.00, (float) $refundRecord->amount);
    }

    /**
     * Test gateway webhook triggers payment update.
     */
    public function test_payment_webhook_updates_payment(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-WEBHOOK-001',
            'customer_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'customer_email' => $this->customer->email,
            'customer_phone' => $this->customer->phone,
            'shipping_address' => '789 Elm St',
            'billing_address' => '789 Elm St',
            'status' => OrderStatus::Pending,
            'payment_status' => PaymentStatus::Pending,
            'payment_method' => 'stripe',
            'subtotal' => 80.00,
            'total' => 80.00,
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'transaction_id' => 'evt_12345',
            'gateway' => 'stripe',
            'amount' => 80.00,
            'currency' => 'USD',
            'status' => PaymentStatus::Pending,
            'type' => 'charge',
        ]);

        $webhookResponse = $this->postJson('/api/user/payments/webhook/stripe', [
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'evt_12345',
                ],
            ],
        ]);

        $webhookResponse->assertOk()
            ->assertJson([
                'received' => true,
                'status' => 'paid',
            ]);

        $this->assertEquals(PaymentStatus::Paid, $payment->fresh()->status);
        $this->assertEquals(PaymentStatus::Paid, $order->fresh()->payment_status);
    }
}

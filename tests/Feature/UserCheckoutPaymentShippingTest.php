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
use App\Services\Payments\Gateways\PaypalClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Stripe\Charge;
use Stripe\Refund;
use Stripe\Service\ChargeService;
use Stripe\Service\RefundService;
use Stripe\StripeClient;
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
        Setting::set('payment_paypal_enabled', true);
        Setting::set('payment_paypal_client_id', 'mock_paypal_client_id');
        Setting::set('payment_paypal_client_secret', 'mock_paypal_client_secret');
        Setting::set('shipping_flat_rate_enabled', true);
        Setting::set('shipping_flat_rate_cost', 15.00);
        Setting::set('shipping_free_shipping_enabled', true);
        Setting::set('shipping_free_min_amount', 100.00);
        Setting::set('shipping_fedex_enabled', true);
        Setting::set('allow_customer_cancellation', true);

        $mockStripe = Mockery::mock(StripeClient::class);
        $mockCharges = Mockery::mock(ChargeService::class);
        $mockCharges->shouldReceive('retrieve')->byDefault()->andReturn(
            Charge::constructFrom(['id' => 'ch_stripe_pending', 'paid' => true])
        );
        $mockStripe->charges = $mockCharges;

        $mockRefunds = Mockery::mock(RefundService::class);
        $mockRefunds->shouldReceive('create')->byDefault()->andReturn(
            Refund::constructFrom(['id' => 're_test_refund_123', 'status' => 'succeeded'])
        );
        $mockStripe->refunds = $mockRefunds;

        $this->app->instance(StripeClient::class, $mockStripe);

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

        $orderNumber = $checkoutResponse->json('data.order_number');
        $this->assertNotNull($orderNumber);
        $this->assertNotNull($checkoutResponse->json('data.order_id'));

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

    /**
     * Test Razorpay gateway webhook triggers payment update.
     */
    public function test_razorpay_webhook_updates_payment(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-RZP-WEBHOOK-001',
            'customer_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'customer_email' => $this->customer->email,
            'customer_phone' => $this->customer->phone,
            'shipping_address' => '789 Elm St',
            'billing_address' => '789 Elm St',
            'status' => OrderStatus::Pending,
            'payment_status' => PaymentStatus::Pending,
            'payment_method' => 'razorpay',
            'subtotal' => 120.00,
            'total' => 120.00,
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'transaction_id' => 'order_rzp_hook_123',
            'gateway' => 'razorpay',
            'amount' => 120.00,
            'currency' => 'INR',
            'status' => PaymentStatus::Pending,
            'type' => 'charge',
        ]);

        $webhookResponse = $this->postJson('/api/user/payments/webhook/razorpay', [
            'event' => 'payment.captured',
            'payload' => [
                'payment' => [
                    'entity' => [
                        'id' => 'pay_rzp_hook_456',
                        'order_id' => 'order_rzp_hook_123',
                        'amount' => 12000,
                        'status' => 'captured',
                    ],
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

    /**
     * Test PayPal checkout creates a pending order with redirect URL.
     */
    public function test_paypal_checkout_creates_pending_order_and_redirect_url(): void
    {
        Sanctum::actingAs($this->customer);

        $mockPaypal = Mockery::mock(PaypalClient::class);
        $mockPaypal->shouldReceive('createOrder')
            ->once()
            ->andReturn([
                'id' => 'PAYPAL_ORDER_FEATURE_123',
                'status' => 'CREATED',
                'links' => [
                    [
                        'rel' => 'approve',
                        'href' => 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL_ORDER_FEATURE_123',
                    ],
                ],
            ]);
        $this->app->instance(PaypalClient::class, $mockPaypal);

        $response = $this->postJson('/api/user/checkout', [
            'shipping_address' => '456 Market St, San Francisco, CA',
            'billing_address' => '456 Market St, San Francisco, CA',
            'payment_method' => 'paypal',
            'shipping_carrier' => 'flat_rate',
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
                'data' => [
                    'payment_method' => 'paypal',
                    'payment_status' => 'pending',
                    'redirect_url' => 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL_ORDER_FEATURE_123',
                ],
            ]);
    }

    /**
     * Test PayPal gateway webhook triggers payment update.
     */
    public function test_paypal_webhook_updates_payment(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-PP-WEBHOOK-001',
            'customer_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'customer_email' => $this->customer->email,
            'customer_phone' => $this->customer->phone,
            'shipping_address' => '789 Elm St',
            'billing_address' => '789 Elm St',
            'status' => OrderStatus::Pending,
            'payment_status' => PaymentStatus::Pending,
            'payment_method' => 'paypal',
            'subtotal' => 60.00,
            'total' => 60.00,
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'transaction_id' => 'PAYPAL_TX_HOOK_789',
            'gateway' => 'paypal',
            'amount' => 60.00,
            'currency' => 'USD',
            'status' => PaymentStatus::Pending,
            'type' => 'charge',
        ]);

        $webhookResponse = $this->postJson('/api/user/payments/webhook/paypal', [
            'event_type' => 'PAYMENT.CAPTURE.COMPLETED',
            'resource' => [
                'id' => 'PAYPAL_TX_HOOK_789',
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

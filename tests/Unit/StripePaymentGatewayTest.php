<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Order;
use App\Models\Setting;
use App\Services\Payments\Gateways\StripePaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Stripe\Checkout\Session;
use Stripe\PaymentIntent;
use Stripe\Refund;
use Stripe\Service\Checkout\CheckoutServiceFactory;
use Stripe\Service\Checkout\SessionService;
use Stripe\Service\PaymentIntentService;
use Stripe\Service\RefundService;
use Stripe\StripeClient;
use Tests\TestCase;

class StripePaymentGatewayTest extends TestCase
{
    use RefreshDatabase;

    protected StripePaymentGateway $gateway;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gateway = new StripePaymentGateway();

        Setting::set('currency_code', 'INR');
        Setting::set('payment_stripe_enabled', true);
        Setting::set('payment_stripe_secret_key', 'sk_test_mock_secret_key_12345');
        Setting::set('payment_stripe_publishable_key', 'pk_test_mock_pub_key_12345');
    }

    public function test_gateway_name_and_label(): void
    {
        $this->assertSame('stripe', $this->gateway->name());
        $this->assertSame('Stripe', $this->gateway->label());
        $this->assertTrue($this->gateway->isEnabled());
        $this->assertSame('sk_test_mock_secret_key_12345', $this->gateway->secretKey());
        $this->assertSame('pk_test_mock_pub_key_12345', $this->gateway->publishableKey());
    }

    public function test_gateway_disabled_if_secret_key_is_missing(): void
    {
        Setting::set('payment_stripe_secret_key', '');
        Setting::set('payment_settings', ['stripe' => ['enabled' => true, 'secret_key' => '']]);

        $this->assertFalse($this->gateway->isEnabled());

        $order = new Order(['order_number' => 'ORD-TEST-01', 'total' => 100]);
        $result = $this->gateway->charge($order);

        $this->assertFalse($result->success);
        $this->assertSame('failed', $result->status);
    }

    public function test_charge_creates_and_confirms_payment_intent(): void
    {
        $mockClient = Mockery::mock(StripeClient::class);
        $piService = Mockery::mock(PaymentIntentService::class);
        $mockClient->paymentIntents = $piService;

        $intent = PaymentIntent::constructFrom([
            'id' => 'pi_test_intent_123',
            'object' => 'payment_intent',
            'status' => 'succeeded',
            'amount' => 50000,
            'currency' => 'inr',
        ]);

        $piService->shouldReceive('create')
            ->once()
            ->with(Mockery::on(function (array $params): bool {
                return $params['amount'] === 50000
                    && $params['currency'] === 'inr'
                    && $params['confirm'] === true
                    && $params['payment_method'] === 'pm_card_visa';
            }))
            ->andReturn($intent);

        $this->gateway->setClient($mockClient);

        $order = new Order([
            'order_number' => 'ORD-12345',
            'total' => 500.00,
            'customer_name' => 'John Doe',
            'customer_email' => 'john@example.com',
            'shipping_address' => '123 Marine Drive, Mumbai',
        ]);
        $order->id = '00000000-0000-0000-0000-000000000001';

        $result = $this->gateway->charge($order, [
            'flow' => 'payment_intent',
            'payment_method_id' => 'pm_card_visa',
        ]);

        $this->assertTrue($result->success);
        $this->assertSame('pi_test_intent_123', $result->transactionId);
        $this->assertSame('paid', $result->status);
        $this->assertSame('Stripe charge captured successfully.', $result->message);
    }

    public function test_charge_handles_3ds_requires_action(): void
    {
        $mockClient = Mockery::mock(StripeClient::class);
        $piService = Mockery::mock(PaymentIntentService::class);
        $mockClient->paymentIntents = $piService;

        $intent = PaymentIntent::constructFrom([
            'id' => 'pi_test_intent_3ds',
            'object' => 'payment_intent',
            'status' => 'requires_action',
            'next_action' => [
                'redirect_to_url' => [
                    'url' => 'https://hooks.stripe.com/3d_secure_2/hosted?test=1',
                ],
            ],
        ]);

        $piService->shouldReceive('create')
            ->once()
            ->andReturn($intent);

        $this->gateway->setClient($mockClient);

        $order = new Order([
            'order_number' => 'ORD-12346',
            'total' => 1200.00,
            'customer_name' => 'Jane Smith',
            'customer_email' => 'jane@example.com',
        ]);
        $order->id = '00000000-0000-0000-0000-000000000002';

        $result = $this->gateway->charge($order, [
            'flow' => 'payment_intent',
        ]);

        $this->assertTrue($result->success);
        $this->assertSame('pi_test_intent_3ds', $result->transactionId);
        $this->assertSame('pending', $result->status);
        $this->assertSame('https://hooks.stripe.com/3d_secure_2/hosted?test=1', $result->redirectUrl);
    }

    public function test_charge_creates_checkout_session_flow(): void
    {
        $mockClient = Mockery::mock(StripeClient::class);
        $checkoutFactory = Mockery::mock(CheckoutServiceFactory::class);
        $sessionService = Mockery::mock(SessionService::class);
        $checkoutFactory->sessions = $sessionService;
        $mockClient->checkout = $checkoutFactory;

        $session = Session::constructFrom([
            'id' => 'cs_test_session_999',
            'object' => 'checkout.session',
            'url' => 'https://checkout.stripe.com/c/pay/cs_test_session_999',
            'payment_status' => 'unpaid',
        ]);

        $sessionService->shouldReceive('create')
            ->once()
            ->andReturn($session);

        $this->gateway->setClient($mockClient);

        $order = new Order([
            'order_number' => 'ORD-12347',
            'total' => 250.00,
            'customer_name' => 'Alex Johnson',
            'customer_email' => 'alex@example.com',
        ]);
        $order->id = '00000000-0000-0000-0000-000000000003';

        $result = $this->gateway->charge($order, [
            'flow' => 'checkout_session',
        ]);

        $this->assertTrue($result->success);
        $this->assertSame('cs_test_session_999', $result->transactionId);
        $this->assertSame('https://checkout.stripe.com/c/pay/cs_test_session_999', $result->redirectUrl);
    }

    public function test_charge_defaults_to_checkout_session_without_explicit_flow(): void
    {
        $mockClient = Mockery::mock(StripeClient::class);
        $checkoutFactory = Mockery::mock(CheckoutServiceFactory::class);
        $sessionService = Mockery::mock(SessionService::class);
        $checkoutFactory->sessions = $sessionService;
        $mockClient->checkout = $checkoutFactory;

        $session = Session::constructFrom([
            'id' => 'cs_test_default_123',
            'object' => 'checkout.session',
            'url' => 'https://checkout.stripe.com/c/pay/cs_test_default_123',
            'payment_status' => 'unpaid',
        ]);

        $sessionService->shouldReceive('create')
            ->once()
            ->andReturn($session);

        $this->gateway->setClient($mockClient);

        $order = new Order([
            'order_number' => 'ORD-DEF-01',
            'total' => 150.00,
            'customer_name' => 'Default Flow User',
            'customer_email' => 'default@example.com',
        ]);
        $order->id = '00000000-0000-0000-0000-000000000004';

        // Calling charge without any flow options should default to checkout session redirect
        $result = $this->gateway->charge($order);

        $this->assertTrue($result->success);
        $this->assertSame('cs_test_default_123', $result->transactionId);
        $this->assertSame('https://checkout.stripe.com/c/pay/cs_test_default_123', $result->redirectUrl);
    }

    public function test_verify_payment_with_payment_intent(): void
    {
        $mockClient = Mockery::mock(StripeClient::class);
        $piService = Mockery::mock(PaymentIntentService::class);
        $mockClient->paymentIntents = $piService;

        $intent = PaymentIntent::constructFrom([
            'id' => 'pi_check_123',
            'status' => 'succeeded',
        ]);

        $piService->shouldReceive('retrieve')
            ->with('pi_check_123')
            ->once()
            ->andReturn($intent);

        $this->gateway->setClient($mockClient);

        $result = $this->gateway->verifyPayment('pi_check_123');

        $this->assertTrue($result->success);
        $this->assertSame('pi_check_123', $result->transactionId);
        $this->assertSame('paid', $result->status);
    }

    public function test_verify_payment_with_checkout_session(): void
    {
        $mockClient = Mockery::mock(StripeClient::class);
        $checkoutFactory = Mockery::mock(CheckoutServiceFactory::class);
        $sessionService = Mockery::mock(SessionService::class);
        $checkoutFactory->sessions = $sessionService;
        $mockClient->checkout = $checkoutFactory;

        $session = Session::constructFrom([
            'id' => 'cs_check_456',
            'payment_status' => 'paid',
            'payment_intent' => 'pi_resolved_789',
        ]);

        $sessionService->shouldReceive('retrieve')
            ->with('cs_check_456')
            ->once()
            ->andReturn($session);

        $this->gateway->setClient($mockClient);

        $result = $this->gateway->verifyPayment('cs_check_456');

        $this->assertTrue($result->success);
        $this->assertSame('pi_resolved_789', $result->transactionId);
        $this->assertSame('paid', $result->status);
    }

    public function test_refund_executes_successfully(): void
    {
        $mockClient = Mockery::mock(StripeClient::class);
        $refundService = Mockery::mock(RefundService::class);
        $mockClient->refunds = $refundService;

        $refund = Refund::constructFrom([
            'id' => 're_test_refund_111',
            'status' => 'succeeded',
            'amount' => 50000,
        ]);

        $refundService->shouldReceive('create')
            ->once()
            ->andReturn($refund);

        $this->gateway->setClient($mockClient);

        $order = new Order([
            'order_number' => 'ORD-REF-01',
            'total' => 500.00,
        ]);
        $order->id = '00000000-0000-0000-0000-000000000004';

        $result = $this->gateway->refund($order, 500.00, 'requested_by_customer');

        $this->assertTrue($result->success);
        $this->assertSame('re_test_refund_111', $result->transactionId);
        $this->assertSame('refunded', $result->status);
    }

    public function test_webhook_handles_payment_intent_succeeded(): void
    {
        $payload = [
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'pi_webhook_success',
                    'amount' => 1000,
                ],
            ],
        ];

        $result = $this->gateway->handleWebhook($payload);

        $this->assertTrue($result->success);
        $this->assertSame('paid', $result->status);
        $this->assertSame('pi_webhook_success', $result->transactionId);
    }

    public function test_webhook_handles_payment_intent_failed(): void
    {
        $payload = [
            'type' => 'payment_intent.payment_failed',
            'data' => [
                'object' => [
                    'id' => 'pi_webhook_failed',
                    'last_payment_error' => [
                        'message' => 'Card was declined.',
                    ],
                ],
            ],
        ];

        $result = $this->gateway->handleWebhook($payload);

        $this->assertFalse($result->success);
        $this->assertSame('failed', $result->status);
        $this->assertSame('Card was declined.', $result->message);
    }
}

<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\Payments\Gateways\PaypalClient;
use App\Services\Payments\Gateways\PaypalPaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class PaypalPaymentGatewayTest extends TestCase
{
    use RefreshDatabase;

    protected PaypalPaymentGateway $gateway;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gateway = new PaypalPaymentGateway();

        Setting::set('currency_code', 'USD');
        Setting::set('payment_paypal_enabled', true);
        Setting::set('payment_paypal_mode', 'sandbox');
        Setting::set('payment_paypal_client_id', 'mock_paypal_client_id_123');
        Setting::set('payment_paypal_client_secret', 'mock_paypal_client_secret_456');
        Setting::set('payment_paypal_webhook_id', 'mock_webhook_id_789');
    }

    public function test_gateway_name_and_label(): void
    {
        $this->assertSame('paypal', $this->gateway->name());
        $this->assertSame('PayPal', $this->gateway->label());
        $this->assertTrue($this->gateway->isEnabled());
        $this->assertSame('mock_paypal_client_id_123', $this->gateway->clientId());
        $this->assertSame('mock_paypal_client_secret_456', $this->gateway->clientSecret());
        $this->assertSame('mock_paypal_client_id_123', $this->gateway->publishableKey());
        $this->assertSame('mock_paypal_client_secret_456', $this->gateway->secretKey());
        $this->assertSame('sandbox', $this->gateway->mode());
        $this->assertSame('mock_webhook_id_789', $this->gateway->webhookId());
    }

    public function test_gateway_disabled_if_credentials_are_missing(): void
    {
        Setting::set('payment_paypal_client_secret', '');
        Setting::set('payment_settings', ['paypal' => ['enabled' => true, 'client_id' => 'client_123', 'client_secret' => '']]);

        $this->assertFalse($this->gateway->isEnabled());

        $order = new Order(['order_number' => 'ORD-PP-01', 'total' => 100]);
        $result = $this->gateway->charge($order);

        $this->assertFalse($result->success);
        $this->assertSame('failed', $result->status);
    }

    public function test_charge_creates_checkout_session_flow(): void
    {
        $mockClient = Mockery::mock(PaypalClient::class);
        $mockClient->shouldReceive('createOrder')
            ->once()
            ->with(Mockery::on(function (array $params): bool {
                return $params['intent'] === 'CAPTURE'
                    && $params['purchase_units'][0]['amount']['currency_code'] === 'USD'
                    && $params['purchase_units'][0]['amount']['value'] === '150.00'
                    && isset($params['application_context']['return_url']);
            }))
            ->andReturn([
                'id' => 'PAYPAL_ORDER_CHECKOUT_123',
                'status' => 'CREATED',
                'links' => [
                    [
                        'rel' => 'approve',
                        'href' => 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL_ORDER_CHECKOUT_123',
                    ],
                ],
            ]);

        $this->gateway->setClient($mockClient);

        $order = new Order([
            'order_number' => 'ORD-12345',
            'total' => 150.00,
            'customer_name' => 'John Doe',
            'customer_email' => 'john@example.com',
        ]);
        $order->id = '00000000-0000-0000-0000-000000000001';

        $result = $this->gateway->charge($order, [
            'flow' => 'checkout_session',
        ]);

        $this->assertTrue($result->success);
        $this->assertSame('PAYPAL_ORDER_CHECKOUT_123', $result->transactionId);
        $this->assertSame('pending', $result->status);
        $this->assertSame('https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL_ORDER_CHECKOUT_123', $result->redirectUrl);
    }

    public function test_charge_defaults_to_checkout_session_without_explicit_flow(): void
    {
        $mockClient = Mockery::mock(PaypalClient::class);
        $mockClient->shouldReceive('createOrder')
            ->once()
            ->andReturn([
                'id' => 'PAYPAL_ORDER_DEF_456',
                'status' => 'CREATED',
                'links' => [
                    [
                        'rel' => 'approve',
                        'href' => 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL_ORDER_DEF_456',
                    ],
                ],
            ]);

        $this->gateway->setClient($mockClient);

        $order = new Order([
            'order_number' => 'ORD-DEF-01',
            'total' => 200.00,
            'customer_name' => 'Jane Smith',
            'customer_email' => 'jane@example.com',
        ]);
        $order->id = '00000000-0000-0000-0000-000000000002';

        $result = $this->gateway->charge($order);

        $this->assertTrue($result->success);
        $this->assertSame('PAYPAL_ORDER_DEF_456', $result->transactionId);
        $this->assertSame('https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL_ORDER_DEF_456', $result->redirectUrl);
    }

    public function test_charge_creates_order_flow_for_client_sdk(): void
    {
        $mockClient = Mockery::mock(PaypalClient::class);
        $mockClient->shouldReceive('createOrder')
            ->once()
            ->andReturn([
                'id' => 'PAYPAL_ORDER_SDK_789',
                'status' => 'CREATED',
                'links' => [
                    [
                        'rel' => 'approve',
                        'href' => 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL_ORDER_SDK_789',
                    ],
                ],
            ]);

        $this->gateway->setClient($mockClient);

        $order = new Order([
            'order_number' => 'ORD-SDK-01',
            'total' => 75.00,
            'customer_name' => 'SDK User',
            'customer_email' => 'sdk@example.com',
        ]);
        $order->id = '00000000-0000-0000-0000-000000000003';

        $result = $this->gateway->charge($order, [
            'flow' => 'order',
        ]);

        $this->assertTrue($result->success);
        $this->assertSame('PAYPAL_ORDER_SDK_789', $result->transactionId);
        $this->assertSame('pending', $result->status);
        $this->assertSame('PAYPAL_ORDER_SDK_789', $result->data['paypal_order_id']);
        $this->assertSame('mock_paypal_client_id_123', $result->data['client_id']);
    }

    public function test_charge_captures_existing_order_directly(): void
    {
        $mockClient = Mockery::mock(PaypalClient::class);
        $mockClient->shouldReceive('captureOrder')
            ->once()
            ->with('PAYPAL_ORDER_APPROVED_999')
            ->andReturn([
                'id' => 'PAYPAL_ORDER_APPROVED_999',
                'status' => 'COMPLETED',
                'purchase_units' => [
                    [
                        'payments' => [
                            'captures' => [
                                [
                                    'id' => 'CAPTURE_ID_111',
                                    'status' => 'COMPLETED',
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        $this->gateway->setClient($mockClient);

        $order = new Order([
            'order_number' => 'ORD-CAP-01',
            'total' => 99.00,
            'customer_name' => 'Capture User',
            'customer_email' => 'cap@example.com',
        ]);
        $order->id = '00000000-0000-0000-0000-000000000004';

        $result = $this->gateway->charge($order, [
            'paypal_order_id' => 'PAYPAL_ORDER_APPROVED_999',
        ]);

        $this->assertTrue($result->success);
        $this->assertSame('paid', $result->status);
        $this->assertSame('CAPTURE_ID_111', $result->transactionId);
    }

    public function test_verify_payment_with_completed_order(): void
    {
        $mockClient = Mockery::mock(PaypalClient::class);
        $mockClient->shouldReceive('getOrder')
            ->with('PAYPAL_ORDER_CMP_123')
            ->once()
            ->andReturn([
                'id' => 'PAYPAL_ORDER_CMP_123',
                'status' => 'COMPLETED',
                'purchase_units' => [
                    [
                        'payments' => [
                            'captures' => [
                                [
                                    'id' => 'CAPTURE_RESOLVED_999',
                                    'status' => 'COMPLETED',
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        $this->gateway->setClient($mockClient);

        $result = $this->gateway->verifyPayment('PAYPAL_ORDER_CMP_123');

        $this->assertTrue($result->success);
        $this->assertSame('paid', $result->status);
        $this->assertSame('CAPTURE_RESOLVED_999', $result->transactionId);
    }

    public function test_verify_payment_captures_approved_order(): void
    {
        $mockClient = Mockery::mock(PaypalClient::class);
        $mockClient->shouldReceive('getOrder')
            ->with('PAYPAL_ORDER_APP_456')
            ->once()
            ->andReturn([
                'id' => 'PAYPAL_ORDER_APP_456',
                'status' => 'APPROVED',
            ]);

        $mockClient->shouldReceive('captureOrder')
            ->with('PAYPAL_ORDER_APP_456')
            ->once()
            ->andReturn([
                'id' => 'PAYPAL_ORDER_APP_456',
                'status' => 'COMPLETED',
                'purchase_units' => [
                    [
                        'payments' => [
                            'captures' => [
                                [
                                    'id' => 'CAPTURE_RESOLVED_888',
                                    'status' => 'COMPLETED',
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        $this->gateway->setClient($mockClient);

        $result = $this->gateway->verifyPayment('PAYPAL_ORDER_APP_456');

        $this->assertTrue($result->success);
        $this->assertSame('paid', $result->status);
        $this->assertSame('CAPTURE_RESOLVED_888', $result->transactionId);
    }

    public function test_verify_payment_handles_pending_status(): void
    {
        $mockClient = Mockery::mock(PaypalClient::class);
        $mockClient->shouldReceive('getOrder')
            ->with('PAYPAL_ORDER_ACT_000')
            ->once()
            ->andReturn([
                'id' => 'PAYPAL_ORDER_ACT_000',
                'status' => 'PAYER_ACTION_REQUIRED',
            ]);

        $this->gateway->setClient($mockClient);

        $result = $this->gateway->verifyPayment('PAYPAL_ORDER_ACT_000');

        $this->assertTrue($result->success);
        $this->assertSame('pending', $result->status);
        $this->assertSame('PAYPAL_ORDER_ACT_000', $result->transactionId);
    }

    public function test_refund_executes_successfully(): void
    {
        $mockClient = Mockery::mock(PaypalClient::class);
        $mockClient->shouldReceive('refundCapture')
            ->once()
            ->with('CAP_TEST_REFUND_111', Mockery::on(function (array $params): bool {
                return $params['amount']['value'] === '100.00'
                    && $params['amount']['currency_code'] === 'USD';
            }))
            ->andReturn([
                'id' => 'REFUND_ID_777',
                'status' => 'COMPLETED',
            ]);

        $this->gateway->setClient($mockClient);

        $order = Order::create([
            'order_number' => 'ORD-REF-01',
            'customer_name' => 'Alice Doe',
            'customer_email' => 'alice@example.com',
            'shipping_address' => '123 Test St, Test City',
            'subtotal' => 100.00,
            'total' => 100.00,
            'payment_method' => 'paypal',
            'payment_status' => 'paid',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'gateway' => 'paypal',
            'transaction_id' => 'CAP_TEST_REFUND_111',
            'amount' => 100.00,
            'currency' => 'USD',
            'status' => 'paid',
            'type' => 'charge',
        ]);

        $result = $this->gateway->refund($order, 100.00, 'requested_by_customer');

        $this->assertTrue($result->success);
        $this->assertSame('REFUND_ID_777', $result->transactionId);
        $this->assertSame('refunded', $result->status);
    }

    public function test_webhook_handles_payment_capture_completed(): void
    {
        $mockClient = Mockery::mock(PaypalClient::class);
        $mockClient->shouldReceive('verifyWebhookSignature')->andReturn(true);
        $this->gateway->setClient($mockClient);

        $payload = [
            'event_type' => 'PAYMENT.CAPTURE.COMPLETED',
            'resource' => [
                'id' => 'CAPTURE_WEBHOOK_123',
                'amount' => ['value' => '50.00', 'currency_code' => 'USD'],
            ],
        ];

        $result = $this->gateway->handleWebhook($payload);

        $this->assertTrue($result->success);
        $this->assertSame('paid', $result->status);
        $this->assertSame('CAPTURE_WEBHOOK_123', $result->transactionId);
    }

    public function test_webhook_handles_payment_capture_denied(): void
    {
        $mockClient = Mockery::mock(PaypalClient::class);
        $mockClient->shouldReceive('verifyWebhookSignature')->andReturn(true);
        $this->gateway->setClient($mockClient);

        $payload = [
            'event_type' => 'PAYMENT.CAPTURE.DENIED',
            'resource' => [
                'id' => 'CAPTURE_DENIED_456',
                'status_details' => [
                    'reason' => 'Risk assessment denied.',
                ],
            ],
        ];

        $result = $this->gateway->handleWebhook($payload);

        $this->assertFalse($result->success);
        $this->assertSame('failed', $result->status);
        $this->assertSame('Risk assessment denied.', $result->message);
    }

    public function test_webhook_handles_payment_capture_refunded(): void
    {
        $mockClient = Mockery::mock(PaypalClient::class);
        $mockClient->shouldReceive('verifyWebhookSignature')->andReturn(true);
        $this->gateway->setClient($mockClient);

        $payload = [
            'event_type' => 'PAYMENT.CAPTURE.REFUNDED',
            'resource' => [
                'id' => 'REFUND_EVT_999',
            ],
        ];

        $result = $this->gateway->handleWebhook($payload);

        $this->assertTrue($result->success);
        $this->assertSame('refunded', $result->status);
        $this->assertSame('REFUND_EVT_999', $result->transactionId);
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        $mockClient = Mockery::mock(PaypalClient::class);
        $mockClient->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(false);
        $this->gateway->setClient($mockClient);

        $payload = [
            'event_type' => 'PAYMENT.CAPTURE.COMPLETED',
            'resource' => ['id' => 'INVALID_SIG_123'],
        ];

        $result = $this->gateway->handleWebhook($payload, ['paypal-auth-algo' => 'SHA256withRSA']);

        $this->assertFalse($result->success);
        $this->assertSame('failed', $result->status);
        $this->assertSame('Invalid PayPal webhook signature.', $result->message);
    }
}

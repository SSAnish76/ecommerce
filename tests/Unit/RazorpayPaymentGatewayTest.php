<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\Payments\Gateways\RazorpayPaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Razorpay\Api\Api;
use Razorpay\Api\Order as RazorpayOrder;
use Razorpay\Api\Payment as RazorpayPayment;
use Razorpay\Api\PaymentLink as RazorpayPaymentLink;
use Razorpay\Api\Refund as RazorpayRefund;
use Tests\TestCase;

class RazorpayPaymentGatewayTest extends TestCase
{
    use RefreshDatabase;

    protected RazorpayPaymentGateway $gateway;

    protected function setUp(): void
    {
        parent::setUp();

        $this->gateway = new RazorpayPaymentGateway();

        Setting::set('currency_code', 'INR');
        Setting::set('payment_razorpay_enabled', true);
        Setting::set('payment_razorpay_key_id', 'rzp_test_key_12345');
        Setting::set('payment_razorpay_key_secret', 'mock_secret_key_67890');
        Setting::set('payment_razorpay_webhook_secret', 'mock_webhook_secret_abcde');
    }

    public function test_gateway_name_and_label(): void
    {
        $this->assertSame('razorpay', $this->gateway->name());
        $this->assertSame('Razorpay', $this->gateway->label());
        $this->assertTrue($this->gateway->isEnabled());
        $this->assertSame('rzp_test_key_12345', $this->gateway->keyId());
        $this->assertSame('mock_secret_key_67890', $this->gateway->keySecret());
        $this->assertSame('rzp_test_key_12345', $this->gateway->publishableKey());
        $this->assertSame('mock_secret_key_67890', $this->gateway->secretKey());
        $this->assertSame('mock_webhook_secret_abcde', $this->gateway->webhookSecret());
    }

    public function test_gateway_disabled_if_credentials_are_missing(): void
    {
        Setting::set('payment_razorpay_key_secret', '');
        Setting::set('payment_settings', ['razorpay' => ['enabled' => true, 'key_id' => 'rzp_123', 'key_secret' => '']]);

        $this->assertFalse($this->gateway->isEnabled());

        $order = new Order(['order_number' => 'ORD-TEST-01', 'total' => 100]);
        $result = $this->gateway->charge($order);

        $this->assertFalse($result->success);
        $this->assertSame('failed', $result->status);
    }

    public function test_charge_creates_payment_link_flow_by_default(): void
    {
        $mockApi = Mockery::mock(Api::class);
        $mockPaymentLinkService = Mockery::mock(RazorpayPaymentLink::class);
        $mockApi->paymentLink = $mockPaymentLinkService;

        $createdLink = new RazorpayPaymentLink();
        $createdLink['id'] = 'plink_test_12345';
        $createdLink['short_url'] = 'https://rzp.io/i/plink_test_12345';
        $createdLink['status'] = 'created';

        $mockPaymentLinkService->shouldReceive('create')
            ->once()
            ->with(Mockery::on(function (array $params): bool {
                return $params['amount'] === 50000
                    && $params['currency'] === 'INR'
                    && $params['reference_id'] === 'ORD-12345'
                    && isset($params['callback_url']);
            }))
            ->andReturn($createdLink);

        $this->gateway->setClient($mockApi);

        $order = new Order([
            'order_number' => 'ORD-12345',
            'total' => 500.00,
            'customer_name' => 'John Doe',
            'customer_email' => 'john@example.com',
        ]);
        $order->id = '00000000-0000-0000-0000-000000000001';

        $result = $this->gateway->charge($order);

        $this->assertTrue($result->success);
        $this->assertSame('plink_test_12345', $result->transactionId);
        $this->assertSame('https://rzp.io/i/plink_test_12345', $result->redirectUrl);
        $this->assertSame('Razorpay payment link created successfully.', $result->message);
    }

    public function test_charge_creates_razorpay_order_when_flow_is_order(): void
    {
        $mockApi = Mockery::mock(Api::class);
        $mockOrderService = Mockery::mock(RazorpayOrder::class);
        $mockApi->order = $mockOrderService;

        $createdOrder = new RazorpayOrder();
        $createdOrder['id'] = 'order_test_99999';
        $createdOrder['entity'] = 'order';
        $createdOrder['amount'] = 25000;
        $createdOrder['currency'] = 'INR';
        $createdOrder['status'] = 'created';

        $mockOrderService->shouldReceive('create')
            ->once()
            ->with(Mockery::on(function (array $params): bool {
                return $params['amount'] === 25000
                    && $params['currency'] === 'INR'
                    && $params['receipt'] === 'ORD-54321';
            }))
            ->andReturn($createdOrder);

        $this->gateway->setClient($mockApi);

        $order = new Order([
            'order_number' => 'ORD-54321',
            'total' => 250.00,
            'customer_name' => 'Jane Smith',
            'customer_email' => 'jane@example.com',
        ]);
        $order->id = '00000000-0000-0000-0000-000000000002';

        $result = $this->gateway->charge($order, [
            'flow' => 'order',
        ]);

        $this->assertTrue($result->success);
        $this->assertSame('order_test_99999', $result->transactionId);
        $this->assertSame('pending', $result->status);
        $this->assertSame('rzp_test_key_12345', $result->data['key_id']);
        $this->assertSame(25000, $result->data['amount_in_paise']);
    }

    public function test_charge_direct_payment_captures_authorized_payment(): void
    {
        $mockApi = Mockery::mock(Api::class);
        $mockPaymentService = Mockery::mock(RazorpayPayment::class);
        $mockApi->payment = $mockPaymentService;

        $paymentEntity = Mockery::mock(RazorpayPayment::class)->makePartial();
        $paymentEntity['id'] = 'pay_authorized_111';
        $paymentEntity['status'] = 'authorized';
        $paymentEntity['amount'] = 10000;

        $capturedPayment = new RazorpayPayment();
        $capturedPayment['id'] = 'pay_authorized_111';
        $capturedPayment['status'] = 'captured';
        $capturedPayment['amount'] = 10000;

        $mockPaymentService->shouldReceive('fetch')
            ->with('pay_authorized_111')
            ->once()
            ->andReturn($paymentEntity);

        $paymentEntity->shouldReceive('capture')
            ->once()
            ->with(Mockery::on(function (array $params): bool {
                return $params['amount'] === 10000 && $params['currency'] === 'INR';
            }))
            ->andReturn($capturedPayment);

        $this->gateway->setClient($mockApi);

        $order = new Order([
            'order_number' => 'ORD-DIRECT-01',
            'total' => 100.00,
        ]);
        $order->id = '00000000-0000-0000-0000-000000000003';

        $result = $this->gateway->charge($order, [
            'payment_id' => 'pay_authorized_111',
        ]);

        $this->assertTrue($result->success);
        $this->assertSame('pay_authorized_111', $result->transactionId);
        $this->assertSame('paid', $result->status);
    }

    public function test_verify_payment_with_valid_signature_and_payment_entity(): void
    {
        $secret = 'mock_secret_key_67890';
        $orderId = 'order_test_123';
        $paymentId = 'pay_test_456';
        $validSignature = hash_hmac('sha256', "{$orderId}|{$paymentId}", $secret);

        $mockApi = Mockery::mock(Api::class);
        $mockPaymentService = Mockery::mock(RazorpayPayment::class);
        $mockApi->payment = $mockPaymentService;

        $paymentEntity = new RazorpayPayment();
        $paymentEntity['id'] = $paymentId;
        $paymentEntity['status'] = 'captured';

        $mockPaymentService->shouldReceive('fetch')
            ->with($paymentId)
            ->once()
            ->andReturn($paymentEntity);

        $this->gateway->setClient($mockApi);

        $result = $this->gateway->verifyPayment($paymentId, [
            'razorpay_order_id' => $orderId,
            'razorpay_payment_id' => $paymentId,
            'razorpay_signature' => $validSignature,
        ]);

        $this->assertTrue($result->success);
        $this->assertSame($paymentId, $result->transactionId);
        $this->assertSame('paid', $result->status);
        $this->assertSame('Razorpay payment captured and verified.', $result->message);
    }

    public function test_verify_payment_with_invalid_signature_fails(): void
    {
        $result = $this->gateway->verifyPayment('pay_test_456', [
            'razorpay_order_id' => 'order_test_123',
            'razorpay_payment_id' => 'pay_test_456',
            'razorpay_signature' => 'invalid_signature_hash',
        ]);

        $this->assertFalse($result->success);
        $this->assertSame('failed', $result->status);
        $this->assertSame('Invalid Razorpay payment signature.', $result->message);
    }

    public function test_verify_payment_with_order_reference(): void
    {
        $mockApi = Mockery::mock(Api::class);
        $mockOrderService = Mockery::mock(RazorpayOrder::class);
        $mockApi->order = $mockOrderService;

        $orderEntity = new RazorpayOrder();
        $orderEntity['id'] = 'order_check_789';
        $orderEntity['status'] = 'paid';

        $mockOrderService->shouldReceive('fetch')
            ->with('order_check_789')
            ->once()
            ->andReturn($orderEntity);

        $this->gateway->setClient($mockApi);

        $result = $this->gateway->verifyPayment('order_check_789');

        $this->assertTrue($result->success);
        $this->assertSame('order_check_789', $result->transactionId);
        $this->assertSame('paid', $result->status);
    }

    public function test_refund_executes_successfully(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-REF-RZP',
            'customer_name' => 'Alice',
            'customer_email' => 'alice@example.com',
            'shipping_address' => '123 Test St, Test City',
            'subtotal' => 300.00,
            'total' => 300.00,
            'total_amount' => 300.00,
            'payment_method' => 'razorpay',
            'payment_status' => 'paid',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'transaction_id' => 'pay_to_refund_123',
            'gateway' => 'razorpay',
            'amount' => 300.00,
            'currency' => 'INR',
            'status' => 'paid',
        ]);

        $mockApi = Mockery::mock(Api::class);
        $mockPaymentService = Mockery::mock(RazorpayPayment::class);
        $mockApi->payment = $mockPaymentService;

        $paymentEntity = Mockery::mock(RazorpayPayment::class)->makePartial();
        $paymentEntity['id'] = 'pay_to_refund_123';

        $refundEntity = new RazorpayRefund();
        $refundEntity['id'] = 'rfnd_test_555';
        $refundEntity['amount'] = 30000;
        $refundEntity['status'] = 'processed';

        $mockPaymentService->shouldReceive('fetch')
            ->with('pay_to_refund_123')
            ->once()
            ->andReturn($paymentEntity);

        $paymentEntity->shouldReceive('refund')
            ->once()
            ->with(Mockery::on(function (array $params): bool {
                return $params['amount'] === 30000;
            }))
            ->andReturn($refundEntity);

        $this->gateway->setClient($mockApi);

        $result = $this->gateway->refund($order, 300.00, 'customer_return');

        $this->assertTrue($result->success);
        $this->assertSame('rfnd_test_555', $result->transactionId);
        $this->assertSame('refunded', $result->status);
    }

    public function test_webhook_handles_payment_captured(): void
    {
        $payload = [
            'event' => 'payment.captured',
            'payload' => [
                'payment' => [
                    'entity' => [
                        'id' => 'pay_webhook_captured_123',
                        'order_id' => 'order_webhook_123',
                        'amount' => 15000,
                        'status' => 'captured',
                    ],
                ],
            ],
        ];

        $result = $this->gateway->handleWebhook($payload);

        $this->assertTrue($result->success);
        $this->assertSame('paid', $result->status);
        $this->assertSame('pay_webhook_captured_123', $result->transactionId);
    }

    public function test_webhook_handles_payment_failed(): void
    {
        $payload = [
            'event' => 'payment.failed',
            'payload' => [
                'payment' => [
                    'entity' => [
                        'id' => 'pay_webhook_failed_456',
                        'error_description' => 'Payment failed due to insufficient funds.',
                    ],
                ],
            ],
        ];

        $result = $this->gateway->handleWebhook($payload);

        $this->assertFalse($result->success);
        $this->assertSame('failed', $result->status);
        $this->assertSame('Payment failed due to insufficient funds.', $result->message);
    }

    public function test_webhook_handles_refund_processed(): void
    {
        $payload = [
            'event' => 'refund.processed',
            'payload' => [
                'refund' => [
                    'entity' => [
                        'id' => 'rfnd_webhook_789',
                        'payment_id' => 'pay_webhook_captured_123',
                        'amount' => 15000,
                        'status' => 'processed',
                    ],
                ],
            ],
        ];

        $result = $this->gateway->handleWebhook($payload);

        $this->assertTrue($result->success);
        $this->assertSame('refunded', $result->status);
        $this->assertSame('pay_webhook_captured_123', $result->transactionId);
    }
}

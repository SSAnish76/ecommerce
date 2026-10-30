<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Payments\Gateways\PaypalClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class PaypalClientTest extends TestCase
{
    protected PaypalClient $client;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        $this->client = new PaypalClient(
            clientId: 'test_client_id_123',
            clientSecret: 'test_client_secret_456',
            mode: 'sandbox'
        );
    }

    public function test_urls_match_environment_mode(): void
    {
        $this->assertSame('https://api-m.sandbox.paypal.com', $this->client->baseUrl());
        $this->assertSame('https://www.sandbox.paypal.com/checkoutnow', $this->client->checkoutUrl());

        $liveClient = new PaypalClient('id', 'secret', 'live');
        $this->assertSame('https://api-m.paypal.com', $liveClient->baseUrl());
        $this->assertSame('https://www.paypal.com/checkoutnow', $liveClient->checkoutUrl());
    }

    public function test_get_access_token_fetches_and_caches_token(): void
    {
        Http::fake([
            'https://api-m.sandbox.paypal.com/v1/oauth2/token' => Http::response([
                'access_token' => 'A21AA_TEST_TOKEN_123',
                'token_type' => 'Bearer',
                'expires_in' => 3600,
            ], 200),
        ]);

        $token = $this->client->getAccessToken();
        $this->assertSame('A21AA_TEST_TOKEN_123', $token);

        // Subsequent call should hit the cache without making a new HTTP request
        $tokenCached = $this->client->getAccessToken();
        $this->assertSame('A21AA_TEST_TOKEN_123', $tokenCached);

        Http::assertSentCount(1);
    }

    public function test_create_order_sends_post_request(): void
    {
        $this->client->setAccessToken('MOCK_ACCESS_TOKEN');

        Http::fake([
            'https://api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response([
                'id' => 'ORDER_CREATED_001',
                'status' => 'CREATED',
                'links' => [
                    [
                        'rel' => 'approve',
                        'href' => 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER_CREATED_001',
                    ],
                ],
            ], 201),
        ]);

        $order = $this->client->createOrder([
            'intent' => 'CAPTURE',
            'purchase_units' => [
                [
                    'amount' => ['currency_code' => 'USD', 'value' => '50.00'],
                ],
            ],
        ]);

        $this->assertSame('ORDER_CREATED_001', $order['id']);
        $this->assertSame('CREATED', $order['status']);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://api-m.sandbox.paypal.com/v2/checkout/orders'
                && $request->hasHeader('Authorization', 'Bearer MOCK_ACCESS_TOKEN');
        });
    }

    public function test_capture_and_get_order(): void
    {
        $this->client->setAccessToken('MOCK_ACCESS_TOKEN');

        Http::fake([
            'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER_APP_123' => Http::response([
                'id' => 'ORDER_APP_123',
                'status' => 'APPROVED',
            ], 200),
            'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER_APP_123/capture' => Http::response([
                'id' => 'ORDER_APP_123',
                'status' => 'COMPLETED',
                'purchase_units' => [
                    [
                        'payments' => [
                            'captures' => [
                                ['id' => 'CAPTURE_999', 'status' => 'COMPLETED'],
                            ],
                        ],
                    ],
                ],
            ], 201),
        ]);

        $order = $this->client->getOrder('ORDER_APP_123');
        $this->assertSame('APPROVED', $order['status']);

        $capture = $this->client->captureOrder('ORDER_APP_123');
        $this->assertSame('COMPLETED', $capture['status']);
    }

    public function test_refund_capture(): void
    {
        $this->client->setAccessToken('MOCK_ACCESS_TOKEN');

        Http::fake([
            'https://api-m.sandbox.paypal.com/v2/payments/captures/CAPTURE_999/refund' => Http::response([
                'id' => 'REFUND_555',
                'status' => 'COMPLETED',
            ], 201),
        ]);

        $refund = $this->client->refundCapture('CAPTURE_999', [
            'amount' => ['value' => '25.00', 'currency_code' => 'USD'],
        ]);

        $this->assertSame('REFUND_555', $refund['id']);
    }

    public function test_verify_webhook_signature(): void
    {
        $this->client->setAccessToken('MOCK_ACCESS_TOKEN');

        Http::fake([
            'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature' => Http::response([
                'verification_status' => 'SUCCESS',
            ], 200),
        ]);

        $valid = $this->client->verifyWebhookSignature(
            ['event_type' => 'PAYMENT.CAPTURE.COMPLETED'],
            [
                'paypal-auth-algo' => 'SHA256withRSA',
                'paypal-cert-url' => 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123',
                'paypal-transmission-id' => 'TRANS_123',
                'paypal-transmission-sig' => 'SIG_123',
                'paypal-transmission-time' => '2026-10-30T10:00:00Z',
            ],
            'WEBHOOK_ID_MOCK'
        );

        $this->assertTrue($valid);
    }

    public function test_throws_exception_on_api_error(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('PayPal order creation failed');

        $this->client->setAccessToken('MOCK_ACCESS_TOKEN');

        Http::fake([
            'https://api-m.sandbox.paypal.com/v2/checkout/orders' => Http::response([
                'message' => 'The requested action could not be completed.',
            ], 422),
        ]);

        $this->client->createOrder([]);
    }
}


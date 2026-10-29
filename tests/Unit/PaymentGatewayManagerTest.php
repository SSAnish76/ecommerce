<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Facades\PaymentGateway;
use App\Models\Order;
use App\Services\PaymentGatewayManager;
use App\Services\Payments\PaymentGatewayInterface;
use App\Services\Payments\PaymentResult;
use App\Services\Payments\StripePaymentGateway;
use Tests\TestCase;

class PaymentGatewayManagerTest extends TestCase
{
    public function test_manager_auto_discovers_payment_gateways(): void
    {
        /** @var PaymentGatewayManager $manager */
        $manager = app(PaymentGatewayManager::class);

        $this->assertTrue($manager->has('stripe'));
        $this->assertTrue($manager->has('paypal'));
        $this->assertTrue($manager->has('cod'));
        $this->assertTrue($manager->has('razorpay'));
        $this->assertTrue($manager->has('wire'));

        $this->assertInstanceOf(StripePaymentGateway::class, $manager->gateway('stripe'));
    }

    public function test_all_discovered_gateways_implement_payment_gateway_interface(): void
    {
        /** @var PaymentGatewayManager $manager */
        $manager = app(PaymentGatewayManager::class);

        foreach ($manager->all() as $name => $gateway) {
            $this->assertInstanceOf(PaymentGatewayInterface::class, $gateway);
            $this->assertNotEmpty($gateway->name());
            $this->assertNotEmpty($gateway->label());
            $this->assertIsArray($gateway->config());
        }
    }

    public function test_generic_extensibility_allows_adding_new_gateway_without_modifying_code(): void
    {
        /** @var PaymentGatewayManager $manager */
        $manager = app(PaymentGatewayManager::class);

        // Simulate a new payment gateway added by a developer or plugin
        $customGateway = new class implements PaymentGatewayInterface
        {
            public function name(): string
            {
                return 'crypto_pay';
            }

            public function label(): string
            {
                return 'Cryptocurrency Gateway';
            }

            public function isEnabled(): bool
            {
                return true;
            }

            public function config(): array
            {
                return ['wallet' => '0x123'];
            }

            public function charge(Order $order, array $options = []): PaymentResult
            {
                return PaymentResult::success('tx_crypto_123', 'Crypto payment received.');
            }

            public function refund(Order $order, ?float $amount = null, ?string $reason = null): PaymentResult
            {
                return PaymentResult::failed('Crypto refunds must be executed manually.');
            }

            public function verifyPayment(string $transactionId, array $payload = []): PaymentResult
            {
                return PaymentResult::success($transactionId, 'Verified on chain.');
            }

            public function handleWebhook(array $payload, array $headers = []): PaymentResult
            {
                return PaymentResult::success('tx_crypto_123', 'Webhook processed.');
            }
        };

        $manager->register($customGateway);

        $this->assertTrue($manager->has('crypto_pay'));
        $this->assertSame('Cryptocurrency Gateway', $manager->gateway('crypto_pay')->label());

        $result = $manager->gateway('crypto_pay')->charge(new Order(['order_number' => 'ORD-100', 'total' => 50]));
        $this->assertTrue($result->success);
        $this->assertSame('tx_crypto_123', $result->transactionId);
    }

    public function test_facade_resolves_payment_gateway_manager(): void
    {
        $this->assertTrue(PaymentGateway::has('stripe'));
        $this->assertInstanceOf(PaymentGatewayInterface::class, PaymentGateway::gateway('stripe'));
    }
}


<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Address;
use App\Models\Order;
use App\Services\PaymentGatewayManager;
use App\Services\Payments\AbstractPaymentGateway;
use App\Services\Payments\PaymentResult;
use App\Services\Shipping\AbstractShippingCarrier;
use App\Services\Shipping\ShipmentResult;
use App\Services\Shipping\ShippingRateResult;
use App\Services\ShippingManager;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class AutoDiscoveryTest extends TestCase
{
    public function test_payment_gateway_is_auto_discovered_simply_by_adding_a_file(): void
    {
        $gatewayFilePath = app_path('Services/Payments/FutureAutoDiscoverGateway.php');

        $gatewayCode = <<<'PHP'
<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Models\Order;

class FutureAutoDiscoverGateway extends AbstractPaymentGateway
{
    public function name(): string
    {
        return 'future_auto_pay';
    }

    public function label(): string
    {
        return 'Future Auto Payment';
    }

    public function isEnabled(): bool
    {
        return true;
    }

    public function charge(Order $order, array $options = []): PaymentResult
    {
        return PaymentResult::success('tx_future_999', 'Auto discovered and charged!');
    }

    public function refund(Order $order, ?float $amount = null, ?string $reason = null): PaymentResult
    {
        return PaymentResult::success('ref_future_999', 'Refunded.');
    }

    public function verifyPayment(string $transactionId, array $payload = []): PaymentResult
    {
        return PaymentResult::success($transactionId, 'Verified.');
    }

    public function handleWebhook(array $payload, array $headers = []): PaymentResult
    {
        return PaymentResult::success('wh_future_999', 'Handled.');
    }
}
PHP;

        try {
            File::put($gatewayFilePath, $gatewayCode);

            // Re-instantiate the manager to simulate app boot
            $manager = new PaymentGatewayManager(app());

            $this->assertTrue($manager->has('future_auto_pay'));
            $this->assertSame('Future Auto Payment', $manager->gateway('future_auto_pay')->label());

            $result = $manager->gateway('future_auto_pay')->charge(new Order(['order_number' => 'ORD-999', 'total' => 100]));
            $this->assertTrue($result->success);
            $this->assertSame('tx_future_999', $result->transactionId);
        } finally {
            if (File::exists($gatewayFilePath)) {
                File::delete($gatewayFilePath);
            }
        }
    }

    public function test_shipping_carrier_is_auto_discovered_simply_by_adding_a_file(): void
    {
        $carrierFilePath = app_path('Services/Shipping/FutureAutoDiscoverShipping.php');

        $carrierCode = <<<'PHP'
<?php

declare(strict_types=1);

namespace App\Services\Shipping;

use App\Models\Address;
use App\Models\Order;

class FutureAutoDiscoverShipping extends AbstractShippingCarrier
{
    public function name(): string
    {
        return 'future_express';
    }

    public function label(): string
    {
        return 'Future Express Delivery';
    }

    public function isEnabled(): bool
    {
        return true;
    }

    public function calculateRate(Order|array $orderData, ?Address $address = null): ShippingRateResult
    {
        return ShippingRateResult::available(19.99, $this->name(), $this->label(), 1);
    }

    public function createShipment(Order $order, array $options = []): ShipmentResult
    {
        return ShipmentResult::success('TRACK-FUTURE-1', $this->name());
    }

    public function track(string $trackingNumber): array
    {
        return [
            'tracking_number' => $trackingNumber,
            'carrier' => $this->name(),
            'status' => 'delivered',
            'estimated_delivery' => null,
            'checkpoints' => [],
        ];
    }

    public function cancelShipment(string $trackingNumber): bool
    {
        return true;
    }
}
PHP;

        try {
            File::put($carrierFilePath, $carrierCode);

            // Re-instantiate the manager to simulate app boot
            $manager = new ShippingManager(app());

            $this->assertTrue($manager->has('future_express'));
            $this->assertSame('Future Express Delivery', $manager->carrier('future_express')->label());

            $rate = $manager->carrier('future_express')->calculateRate([]);
            $this->assertTrue($rate->available);
            $this->assertSame(19.99, $rate->cost);
        } finally {
            if (File::exists($carrierFilePath)) {
                File::delete($carrierFilePath);
            }
        }
    }
}


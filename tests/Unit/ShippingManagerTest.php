<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Facades\Shipping;
use App\Models\Order;
use App\Services\Shipping\Carriers\FlatRateShipping;
use App\Services\Shipping\Contracts\ShippingCarrierInterface;
use App\Services\Shipping\DTOs\ShipmentResult;
use App\Services\Shipping\DTOs\ShippingRateResult;
use App\Services\ShippingManager;
use Tests\TestCase;

class ShippingManagerTest extends TestCase
{
    public function test_manager_auto_discovers_shipping_carriers(): void
    {
        /** @var ShippingManager $manager */
        $manager = app(ShippingManager::class);

        $this->assertTrue($manager->has('flat_rate'));
        $this->assertTrue($manager->has('free_shipping'));
        $this->assertTrue($manager->has('fedex'));
        $this->assertTrue($manager->has('ups'));
        $this->assertTrue($manager->has('dhl'));

        $this->assertInstanceOf(FlatRateShipping::class, $manager->carrier('flat_rate'));
    }

    public function test_all_discovered_carriers_implement_shipping_carrier_interface(): void
    {
        /** @var ShippingManager $manager */
        $manager = app(ShippingManager::class);

        foreach ($manager->all() as $name => $carrier) {
            $this->assertInstanceOf(ShippingCarrierInterface::class, $carrier);
            $this->assertNotEmpty($carrier->name());
            $this->assertNotEmpty($carrier->label());
            $this->assertIsArray($carrier->config());
        }
    }

    public function test_rate_calculation_works_across_carriers(): void
    {
        /** @var ShippingManager $manager */
        $manager = app(ShippingManager::class);

        $flatRate = $manager->carrier('flat_rate');
        $quote = $flatRate->calculateRate(['subtotal' => 100]);

        $this->assertInstanceOf(ShippingRateResult::class, $quote);
        $this->assertTrue($quote->available);
        $this->assertGreaterThan(0, $quote->cost);
    }

    public function test_generic_extensibility_allows_adding_new_shipping_carrier_without_modifying_code(): void
    {
        /** @var ShippingManager $manager */
        $manager = app(ShippingManager::class);

        $customCarrier = new class implements ShippingCarrierInterface
        {
            public function name(): string
            {
                return 'shiprocket';
            }

            public function label(): string
            {
                return 'Shiprocket Courier';
            }

            public function isEnabled(): bool
            {
                return true;
            }

            public function config(): array
            {
                return ['token' => 'sr_123'];
            }

            public function calculateRate(Order|array $orderData, ?\App\Models\Address $address = null): ShippingRateResult
            {
                return ShippingRateResult::available(45.0, 'shiprocket', 'Shiprocket Express');
            }

            public function createShipment(Order $order, array $options = []): ShipmentResult
            {
                return ShipmentResult::success('SR-999', 'shiprocket');
            }

            public function track(string $trackingNumber): array
            {
                return [
                    'tracking_number' => $trackingNumber,
                    'carrier' => 'shiprocket',
                    'status' => 'dispatched',
                    'estimated_delivery' => null,
                    'checkpoints' => [],
                ];
            }

            public function cancelShipment(string $trackingNumber): bool
            {
                return true;
            }
        };

        $manager->register($customCarrier);

        $this->assertTrue($manager->has('shiprocket'));
        $this->assertSame('Shiprocket Courier', $manager->carrier('shiprocket')->label());

        $rate = $manager->carrier('shiprocket')->calculateRate([]);
        $this->assertTrue($rate->available);
        $this->assertSame(45.0, $rate->cost);
    }

    public function test_facade_resolves_shipping_manager(): void
    {
        $this->assertTrue(Shipping::has('flat_rate'));
        $this->assertInstanceOf(ShippingCarrierInterface::class, Shipping::carrier('flat_rate'));
    }
}

<?php

declare(strict_types=1);

namespace App\Services\Shipping\Carriers;

use App\Models\Address;
use App\Models\Order;
use App\Services\Shipping\DTOs\ShipmentResult;
use App\Services\Shipping\DTOs\ShippingRateResult;

class FlatRateShipping extends AbstractShippingCarrier
{
    /**
     * Get the unique key identifier for this shipping method.
     */
    public function name(): string
    {
        return 'flat_rate';
    }

    /**
     * Get the human-friendly display label.
     */
    public function label(): string
    {
        return 'Flat Rate Shipping';
    }

    /**
     * Flat rate is enabled by default if not explicitly disabled.
     */
    public function isEnabled(): bool
    {
        $config = $this->config();

        return (bool) ($config['enabled'] ?? true);
    }

    /**
     * Calculate shipping rate quote for an order or cart payload.
     *
     * @param Order|array<string, mixed> $orderData
     */
    public function calculateRate(Order|array $orderData, ?Address $address = null): ShippingRateResult
    {
        if (! $this->isEnabled()) {
            return ShippingRateResult::unavailable($this->name(), $this->label());
        }

        $cost = (float) ($this->config()['cost'] ?? 10.00);

        return ShippingRateResult::available(
            cost: $cost,
            carrier: $this->name(),
            serviceName: 'Standard Ground Delivery',
            estimatedDays: 3,
            currency: 'USD',
            data: [
                'type' => 'flat_rate',
            ]
        );
    }

    /**
     * Book shipment and generate label/tracking number for an order.
     *
     * @param array<string, mixed> $options
     */
    public function createShipment(Order $order, array $options = []): ShipmentResult
    {
        $trackingNumber = 'FLAT-'.strtoupper(uniqid());

        $this->log('info', "Created Flat Rate shipment for order {$order->order_number}", [
            'order_id' => $order->id,
            'tracking_number' => $trackingNumber,
        ]);

        return ShipmentResult::success(
            trackingNumber: $trackingNumber,
            carrier: $this->name(),
            labelUrl: null,
            status: 'ready_for_pickup',
            message: 'Flat rate standard shipment scheduled.',
            data: [
                'order_id' => $order->id,
            ]
        );
    }

    /**
     * Track an existing parcel by tracking number.
     *
     * @return array{
     *     tracking_number: string,
     *     carrier: string,
     *     status: string,
     *     estimated_delivery: string|null,
     *     checkpoints: array<int, array<string, mixed>>
     * }
     */
    public function track(string $trackingNumber): array
    {
        return [
            'tracking_number' => $trackingNumber,
            'carrier' => $this->name(),
            'status' => 'in_transit',
            'estimated_delivery' => now()->addDays(3)->toIso8601String(),
            'checkpoints' => [
                [
                    'status' => 'Manifest created',
                    'timestamp' => now()->toIso8601String(),
                    'location' => 'Fulfillment Warehouse',
                ],
            ],
        ];
    }

    /**
     * Cancel an existing booked shipment before pickup.
     */
    public function cancelShipment(string $trackingNumber): bool
    {
        $this->log('info', "Cancelled flat rate shipment {$trackingNumber}");

        return true;
    }
}


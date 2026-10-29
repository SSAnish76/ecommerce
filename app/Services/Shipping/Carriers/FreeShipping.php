<?php

declare(strict_types=1);

namespace App\Services\Shipping\Carriers;

use App\Models\Address;
use App\Models\Order;
use App\Services\Shipping\DTOs\ShipmentResult;
use App\Services\Shipping\DTOs\ShippingRateResult;

class FreeShipping extends AbstractShippingCarrier
{
    /**
     * Get the unique key identifier for this shipping method.
     */
    public function name(): string
    {
        return 'free_shipping';
    }

    /**
     * Get the human-friendly display label.
     */
    public function label(): string
    {
        return 'Free Shipping';
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

        $minThreshold = (float) ($this->config()['min_amount'] ?? 50.00);

        $subtotal = $orderData instanceof Order
            ? (float) $orderData->subtotal
            : (float) ($orderData['subtotal'] ?? $orderData['total'] ?? 0);

        if ($subtotal < $minThreshold) {
            return ShippingRateResult::unavailable(
                carrier: $this->name(),
                serviceName: $this->label(),
                message: "Order subtotal must reach at least \${$minThreshold} for free shipping."
            );
        }

        return ShippingRateResult::available(
            cost: 0.00,
            carrier: $this->name(),
            serviceName: 'Free Economy Shipping',
            estimatedDays: 5,
            currency: 'USD',
            data: [
                'min_threshold_applied' => $minThreshold,
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
        $trackingNumber = 'FREE-'.strtoupper(uniqid());

        $this->log('info', "Created Free Shipping shipment for order {$order->order_number}", [
            'order_id' => $order->id,
            'tracking_number' => $trackingNumber,
        ]);

        return ShipmentResult::success(
            trackingNumber: $trackingNumber,
            carrier: $this->name(),
            labelUrl: null,
            status: 'ready_for_pickup',
            message: 'Free shipping order scheduled for dispatch.',
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
            'status' => 'processing',
            'estimated_delivery' => now()->addDays(5)->toIso8601String(),
            'checkpoints' => [
                [
                    'status' => 'Order packaged',
                    'timestamp' => now()->toIso8601String(),
                    'location' => 'Central Hub',
                ],
            ],
        ];
    }

    /**
     * Cancel an existing booked shipment before pickup.
     */
    public function cancelShipment(string $trackingNumber): bool
    {
        $this->log('info', "Cancelled free shipping parcel {$trackingNumber}");

        return true;
    }
}


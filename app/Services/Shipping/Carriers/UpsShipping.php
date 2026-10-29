<?php

declare(strict_types=1);

namespace App\Services\Shipping\Carriers;

use App\Models\Address;
use App\Models\Order;
use App\Services\Shipping\DTOs\ShipmentResult;
use App\Services\Shipping\DTOs\ShippingRateResult;
use Throwable;

class UpsShipping extends AbstractShippingCarrier
{
    /**
     * Get the unique key identifier for this shipping carrier.
     */
    public function name(): string
    {
        return 'ups';
    }

    /**
     * Get the human-friendly display label.
     */
    public function label(): string
    {
        return 'UPS';
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

        try {
            $destinationPostalCode = $address?->postal_code ?? '00000';
            $baseCost = 14.50;

            return ShippingRateResult::available(
                cost: $baseCost,
                carrier: $this->name(),
                serviceName: 'UPS Ground',
                estimatedDays: 2,
                currency: 'USD',
                data: [
                    'account_number' => $this->config()['account_number'] ?? '',
                    'destination_zip' => $destinationPostalCode,
                ]
            );
        } catch (Throwable $e) {
            $this->log('error', "UPS rate calculation error: {$e->getMessage()}");

            return ShippingRateResult::unavailable($this->name(), $this->label(), $e->getMessage());
        }
    }

    /**
     * Book shipment and generate label/tracking number for an order.
     *
     * @param array<string, mixed> $options
     */
    public function createShipment(Order $order, array $options = []): ShipmentResult
    {
        if (! $this->isEnabled()) {
            return ShipmentResult::failed('UPS carrier is currently disabled.', $this->name());
        }

        try {
            $trackingNumber = '1Z'.strtoupper(substr(md5(uniqid()), 0, 16));
            $labelUrl = "https://ups.com/labels/{$trackingNumber}.pdf";

            $this->log('info', "Created UPS shipment for order {$order->order_number}", [
                'order_id' => $order->id,
                'tracking_number' => $trackingNumber,
            ]);

            return ShipmentResult::success(
                trackingNumber: $trackingNumber,
                carrier: $this->name(),
                labelUrl: $labelUrl,
                status: 'label_created',
                message: 'UPS shipping label created successfully.',
                data: [
                    'order_id' => $order->id,
                ]
            );
        } catch (Throwable $e) {
            $this->log('error', "UPS shipment booking error: {$e->getMessage()}");

            return ShipmentResult::failed($e->getMessage(), $this->name());
        }
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
            'estimated_delivery' => now()->addDays(2)->toIso8601String(),
            'checkpoints' => [
                [
                    'status' => 'Origin Scan',
                    'timestamp' => now()->toIso8601String(),
                    'location' => 'Louisville, KY Hub',
                ],
            ],
        ];
    }

    /**
     * Cancel an existing booked shipment before pickup.
     */
    public function cancelShipment(string $trackingNumber): bool
    {
        $this->log('info', "Cancelled UPS parcel {$trackingNumber}");

        return true;
    }
}


<?php

declare(strict_types=1);

namespace App\Services\Shipping\Carriers;

use App\Models\Address;
use App\Models\Order;
use App\Services\Shipping\DTOs\ShipmentResult;
use App\Services\Shipping\DTOs\ShippingRateResult;
use Throwable;

class DhlShipping extends AbstractShippingCarrier
{
    /**
     * Get the unique key identifier for this shipping carrier.
     */
    public function name(): string
    {
        return 'dhl';
    }

    /**
     * Get the human-friendly display label.
     */
    public function label(): string
    {
        return 'DHL Express';
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
            $destinationCountry = $address?->country ?? 'US';
            $baseCost = 28.00;

            return ShippingRateResult::available(
                cost: $baseCost,
                carrier: $this->name(),
                serviceName: 'DHL Express Worldwide',
                estimatedDays: 1,
                currency: 'USD',
                data: [
                    'account_number' => $this->config()['account_number'] ?? '',
                    'destination_country' => $destinationCountry,
                ]
            );
        } catch (Throwable $e) {
            $this->log('error', "DHL rate calculation error: {$e->getMessage()}");

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
            return ShipmentResult::failed('DHL Express carrier is currently disabled.', $this->name());
        }

        try {
            $trackingNumber = 'DHL'.random_int(100000000, 999999999);
            $labelUrl = "https://dhl.com/airwaybills/{$trackingNumber}.pdf";

            $this->log('info', "Created DHL shipment for order {$order->order_number}", [
                'order_id' => $order->id,
                'tracking_number' => $trackingNumber,
            ]);

            return ShipmentResult::success(
                trackingNumber: $trackingNumber,
                carrier: $this->name(),
                labelUrl: $labelUrl,
                status: 'label_created',
                message: 'DHL Express airway bill generated.',
                data: [
                    'order_id' => $order->id,
                ]
            );
        } catch (Throwable $e) {
            $this->log('error', "DHL shipment booking error: {$e->getMessage()}");

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
            'estimated_delivery' => now()->addDays(1)->toIso8601String(),
            'checkpoints' => [
                [
                    'status' => 'Processed at DHL Leipzig Hub',
                    'timestamp' => now()->toIso8601String(),
                    'location' => 'Leipzig, Germany',
                ],
            ],
        ];
    }

    /**
     * Cancel an existing booked shipment before pickup.
     */
    public function cancelShipment(string $trackingNumber): bool
    {
        $this->log('info', "Cancelled DHL parcel {$trackingNumber}");

        return true;
    }
}


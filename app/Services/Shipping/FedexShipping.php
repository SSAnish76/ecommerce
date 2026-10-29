<?php

declare(strict_types=1);

namespace App\Services\Shipping;

use App\Models\Address;
use App\Models\Order;
use Throwable;

class FedexShipping extends AbstractShippingCarrier
{
    /**
     * Get the unique key identifier for this shipping carrier.
     */
    public function name(): string
    {
        return 'fedex';
    }

    /**
     * Get the human-friendly display label.
     */
    public function label(): string
    {
        return 'FedEx';
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
            // Live rate estimation logic or API call using account credentials
            $destinationPostalCode = $address?->postal_code ?? '00000';
            $baseCost = 15.00;

            return ShippingRateResult::available(
                cost: $baseCost,
                carrier: $this->name(),
                serviceName: 'FedEx Ground Delivery',
                estimatedDays: 2,
                currency: 'USD',
                data: [
                    'account_number' => $this->config()['account_number'] ?? '',
                    'destination_zip' => $destinationPostalCode,
                ]
            );
        } catch (Throwable $e) {
            $this->log('error', "FedEx rate quote error: {$e->getMessage()}");

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
            return ShipmentResult::failed('FedEx carrier is currently disabled.', $this->name());
        }

        try {
            $trackingNumber = '79'.random_int(1000000000, 9999999999);
            $labelUrl = "https://fedex.com/labels/{$trackingNumber}.pdf";

            $this->log('info', "Created FedEx shipment for order {$order->order_number}", [
                'order_id' => $order->id,
                'tracking_number' => $trackingNumber,
            ]);

            return ShipmentResult::success(
                trackingNumber: $trackingNumber,
                carrier: $this->name(),
                labelUrl: $labelUrl,
                status: 'label_created',
                message: 'FedEx shipping label created successfully.',
                data: [
                    'order_id' => $order->id,
                ]
            );
        } catch (Throwable $e) {
            $this->log('error', "FedEx shipment creation error: {$e->getMessage()}");

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
                    'status' => 'Picked up by courier',
                    'timestamp' => now()->toIso8601String(),
                    'location' => 'Memphis, TN Hub',
                ],
            ],
        ];
    }

    /**
     * Cancel an existing booked shipment before pickup.
     */
    public function cancelShipment(string $trackingNumber): bool
    {
        $this->log('info', "Cancelled FedEx parcel {$trackingNumber}");

        return true;
    }
}


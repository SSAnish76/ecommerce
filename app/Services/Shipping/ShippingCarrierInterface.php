<?php

declare(strict_types=1);

namespace App\Services\Shipping;

use App\Models\Address;
use App\Models\Order;

interface ShippingCarrierInterface
{
    /**
     * Get the unique key identifier for this shipping carrier or method (e.g. 'flat_rate', 'fedex', 'ups', 'dhl').
     */
    public function name(): string;

    /**
     * Get the human-friendly display label.
     */
    public function label(): string;

    /**
     * Determine whether the carrier/method is currently enabled in settings.
     */
    public function isEnabled(): bool;

    /**
     * Retrieve the carrier configuration settings array.
     *
     * @return array<string, mixed>
     */
    public function config(): array;

    /**
     * Calculate shipping rate quote for an order or cart payload and destination address.
     *
     * @param Order|array<string, mixed> $orderData
     */
    public function calculateRate(Order|array $orderData, ?Address $address = null): ShippingRateResult;

    /**
     * Book shipment and generate label/tracking number for an order.
     *
     * @param array<string, mixed> $options
     */
    public function createShipment(Order $order, array $options = []): ShipmentResult;

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
    public function track(string $trackingNumber): array;

    /**
     * Cancel an existing booked shipment before pickup.
     */
    public function cancelShipment(string $trackingNumber): bool;
}


<?php

declare(strict_types=1);

namespace App\Services\Shipping;

class ShipmentResult
{
    /**
     * Create a new shipment booking result.
     *
     * @param array<string, mixed> $data
     */
    public function __construct(
        public bool $success,
        public ?string $trackingNumber = null,
        public ?string $labelUrl = null,
        public ?string $carrier = null,
        public ?string $status = null,
        public ?string $message = null,
        public array $data = [],
    ) {}

    /**
     * Create a successful shipment booking.
     *
     * @param array<string, mixed> $data
     */
    public static function success(
        string $trackingNumber,
        string $carrier,
        ?string $labelUrl = null,
        string $status = 'label_created',
        ?string $message = 'Shipment booked and label generated successfully.',
        array $data = [],
    ): self {
        return new self(
            success: true,
            trackingNumber: $trackingNumber,
            labelUrl: $labelUrl,
            carrier: $carrier,
            status: $status,
            message: $message,
            data: $data,
        );
    }

    /**
     * Create a failed shipment booking.
     *
     * @param array<string, mixed> $data
     */
    public static function failed(
        string $message,
        string $carrier,
        array $data = [],
    ): self {
        return new self(
            success: false,
            carrier: $carrier,
            status: 'failed',
            message: $message,
            data: $data,
        );
    }

    /**
     * Convert to an array.
     *
     * @return array{
     *     success: bool,
     *     tracking_number: string|null,
     *     label_url: string|null,
     *     carrier: string|null,
     *     status: string|null,
     *     message: string|null,
     *     data: array<string, mixed>
     * }
     */
    public function toArray(): array
    {
        return [
            'success' => $this->success,
            'tracking_number' => $this->trackingNumber,
            'label_url' => $this->labelUrl,
            'carrier' => $this->carrier,
            'status' => $this->status,
            'message' => $this->message,
            'data' => $this->data,
        ];
    }
}


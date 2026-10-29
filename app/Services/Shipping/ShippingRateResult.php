<?php

declare(strict_types=1);

namespace App\Services\Shipping;

class ShippingRateResult
{
    /**
     * Create a new shipping rate quote result.
     *
     * @param array<string, mixed> $data
     */
    public function __construct(
        public bool $available,
        public float $cost,
        public string $carrier,
        public string $serviceName,
        public ?int $estimatedDays = null,
        public string $currency = 'USD',
        public ?string $message = null,
        public array $data = [],
    ) {}

    /**
     * Create an available rate.
     *
     * @param array<string, mixed> $data
     */
    public static function available(
        float $cost,
        string $carrier,
        string $serviceName,
        ?int $estimatedDays = null,
        string $currency = 'USD',
        array $data = [],
    ): self {
        return new self(
            available: true,
            cost: $cost,
            carrier: $carrier,
            serviceName: $serviceName,
            estimatedDays: $estimatedDays,
            currency: $currency,
            data: $data,
        );
    }

    /**
     * Create an unavailable / unsupported rate result.
     *
     * @param array<string, mixed> $data
     */
    public static function unavailable(
        string $carrier,
        string $serviceName,
        string $message = 'Carrier rate calculation unavailable for this destination.',
        array $data = [],
    ): self {
        return new self(
            available: false,
            cost: 0.0,
            carrier: $carrier,
            serviceName: $serviceName,
            message: $message,
            data: $data,
        );
    }

    /**
     * Convert to an array.
     *
     * @return array{
     *     available: bool,
     *     cost: float,
     *     carrier: string,
     *     service_name: string,
     *     estimated_days: int|null,
     *     currency: string,
     *     message: string|null,
     *     data: array<string, mixed>
     * }
     */
    public function toArray(): array
    {
        return [
            'available' => $this->available,
            'cost' => $this->cost,
            'carrier' => $this->carrier,
            'service_name' => $this->serviceName,
            'estimated_days' => $this->estimatedDays,
            'currency' => $this->currency,
            'message' => $this->message,
            'data' => $this->data,
        ];
    }
}


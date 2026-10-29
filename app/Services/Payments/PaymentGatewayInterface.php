<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Models\Order;

interface PaymentGatewayInterface
{
    /**
     * Get the unique key identifier for this payment gateway (e.g. 'stripe', 'paypal', 'cod').
     */
    public function name(): string;

    /**
     * Get the human-friendly display label.
     */
    public function label(): string;

    /**
     * Determine whether the gateway is enabled in application settings.
     */
    public function isEnabled(): bool;

    /**
     * Retrieve the gateway configuration array from database settings or config.
     *
     * @return array<string, mixed>
     */
    public function config(): array;

    /**
     * Process or initiate a charge for the specified order.
     *
     * @param array<string, mixed> $options
     */
    public function charge(Order $order, array $options = []): PaymentResult;

    /**
     * Process a full or partial refund for the order.
     */
    public function refund(Order $order, ?float $amount = null, ?string $reason = null): PaymentResult;

    /**
     * Verify payment status using an external transaction reference.
     *
     * @param array<string, mixed> $payload
     */
    public function verifyPayment(string $transactionId, array $payload = []): PaymentResult;

    /**
     * Handle incoming asynchronous webhook notifications from the provider.
     *
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $headers
     */
    public function handleWebhook(array $payload, array $headers = []): PaymentResult;
}


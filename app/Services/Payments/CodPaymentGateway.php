<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Models\Order;

class CodPaymentGateway extends AbstractPaymentGateway
{
    /**
     * Get the unique key identifier for this payment gateway.
     */
    public function name(): string
    {
        return 'cod';
    }

    /**
     * Get the human-friendly display label.
     */
    public function label(): string
    {
        return 'Cash on Delivery (COD)';
    }

    /**
     * Process or initiate a charge for the specified order.
     *
     * @param array<string, mixed> $options
     */
    public function charge(Order $order, array $options = []): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('Cash on Delivery is currently disabled.');
        }

        $this->log('info', "Created Cash on Delivery payment for order {$order->order_number}", [
            'order_id' => $order->id,
            'amount' => $order->total_amount,
        ]);

        return PaymentResult::pending(
            transactionId: 'cod_'.$order->order_number,
            message: 'Cash on Delivery order confirmed. Payment will be collected upon parcel delivery.',
            data: [
                'order_id' => $order->id,
                'instructions' => $this->config()['instructions'] ?? 'Pay cash to delivery courier upon arrival.',
            ]
        );
    }

    /**
     * Process a full or partial refund for the order.
     */
    public function refund(Order $order, ?float $amount = null, ?string $reason = null): PaymentResult
    {
        return new PaymentResult(
            success: true,
            transactionId: 'cod_refund_'.$order->order_number,
            status: 'refunded',
            message: 'Cash on Delivery refund recorded for manual customer settlement.',
            data: [
                'order_id' => $order->id,
                'refund_amount' => $amount ?? $order->total_amount,
                'reason' => $reason,
            ]
        );
    }

    /**
     * Verify payment status using an external transaction reference.
     *
     * @param array<string, mixed> $payload
     */
    public function verifyPayment(string $transactionId, array $payload = []): PaymentResult
    {
        return PaymentResult::pending(
            transactionId: $transactionId,
            message: 'Cash on Delivery status is determined upon courier delivery.',
            data: $payload
        );
    }

    /**
     * Handle incoming asynchronous webhook notifications.
     *
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $headers
     */
    public function handleWebhook(array $payload, array $headers = []): PaymentResult
    {
        return PaymentResult::pending(
            message: 'COD does not require asynchronous webhooks.',
            data: $payload
        );
    }
}


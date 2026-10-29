<?php

declare(strict_types=1);

namespace App\Services\Payments\Gateways;

use App\Models\Order;
use App\Services\Payments\DTOs\PaymentResult;

class BankTransferPaymentGateway extends AbstractPaymentGateway
{
    /**
     * Get the unique key identifier for this payment gateway.
     */
    public function name(): string
    {
        return 'wire';
    }

    /**
     * Get the human-friendly display label.
     */
    public function label(): string
    {
        return 'Bank Wire Transfer';
    }

    /**
     * Process or initiate a charge for the specified order.
     *
     * @param array<string, mixed> $options
     */
    public function charge(Order $order, array $options = []): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('Bank Wire Transfer is currently disabled.');
        }

        $this->log('info', "Created Bank Transfer order for #{$order->order_number}", [
            'order_id' => $order->id,
            'amount' => $order->total_amount,
        ]);

        return PaymentResult::pending(
            transactionId: 'wire_'.$order->order_number,
            message: 'Bank transfer instructions generated. Please transfer funds to the merchant account.',
            data: [
                'order_id' => $order->id,
                'bank_details' => $this->config()['bank_details'] ?? 'Account details available in invoice.',
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
            transactionId: 'wire_refund_'.$order->order_number,
            status: 'refunded',
            message: 'Bank transfer refund recorded for offline execution.',
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
            message: 'Bank transfers require manual accounting verification.',
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
            message: 'Wire transfer does not utilize webhooks.',
            data: $payload
        );
    }
}


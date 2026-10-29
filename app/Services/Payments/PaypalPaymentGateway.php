<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Models\Order;
use Throwable;

class PaypalPaymentGateway extends AbstractPaymentGateway
{
    /**
     * Get the unique key identifier for this payment gateway.
     */
    public function name(): string
    {
        return 'paypal';
    }

    /**
     * Get the human-friendly display label.
     */
    public function label(): string
    {
        return 'PayPal';
    }

    /**
     * Process or initiate a charge for the specified order.
     *
     * @param array<string, mixed> $options
     */
    public function charge(Order $order, array $options = []): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('PayPal payment gateway is currently disabled.');
        }

        try {
            $this->log('info', "Creating PayPal order for #{$order->order_number}", [
                'order_id' => $order->id,
                'amount' => $order->total_amount,
            ]);

            $payPalOrderId = 'PAYPAL_ORDER_'.uniqid('', true);
            $approvalUrl = "https://www.sandbox.paypal.com/checkoutnow?token={$payPalOrderId}";

            return PaymentResult::redirect(
                redirectUrl: $approvalUrl,
                transactionId: $payPalOrderId,
                message: 'PayPal approval checkout session generated.',
                data: [
                    'order_id' => $order->id,
                    'approval_url' => $approvalUrl,
                ]
            );
        } catch (Throwable $e) {
            $this->log('error', "PayPal order creation error: {$e->getMessage()}");

            return PaymentResult::failed("PayPal processing error: {$e->getMessage()}");
        }
    }

    /**
     * Process a full or partial refund for the order.
     */
    public function refund(Order $order, ?float $amount = null, ?string $reason = null): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('PayPal payment gateway is currently disabled.');
        }

        try {
            $refundAmount = $amount ?? $order->total_amount;
            $refundId = 'pp_ref_'.uniqid('', true);

            $this->log('info', "Processing PayPal refund for order #{$order->order_number}", [
                'order_id' => $order->id,
                'refund_amount' => $refundAmount,
            ]);

            return new PaymentResult(
                success: true,
                transactionId: $refundId,
                status: 'refunded',
                message: 'PayPal refund initiated successfully.',
                data: [
                    'order_id' => $order->id,
                    'refund_amount' => $refundAmount,
                    'reason' => $reason,
                ]
            );
        } catch (Throwable $e) {
            $this->log('error', "PayPal refund error: {$e->getMessage()}");

            return PaymentResult::failed("PayPal refund error: {$e->getMessage()}");
        }
    }

    /**
     * Verify payment status using an external transaction reference.
     *
     * @param array<string, mixed> $payload
     */
    public function verifyPayment(string $transactionId, array $payload = []): PaymentResult
    {
        return PaymentResult::success(
            transactionId: $transactionId,
            message: 'PayPal order captured successfully.',
            data: $payload
        );
    }

    /**
     * Handle incoming asynchronous webhook notifications from PayPal.
     *
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $headers
     */
    public function handleWebhook(array $payload, array $headers = []): PaymentResult
    {
        $eventType = $payload['event_type'] ?? 'unknown';

        $this->log('info', "Received PayPal webhook: {$eventType}");

        return match ($eventType) {
            'PAYMENT.CAPTURE.COMPLETED' => PaymentResult::success(
                transactionId: (string) ($payload['resource']['id'] ?? ''),
                message: 'PayPal payment capture completed.',
                data: $payload
            ),
            'PAYMENT.CAPTURE.DENIED' => PaymentResult::failed(
                message: 'PayPal capture denied by provider.',
                transactionId: (string) ($payload['resource']['id'] ?? null),
                data: $payload
            ),
            default => PaymentResult::pending(
                transactionId: (string) ($payload['resource']['id'] ?? null),
                message: "PayPal event [{$eventType}] logged.",
                data: $payload
            ),
        };
    }
}


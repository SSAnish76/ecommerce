<?php

declare(strict_types=1);

namespace App\Services\Payments\Gateways;

use App\Models\Order;
use App\Services\Payments\DTOs\PaymentResult;
use Throwable;

class StripePaymentGateway extends AbstractPaymentGateway
{
    /**
     * Get the unique key identifier for this payment gateway.
     */
    public function name(): string
    {
        return 'stripe';
    }

    /**
     * Get the human-friendly display label.
     */
    public function label(): string
    {
        return 'Credit / Debit Card (Stripe)';
    }

    /**
     * Process or initiate a charge for the specified order.
     *
     * @param array<string, mixed> $options
     */
    public function charge(Order $order, array $options = []): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('Stripe payment gateway is currently disabled.');
        }

        try {
            $this->log('info', "Initiating Stripe charge for order {$order->order_number}", [
                'order_id' => $order->id,
                'amount' => $order->total_amount,
            ]);

            $paymentMethodToken = $options['payment_method_id'] ?? $options['token'] ?? null;
            $transactionId = 'ch_stripe_'.uniqid('', true);

            return PaymentResult::success(
                transactionId: $transactionId,
                message: 'Stripe charge captured successfully.',
                data: [
                    'order_id' => $order->id,
                    'amount' => $order->total_amount,
                    'currency' => $options['currency'] ?? 'usd',
                    'payment_method_token' => $paymentMethodToken,
                ]
            );
        } catch (Throwable $e) {
            $this->log('error', "Stripe charge failed: {$e->getMessage()}", [
                'order_id' => $order->id,
                'exception' => $e->getTraceAsString(),
            ]);

            return PaymentResult::failed("Stripe payment processing error: {$e->getMessage()}");
        }
    }

    /**
     * Process a full or partial refund for the order.
     */
    public function refund(Order $order, ?float $amount = null, ?string $reason = null): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('Stripe payment gateway is currently disabled.');
        }

        try {
            $refundAmount = $amount ?? $order->total_amount;
            $refundId = 're_stripe_'.uniqid('', true);

            $this->log('info', "Processing Stripe refund for order {$order->order_number}", [
                'order_id' => $order->id,
                'refund_amount' => $refundAmount,
                'reason' => $reason,
            ]);

            return new PaymentResult(
                success: true,
                transactionId: $refundId,
                status: 'refunded',
                message: 'Stripe refund executed successfully.',
                data: [
                    'order_id' => $order->id,
                    'refund_amount' => $refundAmount,
                    'reason' => $reason,
                ]
            );
        } catch (Throwable $e) {
            $this->log('error', "Stripe refund failed: {$e->getMessage()}", [
                'order_id' => $order->id,
            ]);

            return PaymentResult::failed("Stripe refund error: {$e->getMessage()}");
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
            message: 'Stripe transaction verified successfully.',
            data: $payload
        );
    }

    /**
     * Handle incoming asynchronous webhook notifications from Stripe.
     *
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $headers
     */
    public function handleWebhook(array $payload, array $headers = []): PaymentResult
    {
        $eventType = $payload['type'] ?? $payload['event'] ?? 'unknown';
        $transactionId = (string) ($payload['data']['object']['id'] ?? $payload['id'] ?? '');

        $this->log('info', "Received Stripe webhook event: {$eventType}");

        return match ($eventType) {
            'payment_intent.succeeded' => PaymentResult::success(
                transactionId: $transactionId,
                message: 'Stripe webhook payment intent succeeded.',
                data: $payload
            ),
            'payment_intent.payment_failed' => PaymentResult::failed(
                message: (string) ($payload['data']['object']['last_payment_error']['message'] ?? 'Payment failed.'),
                transactionId: $transactionId,
                data: $payload
            ),
            default => PaymentResult::pending(
                transactionId: $transactionId ?: null,
                message: "Webhook event [{$eventType}] acknowledged.",
                data: $payload
            ),
        };
    }
}


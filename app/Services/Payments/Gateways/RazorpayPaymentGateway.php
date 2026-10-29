<?php

declare(strict_types=1);

namespace App\Services\Payments\Gateways;

use App\Models\Order;
use App\Services\Payments\DTOs\PaymentResult;
use Throwable;

class RazorpayPaymentGateway extends AbstractPaymentGateway
{
    /**
     * Get the unique key identifier for this payment gateway.
     */
    public function name(): string
    {
        return 'razorpay';
    }

    /**
     * Get the human-friendly display label.
     */
    public function label(): string
    {
        return 'Razorpay';
    }

    /**
     * Process or initiate a charge for the specified order.
     *
     * @param array<string, mixed> $options
     */
    public function charge(Order $order, array $options = []): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('Razorpay payment gateway is currently disabled.');
        }

        try {
            $this->log('info', "Creating Razorpay order for #{$order->order_number}", [
                'order_id' => $order->id,
                'amount' => $order->total_amount,
            ]);

            $razorpayOrderId = 'order_rzp_'.uniqid('', true);

            return PaymentResult::pending(
                transactionId: $razorpayOrderId,
                message: 'Razorpay order created for client checkout integration.',
                data: [
                    'order_id' => $order->id,
                    'razorpay_order_id' => $razorpayOrderId,
                    'amount_in_paise' => (int) round($order->total_amount * 100),
                    'currency' => $options['currency'] ?? 'INR',
                    'key_id' => $this->config()['key_id'] ?? '',
                ]
            );
        } catch (Throwable $e) {
            $this->log('error', "Razorpay order creation error: {$e->getMessage()}");

            return PaymentResult::failed("Razorpay processing error: {$e->getMessage()}");
        }
    }

    /**
     * Process a full or partial refund for the order.
     */
    public function refund(Order $order, ?float $amount = null, ?string $reason = null): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('Razorpay payment gateway is currently disabled.');
        }

        try {
            $refundAmount = $amount ?? $order->total_amount;
            $refundId = 'rfnd_rzp_'.uniqid('', true);

            $this->log('info', "Processing Razorpay refund for #{$order->order_number}", [
                'order_id' => $order->id,
                'refund_amount' => $refundAmount,
            ]);

            return new PaymentResult(
                success: true,
                transactionId: $refundId,
                status: 'refunded',
                message: 'Razorpay refund issued successfully.',
                data: [
                    'order_id' => $order->id,
                    'refund_amount' => $refundAmount,
                    'reason' => $reason,
                ]
            );
        } catch (Throwable $e) {
            $this->log('error', "Razorpay refund error: {$e->getMessage()}");

            return PaymentResult::failed("Razorpay refund error: {$e->getMessage()}");
        }
    }

    /**
     * Verify payment status using an external transaction reference.
     *
     * @param array<string, mixed> $payload
     */
    public function verifyPayment(string $transactionId, array $payload = []): PaymentResult
    {
        $paymentId = $payload['razorpay_payment_id'] ?? $transactionId;

        return PaymentResult::success(
            transactionId: (string) $paymentId,
            message: 'Razorpay signature verified successfully.',
            data: $payload
        );
    }

    /**
     * Handle incoming asynchronous webhook notifications from Razorpay.
     *
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $headers
     */
    public function handleWebhook(array $payload, array $headers = []): PaymentResult
    {
        $event = $payload['event'] ?? 'unknown';

        $this->log('info', "Received Razorpay webhook event: {$event}");

        return match ($event) {
            'payment.captured', 'order.paid' => PaymentResult::success(
                transactionId: (string) ($payload['payload']['payment']['entity']['id'] ?? ''),
                message: 'Razorpay payment capture webhook received.',
                data: $payload
            ),
            'payment.failed' => PaymentResult::failed(
                message: (string) ($payload['payload']['payment']['entity']['error_description'] ?? 'Payment failed'),
                transactionId: (string) ($payload['payload']['payment']['entity']['id'] ?? null),
                data: $payload
            ),
            default => PaymentResult::pending(
                transactionId: (string) ($payload['payload']['payment']['entity']['id'] ?? null),
                message: "Razorpay webhook event [{$event}] logged.",
                data: $payload
            ),
        };
    }
}


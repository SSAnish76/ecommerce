<?php

declare(strict_types=1);

namespace App\Services\Payments\Gateways;

use App\Enums\Order\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\Payments\DTOs\PaymentResult;
use Throwable;

class PaypalPaymentGateway extends AbstractPaymentGateway
{
    public function __construct(
        protected ?PaypalClient $client = null,
    ) {}

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
     * Retrieve the gateway configuration array from database settings or config.
     *
     * @return array<string, mixed>
     */
    public function config(): array
    {
        try {
            $parent = parent::config();

            return array_merge([
                'mode' => Setting::get('payment_paypal_mode') ?: ($parent['mode'] ?? 'sandbox'),
                'client_id' => Setting::get('payment_paypal_client_id') ?: ($parent['client_id'] ?? null),
                'client_secret' => Setting::get('payment_paypal_client_secret') ?: ($parent['client_secret'] ?? null),
                'webhook_id' => Setting::get('payment_paypal_webhook_id') ?: ($parent['webhook_id'] ?? null),
            ], $parent);
        } catch (Throwable) {
            return [];
        }
    }

    public function clientId(): ?string
    {
        return ($this->config()['client_id'] ?? null) ?: null;
    }

    public function clientSecret(): ?string
    {
        return ($this->config()['client_secret'] ?? null) ?: null;
    }

    public function mode(): string
    {
        $mode = (string) ($this->config()['mode'] ?? 'sandbox');

        return in_array($mode, ['sandbox', 'live'], true) ? $mode : 'sandbox';
    }

    public function webhookId(): ?string
    {
        return ($this->config()['webhook_id'] ?? null) ?: null;
    }

    /**
     * Publishable key alias (client_id) matching Stripe convention.
     */
    public function publishableKey(): ?string
    {
        return $this->clientId();
    }

    /**
     * Secret key alias (client_secret) matching Stripe convention.
     */
    public function secretKey(): ?string
    {
        return $this->clientSecret();
    }

    /**
     * Webhook secret alias matching Stripe convention.
     */
    public function webhookSecret(): ?string
    {
        return $this->webhookId();
    }

    /**
     * Determine whether the gateway is enabled and configured.
     */
    public function isEnabled(): bool
    {
        return parent::isEnabled() && ! empty($this->clientId()) && ! empty($this->clientSecret());
    }

    /**
     * Resolve or instantiate the PayPal client.
     */
    public function client(): PaypalClient
    {
        return $this->client ??= app()->bound(PaypalClient::class)
            ? app(PaypalClient::class)
            : new PaypalClient(
                clientId: (string) $this->clientId(),
                clientSecret: (string) $this->clientSecret(),
                mode: $this->mode()
            );
    }

    /**
     * Override the PayPal client (useful for unit testing and mocking).
     */
    public function setClient(PaypalClient $client): self
    {
        $this->client = $client;

        return $this;
    }

    /**
     * Process or initiate a charge for the specified order.
     *
     * @param  array<string, mixed>  $options
     */
    public function charge(Order $order, array $options = []): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('PayPal payment gateway is currently disabled or unconfigured.');
        }

        try {
            $currency = $this->currency($options['currency'] ?? null);
            $amount = (float) ($order->total ?? $order->total_amount ?? 0.0);

            // 1. Direct capture flow if PayPal order ID is already authorized by client SDK
            if (! empty($options['paypal_order_id']) || ! empty($options['order_id_to_capture'])) {
                $orderId = (string) ($options['paypal_order_id'] ?? $options['order_id_to_capture']);

                return $this->captureExistingOrder($order, $orderId, $options);
            }

            // 2. Client-side JS SDK order creation flow vs hosted checkout redirect session flow
            return in_array($options['flow'] ?? null, ['order', 'sdk', 'modal'], true)
                ? $this->chargeOrder($order, $amount, $currency, $options)
                : $this->chargeCheckoutSession($order, $amount, $currency, $options);
        } catch (Throwable $e) {
            $this->log('error', "PayPal charge error: {$e->getMessage()}");

            return PaymentResult::failed("PayPal payment processing error: {$e->getMessage()}");
        }
    }

    /**
     * Process a full or partial refund for the specified order.
     */
    public function refund(Order $order, ?float $amount = null, ?string $reason = null): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('PayPal payment gateway is currently disabled.');
        }

        $payment = Payment::query()
            ->where('order_id', $order->id)
            ->where('gateway', 'paypal')
            ->where('status', PaymentStatus::Paid)
            ->latest()
            ->first();

        $transactionId = $payment?->transaction_id;

        try {
            $currency = $this->currency();
            $refundAmount = $amount ?? (float) ($order->total ?? $order->total_amount ?? 0.0);
            $captureId = $this->resolveCaptureId($transactionId, $payment);

            $params = array_filter([
                'amount' => $amount !== null ? [
                    'value' => $this->formatAmount($refundAmount, $currency),
                    'currency_code' => $currency,
                ] : null,
                'note_to_payer' => $reason ?: "Refund for order #{$order->order_number}",
            ]);

            $refundData = $this->client()->refundCapture((string) ($captureId ?: $transactionId), $params);
            $refundId = (string) ($refundData['id'] ?? 'pp_ref_'.uniqid('', true));

            return new PaymentResult(
                success: true,
                transactionId: $refundId,
                status: 'refunded',
                message: 'PayPal refund executed successfully.',
                data: $refundData
            );
        } catch (Throwable $e) {
            $this->log('error', "PayPal refund error: {$e->getMessage()}");

            return PaymentResult::failed("PayPal refund error: {$e->getMessage()}");
        }
    }

    /**
     * Verify payment status using transaction reference.
     *
     * @param  array<string, mixed>  $payload
     */
    public function verifyPayment(string $transactionId, array $payload = []): PaymentResult
    {
        try {
            $orderId = (string) ($payload['token'] ?? $payload['paypal_order_id'] ?? $payload['order_id'] ?? $transactionId);

            $orderData = $this->client()->getOrder($orderId);
            $status = strtoupper((string) ($orderData['status'] ?? ''));

            if ($status === 'COMPLETED') {
                $captures = $orderData['purchase_units'][0]['payments']['captures'] ?? [];
                $captureId = (string) ($captures[0]['id'] ?? $orderId);

                return PaymentResult::success(
                    $captureId,
                    'PayPal order completed and verified.',
                    $orderData
                );
            }

            if ($status === 'APPROVED') {
                // Order approved by customer on PayPal checkout; capture it now
                $captureData = $this->client()->captureOrder($orderId);
                $captureStatus = strtoupper((string) ($captureData['status'] ?? ''));

                if ($captureStatus === 'COMPLETED') {
                    $captures = $captureData['purchase_units'][0]['payments']['captures'] ?? [];
                    $captureId = (string) ($captures[0]['id'] ?? $captureData['id'] ?? $orderId);

                    return PaymentResult::success(
                        $captureId,
                        'PayPal payment captured and verified successfully.',
                        $captureData
                    );
                }

                if ($captureStatus === 'PENDING') {
                    return PaymentResult::pending(
                        $orderId,
                        'PayPal payment capture is currently pending.',
                        $captureData
                    );
                }

                return PaymentResult::failed(
                    'PayPal order capture was not completed.',
                    $orderId,
                    $captureData
                );
            }

            if (in_array($status, ['CREATED', 'SAVED', 'PAYER_ACTION_REQUIRED'], true)) {
                return PaymentResult::pending(
                    $orderId,
                    "PayPal order is {$status} and awaiting customer completion.",
                    $orderData
                );
            }

            if (in_array($status, ['VOIDED', 'DENIED'], true)) {
                return PaymentResult::failed(
                    "PayPal order has been {$status}.",
                    $orderId,
                    $orderData
                );
            }

            return PaymentResult::success($orderId, 'PayPal payment reference accepted.', $orderData);
        } catch (Throwable $e) {
            $this->log('error', "PayPal verification error: {$e->getMessage()}");

            return PaymentResult::failed("PayPal payment verification failed: {$e->getMessage()}");
        }
    }

    /**
     * Handle incoming asynchronous webhook notifications from PayPal.
     *
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $headers
     */
    public function handleWebhook(array $payload, array $headers = []): PaymentResult
    {
        $webhookId = $this->webhookId();

        if ($webhookId) {
            $signatureValid = $this->client()->verifyWebhookSignature($payload, $headers, $webhookId);
            if (! $signatureValid) {
                return PaymentResult::failed('Invalid PayPal webhook signature.');
            }
        }

        $eventType = (string) ($payload['event_type'] ?? 'unknown');
        $resource = $payload['resource'] ?? [];
        $transactionId = (string) ($resource['id'] ?? $payload['id'] ?? '');

        $this->log('info', "Received PayPal webhook: {$eventType}", ['transaction_id' => $transactionId]);

        return match ($eventType) {
            'PAYMENT.CAPTURE.COMPLETED' => PaymentResult::success(
                $transactionId,
                'PayPal payment capture completed.',
                $payload
            ),
            'CHECKOUT.ORDER.COMPLETED' => PaymentResult::success(
                $transactionId,
                'PayPal checkout order completed.',
                $payload
            ),
            'PAYMENT.CAPTURE.DENIED', 'CHECKOUT.ORDER.VOIDED' => PaymentResult::failed(
                (string) ($resource['status_details']['reason'] ?? 'Payment failed via PayPal.'),
                $transactionId,
                $payload
            ),
            'PAYMENT.CAPTURE.REFUNDED' => new PaymentResult(
                success: true,
                transactionId: $transactionId,
                status: 'refunded',
                message: 'PayPal payment refunded.',
                data: $payload
            ),
            'CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.PENDING' => PaymentResult::pending(
                $transactionId ?: null,
                "PayPal event [{$eventType}] pending completion.",
                $payload
            ),
            default => PaymentResult::pending(
                $transactionId ?: null,
                "PayPal event [{$eventType}] acknowledged.",
                $payload
            ),
        };
    }

    /**
     * Create a PayPal Order for hosted checkout redirect flow (similar to Stripe Checkout Session).
     *
     * @param  array<string, mixed>  $options
     */
    protected function chargeCheckoutSession(Order $order, float $amount, string $currency, array $options): PaymentResult
    {
        $orderData = $this->buildOrderPayload($order, $amount, $currency, $options);
        $result = $this->client()->createOrder($orderData);

        $orderId = (string) ($result['id'] ?? 'PAYPAL_ORDER_'.uniqid('', true));
        $approvalUrl = $this->extractApprovalUrl($result, $orderId);

        return PaymentResult::redirect(
            redirectUrl: $approvalUrl,
            transactionId: $orderId,
            message: 'PayPal approval checkout session generated.',
            data: array_merge($result, [
                'order_id' => $order->id,
                'approval_url' => $approvalUrl,
            ])
        );
    }

    /**
     * Create a PayPal Order for client-side JS SDK modal flow.
     *
     * @param  array<string, mixed>  $options
     */
    protected function chargeOrder(Order $order, float $amount, string $currency, array $options): PaymentResult
    {
        $orderData = $this->buildOrderPayload($order, $amount, $currency, $options);
        $result = $this->client()->createOrder($orderData);

        $orderId = (string) ($result['id'] ?? 'PAYPAL_ORDER_'.uniqid('', true));
        $approvalUrl = $this->extractApprovalUrl($result, $orderId);

        return PaymentResult::pending(
            transactionId: $orderId,
            message: 'PayPal order created for client checkout integration.',
            data: array_merge($result, [
                'order_id' => $order->id,
                'paypal_order_id' => $orderId,
                'approval_url' => $approvalUrl,
                'client_id' => $this->clientId(),
            ])
        );
    }

    /**
     * Capture an already authorized or approved PayPal order.
     *
     * @param  array<string, mixed>  $options
     */
    protected function captureExistingOrder(Order $order, string $paypalOrderId, array $options = []): PaymentResult
    {
        $result = $this->client()->captureOrder($paypalOrderId);
        $status = strtoupper((string) ($result['status'] ?? ''));

        $captures = $result['purchase_units'][0]['payments']['captures'] ?? [];
        $captureId = (string) ($captures[0]['id'] ?? $result['id'] ?? $paypalOrderId);

        if ($status === 'COMPLETED') {
            return PaymentResult::success(
                $captureId,
                'PayPal payment captured successfully.',
                $result
            );
        }

        if ($status === 'PENDING') {
            return PaymentResult::pending(
                $captureId,
                'PayPal payment is pending completion.',
                $result
            );
        }

        return PaymentResult::failed(
            'PayPal payment capture failed.',
            $captureId,
            $result
        );
    }

    /**
     * Build the standard PayPal Orders v2 creation payload.
     *
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    protected function buildOrderPayload(Order $order, float $amount, string $currency, array $options): array
    {
        $returnUrl = (string) ($options['return_url'] ?? $options['success_url'] ?? url("/shop?payment_status=success&order_id={$order->id}&payment_gateway=paypal"));
        $cancelUrl = (string) ($options['cancel_url'] ?? url("/shop?payment_status=cancelled&order_id={$order->id}&payment_gateway=paypal"));

        return [
            'intent' => 'CAPTURE',
            'purchase_units' => [
                [
                    'reference_id' => (string) ($order->order_number ?: $order->id),
                    'description' => "Order #{$order->order_number}",
                    'custom_id' => (string) $order->id,
                    'amount' => [
                        'currency_code' => $currency,
                        'value' => $this->formatAmount($amount, $currency),
                    ],
                ],
            ],
            'application_context' => array_filter([
                'brand_name' => (string) Setting::get('store_name', config('app.name', 'Store')),
                'landing_page' => 'LOGIN',
                'user_action' => 'PAY_NOW',
                'return_url' => $returnUrl,
                'cancel_url' => $cancelUrl,
            ]),
        ];
    }

    /**
     * Extract buyer approval URL from PayPal order links or fallback to checkout URL.
     *
     * @param  array<string, mixed>  $orderData
     */
    protected function extractApprovalUrl(array $orderData, string $orderId): string
    {
        $links = $orderData['links'] ?? [];
        if (is_array($links)) {
            foreach ($links as $link) {
                if (($link['rel'] ?? '') === 'approve') {
                    return (string) $link['href'];
                }
            }
        }

        return "{$this->client()->checkoutUrl()}?token={$orderId}";
    }

    /**
     * Resolve capture ID for refund operations.
     */
    protected function resolveCaptureId(?string $transactionId, ?Payment $payment): ?string
    {
        if ($payment && is_array($payment->payload)) {
            $payload = $payment->payload;
            $captures = $payload['purchase_units'][0]['payments']['captures'] ?? null;
            if (is_array($captures) && ! empty($captures[0]['id'])) {
                return (string) $captures[0]['id'];
            }
            if (! empty($payload['capture_id'])) {
                return (string) $payload['capture_id'];
            }
        }

        if ($transactionId && ! str_starts_with($transactionId, 'PAYPAL_ORDER_') && ! str_starts_with($transactionId, 'EC-')) {
            return $transactionId;
        }

        if ($transactionId) {
            try {
                $orderData = $this->client()->getOrder($transactionId);
                $captures = $orderData['purchase_units'][0]['payments']['captures'] ?? null;
                if (is_array($captures) && ! empty($captures[0]['id'])) {
                    return (string) $captures[0]['id'];
                }
            } catch (Throwable) {
                // Non-blocking fallback
            }
        }

        return $transactionId;
    }

    /**
     * Normalize currency code (PayPal requires uppercase ISO 4217 code).
     */
    protected function currency(?string $currency = null): string
    {
        return strtoupper((string) ($currency ?? Setting::get('currency_code', 'USD')));
    }

    /**
     * Standard order metadata for PayPal.
     *
     * @return array{order_id: string, order_number: string}
     */
    protected function orderMetadata(Order $order): array
    {
        return [
            'order_id' => (string) $order->id,
            'order_number' => (string) $order->order_number,
        ];
    }

    protected function formatAmount(float $amount, string $currency): string
    {
        return number_format($amount, 2, '.', '');
    }
}

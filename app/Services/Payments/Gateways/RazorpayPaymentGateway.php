<?php

declare(strict_types=1);

namespace App\Services\Payments\Gateways;

use App\Enums\Order\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\Payments\DTOs\PaymentResult;
use Razorpay\Api\Api;
use Razorpay\Api\Errors\SignatureVerificationError;
use Throwable;

class RazorpayPaymentGateway extends AbstractPaymentGateway
{
    public function __construct(
        protected ?Api $api = null,
    ) {}

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
     * Retrieve the gateway configuration array from database settings or config.
     *
     * @return array<string, mixed>
     */
    public function config(): array
    {
        try {
            $parent = parent::config();

            return array_merge([
                'key_id' => Setting::get('payment_razorpay_key_id') ?: ($parent['key_id'] ?? null),
                'key_secret' => Setting::get('payment_razorpay_key_secret') ?: ($parent['key_secret'] ?? null),
                'webhook_secret' => Setting::get('payment_razorpay_webhook_secret') ?: ($parent['webhook_secret'] ?? null),
            ], $parent);
        } catch (Throwable) {
            return [];
        }
    }

    public function keyId(): ?string
    {
        return ($this->config()['key_id'] ?? null) ?: null;
    }

    public function keySecret(): ?string
    {
        return ($this->config()['key_secret'] ?? null) ?: null;
    }

    public function webhookSecret(): ?string
    {
        return ($this->config()['webhook_secret'] ?? null) ?: null;
    }

    /**
     * Publishable key alias (key_id) matching Stripe convention.
     */
    public function publishableKey(): ?string
    {
        return $this->keyId();
    }

    /**
     * Secret key alias (key_secret) matching Stripe convention.
     */
    public function secretKey(): ?string
    {
        return $this->keySecret();
    }

    /**
     * Determine whether the gateway is enabled and configured.
     */
    public function isEnabled(): bool
    {
        return parent::isEnabled() && ! empty($this->keyId()) && ! empty($this->keySecret());
    }

    /**
     * Resolve or instantiate the Razorpay API client.
     */
    public function client(): Api
    {
        return $this->api ??= app()->bound(Api::class)
            ? app(Api::class)
            : new Api((string) $this->keyId(), (string) $this->keySecret());
    }

    /**
     * Override the API client (useful for unit testing and mocking).
     */
    public function setClient(Api $api): self
    {
        $this->api = $api;

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
            return PaymentResult::failed('Razorpay payment gateway is currently disabled or unconfigured.');
        }

        try {
            $currency = $this->currency($options['currency'] ?? null);
            $amountInPaise = $this->formatAmount((float) ($order->total ?? $order->total_amount ?? 0), $currency);

            // Direct payment ID capture if supplied
            if (! empty($options['payment_id']) || ! empty($options['razorpay_payment_id'])) {
                return $this->chargeDirectPayment($order, $amountInPaise, $currency, $options);
            }

            // Standard order creation flow (modal checkout) vs hosted Payment Link redirect flow
            return in_array($options['flow'] ?? null, ['order', 'standard', 'modal'], true)
                ? $this->chargeOrder($order, $amountInPaise, $currency, $options)
                : $this->chargePaymentLink($order, $amountInPaise, $currency, $options);
        } catch (Throwable $e) {
            $this->log('error', "Razorpay charge error: {$e->getMessage()}");

            return PaymentResult::failed("Razorpay payment processing error: {$e->getMessage()}");
        }
    }

    /**
     * Process a full or partial refund for the specified order.
     */
    public function refund(Order $order, ?float $amount = null, ?string $reason = null): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('Razorpay payment gateway is currently disabled.');
        }

        $payment = Payment::query()
            ->where('order_id', $order->id)
            ->where('gateway', 'razorpay')
            ->where('status', PaymentStatus::Paid)
            ->latest()
            ->first();

        $transactionId = $payment?->transaction_id;

        try {
            $currency = $this->currency();
            $refundAmount = $amount ?? (float) ($order->total ?? $order->total_amount ?? 0.0);
            $amountInPaise = $amount !== null ? $this->formatAmount($refundAmount, $currency) : null;

            $params = array_filter([
                'amount' => $amountInPaise,
                'notes' => array_filter([
                    'reason' => $reason,
                    'order_id' => (string) $order->id,
                    'order_number' => (string) $order->order_number,
                ]),
            ]);

            $refundEntity = null;

            // 1. If transaction ID is a payment ID (pay_...), refund through payment entity
            if ($transactionId && str_starts_with($transactionId, 'pay_')) {
                $paymentEntity = $this->client()->payment->fetch($transactionId);
                $refundEntity = $paymentEntity->refund($params);
            } elseif ($transactionId && str_starts_with($transactionId, 'order_')) {
                // 2. If transaction ID is an order ID (order_...), look up its captured payments
                try {
                    $orderEntity = $this->client()->order->fetch($transactionId);
                    $payments = $orderEntity->payments();
                    $items = $payments['items'] ?? $payments->items ?? [];
                    foreach ($items as $item) {
                        $itemStatus = $item['status'] ?? $item->status ?? '';
                        if ($itemStatus === 'captured') {
                            $payId = (string) ($item['id'] ?? $item->id);
                            $paymentEntity = $this->client()->payment->fetch($payId);
                            $refundEntity = $paymentEntity->refund($params);
                            break;
                        }
                    }
                } catch (Throwable) {
                    // Fall back to direct refund resource creation
                }
            }

            // 3. Fallback: Create refund via refund resource
            if (! $refundEntity) {
                $payId = ($transactionId && str_starts_with($transactionId, 'pay_'))
                    ? $transactionId
                    : ($payment?->payload['razorpay_payment_id'] ?? null);

                $refundEntity = $this->client()->refund->create(array_filter(array_merge($params, [
                    'payment_id' => $payId ?: $transactionId,
                ])));
            }

            $data = method_exists($refundEntity, 'toArray') ? $refundEntity->toArray() : (array) $refundEntity;
            $refundId = (string) ($data['id'] ?? $refundEntity->id ?? '');

            return new PaymentResult(
                success: true,
                transactionId: $refundId,
                status: 'refunded',
                message: 'Razorpay refund executed successfully.',
                data: $data
            );
        } catch (Throwable $e) {
            $this->log('error', "Razorpay refund error: {$e->getMessage()}");

            return PaymentResult::failed("Razorpay refund error: {$e->getMessage()}");
        }
    }

    /**
     * Verify payment status using an external transaction reference and optional payload signature.
     *
     * @param  array<string, mixed>  $payload
     */
    public function verifyPayment(string $transactionId, array $payload = []): PaymentResult
    {
        try {
            $signature = (string) ($payload['razorpay_signature'] ?? '');
            $paymentId = (string) ($payload['razorpay_payment_id'] ?? (str_starts_with($transactionId, 'pay_') ? $transactionId : ''));
            $orderId = (string) ($payload['razorpay_order_id'] ?? (str_starts_with($transactionId, 'order_') ? $transactionId : ''));

            // 1. Verify HMAC-SHA256 signature if signature is supplied
            if (! empty($signature) && ! empty($paymentId)) {
                $secret = (string) $this->keySecret();
                if (! empty($secret)) {
                    $expectedPayload = $orderId ? "{$orderId}|{$paymentId}" : $paymentId;
                    $expectedSignature = hash_hmac('sha256', $expectedPayload, $secret);

                    if (! hash_equals($expectedSignature, $signature)) {
                        return PaymentResult::failed('Invalid Razorpay payment signature.', $paymentId ?: $transactionId, $payload);
                    }
                }
            }

            // 2. Fetch payment entity if pay_... ID is available
            if (! empty($paymentId) && str_starts_with($paymentId, 'pay_')) {
                $paymentEntity = $this->client()->payment->fetch($paymentId);
                $data = method_exists($paymentEntity, 'toArray') ? $paymentEntity->toArray() : (array) $paymentEntity;

                return match ($paymentEntity->status) {
                    'captured' => PaymentResult::success((string) $paymentEntity->id, 'Razorpay payment captured and verified.', $data),
                    'authorized' => PaymentResult::pending((string) $paymentEntity->id, 'Razorpay payment is authorized and awaiting capture.', $data),
                    'refunded' => PaymentResult::failed('Razorpay payment has already been refunded.', (string) $paymentEntity->id, $data),
                    default => PaymentResult::failed((string) ($paymentEntity->error_description ?? "Razorpay payment status is {$paymentEntity->status}."), (string) $paymentEntity->id, $data),
                };
            }

            // 3. Fetch order entity if transaction is order_...
            if (str_starts_with($transactionId, 'order_')) {
                $orderEntity = $this->client()->order->fetch($transactionId);
                $data = method_exists($orderEntity, 'toArray') ? $orderEntity->toArray() : (array) $orderEntity;

                return match ($orderEntity->status) {
                    'paid' => PaymentResult::success((string) $orderEntity->id, 'Razorpay order paid and verified.', $data),
                    'attempted' => PaymentResult::pending((string) $orderEntity->id, 'Razorpay order payment attempted.', $data),
                    default => PaymentResult::pending((string) $orderEntity->id, "Razorpay order status is {$orderEntity->status}.", $data),
                };
            }

            // 4. Fetch payment link entity if transaction is plink_...
            if (str_starts_with($transactionId, 'plink_')) {
                $linkEntity = $this->client()->paymentLink->fetch($transactionId);
                $data = method_exists($linkEntity, 'toArray') ? $linkEntity->toArray() : (array) $linkEntity;

                return match ($linkEntity->status) {
                    'paid' => PaymentResult::success((string) $linkEntity->id, 'Razorpay payment link paid and verified.', $data),
                    'partially_paid' => PaymentResult::pending((string) $linkEntity->id, 'Razorpay payment link partially paid.', $data),
                    default => PaymentResult::pending((string) $linkEntity->id, "Razorpay payment link status is {$linkEntity->status}.", $data),
                };
            }

            return PaymentResult::success($transactionId, 'Razorpay payment reference accepted.', $payload);
        } catch (Throwable $e) {
            $this->log('error', "Razorpay verification error: {$e->getMessage()}");

            return PaymentResult::failed("Razorpay payment verification failed: {$e->getMessage()}");
        }
    }

    /**
     * Handle incoming asynchronous webhook notifications from Razorpay.
     *
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $headers
     */
    public function handleWebhook(array $payload, array $headers = []): PaymentResult
    {
        $signature = request()->header('x-razorpay-signature')
            ?? (is_array($headers['x-razorpay-signature'] ?? null) ? $headers['x-razorpay-signature'][0] : ($headers['x-razorpay-signature'] ?? null));

        $secret = $this->webhookSecret();

        if ($secret && $signature) {
            $rawPayload = (string) request()->getContent();
            $expectedSignature = hash_hmac('sha256', $rawPayload, $secret);

            if (! hash_equals($expectedSignature, (string) $signature)) {
                return PaymentResult::failed('Invalid Razorpay webhook signature.');
            }
        }

        $event = (string) ($payload['event'] ?? 'unknown');
        $paymentEntity = $payload['payload']['payment']['entity'] ?? [];
        $orderEntity = $payload['payload']['order']['entity'] ?? [];
        $refundEntity = $payload['payload']['refund']['entity'] ?? [];
        $linkEntity = $payload['payload']['payment_link']['entity'] ?? [];

        $paymentId = (string) ($paymentEntity['id'] ?? $refundEntity['payment_id'] ?? '');
        $orderId = (string) ($paymentEntity['order_id'] ?? $orderEntity['id'] ?? '');
        $refundId = (string) ($refundEntity['id'] ?? '');
        $linkId = (string) ($linkEntity['id'] ?? '');

        // Resolve transaction ID for CheckoutController payment matching
        $candidates = array_filter([$paymentId, $orderId, $linkId, $refundId]);
        $transactionId = $paymentId ?: $orderId ?: $linkId ?: $refundId;
        foreach ($candidates as $candidate) {
            if (Payment::where('transaction_id', $candidate)->exists()) {
                $transactionId = $candidate;
                break;
            }
        }

        return match ($event) {
            'payment.captured', 'order.paid', 'payment_link.paid' => PaymentResult::success(
                $transactionId,
                'Razorpay payment captured successfully.',
                $payload
            ),
            'payment.failed' => PaymentResult::failed(
                (string) ($paymentEntity['error_description'] ?? 'Payment failed via Razorpay.'),
                $transactionId,
                $payload
            ),
            'refund.processed', 'refund.created' => new PaymentResult(
                success: true,
                transactionId: $transactionId,
                status: 'refunded',
                message: 'Razorpay refund processed.',
                data: $payload
            ),
            'payment.authorized' => PaymentResult::pending(
                $transactionId,
                'Razorpay payment authorized.',
                $payload
            ),
            default => PaymentResult::pending(
                $transactionId ?: null,
                "Razorpay webhook event [{$event}] acknowledged.",
                $payload
            ),
        };
    }

    /**
     * Create a Razorpay Order for client-side modal checkout flow.
     *
     * @param  array<string, mixed>  $options
     */
    protected function chargeOrder(Order $order, int $amountInPaise, string $currency, array $options): PaymentResult
    {
        $orderData = [
            'receipt' => (string) ($options['receipt'] ?? $order->order_number),
            'amount' => $amountInPaise,
            'currency' => $currency,
            'notes' => $this->orderMetadata($order),
        ];

        $razorpayOrder = $this->client()->order->create($orderData);
        $data = method_exists($razorpayOrder, 'toArray') ? $razorpayOrder->toArray() : (array) $razorpayOrder;
        $id = (string) ($data['id'] ?? $razorpayOrder->id ?? '');

        return PaymentResult::pending(
            transactionId: $id,
            message: 'Razorpay order created for client checkout integration.',
            data: array_merge($data, [
                'order_id' => $order->id,
                'razorpay_order_id' => $id,
                'amount_in_paise' => $amountInPaise,
                'currency' => $currency,
                'key_id' => $this->keyId(),
            ])
        );
    }

    /**
     * Create a Razorpay Payment Link for hosted checkout redirect flow (similar to Stripe Checkout Session).
     *
     * @param  array<string, mixed>  $options
     */
    protected function chargePaymentLink(Order $order, int $amountInPaise, string $currency, array $options): PaymentResult
    {
        $customer = array_filter([
            'name' => (string) ($order->customer_name ?: 'Customer'),
            'email' => (string) ($order->customer_email ?: ''),
            'contact' => (string) ($order->customer_phone ?: ''),
        ]);

        $linkData = array_filter([
            'amount' => $amountInPaise,
            'currency' => $currency,
            'accept_partial' => false,
            'reference_id' => (string) ($order->order_number ?: $order->id),
            'description' => "Order #{$order->order_number}",
            'customer' => ! empty($customer) ? $customer : null,
            'notify' => [
                'sms' => false,
                'email' => ! empty($order->customer_email),
            ],
            'reminder_enable' => false,
            'callback_url' => (string) ($options['callback_url'] ?? $options['success_url'] ?? url("/shop?payment_status=success&order_id={$order->id}&payment_gateway=razorpay")),
            'callback_method' => 'get',
            'notes' => $this->orderMetadata($order),
        ]);

        $paymentLink = $this->client()->paymentLink->create($linkData);
        $data = method_exists($paymentLink, 'toArray') ? $paymentLink->toArray() : (array) $paymentLink;
        $id = (string) ($data['id'] ?? $paymentLink->id ?? '');
        $shortUrl = (string) ($data['short_url'] ?? $paymentLink->short_url ?? '');

        return PaymentResult::redirect(
            redirectUrl: $shortUrl,
            transactionId: $id,
            message: 'Razorpay payment link created successfully.',
            data: $data
        );
    }

    /**
     * Capture a direct or pre-authorized payment.
     *
     * @param  array<string, mixed>  $options
     */
    protected function chargeDirectPayment(Order $order, int $amountInPaise, string $currency, array $options): PaymentResult
    {
        $paymentId = (string) ($options['payment_id'] ?? $options['razorpay_payment_id']);
        $payment = $this->client()->payment->fetch($paymentId);

        if ($payment->status === 'authorized') {
            $payment = $payment->capture([
                'amount' => $amountInPaise,
                'currency' => $currency,
            ]);
        }

        $data = method_exists($payment, 'toArray') ? $payment->toArray() : (array) $payment;

        return match ($payment->status) {
            'captured' => PaymentResult::success((string) $payment->id, 'Razorpay charge captured successfully.', $data),
            'authorized' => PaymentResult::pending((string) $payment->id, 'Razorpay charge authorized.', $data),
            default => PaymentResult::failed(
                (string) ($payment->error_description ?? "Razorpay payment status is {$payment->status}."),
                (string) $payment->id,
                $data
            ),
        };
    }

    /**
     * Normalize currency code (Razorpay requires uppercase ISO currency).
     */
    protected function currency(?string $currency = null): string
    {
        return strtoupper((string) ($currency ?? Setting::get('currency_code', 'INR')));
    }

    /**
     * Standard order metadata for Razorpay orders/links.
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

    protected function formatAmount(float $amount, string $currency): int
    {
        return (int) round($amount * 100);
    }
}

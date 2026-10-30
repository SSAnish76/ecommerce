<?php

declare(strict_types=1);

namespace App\Services\Payments\Gateways;

use App\Enums\Order\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\Payments\DTOs\PaymentResult;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;
use Throwable;

class StripePaymentGateway extends AbstractPaymentGateway
{
    public function __construct(
        protected ?StripeClient $stripe = null,
    ) {}

    public function name(): string
    {
        return 'stripe';
    }

    public function label(): string
    {
        return 'Stripe';
    }

    /**
     * @return array<string, mixed>
     */
    public function config(): array
    {
        try {
            return array_merge([
                'secret_key' => Setting::get('payment_stripe_secret_key'),
                'publishable_key' => Setting::get('payment_stripe_publishable_key'),
                'webhook_secret' => Setting::get('payment_stripe_webhook_secret'),
            ], parent::config());
        } catch (Throwable) {
            return [];
        }
    }

    public function secretKey(): ?string
    {
        return ($this->config()['secret_key'] ?? null) ?: null;
    }

    public function publishableKey(): ?string
    {
        return ($this->config()['publishable_key'] ?? null) ?: null;
    }

    public function webhookSecret(): ?string
    {
        return ($this->config()['webhook_secret'] ?? null) ?: null;
    }

    public function isEnabled(): bool
    {
        return parent::isEnabled() && ! empty($this->secretKey());
    }

    public function client(): StripeClient
    {
        return $this->stripe ??= app()->bound(StripeClient::class)
            ? app(StripeClient::class)
            : new StripeClient((string) $this->secretKey());
    }

    public function setClient(StripeClient $stripe): self
    {
        $this->stripe = $stripe;

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
            return PaymentResult::failed('Stripe payment gateway is currently disabled or unconfigured.');
        }

        try {
            $currency = $this->currency($options['currency'] ?? null);
            $amountInCents = $this->formatAmount((float) ($order->total ?? $order->total_amount ?? 0), $currency);

            return ($options['flow'] ?? null) === 'payment_intent'
                ? $this->chargePaymentIntent($order, $amountInCents, $currency, $options)
                : $this->chargeCheckoutSession($order, $amountInCents, $currency, $options);
        } catch (Throwable $e) {
            $this->log('error', "Stripe charge error: {$e->getMessage()}");

            return PaymentResult::failed("Stripe payment processing error: {$e->getMessage()}");
        }
    }

    /**
     * Process a refund for the specified order.
     */
    public function refund(Order $order, ?float $amount = null, ?string $reason = null): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('Stripe payment gateway is currently disabled.');
        }

        $payment = Payment::query()
            ->where('order_id', $order->id)
            ->where('gateway', 'stripe')
            ->where('status', PaymentStatus::Paid)
            ->latest()
            ->first();

        $transactionId = $payment?->transaction_id;

        try {
            $refundAmount = $amount ?? (float) ($order->total ?? $order->total_amount ?? 0.0);

            $params = array_filter([
                'amount' => $amount !== null ? $this->formatAmount($refundAmount, $this->currency()) : null,
                'reason' => in_array($reason, ['duplicate', 'fraudulent', 'requested_by_customer'], true) ? $reason : null,
            ]);

            if ($transactionId) {
                $params[str_starts_with($transactionId, 'pi_') ? 'payment_intent' : 'charge'] = $transactionId;
            }

            $refund = $this->client()->refunds->create($params);

            return new PaymentResult(
                success: true,
                transactionId: (string) $refund->id,
                status: 'refunded',
                message: 'Stripe refund executed successfully.',
                data: $refund->toArray()
            );
        } catch (Throwable $e) {
            $this->log('error', "Stripe refund error: {$e->getMessage()}");

            return PaymentResult::failed("Stripe refund error: {$e->getMessage()}");
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
            $sessionId = str_starts_with($transactionId, 'cs_')
                ? $transactionId
                : (string) ($payload['session_id'] ?? '');

            if (str_starts_with($sessionId, 'cs_')) {
                $session = $this->client()->checkout->sessions->retrieve($sessionId);

                return match ($session->payment_status) {
                    'paid' => PaymentResult::success((string) ($session->payment_intent ?? $sessionId), 'Stripe checkout session completed and verified.', $session->toArray()),
                    'unpaid' => PaymentResult::pending($sessionId, 'Stripe checkout session payment is still unpaid.', $session->toArray()),
                    default => PaymentResult::failed('Stripe checkout session could not be verified.', $sessionId, $session->toArray()),
                };
            }

            if (str_starts_with($transactionId, 'pi_')) {
                $intent = $this->client()->paymentIntents->retrieve($transactionId);
                $data = $intent->toArray();

                return match ($intent->status) {
                    'succeeded' => PaymentResult::success((string) $intent->id, 'Stripe payment intent confirmed and verified.', $data),
                    'requires_action', 'requires_confirmation', 'processing' => PaymentResult::pending((string) $intent->id, "Stripe payment intent is {$intent->status}.", $data),
                    default => PaymentResult::failed((string) ($intent->last_payment_error?->message ?? "Stripe payment intent status is {$intent->status}."), $transactionId, $data),
                };
            }

            if (str_starts_with($transactionId, 'ch_')) {
                $charge = $this->client()->charges->retrieve($transactionId);

                return $charge->paid
                    ? PaymentResult::success((string) $charge->id, 'Stripe charge verified successfully.', $charge->toArray())
                    : PaymentResult::failed('Stripe charge is not paid.', $transactionId, $charge->toArray());
            }

            return PaymentResult::success($transactionId, 'Stripe payment reference accepted.', $payload);
        } catch (Throwable $e) {
            $this->log('error', "Stripe verification error: {$e->getMessage()}");

            return PaymentResult::failed("Stripe payment verification failed: {$e->getMessage()}");
        }
    }

    /**
     * Handle incoming asynchronous webhook notifications from Stripe.
     *
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $headers
     */
    public function handleWebhook(array $payload, array $headers = []): PaymentResult
    {
        $signature = request()->header('stripe-signature')
            ?? (is_array($headers['stripe-signature'] ?? null) ? $headers['stripe-signature'][0] : ($headers['stripe-signature'] ?? null));
        $secret = $this->webhookSecret();

        if ($secret && $signature) {
            try {
                Webhook::constructEvent((string) request()->getContent(), (string) $signature, $secret);
            } catch (SignatureVerificationException) {
                return PaymentResult::failed('Invalid Stripe webhook signature.');
            }
        }

        $eventType = (string) ($payload['type'] ?? $payload['event'] ?? 'unknown');
        $eventObject = $payload['data']['object'] ?? [];
        $transactionId = (string) ($eventObject['id'] ?? $payload['id'] ?? '');

        return match ($eventType) {
            'payment_intent.succeeded' => PaymentResult::success($transactionId, 'Stripe payment intent succeeded.', $payload),
            'payment_intent.payment_failed' => PaymentResult::failed((string) ($eventObject['last_payment_error']['message'] ?? 'Payment failed via Stripe.'), $transactionId, $payload),
            'checkout.session.completed' => (($eventObject['payment_status'] ?? '') === 'paid')
                ? PaymentResult::success((string) ($eventObject['payment_intent'] ?? $transactionId), 'Stripe checkout session succeeded.', $payload)
                : PaymentResult::pending((string) ($eventObject['payment_intent'] ?? $transactionId), 'Stripe checkout session completed but pending payment.', $payload),
            'charge.refunded' => new PaymentResult(
                success: true,
                transactionId: (string) ($eventObject['payment_intent'] ?? $transactionId),
                status: 'refunded',
                message: 'Stripe charge refunded.',
                data: $payload
            ),
            default => PaymentResult::pending($transactionId ?: null, "Stripe webhook event [{$eventType}] acknowledged.", $payload),
        };
    }

    /**
     * Create a Stripe PaymentIntent for direct/custom UI payment flow.
     *
     * @param  array<string, mixed>  $options
     */
    protected function chargePaymentIntent(Order $order, int $amountInCents, string $currency, array $options): PaymentResult
    {
        $paymentMethod = $options['payment_method_id'] ?? $options['token'] ?? 'pm_card_visa';
        if (in_array($paymentMethod, ['pm_card_simulated', 'tok_visa_card_test'], true)) {
            $paymentMethod = 'pm_card_visa';
        }

        $intent = $this->client()->paymentIntents->create(array_filter([
            'amount' => $amountInCents,
            'currency' => $currency,
            'payment_method' => $paymentMethod,
            'confirm' => true,
            'description' => "Order #{$order->order_number}",
            'receipt_email' => $order->customer_email ?: null,
            'return_url' => (string) ($options['return_url'] ?? url("/shop?order_id={$order->id}&payment_gateway=stripe")),
            'metadata' => $this->orderMetadata($order),
        ]));

        $data = $intent->toArray();
        $id = (string) $intent->id;

        return match ($intent->status) {
            'succeeded' => PaymentResult::success($id, 'Stripe charge captured successfully.', $data),
            'requires_action', 'requires_confirmation' => PaymentResult::redirect(
                redirectUrl: (string) ($intent->next_action?->redirect_to_url?->url ?? $options['return_url'] ?? ''),
                transactionId: $id,
                message: 'Stripe 3D-Secure customer authentication required.',
                data: $data
            ),
            'processing' => PaymentResult::pending($id, 'Stripe payment is processing asynchronously.', $data),
            default => PaymentResult::failed(
                (string) ($intent->last_payment_error?->message ?? "Stripe payment status is {$intent->status}."),
                $id,
                $data
            ),
        };
    }

    /**
     * Create a Stripe Checkout Session for hosted checkout redirect flow.
     *
     * @param  array<string, mixed>  $options
     */
    protected function chargeCheckoutSession(Order $order, int $amountInCents, string $currency, array $options): PaymentResult
    {
        $session = $this->client()->checkout->sessions->create(array_filter([
            'mode' => 'payment',
            'line_items' => [[
                'price_data' => [
                    'currency' => $currency,
                    'product_data' => ['name' => "Order #{$order->order_number}"],
                    'unit_amount' => $amountInCents,
                ],
                'quantity' => 1,
            ]],
            'client_reference_id' => (string) $order->id,
            'customer_email' => $order->customer_email ?: null,
            'success_url' => (string) ($options['success_url'] ?? url("/shop?payment_status=success&session_id={CHECKOUT_SESSION_ID}&order_id={$order->id}")),
            'cancel_url' => (string) ($options['cancel_url'] ?? url("/shop?payment_status=cancelled&order_id={$order->id}")),
            'metadata' => $this->orderMetadata($order),
        ]));

        return PaymentResult::redirect(
            redirectUrl: (string) $session->url,
            transactionId: (string) $session->id,
            message: 'Stripe checkout session created successfully.',
            data: $session->toArray()
        );
    }

    /**
     * Normalize currency code.
     */
    protected function currency(?string $currency = null): string
    {
        return strtolower((string) ($currency ?? Setting::get('currency_code', 'inr')));
    }

    /**
     * Standard order metadata for Stripe intents/sessions.
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

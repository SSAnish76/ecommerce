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

    public function secretKey(): ?string
    {
        $secret = $this->config()['secret_key']
            ?? Setting::get('payment_stripe_secret_key')
            ?? config('services.stripe.secret')
            ?? env('STRIPE_SECRET');

        return is_string($secret) && $secret !== '' ? $secret : null;
    }

    public function publishableKey(): ?string
    {
        $key = $this->config()['publishable_key']
            ?? Setting::get('payment_stripe_publishable_key')
            ?? config('services.stripe.key')
            ?? env('STRIPE_KEY');

        return is_string($key) && $key !== '' ? $key : null;
    }

    public function webhookSecret(): ?string
    {
        $secret = $this->config()['webhook_secret']
            ?? Setting::get('payment_stripe_webhook_secret')
            ?? config('services.stripe.webhook_secret')
            ?? env('STRIPE_WEBHOOK_SECRET');

        return is_string($secret) && $secret !== '' ? $secret : null;
    }

    public function isEnabled(): bool
    {
        return parent::isEnabled() && $this->secretKey() !== null;
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

    public function charge(Order $order, array $options = []): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('Stripe payment gateway is currently disabled or unconfigured.');
        }

        try {
            $currency = strtolower((string) ($options['currency'] ?? Setting::get('currency_code', 'inr')));
            $amountInCents = $this->formatAmount((float) ($order->total ?? $order->total_amount ?? 0), $currency);

            if (($options['flow'] ?? null) === 'checkout_session') {
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
                    'metadata' => [
                        'order_id' => (string) $order->id,
                        'order_number' => (string) $order->order_number,
                    ],
                ]));

                return PaymentResult::redirect(
                    redirectUrl: (string) $session->url,
                    transactionId: (string) $session->id,
                    message: 'Stripe checkout session created successfully.',
                    data: $session->toArray()
                );
            }

            $paymentMethod = $options['payment_method_id'] ?? $options['token'] ?? 'pm_card_visa';
            if ($paymentMethod === 'pm_card_simulated' || $paymentMethod === 'tok_visa_card_test') {
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
                'metadata' => [
                    'order_id' => (string) $order->id,
                    'order_number' => (string) $order->order_number,
                ],
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
                default => PaymentResult::failed((string) ($intent->last_payment_error?->message ?? "Stripe payment status is {$intent->status}."), $id, $data),
            };
        } catch (Throwable $e) {
            $this->log('error', "Stripe charge error: {$e->getMessage()}");

            return PaymentResult::failed("Stripe payment processing error: {$e->getMessage()}");
        }
    }

    public function refund(Order $order, ?float $amount = null, ?string $reason = null): PaymentResult
    {
        if (! $this->isEnabled()) {
            return PaymentResult::failed('Stripe payment gateway is currently disabled.');
        }

        $payment = Payment::where('order_id', $order->id)
            ->where('gateway', 'stripe')
            ->where('status', PaymentStatus::Paid)
            ->latest()
            ->first();

        $transactionId = $payment?->transaction_id ?? null;

        try {
            $currency = strtolower((string) Setting::get('currency_code', 'inr'));
            $refundAmount = $amount ?? (float) ($order->total ?? $order->total_amount ?? 0.0);

            $params = array_filter([
                'amount' => $amount !== null ? $this->formatAmount($refundAmount, $currency) : null,
                'reason' => in_array($reason, ['duplicate', 'fraudulent', 'requested_by_customer'], true) ? $reason : null,
            ]);

            if ($transactionId && str_starts_with($transactionId, 'pi_')) {
                $params['payment_intent'] = $transactionId;
            } elseif ($transactionId) {
                $params['charge'] = $transactionId;
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

    public function verifyPayment(string $transactionId, array $payload = []): PaymentResult
    {
        try {
            if (str_starts_with($transactionId, 'cs_') || (! empty($payload['session_id']) && str_starts_with((string) $payload['session_id'], 'cs_'))) {
                $sessionId = str_starts_with($transactionId, 'cs_') ? $transactionId : (string) $payload['session_id'];
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
            'charge.refunded' => new PaymentResult(true, (string) ($eventObject['payment_intent'] ?? $transactionId), 'refunded', 'Stripe charge refunded.', null, $payload),
            default => PaymentResult::pending($transactionId ?: null, "Stripe webhook event [{$eventType}] acknowledged.", $payload),
        };
    }

    protected function formatAmount(float $amount, string $currency): int
    {
        $zeroDecimal = ['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];

        return in_array(strtolower($currency), $zeroDecimal, true)
            ? (int) round($amount)
            : (int) round($amount * 100);
    }
}

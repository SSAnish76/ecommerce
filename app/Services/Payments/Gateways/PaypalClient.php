<?php

declare(strict_types=1);

namespace App\Services\Payments\Gateways;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class PaypalClient
{
    protected ?string $cachedToken = null;

    public function __construct(
        protected string $clientId = '',
        protected string $clientSecret = '',
        protected string $mode = 'sandbox',
    ) {}

    public function clientId(): string
    {
        return $this->clientId;
    }

    public function clientSecret(): string
    {
        return $this->clientSecret;
    }

    public function mode(): string
    {
        return $this->mode;
    }

    public function baseUrl(): string
    {
        return $this->mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    public function checkoutUrl(): string
    {
        return $this->mode === 'live'
            ? 'https://www.paypal.com/checkoutnow'
            : 'https://www.sandbox.paypal.com/checkoutnow';
    }

    /**
     * Get or fetch an OAuth2 access token for PayPal REST API.
     */
    public function getAccessToken(): string
    {
        if ($this->cachedToken !== null && $this->cachedToken !== '') {
            return $this->cachedToken;
        }

        $cacheKey = 'paypal_access_token_'.md5("{$this->clientId}:{$this->mode}");
        $token = Cache::get($cacheKey);

        if (is_string($token) && $token !== '') {
            $this->cachedToken = $token;

            return $token;
        }

        $response = Http::baseUrl($this->baseUrl())
            ->withBasicAuth($this->clientId, $this->clientSecret)
            ->asForm()
            ->post('/v1/oauth2/token', [
                'grant_type' => 'client_credentials',
            ]);

        if (! $response->successful()) {
            $error = $this->extractErrorMessage($response);
            throw new RuntimeException("Failed to authenticate with PayPal: {$error}");
        }

        $data = $response->json();
        $accessToken = (string) ($data['access_token'] ?? '');
        $expiresIn = (int) ($data['expires_in'] ?? 3600);

        if ($accessToken === '') {
            throw new RuntimeException('PayPal OAuth token endpoint returned an empty access token.');
        }

        Cache::put($cacheKey, $accessToken, max(60, $expiresIn - 120));
        $this->cachedToken = $accessToken;

        return $accessToken;
    }

    /**
     * Set a pre-resolved access token (useful for mocking and testing).
     */
    public function setAccessToken(string $token): self
    {
        $this->cachedToken = $token;

        return $this;
    }

    /**
     * Create an order via PayPal Orders v2 API.
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function createOrder(array $params): array
    {
        $response = $this->request()->post('/v2/checkout/orders', $params);

        if (! $response->successful()) {
            $message = $this->extractErrorMessage($response);
            throw new RuntimeException("PayPal order creation failed: {$message}");
        }

        return (array) $response->json();
    }

    /**
     * Retrieve order details from PayPal Orders v2 API.
     *
     * @return array<string, mixed>
     */
    public function getOrder(string $orderId): array
    {
        $response = $this->request()->get("/v2/checkout/orders/{$orderId}");

        if (! $response->successful()) {
            $message = $this->extractErrorMessage($response);
            throw new RuntimeException("PayPal order retrieval failed: {$message}");
        }

        return (array) $response->json();
    }

    /**
     * Capture payment for an approved order.
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function captureOrder(string $orderId, array $params = []): array
    {
        $response = $this->request()->post("/v2/checkout/orders/{$orderId}/capture", $params);

        if (! $response->successful()) {
            $message = $this->extractErrorMessage($response);
            throw new RuntimeException("PayPal order capture failed: {$message}");
        }

        return (array) $response->json();
    }

    /**
     * Retrieve capture details.
     *
     * @return array<string, mixed>
     */
    public function getCapture(string $captureId): array
    {
        $response = $this->request()->get("/v2/payments/captures/{$captureId}");

        if (! $response->successful()) {
            $message = $this->extractErrorMessage($response);
            throw new RuntimeException("PayPal capture retrieval failed: {$message}");
        }

        return (array) $response->json();
    }

    /**
     * Refund a captured payment.
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function refundCapture(string $captureId, array $params = []): array
    {
        $response = $this->request()->post("/v2/payments/captures/{$captureId}/refund", $params);

        if (! $response->successful()) {
            $message = $this->extractErrorMessage($response);
            throw new RuntimeException("PayPal refund failed: {$message}");
        }

        return (array) $response->json();
    }

    /**
     * Verify webhook signature with PayPal API.
     *
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $headers
     */
    public function verifyWebhookSignature(array $payload, array $headers = [], ?string $webhookId = null): bool
    {
        if (empty($webhookId)) {
            return true;
        }

        $header = static function (string $key) use ($headers): ?string {
            $val = $headers[$key] ?? $headers[strtolower($key)] ?? null;

            return is_array($val) ? ($val[0] ?? null) : (is_string($val) ? $val : null);
        };

        $authAlgo = $header('paypal-auth-algo');
        $certUrl = $header('paypal-cert-url');
        $transmissionId = $header('paypal-transmission-id');
        $transmissionSig = $header('paypal-transmission-sig');
        $transmissionTime = $header('paypal-transmission-time');

        if (! $authAlgo || ! $certUrl || ! $transmissionId || ! $transmissionSig || ! $transmissionTime) {
            return false;
        }

        try {
            $response = $this->request()->post('/v1/notifications/verify-webhook-signature', [
                'transmission_id' => $transmissionId,
                'transmission_time' => $transmissionTime,
                'cert_url' => $certUrl,
                'auth_algo' => $authAlgo,
                'transmission_sig' => $transmissionSig,
                'webhook_id' => $webhookId,
                'webhook_event' => $payload,
            ]);

            return $response->successful() && ($response->json('verification_status') === 'SUCCESS');
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * Build an authenticated HTTP request for PayPal API.
     */
    protected function request(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl())
            ->withToken($this->getAccessToken())
            ->acceptJson()
            ->asJson();
    }

    protected function extractErrorMessage(Response $response): string
    {
        $json = $response->json();
        if (is_array($json)) {
            if (! empty($json['message'])) {
                return (string) $json['message'];
            }
            if (! empty($json['details'][0]['description'])) {
                return (string) $json['details'][0]['description'];
            }
            if (! empty($json['error_description'])) {
                return (string) $json['error_description'];
            }
        }

        $body = $response->body();

        return $body !== '' ? $body : "HTTP {$response->status()}";
    }
}


<?php

declare(strict_types=1);

namespace App\Services\Payments\Gateways;

use App\Models\Setting;
use App\Services\Payments\Contracts\PaymentGatewayInterface;
use Illuminate\Support\Facades\Log;
use Throwable;

abstract class AbstractPaymentGateway implements PaymentGatewayInterface
{
    /**
     * Retrieve the gateway configuration array from database settings or config.
     *
     * @return array<string, mixed>
     */
    public function config(): array
    {
        try {
            /** @var array<string, mixed> $allPaymentSettings */
            $allPaymentSettings = Setting::get('payment_settings', []);

            $config = $allPaymentSettings[$this->name()] ?? [];
            if (! is_array($config)) {
                $config = [];
            }

            // Also check individual flat setting keys (e.g. payment_stripe_enabled)
            $flatEnabled = Setting::get("payment_{$this->name()}_enabled");
            if ($flatEnabled !== null) {
                $config['enabled'] = (bool) $flatEnabled;
            }

            return $config;
        } catch (Throwable) {
            return [];
        }
    }

    /**
     * Determine whether the gateway is enabled.
     */
    public function isEnabled(): bool
    {
        $config = $this->config();

        return (bool) ($config['enabled'] ?? false);
    }

    /**
     * Log payment gateway activities with consistent contextual metadata.
     *
     * @param array<string, mixed> $context
     */
    protected function log(string $level, string $message, array $context = []): void
    {
        Log::log($level, "[Payment:{$this->name()}] {$message}", array_merge([
            'gateway' => $this->name(),
        ], $context));
    }
}


<?php

declare(strict_types=1);

namespace App\Services\Shipping\Carriers;

use App\Models\Setting;
use App\Services\Shipping\Contracts\ShippingCarrierInterface;
use Illuminate\Support\Facades\Log;
use Throwable;

abstract class AbstractShippingCarrier implements ShippingCarrierInterface
{
    /**
     * Retrieve the carrier configuration settings array.
     *
     * @return array<string, mixed>
     */
    public function config(): array
    {
        try {
            /** @var array<string, mixed> $allShippingSettings */
            $allShippingSettings = Setting::get('shipping_settings', []);

            $config = $allShippingSettings[$this->name()] ?? [];
            if (! is_array($config)) {
                $config = [];
            }

            // Also check individual flat setting keys (e.g. shipping_fedex_enabled)
            $flatEnabled = Setting::get("shipping_{$this->name()}_enabled");
            if ($flatEnabled !== null) {
                $config['enabled'] = (bool) $flatEnabled;
            }

            return $config;
        } catch (Throwable) {
            return [];
        }
    }

    /**
     * Determine whether the carrier/method is enabled.
     */
    public function isEnabled(): bool
    {
        $config = $this->config();

        return (bool) ($config['enabled'] ?? false);
    }

    /**
     * Log shipping carrier events with structured contextual metadata.
     *
     * @param array<string, mixed> $context
     */
    protected function log(string $level, string $message, array $context = []): void
    {
        Log::log($level, "[Shipping:{$this->name()}] {$message}", array_merge([
            'carrier' => $this->name(),
        ], $context));
    }
}


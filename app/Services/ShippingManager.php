<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Address;
use App\Models\Order;
use App\Services\Shipping\ShippingCarrierInterface;
use App\Services\Shipping\ShippingRateResult;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;
use ReflectionClass;

class ShippingManager
{
    /**
     * Map of registered shipping carriers and methods.
     *
     * @var array<string, ShippingCarrierInterface>
     */
    protected array $carriers = [];

    /**
     * Create a new shipping manager instance and auto-discover carrier drivers.
     */
    public function __construct(
        protected Application $app,
    ) {
        $this->discoverCarriers();
    }

    /**
     * Auto-discover all shipping carrier classes in App\Services\Shipping.
     * Any new carrier class implementing ShippingCarrierInterface added to this directory
     * is automatically registered without modifying existing code.
     */
    public function discoverCarriers(): void
    {
        $directory = app_path('Services/Shipping');

        if (! File::isDirectory($directory)) {
            return;
        }

        $files = File::files($directory);

        foreach ($files as $file) {
            $className = 'App\\Services\\Shipping\\'.$file->getFilenameWithoutExtension();

            if (! class_exists($className)) {
                continue;
            }

            $reflection = new ReflectionClass($className);

            if ($reflection->isInstantiable() && $reflection->implementsInterface(ShippingCarrierInterface::class)) {
                /** @var ShippingCarrierInterface $carrier */
                $carrier = $this->app->make($className);
                $this->register($carrier);
            }
        }
    }

    /**
     * Register a shipping carrier instance.
     */
    public function register(ShippingCarrierInterface $carrier): self
    {
        $this->carriers[$carrier->name()] = $carrier;

        return $this;
    }

    /**
     * Determine whether a carrier is registered.
     */
    public function has(string $name): bool
    {
        return isset($this->carriers[$name]);
    }

    /**
     * Get a registered shipping carrier by its unique name.
     *
     * @throws InvalidArgumentException
     */
    public function carrier(string $name): ShippingCarrierInterface
    {
        return $this->carriers[$name] ?? throw new InvalidArgumentException("Shipping carrier or method [{$name}] is not registered.");
    }

    /**
     * Alias for carrier() to support driver syntax.
     */
    public function driver(?string $name = null): ShippingCarrierInterface
    {
        if ($name === null) {
            $available = $this->available();
            if (! empty($available)) {
                return reset($available);
            }

            return $this->carrier('flat_rate');
        }

        return $this->carrier($name);
    }

    /**
     * Get all registered shipping carriers.
     *
     * @return array<string, ShippingCarrierInterface>
     */
    public function all(): array
    {
        return $this->carriers;
    }

    /**
     * Get all currently enabled shipping carriers.
     *
     * @return array<string, ShippingCarrierInterface>
     */
    public function available(): array
    {
        return array_filter($this->carriers, static fn (ShippingCarrierInterface $carrier): bool => $carrier->isEnabled());
    }

    /**
     * Calculate shipping rate quotes across all available carriers.
     *
     * @param Order|array<string, mixed> $orderData
     * @return array<string, ShippingRateResult>
     */
    public function calculateRates(Order|array $orderData, ?Address $address = null): array
    {
        $rates = [];

        foreach ($this->available() as $carrier) {
            $rate = $carrier->calculateRate($orderData, $address);
            if ($rate->available) {
                $rates[$carrier->name()] = $rate;
            }
        }

        return $rates;
    }

    /**
     * Dynamic helper method to directly access registered carriers by method name.
     * E.g. $manager->fedex(), $manager->ups(), $manager->flat_rate()
     *
     * @param array<int, mixed> $arguments
     */
    public function __call(string $method, array $arguments): ShippingCarrierInterface
    {
        // Support snake_case or camelCase lookup
        $snake = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $method) ?? $method);

        if ($this->has($method)) {
            return $this->carrier($method);
        }

        if ($this->has($snake)) {
            return $this->carrier($snake);
        }

        throw new InvalidArgumentException("Method or shipping carrier [{$method}] does not exist.");
    }
}


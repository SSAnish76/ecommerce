<?php

declare(strict_types=1);

namespace App\Services;

use App\Services\Payments\PaymentGatewayInterface;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;
use ReflectionClass;

class PaymentGatewayManager
{
    /**
     * Map of registered payment gateways.
     *
     * @var array<string, PaymentGatewayInterface>
     */
    protected array $gateways = [];

    /**
     * Create a new payment gateway manager instance and auto-discover drivers.
     */
    public function __construct(
        protected Application $app,
    ) {
        $this->discoverGateways();
    }

    /**
     * Auto-discover all payment gateway classes in App\Services\Payments.
     * Any new class implementing PaymentGatewayInterface added to this directory
     * is automatically loaded without touching this code.
     */
    public function discoverGateways(): void
    {
        $directory = app_path('Services/Payments');

        if (! File::isDirectory($directory)) {
            return;
        }

        $files = File::files($directory);

        foreach ($files as $file) {
            $className = 'App\\Services\\Payments\\'.$file->getFilenameWithoutExtension();

            if (! class_exists($className)) {
                continue;
            }

            $reflection = new ReflectionClass($className);

            if ($reflection->isInstantiable() && $reflection->implementsInterface(PaymentGatewayInterface::class)) {
                /** @var PaymentGatewayInterface $gateway */
                $gateway = $this->app->make($className);
                $this->register($gateway);
            }
        }
    }

    /**
     * Register a payment gateway instance.
     */
    public function register(PaymentGatewayInterface $gateway): self
    {
        $this->gateways[$gateway->name()] = $gateway;

        return $this;
    }

    /**
     * Determine whether a payment gateway is registered.
     */
    public function has(string $name): bool
    {
        return isset($this->gateways[$name]);
    }

    /**
     * Get a registered payment gateway by its unique name.
     *
     * @throws InvalidArgumentException
     */
    public function gateway(string $name): PaymentGatewayInterface
    {
        return $this->gateways[$name] ?? throw new InvalidArgumentException("Payment gateway [{$name}] is not registered.");
    }

    /**
     * Alias for gateway() to support driver syntax.
     */
    public function driver(?string $name = null): PaymentGatewayInterface
    {
        if ($name === null) {
            // Default to first enabled gateway or 'stripe'
            $available = $this->available();
            if (! empty($available)) {
                return reset($available);
            }

            return $this->gateway('stripe');
        }

        return $this->gateway($name);
    }

    /**
     * Get all registered payment gateways.
     *
     * @return array<string, PaymentGatewayInterface>
     */
    public function all(): array
    {
        return $this->gateways;
    }

    /**
     * Get all currently enabled payment gateways.
     *
     * @return array<string, PaymentGatewayInterface>
     */
    public function available(): array
    {
        return array_filter($this->gateways, static fn (PaymentGatewayInterface $gateway): bool => $gateway->isEnabled());
    }

    /**
     * Get key-value list of available gateways for frontend checkout display.
     *
     * @return array<int, array{id: string, name: string, label: string}>
     */
    public function forCheckout(): array
    {
        $list = [];

        foreach ($this->available() as $gateway) {
            $list[] = [
                'id' => $gateway->name(),
                'name' => $gateway->name(),
                'label' => $gateway->label(),
            ];
        }

        return $list;
    }

    /**
     * Dynamic helper method to directly access registered gateways by method name.
     * E.g. $manager->stripe(), $manager->paypal(), $manager->cod()
     *
     * @param array<int, mixed> $arguments
     */
    public function __call(string $method, array $arguments): PaymentGatewayInterface
    {
        if ($this->has($method)) {
            return $this->gateway($method);
        }

        throw new InvalidArgumentException("Method or payment gateway [{$method}] does not exist.");
    }
}


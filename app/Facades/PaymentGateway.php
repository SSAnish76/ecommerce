<?php

declare(strict_types=1);

namespace App\Facades;

use App\Services\PaymentGatewayManager;
use Illuminate\Support\Facades\Facade;

/**
 * @method static \App\Services\Payments\Contracts\PaymentGatewayInterface gateway(string $name)
 * @method static \App\Services\Payments\Contracts\PaymentGatewayInterface driver(?string $name = null)
 * @method static bool has(string $name)
 * @method static array all()
 * @method static array available()
 * @method static array forCheckout()
 * @method static \App\Services\PaymentGatewayManager register(\App\Services\Payments\Contracts\PaymentGatewayInterface $gateway)
 *
 * @see \App\Services\PaymentGatewayManager
 */
class PaymentGateway extends Facade
{
    /**
     * Get the registered name of the component.
     */
    protected static function getFacadeAccessor(): string
    {
        return PaymentGatewayManager::class;
    }
}

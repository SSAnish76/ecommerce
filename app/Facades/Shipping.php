<?php

declare(strict_types=1);

namespace App\Facades;

use App\Services\ShippingManager;
use Illuminate\Support\Facades\Facade;

/**
 * @method static \App\Services\Shipping\Contracts\ShippingCarrierInterface carrier(string $name)
 * @method static \App\Services\Shipping\Contracts\ShippingCarrierInterface driver(?string $name = null)
 * @method static bool has(string $name)
 * @method static array all()
 * @method static array available()
 * @method static array calculateRates(\App\Models\Order|array $orderData, ?\App\Models\Address $address = null)
 * @method static \App\Services\ShippingManager register(\App\Services\Shipping\Contracts\ShippingCarrierInterface $carrier)
 *
 * @see \App\Services\ShippingManager
 */
class Shipping extends Facade
{
    /**
     * Get the registered name of the component.
     */
    protected static function getFacadeAccessor(): string
    {
        return ShippingManager::class;
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\Address\AddressType;
use App\Enums\Coupon\CouponApplyTo;
use App\Enums\Coupon\CouponType;
use App\Enums\Order\OrderStatus;
use App\Enums\Order\PaymentMethod;
use App\Enums\Order\PaymentStatus;
use App\Enums\Product\DiscountType;
use App\Enums\Product\StockVisibility;
use App\Enums\Setting\CurrencyPosition;
use App\Models\Setting;
use App\Models\Store;
use App\Services\EnumRegistryService;
use App\Support\Constants;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EssentialsController extends Controller
{
    public function __construct(
        protected EnumRegistryService $enumRegistry
    ) {
    }

    /**
     * Return all system enums, constants, and dropdown configurations dynamically.
     */
    public function index(Request $request): JsonResponse
    {
        $modules = $this->enumRegistry->discover();
        $enums = $this->enumRegistry->getFlatEnums();

        $constants = [
            'timezones' => Constants::timezones(),
            'currencies' => Constants::currencies(),
            'currencies_map' => Constants::currenciesMap(),
            'vital_permissions' => Constants::vitalPermissions(),
        ];

        $moduleFilter = $request->query('module');
        if (is_string($moduleFilter) && array_key_exists($moduleFilter, $modules)) {
            return response()->json([
                'success' => true,
                'module' => $moduleFilter,
                'data' => $modules[$moduleFilter],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'modules' => $modules,
                'enums' => $enums,
                'constants' => $constants,
            ],
        ]);
    }

    /**
     * Return customer-facing and storefront essentials (public settings, store branding, payment methods, enums, and constants).
     */
    public function frontend(Request $request): JsonResponse
    {
        // 1. Resolve storefront domain modules & formatted enums
        $enums = [
            'address' => [
                'address_type' => $this->enumRegistry->formatEnum(AddressType::class)['options'],
            ],
            'order' => [
                'order_status' => $this->enumRegistry->formatEnum(OrderStatus::class)['options'],
                'payment_status' => $this->enumRegistry->formatEnum(PaymentStatus::class)['options'],
                'payment_method' => $this->enumRegistry->formatEnum(PaymentMethod::class)['options'],
            ],
            'coupon' => [
                'coupon_type' => $this->enumRegistry->formatEnum(CouponType::class)['options'],
                'coupon_apply_to' => $this->enumRegistry->formatEnum(CouponApplyTo::class)['options'],
            ],
            'product' => [
                'stock_visibility' => $this->enumRegistry->formatEnum(StockVisibility::class)['options'],
                'discount_type' => $this->enumRegistry->formatEnum(DiscountType::class)['options'],
            ],
            'setting' => [
                'currency_position' => $this->enumRegistry->formatEnum(CurrencyPosition::class)['options'],
            ],
        ];

        // 4. Store singleton profile branding
        $store = Store::current();
        $storeData = [
            'name' => $store->name,
            'legal_name' => $store->legal_name,
            'email' => $store->email,
            'phone' => $store->phone,
            'city' => $store->city,
            'state' => $store->state,
            'postal_code' => $store->postal_code,
            'country' => $store->country,
            'logo_url' => $store->logo_url,
            'favicon_url' => $store->favicon_url,
            'description' => $store->description,
            'website_url' => $store->website_url,
        ];

        // 5. Storefront commerce settings (fetched efficiently in one cached query)
        $allSettings = Setting::getAllKeyValues();
        $settings = [
            'currency_code' => (string) ($allSettings['currency_code'] ?? 'USD'),
            'currency_symbol' => (string) ($allSettings['currency_symbol'] ?? '$'),
            'currency_decimals' => (int) ($allSettings['currency_decimals'] ?? 2),
            'currency_position' => (string) ($allSettings['currency_position'] ?? 'left'),
            'timezone' => (string) ($allSettings['timezone'] ?? config('app.timezone', 'UTC')),
            'allow_customer_cancellation' => (bool) ($allSettings['allow_customer_cancellation'] ?? true),
            'enable_customer_reviews' => (bool) ($allSettings['enable_customer_reviews'] ?? true),
            'low_stock_threshold' => (int) ($allSettings['low_stock_threshold'] ?? 5),
            'out_of_stock_visibility' => (string) ($allSettings['out_of_stock_visibility'] ?? 'show'),
        ];

        // 6. Public payment gateway configurations (only enabled gateways for display purpose)
        $rawPayments = Setting::getPaymentSettings();
        $allGateways = [
            'cod' => [
                'enabled' => (bool) ($rawPayments['cod']['enabled'] ?? true),
                'name' => 'Cash on Delivery',
                'instructions' => (string) ($rawPayments['cod']['instructions'] ?? 'Pay cash upon delivery.'),
            ],
            'stripe' => [
                'enabled' => (bool) ($rawPayments['stripe']['enabled'] ?? false),
                'name' => 'Credit / Debit Card (Stripe)',
                'publishable_key' => (string) ($rawPayments['stripe']['publishable_key'] ?? ''),
            ],
            'paypal' => [
                'enabled' => (bool) ($rawPayments['paypal']['enabled'] ?? false),
                'name' => 'PayPal',
                'mode' => (string) ($rawPayments['paypal']['mode'] ?? 'sandbox'),
                'client_id' => (string) ($rawPayments['paypal']['client_id'] ?? ''),
            ],
            'razorpay' => [
                'enabled' => (bool) ($rawPayments['razorpay']['enabled'] ?? false),
                'name' => 'Razorpay',
                'key_id' => (string) ($rawPayments['razorpay']['key_id'] ?? ''),
            ],
        ];

        $paymentGateways = array_filter($allGateways, fn (array $gateway): bool => (bool) $gateway['enabled']);

        // 7. Public shipping carrier configurations (only enabled carriers for display purpose)
        $rawShipping = Setting::getShippingSettings();
        $allShipping = [
            'fedex' => [
                'enabled' => (bool) ($rawShipping['fedex']['enabled'] ?? ($rawShipping['carrier']['provider'] === 'fedex')),
                'name' => 'FedEx',
            ],
            'ups' => [
                'enabled' => (bool) ($rawShipping['ups']['enabled'] ?? ($rawShipping['carrier']['provider'] === 'ups')),
                'name' => 'UPS',
            ],
            'dhl' => [
                'enabled' => (bool) ($rawShipping['dhl']['enabled'] ?? ($rawShipping['carrier']['provider'] === 'dhl')),
                'name' => 'DHL Express',
            ],
        ];

        $shipping = array_filter($allShipping, fn (array $carrier): bool => (bool) $carrier['enabled']);

        // 8. Public constants (currencies, timezones)
        $constants = [
            'currencies' => Constants::currencies(),
            'currencies_map' => Constants::currenciesMap(),
            'timezones' => Constants::timezones(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'store' => $storeData,
                'settings' => $settings,
                'payment_gateways' => $paymentGateways,
                'shipping' => $shipping,
                'enums' => $enums,
                'constants' => $constants,
            ],
        ]);
    }
}

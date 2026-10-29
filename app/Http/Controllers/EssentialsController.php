<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\Store;
use App\Services\EnumRegistryService;
use App\Support\Constants;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

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
     * Return customer-facing and storefront essentials dynamically resolved from database configurations.
     */
    public function frontend(Request $request): JsonResponse
    {
        // 1. Resolve storefront domain modules & formatted enums dynamically by module     
        $frontendEnumConfig = ['address', 'order', 'coupon', 'product', 'setting'];

        $discoveredEnums = $this->enumRegistry->discover();
        $enums = []; 

        foreach ($frontendEnumConfig as $key => $value) {
            $moduleName = is_int($key) ? trim((string) $value) : trim((string) $key);
            if (! isset($discoveredEnums[$moduleName])) {
                continue;
            }
            $moduleEnums = $discoveredEnums[$moduleName];
            if (is_array($value)) {
                foreach ($value as $enumKey) {
                    if (isset($moduleEnums[$enumKey]['options'])) {
                        $enums[$moduleName][$enumKey] = $moduleEnums[$enumKey]['options'];
                    }
                }
            } 
        }

        // 2. Store singleton profile branding
        $storeData = Store::current()->toStorefrontArray();

        // 3. Storefront commerce settings (dynamically fetched from DB where is_public is true)
        $settings = Setting::getPublicSettings();

        // 4. Public payment gateway configurations (dynamically loaded from DB, enabled gateways only, secrets stripped)
        $rawPayments = Setting::getPaymentSettings();
        $paymentGateways = [];

        foreach ($rawPayments as $code => $gatewayConfig) {
            if (! is_array($gatewayConfig) || empty($gatewayConfig['enabled'])) {
                continue;
            }

            $publicGateway = [
                'name' => (string) ($gatewayConfig['name'] ?? Str::headline((string) $code)),
            ];

            foreach ($gatewayConfig as $key => $val) {
                $keyStr = (string) $key;
                if (Setting::isSensitiveKey($keyStr) || str_contains(strtolower($keyStr), 'secret')) {
                    continue;
                }
                $publicGateway[$keyStr] = $val;
            }

            $paymentGateways[$code] = $publicGateway;
        }

        // 5. Public shipping carrier configurations (dynamically loaded from DB, enabled carriers only)
        $rawShipping = Setting::getShippingSettings();
        $shipping = [];

        foreach ($rawShipping as $code => $carrierConfig) {
            if ($code === 'carrier' || ! is_array($carrierConfig)) {
                continue;
            }

            $isEnabled = (bool) ($carrierConfig['enabled'] ?? ($rawShipping['carrier']['provider'] === $code));
            if (! $isEnabled) {
                continue;
            }

            $publicCarrier = [
                'name' => (string) ($carrierConfig['name'] ?? Str::headline((string) $code)),
            ];

            foreach ($carrierConfig as $key => $val) {
                $keyStr = (string) $key;
                if (Setting::isSensitiveKey($keyStr) || in_array($keyStr, ['account_number', 'api_key', 'api_secret'], true)) {
                    continue;
                }
                $publicCarrier[$keyStr] = $val;
            }

            $shipping[$code] = $publicCarrier;
        }

        // 6. Public constants (dynamically resolved from DB configuration)
        $frontendConstantKeys = (array) ['currencies', 'currencies_map', 'timezones'];
        $constants = [];

        foreach ($frontendConstantKeys as $constantKey) {
            if (! is_string($constantKey)) {
                continue;
            }
            $method = Str::camel($constantKey);
            if (method_exists(Constants::class, $method)) {
                $constants[$constantKey] = Constants::$method();
            }
        }

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

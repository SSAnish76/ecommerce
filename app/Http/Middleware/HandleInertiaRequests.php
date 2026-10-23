<?php

namespace App\Http\Middleware;

use App\Enums\User\RoleStatus;
use App\Enums\User\UserStatus;
use App\Models\Menu;
use App\Models\Store;
use App\Services\EnumRegistryService;
use App\Support\Constants;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // 1. Cached lightweight store branding data (zero repetitive queries)
        $store = Store::currentSharedData();
        $appName = $store['name'] ?: (string) config('app.name', 'E-Commerce');

        // 2. Authenticated user payload (only loaded for logged in accounts)
        $user = $request->user();
        if ($user) {
            $user->loadMissing(['role' => fn ($q) => $q->where('status', RoleStatus::Active)->with('rolePermissions')]);
        }

        return [
            ...parent::share($request),
            'app_name' => $appName,
            'store' => $store,
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->primaryRoleLabel(),
                    'role_name' => $user->primaryRoleName(),
                    'role_id' => $user->role_id,
                    'roles' => $user->role ? [$user->role->name] : [],
                    'permissions' => $user->allPermissions()->all(),
                    'is_super_admin' => $user->isSuperAdmin(),
                    'is_2fa' => $user->hasTwoFactorEnabled(),
                    'is_active' => $user->isActive(),
                    'status' => $user->status?->value ?? UserStatus::Active->value,
                    'allowed_menus' => $user->allowedMenus()->pluck('slug')->all(),
                ] : null,
            ],
            // 3. Navigation menus (scoped to authenticated admin, served from cache)
            'navigation_menus' => fn () => $user ? Cache::remember('app_navigation_menus', 86400, fn () => Menu::activeList()
                ->toArray()
            ) : null,
            // 4. System enums & dropdown constants (scoped to authenticated admin, served from cache)
            'essentials' => fn () => $user ? Cache::remember('app_essentials_data', 86400, fn () => [
                'modules' => app(EnumRegistryService::class)->discover(),
                'enums' => app(EnumRegistryService::class)->getFlatEnums(),
                'constants' => [
                    'timezones' => Constants::timezones(),
                    'currencies' => Constants::currencies(),
                    'currencies_map' => Constants::currenciesMap(),
                    'date_formats' => Constants::dateFormats(),
                    'time_formats' => Constants::timeFormats(),
                    'vital_permissions' => Constants::vitalPermissions(),
                ],
            ]) : null,
            // 5. Session flash notifications
            'flash' => [
                'message' => fn () => $request->session()->get('message'),
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'status' => fn () => $request->session()->get('status'),
                'recovery_codes' => fn () => $request->session()->get('recovery_codes'),
            ],
        ];
    }
}

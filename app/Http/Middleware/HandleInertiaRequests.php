<?php

namespace App\Http\Middleware;

use App\Enums\Menu\MenuStatus;
use App\Enums\User\RoleStatus;
use App\Enums\User\UserStatus;
use App\Models\Menu;
use App\Models\Store;
use App\Services\EnumRegistryService;
use App\Support\Constants;
use Illuminate\Http\Request;
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
        $store = Store::current();
        $appName = $store->name ?: (string) config('app.name');

        $user = $request->user();
        if ($user) {
            $user->loadMissing(['role' => fn ($q) => $q->where('status', RoleStatus::Active)->with('rolePermissions')]);
        }

        return [
            ...parent::share($request),
            'app_name' => $appName,
            'store' => [
                'name' => $store->name,
                'legal_name' => $store->legal_name,
                'logo_url' => $store->logo_url,
                'favicon_url' => $store->favicon_url,
            ],
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
            'navigation_menus' => fn () => \Illuminate\Support\Facades\Cache::remember('app_navigation_menus', 3600, fn () => Menu::query()
                ->where('status', MenuStatus::Active)
                ->orderBy('sort_order')
                ->get(['slug', 'parent_slug', 'name', 'description', 'href', 'icon', 'sort_order', 'is_crud', 'is_import_export'])
                ->toArray()
            ),
            'essentials' => fn () => [
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
            ],
            'flash' => [
                'message' => fn() => $request->session()->get('message'),
                'success' => fn() => $request->session()->get('success'),
                'error' => fn() => $request->session()->get('error'),
                'warning' => fn() => $request->session()->get('warning'),
                'status' => fn() => $request->session()->get('status'),
                'recovery_codes' => fn() => $request->session()->get('recovery_codes'),
            ],
        ];
    }
}

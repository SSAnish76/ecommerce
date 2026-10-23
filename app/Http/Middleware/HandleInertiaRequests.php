<?php

namespace App\Http\Middleware;

use App\Enums\User\RoleStatus;
use App\Enums\User\UserStatus;
use App\Models\Menu;
use App\Models\Setting;
use App\Models\Store;
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
            $user->loadMissing(['role' => fn ($q) => $q->where('status', RoleStatus::Active)]);
        }

        // Navigation delivery strategy: 'inertia' (embed in page props) or 'api' (fetch via /admin/menus & cache in localStorage)
        $menuDeliveryMode = (string) Setting::get('menu_delivery_mode', 'inertia');
        $roleMenusVersion = (int) Cache::get('role_menus_version', 1);

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
                    'is_super_admin' => $user->isSuperAdmin(),
                    'is_2fa' => $user->hasTwoFactorEnabled(),
                    'status' => $user->status?->value ?? UserStatus::Active->value,
                ] : null,
            ],
            'menu_delivery_mode' => $menuDeliveryMode,
            'menu_version' => $roleMenusVersion,
            // 3. Role-based navigation menus with permissions (scoped to authenticated user, served from cache)
            'menus' => fn () => ($menuDeliveryMode === 'inertia' && $user) ? Menu::roleMenuData($user) : null,
            // 4. Session flash notifications
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

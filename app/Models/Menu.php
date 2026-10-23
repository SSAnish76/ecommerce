<?php

namespace App\Models;

use App\Enums\Menu\MenuStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

#[Fillable(['slug', 'parent_slug', 'name', 'description', 'href', 'icon', 'sort_order', 'status', 'is_crud', 'is_import_export'])]
class Menu extends Model
{
    use HasFactory;

    public const ACTIVE_CACHE_KEY = 'app_active_menus_cache';

    protected static function booted(): void
    {
        static::saved(fn () => static::clearCache());
        static::deleted(fn () => static::clearCache());
    }

    /**
     * Get cached list of active menus.
     *
     * @return \Illuminate\Database\Eloquent\Collection<string, static>
     */
    public static function activeList(): \Illuminate\Database\Eloquent\Collection
    {
        $cached = Cache::get(self::ACTIVE_CACHE_KEY);

        if (is_array($cached)) {
            return static::hydrate($cached);
        }

        if ($cached instanceof \Illuminate\Database\Eloquent\Collection) {
            return $cached;
        }

        // Invalidate corrupt/legacy incomplete class serialization
        Cache::forget(self::ACTIVE_CACHE_KEY);

        $menus = static::query()
            ->where('status', MenuStatus::Active)
            ->orderBy('sort_order')
            ->get(['slug', 'parent_slug', 'name', 'description', 'href', 'icon', 'sort_order', 'is_crud', 'is_import_export']);

        // Cache as plain array to be 100% immune to PHP serialization / autoloading issues
        Cache::put(self::ACTIVE_CACHE_KEY, $menus->toArray(), 86400);

        return $menus;
    }

    /**
     * Clear menu related caches.
     */
    public static function clearCache(): void
    {
        Cache::forget(self::ACTIVE_CACHE_KEY);
        Cache::forget('app_navigation_menus');
        Cache::put('role_menus_version', (int) Cache::get('role_menus_version', 1) + 1, 86400 * 30);
    }

    /**
     * Get cached role-based menu list with role permissions for a user.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function roleMenuData(User $user): array
    {
        $isSuperAdmin = $user->isSuperAdmin();
        $roleId = $isSuperAdmin ? 'super_admin' : ($user->role_id ?? 'guest');

        $version = (int) Cache::get('role_menus_version', 1);
        $cacheKey = "role_menus_{$version}_{$roleId}";

        return Cache::remember($cacheKey, 86400, function () use ($user, $isSuperAdmin) {
            $activeMenus = static::activeList();

            if ($isSuperAdmin) {
                $menus = [];

                foreach ($activeMenus as $m) {
                    $menus[] = [
                        'slug' => $m->slug,
                        'parent_slug' => $m->parent_slug,
                        'name' => $m->name,
                        'description' => $m->description,
                        'href' => $m->href,
                        'icon' => $m->icon,
                        'sort_order' => $m->sort_order,
                        'permissions' => [
                            'can_view' => true,
                            'can_create' => true,
                            'can_update' => true,
                            'can_delete' => true,
                            'can_import' => true,
                            'can_export' => true,
                        ],
                    ];
                }

                return $menus;
            }

            if (! $user->role || ! $user->role->isActive()) {
                return [];
            }

            // Fetch RolePermission entries for this role
            $dbPermissions = RolePermission::query()
                ->where('role_id', $user->role_id)
                ->get()
                ->keyBy('menu_slug');

            $accessibleSlugs = [];
            $rolePermissions = [];

            foreach ($activeMenus as $m) {
                /** @var RolePermission|null $rp */
                $rp = $dbPermissions->get($m->slug);
                $canView = (bool) ($rp?->can_view ?? false);

                if ($canView) {
                    $accessibleSlugs[$m->slug] = true;
                    if ($m->parent_slug) {
                        $accessibleSlugs[$m->parent_slug] = true;
                    }
                }

                if ($rp) {
                    $rolePermissions[$m->slug] = [
                        'can_view' => (bool) $rp->can_view,
                        'can_create' => (bool) $rp->can_create,
                        'can_update' => (bool) $rp->can_update,
                        'can_delete' => (bool) $rp->can_delete,
                        'can_import' => (bool) $rp->can_import,
                        'can_export' => (bool) $rp->can_export,
                    ];
                }
            }

            $menus = [];
            foreach ($activeMenus as $m) {
                if (! isset($accessibleSlugs[$m->slug])) {
                    continue;
                }

                $perms = $rolePermissions[$m->slug] ?? [
                    'can_view' => true,
                    'can_create' => false,
                    'can_update' => false,
                    'can_delete' => false,
                    'can_import' => false,
                    'can_export' => false,
                ];

                $menus[] = [
                    'slug' => $m->slug,
                    'parent_slug' => $m->parent_slug,
                    'name' => $m->name,
                    'description' => $m->description,
                    'href' => $m->href,
                    'icon' => $m->icon,
                    'sort_order' => $m->sort_order,
                    'permissions' => $perms,
                ];
            }

            return $menus;
        });
    }

    /**
     * The primary key for the model.
     *
     * @var string
     */
    protected $primaryKey = 'slug';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The data type of the primary key ID.
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => MenuStatus::class,
            'is_crud' => 'boolean',
            'is_import_export' => 'boolean',
        ];
    }

    /**
     * Determine whether the menu is active.
     */
    public function isActive(): bool
    {
        return $this->status === MenuStatus::Active;
    }

    /**
     * Get the parent menu if this is a sub-menu.
     *
     * @return BelongsTo<Menu, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Menu::class, 'parent_slug', 'slug');
    }

    /**
     * Get direct sub-menus / children.
     *
     * @return HasMany<Menu, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(Menu::class, 'parent_slug', 'slug')
            ->orderBy('sort_order');
    }

    /**
     * Get the roles that have access to this menu.
     *
     * @return BelongsToMany<Role, $this>
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_permissions', 'menu_slug', 'role_id', 'slug', 'id')
            ->withPivot(['can_view', 'can_create', 'can_update', 'can_delete', 'can_import', 'can_export'])
            ->withTimestamps();
    }

    /**
     * Get the role permissions for this menu.
     *
     * @return HasMany<RolePermission, $this>
     */
    public function rolePermissions(): HasMany
    {
        return $this->hasMany(RolePermission::class, 'menu_slug', 'slug');
    }
}

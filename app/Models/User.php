<?php

namespace App\Models;

use App\Enums\Menu\MenuStatus;
use App\Enums\User\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;

#[Fillable([
    'name',
    'email',
    'password',
    'role_id',
    '2fa_secret',
    '2fa_recovery_codes',
    '2fa_confirmed_at',
    'is_2fa',
    'two_factor_secret',
    'two_factor_recovery_codes',
    'two_factor_confirmed_at',
    'status',
    'last_login_at',
])]
#[Hidden(['password', 'remember_token', '2fa_secret', '2fa_recovery_codes', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasUuids, Notifiable;

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::saving(function (self $user): void {
            if ($user->isDirty(['2fa_secret', '2fa_confirmed_at'])) {
                $hasSecret = !is_null($user->getAttributeFromArray('2fa_secret'));
                $hasConfirmed = !is_null($user->getAttributeFromArray('2fa_confirmed_at'));
                $user->is_2fa = $hasSecret && $hasConfirmed;
            }
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            '2fa_secret' => 'encrypted',
            '2fa_recovery_codes' => 'encrypted',
            '2fa_confirmed_at' => 'datetime',
            'is_2fa' => 'boolean',
            'status' => UserStatus::class,
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * The role that belongs to the user.
     *
     * @return BelongsTo<Role, $this>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Check if user has a specific role or any of the given roles.
     *
     * @param  string|array<int, string>  $roles
     */
    public function hasRole(string|array $roles): bool
    {
        if (! $this->role) {
            return false;
        }

        if (is_array($roles)) {
            return in_array($this->role->name, $roles, true);
        }

        return $this->role->name === $roles;
    }

    /**
     * Check if user is assigned to any active system role.
     */
    public function isSuperAdmin(): bool
    {
        return (bool) ($this->role?->isActive() && $this->role->is_system);
    }

    /**
     * Alias for checking active system role assignment.
     */
    public function hasSystemRole(): bool
    {
        return $this->isSuperAdmin();
    }

    /**
     * In-memory cache for user permissions during a single request lifecycle.
     *
     * @var Collection<int, string>|null
     */
    protected ?Collection $cachedPermissions = null;

    /**
     * In-memory cache for allowed menus during a single request lifecycle.
     *
     * @var Collection<int, Menu>|null
     */
    protected ?Collection $cachedMenus = null;

    /**
     * Check if user has administrative access.
     */
    public function isAdmin(): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return (bool) $this->role?->isActive();
    }

    /**
     * Check if user has a specific permission.
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($permission === 'users.roles') {
            return $this->canMenuAction('roles', 'can_view')
                || $this->canMenuAction('users', 'can_update')
                || $this->allPermissions()->contains('users.roles');
        }

        if (str_contains($permission, '.')) {
            [$menuSlug, $action] = explode('.', $permission, 2);
            $actionCol = match ($action) {
                'view', 'index', 'show' => 'can_view',
                'create', 'add', 'store' => 'can_create',
                'edit', 'update', 'roles', 'manage' => 'can_update',
                'delete', 'destroy' => 'can_delete',
                'import' => 'can_import',
                'export' => 'can_export',
                default => null,
            };

            if ($actionCol !== null) {
                return $this->canMenuAction($menuSlug, $actionCol);
            }
        }

        return $this->allPermissions()->contains($permission);
    }

    /**
     * Check granular permission flag on a menu.
     */
    public function canMenuAction(string $menuSlug, string $actionCol): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $this->loadMissing(['role.rolePermissions']);

        if (! $this->role || ! $this->role->isActive()) {
            return false;
        }

        return $this->role->rolePermissions
            ->where('menu_slug', $menuSlug)
            ->contains($actionCol, true);
    }

    /**
     * Get all permissions of the user derived from RolePermissions.
     *
     * @return Collection<int, string>
     */
    public function allPermissions(): Collection
    {
        if ($this->cachedPermissions !== null) {
            return $this->cachedPermissions;
        }

        if ($this->isSuperAdmin()) {
            $menus = Menu::query()->where('status', MenuStatus::Active)->get();
            $perms = collect();
            foreach ($menus as $m) {
                $perms->push("{$m->slug}.view");
                if ($m->is_crud) {
                    $perms->push("{$m->slug}.create", "{$m->slug}.add", "{$m->slug}.edit", "{$m->slug}.update", "{$m->slug}.delete");
                }
                if ($m->is_import_export) {
                    $perms->push("{$m->slug}.import", "{$m->slug}.export");
                }
            }
            $perms->push('users.roles', 'security.manage');

            return $this->cachedPermissions = $perms->unique()->values();
        }

        $this->loadMissing(['role.rolePermissions']);

        if (! $this->role || ! $this->role->isActive()) {
            return $this->cachedPermissions = collect();
        }

        $perms = collect();
        /** @var RolePermission $rp */
        foreach ($this->role->rolePermissions as $rp) {
            if ($rp->can_view) {
                $perms->push("{$rp->menu_slug}.view");
            }
            if ($rp->can_create) {
                $perms->push("{$rp->menu_slug}.create", "{$rp->menu_slug}.add");
            }
            if ($rp->can_update) {
                $perms->push("{$rp->menu_slug}.edit", "{$rp->menu_slug}.update");
                if ($rp->menu_slug === 'users') {
                    $perms->push('users.roles');
                }
                if ($rp->menu_slug === 'profile') {
                    $perms->push('security.manage');
                }
            }
            if ($rp->can_delete) {
                $perms->push("{$rp->menu_slug}.delete");
            }
            if ($rp->can_import) {
                $perms->push("{$rp->menu_slug}.import");
            }
            if ($rp->can_export) {
                $perms->push("{$rp->menu_slug}.export");
            }
        }

        return $this->cachedPermissions = $perms->unique()->values();
    }

    /**
     * Get all allowed menus for the user.
     *
     * @return Collection<int, Menu>
     */
    public function allowedMenus(): Collection
    {
        if ($this->cachedMenus !== null) {
            return $this->cachedMenus;
        }

        if ($this->isSuperAdmin()) {
            return $this->cachedMenus = Menu::query()->where('status', MenuStatus::Active)->orderBy('sort_order')->get();
        }

        $this->loadMissing(['role.rolePermissions']);

        if (! $this->role || ! $this->role->isActive()) {
            return $this->cachedMenus = collect();
        }

        $allowedSlugs = $this->role->rolePermissions
            ->filter(fn (RolePermission $rp) => (bool) $rp->can_view)
            ->pluck('menu_slug');

        return $this->cachedMenus = Menu::query()
            ->where('status', MenuStatus::Active)
            ->whereIn('slug', $allowedSlugs)
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * Flush request-level cached permissions and menus.
     */
    public function flushPermissionsCache(): void
    {
        $this->cachedPermissions = null;
        $this->cachedMenus = null;
    }

    /**
     * Reload the current model instance with fresh attributes and flush caches.
     *
     * @return $this
     */
    public function refresh(): static
    {
        $this->flushPermissionsCache();

        return parent::refresh();
    }

    /**
     * Assign a role to the user.
     */
    public function assignRole(string|Role $role): void
    {
        $roleModel = is_string($role) ? Role::where('name', $role)->firstOrFail() : $role;

        $this->forceFill(['role_id' => $roleModel->id])->save();
        $this->setRelation('role', $roleModel);
        $this->flushPermissionsCache();
    }

    /**
     * Compatibility accessors/mutators for 2fa columns.
     */
    public function getTwoFactorSecretAttribute(): ?string
    {
        return $this->getAttribute('2fa_secret');
    }

    public function setTwoFactorSecretAttribute(?string $value): void
    {
        $this->setAttribute('2fa_secret', $value);
    }

    public function getTwoFactorRecoveryCodesAttribute(): mixed
    {
        return $this->getAttribute('2fa_recovery_codes');
    }

    public function setTwoFactorRecoveryCodesAttribute(mixed $value): void
    {
        $this->setAttribute('2fa_recovery_codes', $value);
    }

    public function getTwoFactorConfirmedAtAttribute(): mixed
    {
        return $this->getAttribute('2fa_confirmed_at');
    }

    public function setTwoFactorConfirmedAtAttribute(mixed $value): void
    {
        $this->setAttribute('2fa_confirmed_at', $value);
    }

    public function getTwoFactorEnabledAttribute(): bool
    {
        return (bool) $this->getAttribute('is_2fa');
    }

    public function setTwoFactorEnabledAttribute(bool $value): void
    {
        $this->setAttribute('is_2fa', $value);
    }

    /**
     * Check if two-factor authentication is confirmed.
     */
    public function hasTwoFactorEnabled(): bool
    {
        if (isset($this->attributes['is_2fa'])) {
            return (bool) $this->attributes['is_2fa'];
        }

        return !is_null($this->{'2fa_secret'} ?? $this->two_factor_secret ?? null)
            && !is_null($this->{'2fa_confirmed_at'} ?? $this->two_factor_confirmed_at ?? null);
    }

    /**
     * Get primary role name or label.
     */
    public function primaryRoleLabel(): string
    {
        if (! $this->role) {
            return '';
        }

        return ucwords(str_replace(['_', '-'], ' ', $this->role->name));
    }

    /**
     * Get primary role system name.
     */
    public function primaryRoleName(): string
    {
        return $this->role?->name ?? '';
    }

    /**
     * Determine whether the user account is active.
     */
    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }
}


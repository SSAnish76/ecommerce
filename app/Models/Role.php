<?php

namespace App\Models;

use App\Enums\User\RoleStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'is_system', 'status'])]
class Role extends Model
{
    use HasFactory, HasUuids;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'status' => RoleStatus::class,
        ];
    }

    /**
     * Check if the role is currently active.
     */
    public function isActive(): bool
    {
        return $this->status === RoleStatus::Active;
    }

    /**
     * Get the users assigned to this role.
     *
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the menus assigned to this role through role permissions.
     *
     * @return BelongsToMany<Menu, $this>
     */
    public function menus(): BelongsToMany
    {
        return $this->belongsToMany(Menu::class, 'role_permissions', 'role_id', 'menu_slug', 'id', 'slug')
            ->withPivot(['can_view', 'can_add', 'can_update', 'can_delete', 'can_import', 'can_export'])
            ->withTimestamps();
    }

    /**
     * Get the granular role permissions for this role.
     *
     * @return HasMany<RolePermission, $this>
     */
    public function rolePermissions(): HasMany
    {
        return $this->hasMany(RolePermission::class);
    }
}

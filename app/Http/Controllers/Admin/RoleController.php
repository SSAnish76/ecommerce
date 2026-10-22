<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\Menu\MenuStatus;
use App\Enums\User\RoleStatus;
use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\Role;
use App\Models\RolePermission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    /**
     * Display a listing of roles with menus, role permissions, and user counts.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();

        $roles = Role::query()
            ->withCount('users')
            ->with([
                'menus:slug,name,icon,parent_slug,sort_order',
                'rolePermissions',
            ])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('id')
            ->get();

        $availableMenus = Menu::query()
            ->where('status', MenuStatus::Active)
            ->orderBy('sort_order')
            ->get(['slug', 'parent_slug', 'name', 'icon', 'sort_order', 'is_crud', 'is_import_export']);

        return Inertia::render('Admin/Roles', [
            'roles' => $roles,
            'available_menus' => $availableMenus,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Store a newly created role with selected menus and role permissions.
     */
    public function store(Request $request): RedirectResponse
    {
        $isSystem = $request->boolean('is_system');

        /** @var array{name: string, is_system?: ?bool, status?: ?string, menu_slugs?: array<int, string>, role_permissions?: array<string, array<string, bool>>} $validated */
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('roles', 'name')->where(fn ($query) => $query->where('is_system', $isSystem)),
            ],
            'is_system' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', Rule::enum(RoleStatus::class)],
            'menu_slugs' => ['nullable', 'array'],
            'menu_slugs.*' => ['string', 'exists:menus,slug'],
            'role_permissions' => ['nullable', 'array'],
        ]);

        $role = Role::query()->create([
            'name' => trim($validated['name']),
            'is_system' => $isSystem,
            'status' => $validated['status'] ?? RoleStatus::Active->value,
        ]);

        $menuSlugs = $validated['menu_slugs'] ?? [];
        if ($isSystem) {
            $menuSlugs = Menu::query()->where('status', MenuStatus::Active)->pluck('slug')->all();
        }

        $customPermissions = $validated['role_permissions'] ?? [];
        $this->syncRolePermissionsMatrix($role, $menuSlugs, $customPermissions, $isSystem);

        Cache::forget('app_navigation_menus');

        return redirect()->back()->with('success', "Role '{$role->name}' created successfully.");
    }

    /**
     * Update the specified role and its chosen menus and role permissions.
     */
    public function update(Request $request, Role $role): RedirectResponse
    {
        $isSystem = $request->has('is_system') ? $request->boolean('is_system') : (bool) $role->is_system;

        /** @var array{name?: ?string, is_system?: ?bool, status?: ?string, menu_slugs?: array<int, string>, role_permissions?: array<string, array<string, bool>>} $validated */
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('roles', 'name')
                    ->where(fn ($query) => $query->where('is_system', $isSystem))
                    ->ignore($role->id),
            ],
            'is_system' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', Rule::enum(RoleStatus::class)],
            'menu_slugs' => ['nullable', 'array'],
            'menu_slugs.*' => ['string', 'exists:menus,slug'],
            'role_permissions' => ['nullable', 'array'],
        ]);

        $updateData = [
            'name' => trim($validated['name']),
            'status' => $validated['status'] ?? $role->status?->value ?? RoleStatus::Active->value,
        ];

        if (! $role->is_system) {
            $updateData['is_system'] = $isSystem;
        }

        $role->update($updateData);

        $menuSlugs = $validated['menu_slugs'] ?? [];
        if ($role->is_system) {
            $menuSlugs = Menu::query()->where('status', MenuStatus::Active)->pluck('slug')->all();
        }

        $customPermissions = $validated['role_permissions'] ?? [];
        $this->syncRolePermissionsMatrix($role, $menuSlugs, $customPermissions, (bool) $role->is_system);

        Cache::forget('app_navigation_menus');

        return redirect()->back()->with('success', "Role '{$role->name}' updated successfully.");
    }

    /**
     * Remove the specified role.
     */
    public function destroy(Role $role): RedirectResponse
    {
        if ($role->is_system) {
            return redirect()->back()->with('error', 'System roles cannot be deleted.');
        }

        if ($role->users()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete role because it is currently assigned to users.');
        }

        $role->rolePermissions()->delete();
        $role->delete();

        return redirect()->back()->with('success', 'Role deleted successfully.');
    }

    /**
     * Synchronize the RolePermission matrix for a given role and menus.
     *
     * @param  array<int, string>  $menuSlugs
     * @param  array<string, array<string, bool>>  $customPermissions
     */
    private function syncRolePermissionsMatrix(Role $role, array $menuSlugs, array $customPermissions, bool $isSystem): void
    {
        $menus = Menu::query()->whereIn('slug', $menuSlugs)->get();

        // Delete permissions for menus no longer linked to role
        RolePermission::where('role_id', $role->id)->whereNotIn('menu_slug', $menuSlugs)->delete();

        foreach ($menus as $menu) {
            $override = $customPermissions[$menu->slug] ?? null;

            if ($isSystem) {
                $canView = true;
                $canCreate = (bool) $menu->is_crud;
                $canUpdate = (bool) $menu->is_crud;
                $canDelete = (bool) $menu->is_crud;
                $canImport = (bool) $menu->is_import_export;
                $canExport = (bool) $menu->is_import_export;
            } elseif ($override !== null) {
                $canView = (bool) ($override['can_view'] ?? true);
                $canCreate = $menu->is_crud && (bool) ($override['can_create'] ?? $override['can_add'] ?? false);
                $canUpdate = $menu->is_crud && (bool) ($override['can_update'] ?? false);
                $canDelete = $menu->is_crud && (bool) ($override['can_delete'] ?? false);
                $canImport = $menu->is_import_export && (bool) ($override['can_import'] ?? false);
                $canExport = $menu->is_import_export && (bool) ($override['can_export'] ?? false);
            } else {
                $canView = true;
                $canCreate = (bool) $menu->is_crud;
                $canUpdate = (bool) $menu->is_crud;
                $canDelete = $menu->slug !== 'roles' && (bool) $menu->is_crud;
                $canImport = (bool) $menu->is_import_export;
                $canExport = (bool) $menu->is_import_export;
            }

            RolePermission::updateOrCreate(
                ['role_id' => $role->id, 'menu_slug' => $menu->slug],
                [
                    'can_view' => $canView,
                    'can_create' => $canCreate,
                    'can_update' => $canUpdate,
                    'can_delete' => $canDelete,
                    'can_import' => $canImport,
                    'can_export' => $canExport,
                ]
            );
        }
    }
}

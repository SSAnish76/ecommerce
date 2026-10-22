import React, { useState, useMemo } from 'react';
import { Head, usePage, useForm, router } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { PageProps, Role, MenuItem, RolePermission, RoleStatus } from '../../types';
import { useEssentials } from '../../hooks/useEssentials';
import { Button, Input, Modal, Card, Badge, Select } from '../../Components/UI';
import {
    Shield,
    Plus,
    Search,
    Edit2,
    Trash2,
    Users,
    Lock,
    LayoutDashboard,
    BarChart3,
    Settings,
    Store as StoreIcon,
    ShieldCheck,
    RotateCcw,
    ShoppingBag,
    ShoppingCart,
    Boxes,
    FolderTree,
    UserCheck,
    TicketPercent,
} from 'lucide-react';

interface RolesProps {
    roles: Role[];
    available_menus: MenuItem[];
    filters: {
        search: string;
        status?: string;
    };
}

const menuIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    dashboard: LayoutDashboard,
    analytics: BarChart3,
    catalog: ShoppingBag,
    products: ShoppingBag,
    categories: FolderTree,
    inventory: Boxes,
    sales: ShoppingCart,
    orders: ShoppingCart,
    customers: UserCheck,
    coupons: TicketPercent,
    administration: Shield,
    users: Users,
    roles: Shield,
    platform: Settings,
    store: StoreIcon,
    settings: Settings,
    profile: ShieldCheck,
};

type PermissionActionKey = 'can_view' | 'can_create' | 'can_update' | 'can_delete' | 'can_import' | 'can_export';

interface MenuPermissionState {
    can_view: boolean;
    can_create: boolean;
    can_update: boolean;
    can_delete: boolean;
    can_import: boolean;
    can_export: boolean;
}

interface RoleFormData {
    name: string;
    is_system: boolean;
    status: RoleStatus;
    menu_slugs: string[];
    role_permissions: Record<string, MenuPermissionState>;
}

type RoleForm = ReturnType<typeof useForm<RoleFormData>>;

export default function RolesPage({
    roles = [],
    available_menus = [],
    filters = { search: '' },
}: RolesProps) {
    const { auth } = usePage<PageProps>().props;
    const isSuperAdmin = auth?.user?.is_super_admin;
    const canManageRoles =
        isSuperAdmin ||
        auth?.user?.permissions?.includes('users.roles') ||
        auth?.user?.permissions?.includes('roles.view');

    const [search, setSearch] = useState(filters?.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters?.status || '');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    // Group available menus into parent-child hierarchy
    const menuHierarchy = useMemo(() => {
        const parents = available_menus.filter((m) => !m.parent_slug);
        const childrenMap: Record<string, MenuItem[]> = {};

        for (const m of available_menus) {
            if (m.parent_slug) {
                if (!childrenMap[m.parent_slug]) {
                    childrenMap[m.parent_slug] = [];
                }
                childrenMap[m.parent_slug].push(m);
            }
        }

        return parents.map((parent) => ({
            parent,
            children: childrenMap[parent.slug] || [],
        }));
    }, [available_menus]);

    const { getOptions, getValues } = useEssentials();
    const roleStatusOptions = getOptions<RoleStatus>('role_status');
    const defaultStatus = (getValues<RoleStatus>('role_status')[0] ?? 'active') as RoleStatus;

    // Create form
    const createForm = useForm<RoleFormData>({
        name: '',
        is_system: false,
        status: defaultStatus,
        menu_slugs: ['dashboard'],
        role_permissions: {
            dashboard: {
                can_view: true,
                can_create: false,
                can_update: false,
                can_delete: false,
                can_import: false,
                can_export: false,
            },
        },
    });

    // Edit form
    const editForm = useForm<RoleFormData>({
        name: '',
        is_system: false,
        status: defaultStatus,
        menu_slugs: [],
        role_permissions: {},
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/roles',
            {
                search: search || undefined,
                status: selectedStatus || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setSelectedStatus('');
        router.get('/admin/roles');
    };

    const handleOpenCreate = () => {
        createForm.reset();
        createForm.clearErrors();
        const initialPerms: Record<string, MenuPermissionState> = {};
        for (const m of available_menus) {
            initialPerms[m.slug] = {
                can_view: true,
                can_create: Boolean(m.is_crud),
                can_update: Boolean(m.is_crud),
                can_delete: Boolean(m.is_crud),
                can_import: Boolean(m.is_import_export),
                can_export: Boolean(m.is_import_export),
            };
        }

        createForm.setData({
            name: '',
            is_system: false,
            status: 'active',
            menu_slugs: available_menus.map((m) => m.slug),
            role_permissions: initialPerms,
        });
        setIsCreateOpen(true);
    };

    const handleCreateRole = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/roles', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const handleOpenEdit = (role: Role) => {
        setEditingRole(role);
        const assignedSlugs = role.menus ? role.menus.map((m) => m.slug) : role.menu_slugs || [];

        // Build role_permissions map from role.role_permissions
        const permsMap: Record<string, MenuPermissionState> = {};
        for (const m of available_menus) {
            const existing = role.role_permissions?.find((rp) => rp.menu_slug === m.slug);
            if (existing) {
                permsMap[m.slug] = {
                    can_view: Boolean(existing.can_view),
                    can_create: Boolean(existing.can_create),
                    can_update: Boolean(existing.can_update),
                    can_delete: Boolean(existing.can_delete),
                    can_import: Boolean(existing.can_import),
                    can_export: Boolean(existing.can_export),
                };
            } else {
                permsMap[m.slug] = {
                    can_view: assignedSlugs.includes(m.slug),
                    can_create: assignedSlugs.includes(m.slug) && Boolean(m.is_crud),
                    can_update: assignedSlugs.includes(m.slug) && Boolean(m.is_crud),
                    can_delete: assignedSlugs.includes(m.slug) && Boolean(m.is_crud),
                    can_import: assignedSlugs.includes(m.slug) && Boolean(m.is_import_export),
                    can_export: assignedSlugs.includes(m.slug) && Boolean(m.is_import_export),
                };
            }
        }

        editForm.setData({
            name: role.name,
            is_system: Boolean(role.is_system),
            status: role.status || 'active',
            menu_slugs: assignedSlugs,
            role_permissions: permsMap,
        });
        editForm.clearErrors();
    };

    const handleUpdateRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRole) return;

        editForm.put(`/admin/roles/${editingRole.id}`, {
            onSuccess: () => {
                setEditingRole(null);
                editForm.reset();
            },
        });
    };

    const handleDeleteRole = (role: Role) => {
        if (role.is_system) {
            alert('System roles cannot be deleted.');
            return;
        }

        if (role.users_count && role.users_count > 0) {
            alert(`Cannot delete role '${role.name}' because it has ${role.users_count} active user(s).`);
            return;
        }

        if (confirm(`Are you sure you want to delete role '${role.name}'? This cannot be undone.`)) {
            router.delete(`/admin/roles/${role.id}`);
        }
    };

    // Helper for toggling a menu in form
    const toggleMenuSlug = (form: RoleForm, slug: string) => {
        const currentSlugs = form.data.menu_slugs;
        const exists = currentSlugs.includes(slug);
        const menuObj = available_menus.find((m) => m.slug === slug);

        if (exists) {
            form.setData('menu_slugs', currentSlugs.filter((s) => s !== slug));
        } else {
            form.setData('menu_slugs', [...currentSlugs, slug]);
            // Ensure default permissions are initialized for the menu
            if (!form.data.role_permissions[slug]) {
                form.setData('role_permissions', {
                    ...form.data.role_permissions,
                    [slug]: {
                        can_view: true,
                        can_create: Boolean(menuObj?.is_crud),
                        can_update: Boolean(menuObj?.is_crud),
                        can_delete: Boolean(menuObj?.is_crud),
                        can_import: Boolean(menuObj?.is_import_export),
                        can_export: Boolean(menuObj?.is_import_export),
                    },
                });
            }
        }
    };

    // Helper for toggling a specific permission action for a menu
    const toggleAction = (
        form: RoleForm,
        menuSlug: string,
        action: PermissionActionKey
    ) => {
        const currentPerms = form.data.role_permissions[menuSlug] || {
            can_view: true,
            can_create: false,
            can_update: false,
            can_delete: false,
            can_import: false,
            can_export: false,
        };

        const updated = {
            ...currentPerms,
            [action]: !currentPerms[action],
        };

        // If toggling on an action other than view, ensure can_view and menu_slug are also active
        if (!currentPerms[action] && action !== 'can_view') {
            updated.can_view = true;
            if (!form.data.menu_slugs.includes(menuSlug)) {
                form.setData('menu_slugs', [...form.data.menu_slugs, menuSlug]);
            }
        }

        form.setData('role_permissions', {
            ...form.data.role_permissions,
            [menuSlug]: updated,
        });
    };

    // Modal Form Content
    const renderRoleModalForm = (form: RoleForm) => {
        const isSystemRole = form.data.is_system;

        return (
            <div className="space-y-6">
                {/* Basic Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Role Name"
                        required
                        placeholder="e.g., Store Manager, Fulfillment Lead"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        error={form.errors.name}
                        disabled={form.processing || isSystemRole}
                    />

                    <Select
                        label="Status"
                        value={form.data.status}
                        onChange={(e) => form.setData('status', e.target.value as RoleStatus)}
                        disabled={form.processing || isSystemRole}
                    >
                        {roleStatusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </Select>
                </div>

                {isSystemRole && (
                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                        <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div>
                            <span className="font-bold">System Role:</span> Users with this role receive universal access across all modules and capabilities. System roles cannot be deleted or restricted.
                        </div>
                    </div>
                )}

                {/* Role Permission Matrix Header */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                Role Permission Matrix
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Configure accessible parent/child menus and fine-tune CRUD & export actions.
                            </p>
                        </div>

                        {!isSystemRole && (
                            <button
                                type="button"
                                onClick={() => {
                                    const allSlugs = available_menus.map((m) => m.slug);
                                    const areAllSelected = form.data.menu_slugs.length === allSlugs.length;
                                    form.setData('menu_slugs', areAllSelected ? ['dashboard'] : allSlugs);
                                }}
                                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {form.data.menu_slugs.length === available_menus.length ? 'Deselect All' : 'Select All Menus'}
                            </button>
                        )}
                    </div>

                    {/* Matrix Table */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto">
                        {menuHierarchy.map(({ parent, children }) => {
                            const parentSelected = form.data.menu_slugs.includes(parent.slug);
                            const ParentIcon = (parent.icon && menuIconMap[parent.slug]) || LayoutDashboard;
                            const parentPerms = form.data.role_permissions[parent.slug] || { can_view: parentSelected };

                            return (
                                <div key={parent.slug} className="bg-white dark:bg-slate-900">
                                    {/* Parent Menu Row */}
                                    <div className="flex items-center justify-between p-3 bg-slate-50/70 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800">
                                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={parentSelected}
                                                disabled={isSystemRole}
                                                onChange={() => toggleMenuSlug(form, parent.slug)}
                                                className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                                            />
                                            <ParentIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                                {parent.name}
                                            </span>
                                        </label>

                                        {/* Action Badges for Parent (if applicable) */}
                                        <div className="flex items-center gap-1.5">
                                            {parent.is_crud && (
                                                <div className="flex items-center gap-1 text-[11px]">
                                                    {(['can_view', 'can_create', 'can_update', 'can_delete'] as PermissionActionKey[]).map((action) => (
                                                        <button
                                                            key={action}
                                                            type="button"
                                                            disabled={isSystemRole || !parentSelected}
                                                            onClick={() => toggleAction(form, parent.slug, action)}
                                                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                                                parentPerms[action]
                                                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 opacity-60'
                                                            }`}
                                                        >
                                                            {action.replace('can_', '').toUpperCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Children Sub-Menus */}
                                    {children.length > 0 && (
                                        <div className="pl-6 divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                                            {children.map((child) => {
                                                const childSelected = form.data.menu_slugs.includes(child.slug);
                                                const ChildIcon = (child.icon && menuIconMap[child.slug]) || LayoutDashboard;
                                                const childPerms = form.data.role_permissions[child.slug] || { can_view: childSelected };

                                                return (
                                                    <div key={child.slug} className="flex items-center justify-between p-2.5 pr-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={childSelected}
                                                                disabled={isSystemRole}
                                                                onChange={() => toggleMenuSlug(form, child.slug)}
                                                                className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                                                            />
                                                            <ChildIcon className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                                {child.name}
                                                            </span>
                                                        </label>

                                                        {/* Granular Action Checkbox Toggles */}
                                                        <div className="flex items-center gap-1">
                                                            {child.is_crud && (
                                                                <>
                                                                    {(['can_view', 'can_create', 'can_update', 'can_delete'] as PermissionActionKey[]).map((act) => (
                                                                        <button
                                                                            key={act}
                                                                            type="button"
                                                                            disabled={isSystemRole || !childSelected}
                                                                            onClick={() => toggleAction(form, child.slug, act)}
                                                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                                                                childPerms[act]
                                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                                                                    : 'bg-slate-50 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700 opacity-50'
                                                                            }`}
                                                                        >
                                                                            {act.replace('can_', '').toUpperCase()}
                                                                        </button>
                                                                    ))}
                                                                </>
                                                            )}
                                                            {child.is_import_export && (
                                                                <>
                                                                    {(['can_import', 'can_export'] as PermissionActionKey[]).map((act) => (
                                                                        <button
                                                                            key={act}
                                                                            type="button"
                                                                            disabled={isSystemRole || !childSelected}
                                                                            onClick={() => toggleAction(form, child.slug, act)}
                                                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                                                                childPerms[act]
                                                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                                                                    : 'bg-slate-50 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700 opacity-50'
                                                                            }`}
                                                                        >
                                                                            {act.replace('can_', '').toUpperCase()}
                                                                        </button>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AdminLayout title="Roles & Permissions">
            <Head title="Roles & Permissions" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Shield className="w-6 h-6 text-indigo-600" />
                            Roles & Privileges
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Control accessible storefront modules and configure fine-grained role permissions.
                        </p>
                    </div>

                    {canManageRoles && (
                        <Button
                            onClick={handleOpenCreate}
                            variant="primary"
                            size="sm"
                            pill
                            leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                            className="shadow-md shadow-indigo-600/20 font-medium px-4.5 py-1.5 rounded-full whitespace-nowrap self-start sm:self-auto"
                        >
                            Add
                        </Button>
                    )}
                </div>

                {/* Filter bar */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search roles by title..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                            />
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="min-w-[140px]">
                                <Select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    {roleStatusOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <Button type="submit" variant="secondary" size="md" className="rounded-xl px-4">
                                Search
                            </Button>

                            {(filters?.search || filters?.status || search || selectedStatus) && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="md"
                                    onClick={handleReset}
                                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                                    className="rounded-xl text-slate-500"
                                >
                                    Reset
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Roles Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {roles.map((role) => {
                        const isSystemRole = Boolean(role.is_system);
                        const assignedMenus = role.menus || [];

                        return (
                            <div
                                key={role.id}
                                className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-300/80 dark:hover:border-indigo-500/40 transition-all duration-300 overflow-hidden"
                            >
                                <div className="p-5 flex-1 flex flex-col">
                                    {/* Role Header */}
                                    <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`flex items-center justify-center w-11 h-11 rounded-xl shadow-2xs transition-transform duration-300 group-hover:scale-105 shrink-0 ${
                                                    isSystemRole
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200/80 dark:border-slate-700/80'
                                                }`}
                                            >
                                                {isSystemRole ? (
                                                    <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                ) : (
                                                    <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {role.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1 text-xs">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full ${
                                                                role.status === 'active'
                                                                    ? 'bg-emerald-500'
                                                                    : role.status === 'inactive'
                                                                    ? 'bg-rose-500'
                                                                    : 'bg-amber-500'
                                                            }`}
                                                        />
                                                        <span
                                                            className={
                                                                role.status === 'active'
                                                                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                                                    : role.status === 'inactive'
                                                                    ? 'text-rose-600 dark:text-rose-400 font-medium'
                                                                    : 'text-amber-600 dark:text-amber-400 font-medium'
                                                            }
                                                        >
                                                            {roleStatusOptions.find((o) => o.value === role.status)?.label || role.status || 'Active'}
                                                        </span>
                                                    </span>

                                                    <span className="text-slate-300 dark:text-slate-700">•</span>

                                                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                                        {role.users_count || 0} user{role.users_count === 1 ? '' : 's'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {isSystemRole && (
                                            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 shadow-2xs">
                                                <Lock className="w-2.5 h-2.5" />
                                                System
                                            </span>
                                        )}
                                    </div>

                                    {/* Role Permissions / Accessible Menus Summary */}
                                    <div className="pt-4 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                                                <span>Accessible Menus</span>
                                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                    {isSystemRole ? 'All Active' : `${assignedMenus.length} Linked`}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5">
                                                {isSystemRole ? (
                                                    <Badge variant="indigo" className="text-xs font-semibold py-1 px-2.5">
                                                        Universal Platform Access
                                                    </Badge>
                                                ) : assignedMenus.length === 0 ? (
                                                    <span className="text-xs text-slate-400 italic">No menus linked</span>
                                                ) : (
                                                    assignedMenus.slice(0, 6).map((m) => (
                                                        <span
                                                            key={m.slug}
                                                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                                                        >
                                                            {m.name}
                                                        </span>
                                                    ))
                                                )}
                                                {!isSystemRole && assignedMenus.length > 6 && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                                                        +{assignedMenus.length - 6} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="p-3.5 px-5 bg-slate-50/70 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleOpenEdit(role)}
                                        className="flex items-center gap-1.5 text-xs font-medium rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        {isSystemRole ? 'View Permissions' : 'Configure'}
                                    </Button>

                                    {!isSystemRole && canManageRoles && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteRole(role)}
                                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 rounded-xl text-xs"
                                            title="Delete Role"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Create Role Modal */}
                <Modal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    title="Create New Staff Role"
                    description="Configure accessible modules and granular action flags."
                    maxWidth="2xl"
                    footer={
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setIsCreateOpen(false)}
                                disabled={createForm.processing}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateRole}
                                isLoading={createForm.processing}
                            >
                                Save Role
                            </Button>
                        </div>
                    }
                >
                    {renderRoleModalForm(createForm)}
                </Modal>

                {/* Edit Role Modal */}
                <Modal
                    isOpen={Boolean(editingRole)}
                    onClose={() => setEditingRole(null)}
                    title={`Configure Role: ${editingRole?.name || ''}`}
                    description="Update accessible navigation menus and fine-tune permission capabilities."
                    maxWidth="2xl"
                    footer={
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setEditingRole(null)}
                                disabled={editForm.processing}
                            >
                                Cancel
                            </Button>
                            {!editingRole?.is_system && (
                                <Button
                                    onClick={handleUpdateRole}
                                    isLoading={editForm.processing}
                                >
                                    Update Role
                                </Button>
                            )}
                        </div>
                    }
                >
                    {renderRoleModalForm(editForm)}
                </Modal>
            </div>
        </AdminLayout>
    );
}

import React, { useMemo } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { PageProps, Role, MenuItem, RoleStatus } from '../../../types';
import { useEssentials } from '../../../hooks/useEssentials';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardFooter, Badge, Select } from '../../../Components/UI';
import {
    ArrowLeft,
    Shield,
    Lock,
    Check,
    LayoutDashboard,
    BarChart3,
    Settings,
    Store as StoreIcon,
    ShieldCheck,
    ShoppingBag,
    ShoppingCart,
    Boxes,
    FolderTree,
    UserCheck,
    TicketPercent,
    Users,
    Sparkles,
} from 'lucide-react';

interface CreateOrEditProps {
    role?: Role | null;
    available_menus: MenuItem[];
}

const menuIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    dashboard: LayoutDashboard,
    analytics: BarChart3,
    catalog: ShoppingBag,
    products: ShoppingBag,
    categories: FolderTree,
    brands: Sparkles,
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

export default function CreateOrEditRolePage({
    role = null,
    available_menus = [],
}: CreateOrEditProps) {
    const isEdit = Boolean(role?.id);
    const isSystemRole = Boolean(role?.is_system);

    const { getOptions, getValues } = useEssentials();
    const roleStatusOptions = getOptions<RoleStatus>('role_status');
    const defaultStatus = (getValues<RoleStatus>('role_status')[0] ?? 'active') as RoleStatus;

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

    // Initial permission state builder
    const initialPermissions = useMemo(() => {
        const perms: Record<string, MenuPermissionState> = {};

        if (role?.role_permissions && role.role_permissions.length > 0) {
            for (const rp of role.role_permissions) {
                perms[rp.menu_slug] = {
                    can_view: Boolean(rp.can_view),
                    can_create: Boolean(rp.can_create),
                    can_update: Boolean(rp.can_update),
                    can_delete: Boolean(rp.can_delete),
                    can_import: Boolean(rp.can_import),
                    can_export: Boolean(rp.can_export),
                };
            }
        } else if (role?.menus && role.menus.length > 0) {
            for (const m of role.menus) {
                const pivot = (m as { pivot?: Record<string, unknown> }).pivot || {};
                perms[m.slug] = {
                    can_view: Boolean(pivot.can_view ?? true),
                    can_create: Boolean(pivot.can_create),
                    can_update: Boolean(pivot.can_update),
                    can_delete: Boolean(pivot.can_delete),
                    can_import: Boolean(pivot.can_import),
                    can_export: Boolean(pivot.can_export),
                };
            }
        } else {
            perms['dashboard'] = {
                can_view: true,
                can_create: false,
                can_update: false,
                can_delete: false,
                can_import: false,
                can_export: false,
            };
        }

        return perms;
    }, [role]);

    const initialSlugs = useMemo(() => {
        if (role?.menus && role.menus.length > 0) {
            return role.menus.map((m) => m.slug);
        }
        if (role?.role_permissions && role.role_permissions.length > 0) {
            return role.role_permissions.map((rp) => rp.menu_slug);
        }
        return ['dashboard'];
    }, [role]);

    const form = useForm<RoleFormData>({
        name: role?.name || '',
        is_system: isSystemRole,
        status: (role?.status as RoleStatus) || defaultStatus,
        menu_slugs: initialSlugs,
        role_permissions: initialPermissions,
    });

    const toggleMenuSlug = (slug: string) => {
        if (isSystemRole) return;
        const currentSlugs = form.data.menu_slugs;
        const exists = currentSlugs.includes(slug);
        const menuObj = available_menus.find((m) => m.slug === slug);

        if (exists) {
            form.setData('menu_slugs', currentSlugs.filter((s) => s !== slug));
        } else {
            form.setData('menu_slugs', [...currentSlugs, slug]);
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

    const toggleAction = (menuSlug: string, action: PermissionActionKey) => {
        if (isSystemRole) return;

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

    const handleSelectAll = () => {
        if (isSystemRole) return;
        const allSlugs = available_menus.map((m) => m.slug);
        const areAllSelected = form.data.menu_slugs.length === allSlugs.length;

        if (areAllSelected) {
            form.setData('menu_slugs', ['dashboard']);
        } else {
            const newPerms = { ...form.data.role_permissions };
            for (const menu of available_menus) {
                if (!newPerms[menu.slug]) {
                    newPerms[menu.slug] = {
                        can_view: true,
                        can_create: Boolean(menu.is_crud),
                        can_update: Boolean(menu.is_crud),
                        can_delete: Boolean(menu.is_crud),
                        can_import: Boolean(menu.is_import_export),
                        can_export: Boolean(menu.is_import_export),
                    };
                }
            }
            form.setData({
                ...form.data,
                menu_slugs: allSlugs,
                role_permissions: newPerms,
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && role) {
            form.put(`/admin/roles/${role.id}`);
        } else {
            form.post('/admin/roles');
        }
    };

    const pageTitle = isEdit ? `Edit Role: ${role?.name}` : 'Create Role';

    return (
        <AdminLayout title={pageTitle}>
            <Head title={pageTitle} />

            <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
                {/* Top Bar with Back Link and Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/roles"
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                            aria-label="Back to roles"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    {pageTitle}
                                </h1>
                                {isSystemRole && (
                                    <Badge variant="amber" size="sm" icon={<Lock className="w-3 h-3" />}>
                                        System Role
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link href="/admin/roles">
                            <Button
                                type="button"
                                variant="secondary"
                                size="md"
                            >
                                Cancel
                            </Button>
                        </Link>
                        {!isSystemRole && (
                            <Button
                                type="submit"
                                variant="primary"
                                size="md"
                                isLoading={form.processing}
                            >
                                {isEdit ? 'Update Role' : 'Save Role'}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Role Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Role Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Role Name"
                                required
                                placeholder="e.g. Store Manager"
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
                    </CardContent>
                </Card>

                {/* Permissions Matrix Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle>Module Permissions</CardTitle>
                        {!isSystemRole && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAll}
                            >
                                {form.data.menu_slugs.length === available_menus.length
                                    ? 'Deselect All'
                                    : 'Select All Menus'}
                            </Button>
                        )}
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {menuHierarchy.map(({ parent, children }) => {
                                const parentSelected = form.data.menu_slugs.includes(parent.slug);
                                const ParentIcon = (parent.icon && menuIconMap[parent.slug]) || LayoutDashboard;
                                const parentPerms = form.data.role_permissions[parent.slug] || { can_view: parentSelected };

                                return (
                                    <div key={parent.slug} className="bg-white dark:bg-slate-900">
                                        {/* Parent Menu Row */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-5 bg-slate-50/70 dark:bg-slate-850 gap-3">
                                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={parentSelected}
                                                    disabled={isSystemRole}
                                                    onChange={() => toggleMenuSlug(parent.slug)}
                                                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                                                />
                                                <ParentIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                    {parent.name}
                                                </span>
                                            </label>

                                            {/* Action badges if CRUD */}
                                            {parent.is_crud && (
                                                <div className="flex items-center gap-1.5 flex-wrap pl-7 sm:pl-0">
                                                    {(['can_view', 'can_create', 'can_update', 'can_delete'] as PermissionActionKey[]).map((action) => (
                                                        <button
                                                            key={action}
                                                            type="button"
                                                            disabled={isSystemRole || !parentSelected}
                                                            onClick={() => toggleAction(parent.slug, action)}
                                                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer select-none ${
                                                                parentPerms[action]
                                                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 opacity-60'
                                                            }`}
                                                        >
                                                            {action.replace('can_', '').toUpperCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Child Sub-Menus */}
                                        {children.length > 0 && (
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                                                {children.map((child) => {
                                                    const childSelected = form.data.menu_slugs.includes(child.slug);
                                                    const ChildIcon = (child.icon && menuIconMap[child.slug]) || LayoutDashboard;
                                                    const childPerms = form.data.role_permissions[child.slug] || { can_view: childSelected };

                                                    return (
                                                        <div
                                                            key={child.slug}
                                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 pl-8 sm:pl-10 sm:pr-5 gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
                                                        >
                                                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={childSelected}
                                                                    disabled={isSystemRole}
                                                                    onChange={() => toggleMenuSlug(child.slug)}
                                                                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                                                                />
                                                                <ChildIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                                                    {child.name}
                                                                </span>
                                                            </label>

                                                            {/* Action badges for child */}
                                                            <div className="flex items-center gap-1.5 flex-wrap pl-7 sm:pl-0">
                                                                {child.is_crud && (
                                                                    <>
                                                                        {(['can_view', 'can_create', 'can_update', 'can_delete'] as PermissionActionKey[]).map((action) => (
                                                                            <button
                                                                                key={action}
                                                                                type="button"
                                                                                disabled={isSystemRole || !childSelected}
                                                                                onClick={() => toggleAction(child.slug, action)}
                                                                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer select-none ${
                                                                                    childPerms[action]
                                                                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                                                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 opacity-60'
                                                                                }`}
                                                                            >
                                                                                {action.replace('can_', '').toUpperCase()}
                                                                            </button>
                                                                        ))}
                                                                    </>
                                                                )}

                                                                {child.is_import_export && (
                                                                    <>
                                                                        {(['can_import', 'can_export'] as PermissionActionKey[]).map((action) => (
                                                                            <button
                                                                                key={action}
                                                                                type="button"
                                                                                disabled={isSystemRole || !childSelected}
                                                                                onClick={() => toggleAction(child.slug, action)}
                                                                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer select-none ${
                                                                                    childPerms[action]
                                                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 opacity-60'
                                                                                }`}
                                                                            >
                                                                                {action.replace('can_', '').toUpperCase()}
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
                    </CardContent>

                    {!isSystemRole && (
                        <CardFooter className="flex justify-end gap-2.5">
                            <Link href="/admin/roles">
                                <Button type="button" variant="secondary" size="md">
                                    Cancel
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                variant="primary"
                                size="md"
                                isLoading={form.processing}
                            >
                                {isEdit ? 'Update Role' : 'Save Role'}
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </form>
        </AdminLayout>
    );
}

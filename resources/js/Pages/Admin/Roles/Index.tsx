import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { PageProps, Role, MenuItem, RoleStatus } from '../../../types';
import { useEssentials } from '../../../hooks/useEssentials';
import { usePermission } from '../../../hooks/usePermission';
import { Button, Select, Badge } from '../../../Components/UI';
import {
    Shield,
    Plus,
    Search,
    Edit2,
    Trash2,
    Users,
    Lock,
    RotateCcw,
} from 'lucide-react';

interface RolesProps {
    roles: Role[];
    available_menus: MenuItem[];
    filters: {
        search: string;
        status?: string;
    };
}

export default function RolesIndexPage({
    roles = [],
    filters = { search: '' },
}: RolesProps) {
    const { can, isSuperAdmin } = usePermission();
    const canManageRoles = isSuperAdmin || can('roles', 'view') || can('users', 'edit');

    const [search, setSearch] = useState(filters?.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters?.status || '');

    const { getOptions } = useEssentials();
    const roleStatusOptions = getOptions<RoleStatus>('role_status');

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

    const handleDeleteRole = (role: Role) => {
        if (role.is_system) {
            alert('System roles cannot be deleted.');
            return;
        }

        if (role.users_count && role.users_count > 0) {
            alert(`Cannot delete role '${role.name}' because it has ${role.users_count} active user(s).`);
            return;
        }

        if (confirm(`Are you sure you want to delete role '${role.name}'?`)) {
            router.delete(`/admin/roles/${role.id}`);
        }
    };

    return (
        <AdminLayout title="Roles & Permissions">
            <Head title="Roles & Permissions" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Shield className="w-5 h-5 text-indigo-600" />
                            Roles & Permissions
                        </h1>
                    </div>

                    {canManageRoles && (
                        <Link href="/admin/roles/create">
                            <Button
                                type="button"
                                variant="primary"
                                size="md"
                                leftIcon={<Plus className="w-4 h-4" />}
                            >
                                New Role
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Filter bar */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search roles..."
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

                            <Button type="submit" variant="secondary" size="md">
                                Search
                            </Button>

                            {(filters?.search || filters?.status || search || selectedStatus) && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="md"
                                    onClick={handleReset}
                                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
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
                                className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 overflow-hidden"
                            >
                                <div className="p-5 flex-1 flex flex-col">
                                    {/* Role Header */}
                                    <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
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
                                                <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight truncate">
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
                                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                                    : role.status === 'inactive'
                                                                    ? 'text-rose-600 dark:text-rose-400'
                                                                    : 'text-amber-600 dark:text-amber-400'
                                                            }
                                                        >
                                                            {roleStatusOptions.find((o) => o.value === role.status)?.label || role.status || 'Active'}
                                                        </span>
                                                    </span>

                                                    <span className="text-slate-300 dark:text-slate-700">•</span>

                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                                        {role.users_count || 0} user{role.users_count === 1 ? '' : 's'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {isSystemRole && (
                                            <Badge variant="indigo" size="sm">
                                                System
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Role Menus Summary */}
                                    <div className="pt-4 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                                                <span>Menus</span>
                                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                    {isSystemRole ? 'All Active' : `${assignedMenus.length} Linked`}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5">
                                                {isSystemRole ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                                        All Modules
                                                    </span>
                                                ) : assignedMenus.length === 0 ? (
                                                    <span className="text-xs text-slate-400 italic">No menus linked</span>
                                                ) : (
                                                    assignedMenus.slice(0, 6).map((m) => (
                                                        <span
                                                            key={m.slug}
                                                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                                                        >
                                                            {m.name}
                                                        </span>
                                                    ))
                                                )}
                                                {!isSystemRole && assignedMenus.length > 6 && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                                                        +{assignedMenus.length - 6} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="p-3 px-5 bg-slate-50/70 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2">
                                    <Link href={`/admin/roles/${role.id}/edit`}>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                                        >
                                            {isSystemRole ? 'View Permissions' : 'Configure'}
                                        </Button>
                                    </Link>

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
            </div>
        </AdminLayout>
    );
}

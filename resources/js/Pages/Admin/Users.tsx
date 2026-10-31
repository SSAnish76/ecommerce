import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { User, Role, MenuItem, PageProps, UserStatus } from '../../types';
import { usePermission } from '../../hooks/usePermission';
import {
    Button,
    Input,
    Select,
    Badge,
    Modal,
    TableContainer,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableHeaderCell,
    EmptyState,
    PageHeader,
} from '../../Components/UI';
import {
    Users as UsersIcon,
    Search,
    Plus,
    UserPlus,
    Pencil,
    Trash2,
    Mail,
    Shield,
    ShieldCheck,
    ShieldAlert,
    CheckCircle2,
    XCircle,
    KeyRound,
    RotateCcw,
} from 'lucide-react';

interface PaginatedUsers {
    data: User[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface UsersProps {
    users: PaginatedUsers;
    roles?: (Role & { menu_slugs?: string[]; users_count?: number })[];
    filters: {
        search: string;
        role?: string;
    };
    statuses?: Array<{ value: string; label: string }>;
}

const getPrimaryRole = (user: User): string => {
    if (user.role) {
        const roleName = typeof user.role === 'object' ? (user.role as any).name : user.role;
        if (roleName) return roleName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
    const firstRole = Array.isArray(user.roles) ? user.roles[0] : null;
    const roleName = typeof firstRole === 'object' && firstRole ? firstRole.name : (typeof firstRole === 'string' ? firstRole : null);
    if (!roleName) return '';
    return roleName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const getRoleId = (user: User): string => {
    if (user.role_id) return String(user.role_id);
    if (user.role && typeof user.role === 'object' && (user.role as any).id) return String((user.role as any).id);
    const firstRole = Array.isArray(user.roles) ? user.roles[0] : null;
    return typeof firstRole === 'object' && firstRole?.id ? String(firstRole.id) : '';
};

const hasSystemRole = (user: User): boolean => {
    if (typeof user.has_system_role === 'boolean') return user.has_system_role;
    if (user.role && typeof user.role === 'object') return Boolean((user.role as any).is_system);
    if (!Array.isArray(user.roles)) return false;
    return user.roles.some((r: any) => typeof r === 'object' && Boolean(r?.is_system));
};

const hasTwoFactor = (user: User): boolean => {
    return Boolean(user.is_2fa);
};

export default function UsersPage({
    users,
    roles = [],
    filters,
    statuses = [],
}: UsersProps) {
    const userStatusOptions = statuses.length > 0 ? statuses : [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
    ];
    const defaultStatus = (userStatusOptions[0]?.value ?? 'active') as UserStatus;

    const { auth } = usePage<PageProps>().props;
    const { can } = usePermission();
    const currentUserId = auth?.user?.id;
    const canCreate = can('users', 'create');
    const canEdit = can('users', 'edit');
    const canDelete = can('users', 'delete');

    const [search, setSearch] = useState(filters.search || '');
    const [selectedRole, setSelectedRole] = useState(filters.role || '');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const createForm = useForm<{
        name: string;
        email: string;
        password: string;
        role_id: string;
        status: UserStatus;
    }>({
        name: '',
        email: '',
        password: '',
        role_id: '',
        status: defaultStatus,
    });

    const editForm = useForm<{
        name: string;
        email: string;
        password: string;
        role_id: string;
        status: UserStatus;
    }>({
        name: '',
        email: '',
        password: '',
        role_id: '',
        status: defaultStatus,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/users',
            { search, role: selectedRole },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setSelectedRole('');
        router.get('/admin/users');
    };

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/users', {
            onSuccess: () => {
                createForm.reset();
                setIsCreateOpen(false);
            },
        });
    };

    const handleOpenEdit = (user: User) => {
        setEditingUser(user);
        editForm.setData({
            name: user.name,
            email: user.email,
            password: '',
            role_id: getRoleId(user),
            status: (user.status ?? defaultStatus) as UserStatus,
        });
        editForm.clearErrors();
    };

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        editForm.put(`/admin/users/${editingUser.id}`, {
            onSuccess: () => {
                setEditingUser(null);
                editForm.reset();
            },
        });
    };

    const handleDeleteUser = (user: User) => {
        if (hasSystemRole(user)) {
            alert(`User "${user.name}" is assigned to a system role and cannot be deleted.`);
            return;
        }

        if (confirm(`Are you sure you want to delete "${user.name}"?`)) {
            router.delete(`/admin/users/${user.id}`);
        }
    };

    return (
        <AdminLayout title="User Accounts">
            <Head title="Users Management" />

            {/* Page Header */}
            <PageHeader
                title="User Accounts & Access"
                badge={
                    <Badge variant="indigo" size="md">
                        {users.total} Total Users
                    </Badge>
                }
                actions={
                    canCreate && (
                        <Button
                            variant="primary"
                            size="sm"
                            pill
                            leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                            onClick={() => setIsCreateOpen(true)}
                            className="shadow-md shadow-indigo-600/20 font-medium px-4.5 py-1.5 rounded-full whitespace-nowrap"
                        >
                            Add
                        </Button>
                    )
                }
            />


            {/* Search & Filter Bar */}
            <div className="rounded-3xl bg-[var(--admin-surface)] border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4 mb-6 shadow-xs">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Input
                            placeholder="Search by name or email address..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            leftIcon={<Search className="w-4 h-4" />}
                        />
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="min-w-[160px]">
                            <Select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                            >
                                <option value="">All Roles</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.name}>
                                        {r.name}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <Button type="submit" variant="secondary" size="md">
                            Apply Filter
                        </Button>

                        {(search || selectedRole) && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="md"
                                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                                onClick={handleReset}
                            >
                                Reset
                            </Button>
                        )}
                    </div>
                </form>
            </div>

            {/* Users Data Table */}
            <TableContainer>
                <TableHead>
                    <tr>
                        <TableHeaderCell>User Details</TableHeaderCell>
                        <TableHeaderCell>Assigned Role</TableHeaderCell>
                        <TableHeaderCell>Two-Factor Auth</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Registered On</TableHeaderCell>
                        <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                </TableHead>
                <TableBody>
                    {users.data.length === 0 ? (
                        <tr>
                            <td colSpan={6}>
                                <EmptyState
                                    icon={UsersIcon}
                                    title="No accounts found"
                                    description="No administrator accounts match your active search or role criteria."
                                    action={
                                        (search || selectedRole) && (
                                            <Button variant="outline" size="sm" onClick={handleReset}>
                                                Clear Search Filters
                                            </Button>
                                        )
                                    }
                                />
                            </td>
                        </tr>
                    ) : (
                        users.data.map((user) => {
                            const userRole = getPrimaryRole(user);
                            const userHasSystemRole = hasSystemRole(user);
                            const userHas2fa = hasTwoFactor(user);

                            return (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                                    <span>{user.name}</span>
                                                    {user.id === currentUserId && (
                                                        <Badge variant="indigo" size="sm">
                                                            You
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                                    <Mail className="w-3 h-3 shrink-0" />
                                                    <span>{user.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {userRole ? (
                                                <Badge
                                                    variant="indigo"
                                                    size="md"
                                                    icon={<Shield className="w-3 h-3" />}
                                                >
                                                    {userRole}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-600 text-xs">-</span>
                                            )}
                                            {userHasSystemRole && (
                                                <Badge variant="amber" size="sm">
                                                    System
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {userHas2fa ? (
                                            <Badge
                                                variant="emerald"
                                                size="sm"
                                                dot
                                                icon={<ShieldCheck className="w-3 h-3" />}
                                            >
                                                2FA Active
                                            </Badge>
                                        ) : (
                                            <Badge
                                                variant="default"
                                                size="sm"
                                                icon={<ShieldAlert className="w-3 h-3 text-slate-400" />}
                                            >
                                                Disabled
                                            </Badge>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        {(() => {
                                            const status = user.status || 'active';
                                            const label =
                                                userStatusOptions.find((o) => o.value === status)?.label ||
                                                status.charAt(0).toUpperCase() + status.slice(1);

                                            if (status === 'active') {
                                                return (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        {label}
                                                    </span>
                                                );
                                            }
                                            if (status === 'inactive') {
                                                return (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                                                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                                                        {label}
                                                    </span>
                                                );
                                            }
                                            return (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                    {label}
                                                </span>
                                            );
                                        })()}
                                    </TableCell>

                                    <TableCell>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {user.created_at
                                                ? new Date(user.created_at).toLocaleDateString('en-US', {
                                                      year: 'numeric',
                                                      month: 'short',
                                                      day: 'numeric',
                                                  })
                                                : '—'}
                                        </span>
                                    </TableCell>

                                    <TableCell align="right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleOpenEdit(user)}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                                    title={`Edit account settings for ${user.name}`}
                                                    aria-label={`Edit ${user.name}`}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}

                                            {canDelete && user.id !== currentUserId && !userHasSystemRole && (
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                                    title={`Delete ${user.name}`}
                                                    aria-label={`Delete ${user.name}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </TableContainer>

            {/* Pagination Controls */}
            {users.last_page > 1 && (
                <div className="mt-5 flex items-center justify-between gap-4 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                        Page {users.current_page} of {users.last_page} ({users.total} total accounts)
                    </span>
                    <div className="flex items-center gap-1.5">
                        {users.links.map((link, idx) => {
                            if (!link.url) {
                                return (
                                    <span
                                        key={idx}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className="px-3 py-1.5 rounded-lg text-slate-300 dark:text-slate-600 cursor-not-allowed select-none"
                                    />
                                );
                            }
                            return (
                                <Link
                                    key={idx}
                                    href={link.url}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                                        link.active
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create User Account"
                maxWidth="md"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="md"
                            onClick={() => setIsCreateOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="md"
                            isLoading={createForm.processing}
                            onClick={handleCreateUser}
                        >
                            Create Account
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <Input
                        label="Full Name"
                        placeholder="e.g. John Doe"
                        required
                        value={createForm.data.name}
                        onChange={(e) => createForm.setData('name', e.target.value)}
                        error={createForm.errors.name}
                    />

                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="john@store.com"
                        required
                        value={createForm.data.email}
                        onChange={(e) => createForm.setData('email', e.target.value)}
                        error={createForm.errors.email}
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••••••"
                        required
                        value={createForm.data.password}
                        onChange={(e) => createForm.setData('password', e.target.value)}
                        error={createForm.errors.password}
                    />

                    <Select
                        label="Assigned Role"
                        required
                        value={createForm.data.role_id}
                        onChange={(e) => createForm.setData('role_id', e.target.value)}
                        error={createForm.errors.role_id}
                    >
                        <option value="">Select a role...</option>
                        {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </Select>

                    <Select
                        label="Account Status"
                        required
                        value={createForm.data.status}
                        onChange={(e) => createForm.setData('status', e.target.value as UserStatus)}
                        error={createForm.errors.status}
                    >
                        {userStatusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </Select>
                </form>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                title={`Edit User: ${editingUser?.name || ''}`}
                maxWidth="md"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="md"
                            onClick={() => setEditingUser(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="md"
                            isLoading={editForm.processing}
                            onClick={handleUpdateUser}
                        >
                            Save Changes
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleUpdateUser} className="space-y-4">
                    <Input
                        label="Full Name"
                        placeholder="e.g. John Doe"
                        required
                        value={editForm.data.name}
                        onChange={(e) => editForm.setData('name', e.target.value)}
                        error={editForm.errors.name}
                    />

                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="john@store.com"
                        required
                        value={editForm.data.email}
                        onChange={(e) => editForm.setData('email', e.target.value)}
                        error={editForm.errors.email}
                    />

                    <Input
                        label="New Password"
                        type="password"
                        placeholder="Leave blank to preserve current password"
                        value={editForm.data.password}
                        onChange={(e) => editForm.setData('password', e.target.value)}
                        error={editForm.errors.password}
                    />

                    <Select
                        label="Assigned Role"
                        required
                        value={editForm.data.role_id}
                        onChange={(e) => editForm.setData('role_id', e.target.value)}
                        error={editForm.errors.role_id}
                    >
                        <option value="">Select a role...</option>
                        {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </Select>

                    <Select
                        label="Account Status"
                        required
                        value={editForm.data.status}
                        onChange={(e) => editForm.setData('status', e.target.value as UserStatus)}
                        error={editForm.errors.status}
                    >
                        {userStatusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </Select>

                    {/* Two-Factor Authentication Security Details */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        {Boolean(editingUser?.is_2fa) ? (
                            <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            Two-Factor Auth Active
                                        </div>
                                    </div>
                                </div>
                                {canEdit && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (confirm(`Reset and disable Two-Factor Authentication for "${editingUser?.name}"?`)) {
                                                router.put(
                                                    `/admin/users/${editingUser?.id}`,
                                                    {
                                                        name: editForm.data.name,
                                                        email: editForm.data.email,
                                                        role_id: editForm.data.role_id,
                                                        status: editForm.data.status,
                                                        reset_two_factor: true,
                                                        reset_2fa: true,
                                                    },
                                                    {
                                                        preserveScroll: true,
                                                        onSuccess: () => {
                                                            setEditingUser((prev) => (prev ? { ...prev, is_2fa: false } : null));
                                                        },
                                                    }
                                                );
                                            }
                                        }}
                                        className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900/50 text-xs shrink-0"
                                    >
                                        Reset 2FA
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                        Two-Factor Auth Disabled
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

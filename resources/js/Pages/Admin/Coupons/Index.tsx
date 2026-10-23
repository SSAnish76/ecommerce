import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { Coupon } from '../../../types';
import { usePermission } from '../../../hooks/usePermission';
import {
    Button,
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
    CopyButton,
    Toggle,
} from '../../../Components/UI';
import {
    TicketPercent,
    Plus,
    Search,
    RotateCcw,
    Pencil,
    Trash2,
    AlertCircle,
} from 'lucide-react';

interface PaginatedCoupons {
    data: Coupon[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface CouponsIndexProps {
    coupons: PaginatedCoupons;
    filters: { search?: string; status?: string; type?: string; applies_to?: string };
}

export default function CouponsIndex({ coupons, filters }: CouponsIndexProps) {
    const { can } = usePermission();
    const canCreate = can('coupons', 'create');
    const canEdit = can('coupons', 'edit');
    const canDelete = can('coupons', 'delete');

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/coupons',
            {
                search: search || undefined,
                status: statusFilter || undefined,
                type: typeFilter || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setStatusFilter('');
        setTypeFilter('');
        router.get('/admin/coupons');
    };

    const handleDelete = () => {
        if (!deletingCoupon) return;
        router.delete(`/admin/coupons/${deletingCoupon.id}`, {
            onSuccess: () => setDeletingCoupon(null),
        });
    };

    const handleToggle = (coupon: Coupon) => {
        router.patch(`/admin/coupons/${coupon.id}/toggle-status`, {}, { preserveScroll: true });
    };

    const renderStatusBadge = (coupon: Coupon) => {
        const badge = coupon.status_badge || (coupon.is_active ? 'active' : 'inactive');
        if (badge === 'active') return <Badge variant="emerald" size="sm" dot>Active</Badge>;
        if (badge === 'scheduled') return <Badge variant="sky" size="sm" dot>Scheduled</Badge>;
        if (badge === 'expired') return <Badge variant="rose" size="sm" dot>Expired</Badge>;
        if (badge === 'exhausted') return <Badge variant="amber" size="sm" dot>Limit Reached</Badge>;
        return <Badge variant="default" size="sm">Inactive</Badge>;
    };

    const formatDiscount = (coupon: Coupon) => {
        if (coupon.type === 'percentage') return `${parseFloat(String(coupon.value))}% OFF`;
        return `$${parseFloat(String(coupon.value)).toFixed(2)} OFF`;
    };

    const renderScope = (coupon: Coupon) => {
        if (coupon.applies_to === 'products') {
            return `${coupon.products?.length || 0} Products`;
        }
        if (coupon.applies_to === 'categories') {
            return `${coupon.categories?.length || 0} Categories`;
        }
        if (coupon.applies_to === 'collections') {
            return `${coupon.collections?.length || 0} Collections`;
        }
        return 'All Products';
    };

    const hasFilters = Boolean(search || statusFilter || typeFilter);

    return (
        <AdminLayout title="Coupons">
            <Head title="Coupons" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <TicketPercent className="w-5 h-5 text-indigo-600" />
                        Coupons
                    </h1>

                    {canCreate && (
                        <Link href="/admin/coupons/create">
                            <Button
                                type="button"
                                variant="primary"
                                size="md"
                                leftIcon={<Plus className="w-4 h-4" />}
                            >
                                New Coupon
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Search & Filter Bar */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search coupon code or name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="min-w-[130px]">
                                <Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Statuses' },
                                        { value: 'active', label: 'Active' },
                                        { value: 'inactive', label: 'Inactive' },
                                        { value: 'scheduled', label: 'Scheduled' },
                                        { value: 'expired', label: 'Expired' },
                                        { value: 'exhausted', label: 'Limit Reached' },
                                    ]}
                                />
                            </div>

                            <div className="min-w-[130px]">
                                <Select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Types' },
                                        { value: 'percentage', label: 'Percentage' },
                                        { value: 'fixed', label: 'Fixed Amount' },
                                    ]}
                                />
                            </div>

                            <Button type="submit" variant="secondary" size="md">
                                Search
                            </Button>

                            {hasFilters && (
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

                {/* Table */}
                {coupons.data.length === 0 ? (
                    <EmptyState
                        title="No Coupons Found"
                        description={hasFilters ? 'No coupons matched your search.' : 'Create your first coupon.'}
                        action={
                            canCreate ? (
                                <Link href="/admin/coupons/create">
                                    <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                                        New Coupon
                                    </Button>
                                </Link>
                            ) : undefined
                        }
                    />
                ) : (
                    <TableContainer>
                        <table className="w-full text-left text-xs sm:text-sm">
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell>Code & Campaign</TableHeaderCell>
                                    <TableHeaderCell>Discount</TableHeaderCell>
                                    <TableHeaderCell>Applies To</TableHeaderCell>
                                    <TableHeaderCell>Usage</TableHeaderCell>
                                    <TableHeaderCell>Validity</TableHeaderCell>
                                    <TableHeaderCell>Status</TableHeaderCell>
                                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {coupons.data.map((coupon) => (
                                    <TableRow key={coupon.id}>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 min-w-[150px]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-bold tracking-wider text-xs px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300">
                                                        {coupon.code}
                                                    </span>
                                                    <CopyButton text={coupon.code} />
                                                </div>
                                                <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                    {coupon.name}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {formatDiscount(coupon)}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="text-slate-600 dark:text-slate-300 font-medium">
                                                {renderScope(coupon)}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                                {coupon.times_used}
                                                {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ' / ∞'}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                                                {coupon.expires_at ? (
                                                    <span>Exp: {new Date(coupon.expires_at).toLocaleDateString()}</span>
                                                ) : (
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">No expiry</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {renderStatusBadge(coupon)}
                                                {canEdit && (
                                                    <Toggle
                                                        checked={coupon.is_active}
                                                        onChange={() => handleToggle(coupon)}
                                                        size="sm"
                                                    />
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {canEdit && (
                                                    <Link href={`/admin/coupons/${coupon.id}/edit`}>
                                                        <button
                                                            type="button"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    </Link>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeletingCoupon(coupon)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </table>
                    </TableContainer>
                )}

                {/* Pagination */}
                {coupons.last_page > 1 && (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl">
                        <span className="text-xs text-slate-500">
                            Page {coupons.current_page} of {coupons.last_page} ({coupons.total} total)
                        </span>
                        <div className="flex items-center gap-1.5">
                            {coupons.links.map((link, idx) =>
                                !link.url && !link.active ? (
                                    <span
                                        key={idx}
                                        className="px-3 py-1.5 text-xs text-slate-300 dark:text-slate-700 select-none"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                            link.active
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            {deletingCoupon && (
                <Modal isOpen={true} onClose={() => setDeletingCoupon(null)} title="Delete Coupon" size="md">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200">
                            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                            <p className="text-xs">
                                Are you sure you want to delete coupon <strong>{deletingCoupon.code}</strong>?
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-3">
                            <Button variant="secondary" onClick={() => setDeletingCoupon(null)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={handleDelete}>
                                Delete Permanently
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </AdminLayout>
    );
}

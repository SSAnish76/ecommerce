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
    const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/coupons',
            {
                search: search || undefined,
                status: statusFilter || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setStatusFilter('');
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

    const formatDiscount = (coupon: Coupon) => {
        if (coupon.type === 'percentage') {
            return `${parseFloat(String(coupon.value))}% OFF`;
        }
        return `$${parseFloat(String(coupon.value)).toFixed(2)} OFF`;
    };

    const renderAppliesTo = (coupon: Coupon) => {
        if (coupon.applies_to === 'products') {
            return `${coupon.products?.length || 0} Products`;
        }
        if (coupon.applies_to === 'brands') {
            return `${coupon.brands?.length || 0} Brands`;
        }
        if (coupon.applies_to === 'categories') {
            return `${coupon.categories?.length || 0} Categories`;
        }
        return 'All Products';
    };

    const hasFilters = Boolean(search || statusFilter);

    return (
        <AdminLayout title="Coupons">
            <Head title="Coupons" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <TicketPercent className="w-5 h-5 text-indigo-600" />
                            Coupons
                        </h1>
                    </div>

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

                {/* Filter Bar */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by code or campaign name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                            />
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="min-w-[140px]">
                                <Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Statuses' },
                                        { value: 'active', label: 'Active' },
                                        { value: 'inactive', label: 'Inactive' },
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

                {/* Coupons Table */}
                {coupons.data.length === 0 ? (
                    <EmptyState
                        title="No Coupons Found"
                        description={hasFilters ? 'No coupons match your search filters.' : 'Get started by creating your first promotional coupon.'}
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
                        <table className="w-full text-left text-sm">
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell>Coupon</TableHeaderCell>
                                    <TableHeaderCell>Discount</TableHeaderCell>
                                    <TableHeaderCell>Applies To</TableHeaderCell>
                                    <TableHeaderCell>Usage</TableHeaderCell>
                                    <TableHeaderCell>Status</TableHeaderCell>
                                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {coupons.data.map((coupon) => (
                                    <TableRow key={coupon.id}>
                                        {/* Coupon Code & Campaign Name */}
                                        <TableCell>
                                            <div className="flex flex-col gap-1 min-w-[160px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold tracking-wider text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300">
                                                        {coupon.code}
                                                    </span>
                                                    <CopyButton text={coupon.code} />
                                                </div>
                                                <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                    {coupon.name}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Discount Amount */}
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                    {formatDiscount(coupon)}
                                                </span>
                                                {coupon.min_order_amount && (
                                                    <span className="text-xs text-slate-400">
                                                        Min. ${parseFloat(String(coupon.min_order_amount)).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Scope */}
                                        <TableCell>
                                            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                {renderAppliesTo(coupon)}
                                            </span>
                                        </TableCell>

                                        {/* Usage */}
                                        <TableCell>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {coupon.times_used}
                                                {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ' used'}
                                            </span>
                                        </TableCell>

                                        {/* Active Status & Toggle */}
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                <Badge
                                                    variant={coupon.is_active ? 'emerald' : 'default'}
                                                    size="sm"
                                                    dot
                                                >
                                                    {coupon.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                                {canEdit && (
                                                    <Toggle
                                                        checked={coupon.is_active}
                                                        onChange={() => handleToggle(coupon)}
                                                        size="sm"
                                                    />
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {canEdit && (
                                                    <Link href={`/admin/coupons/${coupon.id}/edit`}>
                                                        <button
                                                            type="button"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="Edit Coupon"
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
                                                        title="Delete Coupon"
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

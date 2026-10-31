import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { Order, PageProps } from '../../types';
import {
    Button,
    Badge,
    PageHeader,
    EmptyState,
} from '../../Components/UI';
import {
    Search,
    ShoppingCart,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    Truck,
    PackageCheck,
    Send,
    AlertCircle,
    ChevronRight,
} from 'lucide-react';

interface PaginatedOrders {
    data: Order[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface OrdersProps {
    orders: PaginatedOrders;
    filters: {
        search: string;
        status: string;
    };
    statuses?: { value: string; label: string }[];
}

const ORDER_STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
    pending: {
        label: 'Pending',
        bg: 'bg-amber-500/10',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-500/20',
        icon: Clock,
    },
    processing: {
        label: 'Processing',
        bg: 'bg-sky-500/10',
        text: 'text-sky-700 dark:text-sky-300',
        border: 'border-sky-500/20',
        icon: Truck,
    },
    shipped: {
        label: 'Shipped',
        bg: 'bg-[var(--admin-primary-subtle)]',
        text: 'text-[var(--admin-primary)]',
        border: 'border-[var(--admin-primary)]/20',
        icon: Send,
    },
    delivered: {
        label: 'Delivered',
        bg: 'bg-teal-500/10',
        text: 'text-teal-700 dark:text-teal-300',
        border: 'border-teal-500/20',
        icon: PackageCheck,
    },
    completed: {
        label: 'Completed',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-500/20',
        icon: CheckCircle2,
    },
    cancelled: {
        label: 'Cancelled',
        bg: 'bg-rose-500/10',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-500/20',
        icon: XCircle,
    },
};

export default function OrdersPage({
    orders,
    filters,
    statuses,
}: OrdersProps) {
    const { store } = usePage<PageProps>().props;
    const currency = store?.currency || '$';

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/orders',
            { search, status: statusFilter },
            { preserveState: true }
        );
    };

    const handleStatusChange = (order: Order, newStatus: string) => {
        if (order.status === newStatus) return;

        if (newStatus === 'cancelled' && !window.confirm(`Are you sure you want to cancel Order #${order.order_number}? Product and variant stock will be automatically restocked.`)) {
            return;
        }

        setUpdatingOrderId(order.id);
        router.patch(
            `/admin/orders/${order.id}/status`,
            { status: newStatus },
            {
                preserveScroll: true,
                onFinish: () => setUpdatingOrderId(null),
            }
        );
    };

    const availableStatuses = statuses && statuses.length > 0 ? statuses : [
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'shipped', label: 'Shipped' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <AdminLayout title="Orders">
            <Head title="Orders Management - Admin" />

            <div className="space-y-6">
                <PageHeader
                    title="Orders & Fulfillment"
                    description="Track storefront purchases, variant SKU breakdowns, fulfillment states, and customer deliveries."
                    breadcrumbs={[
                        { label: 'Admin', href: '/admin' },
                        { label: 'Sales' },
                        { label: 'Orders' },
                    ]}
                />

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--admin-surface)] p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                    <form onSubmit={handleSearchSubmit} className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by Order #, Customer Name, Email, or Phone..."
                                className="w-full text-xs sm:text-sm pl-10 pr-4 h-11 sm:h-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20 focus:border-[var(--admin-primary)]"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    router.get(
                                        '/admin/orders',
                                        { search, status: e.target.value },
                                        { preserveState: true }
                                    );
                                }}
                                className="flex-1 sm:flex-initial text-xs font-semibold h-11 sm:h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)] cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                {availableStatuses.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>

                            <Button type="submit" variant="secondary" size="md" className="hidden sm:inline-flex">
                                Filter
                            </Button>
                        </div>
                    </form>

                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1 shrink-0 text-right sm:text-left">
                        Total: <span className="font-bold text-slate-900 dark:text-white">{orders.total}</span> orders
                    </div>
                </div>

                {/* Orders View */}
                {orders.data.length === 0 ? (
                    <EmptyState
                        icon={<ShoppingCart className="w-8 h-8 text-[var(--admin-primary)]" />}
                        title="No Orders Found"
                        description="Customer checkout orders and variant transactions will automatically appear here."
                    />
                ) : (
                    <div className="bg-[var(--admin-surface)] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        {/* Mobile Native Order Cards (< md) */}
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
                            {orders.data.map((order) => {
                                const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;
                                const isUpdating = updatingOrderId === order.id;

                                return (
                                    <div key={order.id} className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Link
                                                href={`/admin/orders/${order.id}`}
                                                className="font-mono text-sm font-extrabold text-[var(--admin-primary)] flex items-center gap-1.5"
                                            >
                                                <span>#{order.order_number}</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </Link>
                                            <div className="text-sm font-black text-slate-900 dark:text-white">
                                                {currency}{Number(order.total).toFixed(2)}
                                            </div>
                                        </div>

                                        <div className="text-xs">
                                            <div className="font-bold text-slate-900 dark:text-white">{order.customer_name}</div>
                                            <div className="text-slate-400 text-[11px] truncate">{order.customer_email}</div>
                                        </div>

                                        {order.items && order.items.length > 0 && (
                                            <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-2.5 rounded-2xl">
                                                <span className="font-semibold">{order.items[0].quantity}x {order.items[0].product_name}</span>
                                                {order.items.length > 1 && (
                                                    <span className="text-[11px] text-slate-400 ml-1 font-bold">
                                                        +{order.items.length - 1} more
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-1 gap-2">
                                            <div className="relative inline-flex items-center gap-1.5">
                                                <select
                                                    value={order.status}
                                                    disabled={isUpdating}
                                                    onChange={(e) => handleStatusChange(order, e.target.value)}
                                                    className={`text-xs font-bold py-1.5 pl-3 pr-7 rounded-full border appearance-none cursor-pointer ${config.bg} ${config.text} ${config.border} disabled:opacity-50`}
                                                >
                                                    {availableStatuses.map((s) => (
                                                        <option key={s.value} value={s.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                                            {s.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                {isUpdating && (
                                                    <span className="inline-block w-3 h-3 border-2 border-[var(--admin-primary)] border-t-transparent rounded-full animate-spin" />
                                                )}
                                            </div>

                                            <Link
                                                href={`/admin/orders/${order.id}`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5 text-[var(--admin-primary)]" />
                                                <span>Details</span>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table (>= md) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        <th className="py-3.5 px-5">Order #</th>
                                        <th className="py-3.5 px-5">Customer</th>
                                        <th className="py-3.5 px-5">Items &amp; Details</th>
                                        <th className="py-3.5 px-5">Total</th>
                                        <th className="py-3.5 px-5">Change Status</th>
                                        <th className="py-3.5 px-5">Payment</th>
                                        <th className="py-3.5 px-5">Date</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                                    {orders.data.map((order) => {
                                        const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;
                                        const isUpdating = updatingOrderId === order.id;

                                        return (
                                            <tr
                                                key={order.id}
                                                className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <td className="py-4 px-5">
                                                    <Link
                                                        href={`/admin/orders/${order.id}`}
                                                        className="font-mono font-bold text-[var(--admin-primary)] hover:underline block"
                                                    >
                                                        {order.order_number}
                                                    </Link>
                                                    <span className="text-[10px] text-slate-400 capitalize">
                                                        {order.payment_method?.replace(/[-_]/g, ' ') || 'standard'}
                                                    </span>
                                                </td>

                                                <td className="py-4 px-5">
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        {order.customer_name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                                        {order.customer_email}
                                                    </div>
                                                </td>

                                                <td className="py-4 px-5">
                                                    <div className="space-y-1">
                                                        {order.items?.slice(0, 2).map((item) => (
                                                            <div key={item.id} className="flex items-center gap-2">
                                                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                                                    {item.quantity}x {item.product_name}
                                                                </span>
                                                                {item.variant_name && (
                                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] border border-[var(--admin-primary)]/20 font-mono">
                                                                        {item.variant_name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {order.items && order.items.length > 2 && (
                                                            <span className="text-[10px] text-slate-400 font-semibold block">
                                                                +{order.items.length - 2} more item(s)
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                                                    {currency}
                                                    {Number(order.total).toFixed(2)}
                                                </td>

                                                <td className="py-4 px-5">
                                                    <div className="relative inline-flex items-center gap-1.5">
                                                        <select
                                                            value={order.status}
                                                            disabled={isUpdating}
                                                            onChange={(e) => handleStatusChange(order, e.target.value)}
                                                            className={`text-xs font-bold py-1.5 pl-3 pr-7 rounded-full border appearance-none cursor-pointer transition-colors focus:ring-2 focus:ring-[var(--admin-primary)]/20 ${config.bg} ${config.text} ${config.border} disabled:opacity-50`}
                                                        >
                                                            {availableStatuses.map((s) => (
                                                                <option key={s.value} value={s.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                                                    {s.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {isUpdating && (
                                                            <span className="inline-block w-3 h-3 border-2 border-[var(--admin-primary)] border-t-transparent rounded-full animate-spin" />
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-4 px-5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        order.payment_status === 'paid'
                                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                                            : order.payment_status === 'refunded'
                                                            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                                                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                                                    }`}>
                                                        {order.payment_status || 'Pending'}
                                                    </span>
                                                </td>

                                                <td className="py-4 px-5 text-slate-400 text-[11px]">
                                                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                                                </td>

                                                <td className="py-4 px-5 text-right">
                                                    <Link
                                                        href={`/admin/orders/${order.id}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs tap-bounce"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 text-[var(--admin-primary)]" />
                                                        <span>View</span>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {orders.last_page > 1 && (
                            <div className="p-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="text-xs text-slate-500 font-medium">
                                    Showing page {orders.current_page} of {orders.last_page}
                                </div>
                                <div className="flex items-center gap-1 flex-wrap justify-center">
                                    {orders.links.map((link, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                            disabled={!link.url || link.active}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-colors tap-bounce ${
                                                link.active
                                                    ? 'bg-[var(--admin-primary)] text-white shadow-2xs'
                                                    : link.url
                                                    ? 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                                                    : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

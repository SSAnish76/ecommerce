import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { Order, OrderItem, PageProps } from '../../types';
import {
    Button,
    Input,
    Badge,
    Modal,
    PageHeader,
    EmptyState,
} from '../../Components/UI';
import {
    Search,
    ShoppingCart,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Package,
    Truck,
    DollarSign,
    User,
    MapPin,
    Calendar,
    Eye,
    RefreshCw,
    FileText,
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
    metrics: {
        total_revenue: number;
        total_orders: number;
        pending_orders: number;
        processing_orders: number;
        completed_orders: number;
        cancelled_orders: number;
    };
    filters: {
        search: string;
        status: string;
    };
    statuses: { value: string; label: string }[];
}

export default function OrdersPage({
    orders,
    metrics,
    filters,
    statuses,
}: OrdersProps) {
    const { store } = usePage<PageProps>().props;
    const currency = store?.currency || '$';

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/orders',
            { search, status: statusFilter },
            { preserveState: true }
        );
    };

    const handleStatusChange = (orderId: string, newStatus: string) => {
        setUpdatingStatus(true);
        router.patch(
            `/admin/orders/${orderId}/status`,
            { status: newStatus },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setUpdatingStatus(false);
                    if (selectedOrder && selectedOrder.id === orderId) {
                        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
                    }
                },
                onError: () => setUpdatingStatus(false),
            }
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed
                    </span>
                );
            case 'processing':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                        <Truck className="w-3.5 h-3.5" />
                        Processing
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        <XCircle className="w-3.5 h-3.5" />
                        Cancelled
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5" />
                        Pending
                    </span>
                );
        }
    };

    return (
        <AdminLayout>
            <Head title="Orders Management - Admin" />

            <div className="space-y-6">
                <PageHeader
                    title="Orders &amp; Fulfillment"
                    description="Track storefront purchases, variant SKU breakdowns, fulfillment states, and inventory dispatch."
                    breadcrumbs={[
                        { label: 'Admin', href: '/admin/dashboard' },
                        { label: 'Sales' },
                        { label: 'Orders' },
                    ]}
                />

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-slate-500">Gross Sales</span>
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                            {currency}
                            {metrics.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-slate-500">Total Orders</span>
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                                <ShoppingCart className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                            {metrics.total_orders}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-slate-500">Pending / Processing</span>
                            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                            {metrics.pending_orders + metrics.processing_orders}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-slate-500">Cancelled / Restocked</span>
                            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                                <XCircle className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                            {metrics.cancelled_orders}
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-3 w-full">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by Order #, Customer Name, Email, or Phone..."
                                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>

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
                            className="text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Statuses</option>
                            {statuses.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>

                        <Button type="submit" variant="secondary" size="sm" className="hidden sm:inline-flex">
                            Search
                        </Button>
                    </form>

                    <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                        Total: <span className="font-bold text-slate-900 dark:text-white">{orders.total}</span> orders
                    </div>
                </div>

                {/* Orders Table */}
                {orders.data.length === 0 ? (
                    <EmptyState
                        icon={<ShoppingCart className="w-10 h-10 text-slate-400" />}
                        title="No Orders Found"
                        description="Customer checkout orders and variant transactions will automatically appear here."
                    />
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        <th className="py-3.5 px-5">Order #</th>
                                        <th className="py-3.5 px-5">Customer</th>
                                        <th className="py-3.5 px-5">Items &amp; Variants</th>
                                        <th className="py-3.5 px-5">Total</th>
                                        <th className="py-3.5 px-5">Status</th>
                                        <th className="py-3.5 px-5">Date</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                                    {orders.data.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <td className="py-4 px-5">
                                                <button
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                                >
                                                    {order.order_number}
                                                </button>
                                            </td>

                                            <td className="py-4 px-5">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {order.customer_name}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
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
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 font-mono">
                                                                    {item.variant_name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {order.items && order.items.length > 2 && (
                                                        <span className="text-[10px] text-slate-400 font-semibold">
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
                                                {getStatusBadge(order.status)}
                                            </td>

                                            <td className="py-4 px-5 text-slate-400 text-[11px]">
                                                {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                                            </td>

                                            <td className="py-4 px-5 text-right">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setSelectedOrder(order)}
                                                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                                                    className="text-xs py-1.5 px-3 rounded-xl"
                                                >
                                                    Details
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Order Details & Status Management */}
            <Modal
                isOpen={Boolean(selectedOrder)}
                onClose={() => setSelectedOrder(null)}
                title={`Order #${selectedOrder?.order_number || ''}`}
                size="lg"
            >
                {selectedOrder && (
                    <div className="space-y-6">
                        {/* Status Change Control */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <span className="text-xs text-slate-400 block">Current Status</span>
                                <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Update Status:
                                </span>
                                <select
                                    value={selectedOrder.status}
                                    disabled={updatingStatus}
                                    onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                                    className="text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="processing">Processing</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled (Restock)</option>
                                </select>
                            </div>
                        </div>

                        {/* Customer & Shipping Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                    <User className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Customer Information</span>
                                </div>
                                <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                                    {selectedOrder.customer_name}
                                </div>
                                <div className="text-xs text-slate-500">{selectedOrder.customer_email}</div>
                                {selectedOrder.customer_phone && (
                                    <div className="text-xs text-slate-500">{selectedOrder.customer_phone}</div>
                                )}
                            </div>

                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Shipping Address</span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">
                                    {selectedOrder.shipping_address}
                                </p>
                            </div>
                        </div>

                        {/* Line Items Breakdown */}
                        <div className="space-y-3">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                Purchased Line Items ({selectedOrder.items?.length || 0})
                            </span>

                            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                                {selectedOrder.items?.map((item) => (
                                    <div key={item.id} className="p-3.5 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.product_name}
                                                    className="w-12 h-12 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                            )}

                                            <div>
                                                <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {item.product_name}
                                                </div>

                                                {item.variant_name && (
                                                    <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                                                        Variant: {item.variant_name}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="font-mono text-[10px] text-slate-400">
                                                        SKU: {item.sku}
                                                    </span>
                                                    {item.attributes &&
                                                        Object.entries(item.attributes).map(([k, v]) => (
                                                            <span
                                                                key={k}
                                                                className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                                            >
                                                                {k}: {v}
                                                            </span>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                {currency}
                                                {Number(item.subtotal).toFixed(2)}
                                            </div>
                                            <span className="text-[11px] text-slate-400">
                                                {item.quantity} x {currency}
                                                {Number(item.price).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Order Financial Totals */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Subtotal</span>
                                <span>
                                    {currency}
                                    {Number(selectedOrder.subtotal).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Shipping Fee</span>
                                <span>
                                    {currency}
                                    {Number(selectedOrder.shipping_fee).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Tax</span>
                                <span>
                                    {currency}
                                    {Number(selectedOrder.tax).toFixed(2)}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                                <span>Order Total</span>
                                <span className="text-indigo-600 dark:text-indigo-400">
                                    {currency}
                                    {Number(selectedOrder.total).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button type="button" variant="secondary" onClick={() => setSelectedOrder(null)}>
                                Close Details
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}

import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { Order, PageProps } from '../../../types';
import {
    Button,
    Badge,
    Modal,
    PageHeader,
} from '../../../Components/UI';
import {
    ShoppingCart,
    Clock,
    CheckCircle2,
    XCircle,
    Truck,
    PackageCheck,
    Send,
    DollarSign,
    User,
    MapPin,
    ArrowLeft,
    RefreshCw,
    AlertCircle,
    CreditCard,
    FileText,
    ExternalLink,
    Tag,
} from 'lucide-react';

interface OrderShowProps {
    order: Order;
    statuses?: { value: string; label: string }[];
    paymentStatuses?: { value: string; label: string }[];
    paymentSummary: {
        paid_amount: number;
        refunded_amount: number;
        refundable_amount: number;
        is_paid: boolean;
        is_refunded: boolean;
    };
}

const ORDER_STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
    pending: {
        label: 'Pending',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800/60',
        icon: Clock,
    },
    processing: {
        label: 'Processing',
        bg: 'bg-sky-50 dark:bg-sky-950/40',
        text: 'text-sky-700 dark:text-sky-400',
        border: 'border-sky-200 dark:border-sky-800/60',
        icon: Truck,
    },
    shipped: {
        label: 'Shipped',
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        text: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800/60',
        icon: Send,
    },
    delivered: {
        label: 'Delivered',
        bg: 'bg-teal-50 dark:bg-teal-950/40',
        text: 'text-teal-700 dark:text-teal-400',
        border: 'border-teal-200 dark:border-teal-800/60',
        icon: PackageCheck,
    },
    completed: {
        label: 'Completed',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800/60',
        icon: CheckCircle2,
    },
    cancelled: {
        label: 'Cancelled',
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-800/60',
        icon: XCircle,
    },
};

export default function OrderShowPage({
    order,
    statuses,
    paymentSummary,
}: OrderShowProps) {
    const { store } = usePage<PageProps>().props;
    const currency = store?.currency || '$';

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('Cancelled by store administrator');
    const [cancelAutoRefund, setCancelAutoRefund] = useState(paymentSummary.is_paid);
    const [isCancelling, setIsCancelling] = useState(false);

    const [refundModalOpen, setRefundModalOpen] = useState(false);
    const [refundAmount, setRefundAmount] = useState<string>(
        paymentSummary.refundable_amount > 0
            ? String(paymentSummary.refundable_amount)
            : String(order.total)
    );
    const [refundReason, setRefundReason] = useState('Customer requested refund');
    const [refundMarkCancelled, setRefundMarkCancelled] = useState(order.status !== 'cancelled');
    const [isRefunding, setIsRefunding] = useState(false);

    const availableStatuses = statuses && statuses.length > 0 ? statuses : [
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'shipped', label: 'Shipped' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    const handleStatusChange = (newStatus: string) => {
        if (order.status === newStatus) return;

        if (newStatus === 'cancelled') {
            setCancelModalOpen(true);
            return;
        }

        setIsUpdatingStatus(true);
        router.patch(
            `/admin/orders/${order.id}/status`,
            { status: newStatus },
            {
                preserveScroll: true,
                onFinish: () => setIsUpdatingStatus(false),
            }
        );
    };

    const handleConfirmCancel = (e: React.FormEvent) => {
        e.preventDefault();
        setIsCancelling(true);
        router.post(
            `/admin/orders/${order.id}/cancel`,
            {
                reason: cancelReason,
                process_refund: cancelAutoRefund,
                refund_amount: Number(refundAmount) || Number(order.total),
            },
            {
                preserveScroll: true,
                onSuccess: () => setCancelModalOpen(false),
                onFinish: () => setIsCancelling(false),
            }
        );
    };

    const handleConfirmRefund = (e: React.FormEvent) => {
        e.preventDefault();
        setIsRefunding(true);
        router.post(
            `/admin/orders/${order.id}/refund`,
            {
                amount: Number(refundAmount),
                reason: refundReason,
                mark_cancelled: refundMarkCancelled,
            },
            {
                preserveScroll: true,
                onSuccess: () => setRefundModalOpen(false),
                onFinish: () => setIsRefunding(false),
            }
        );
    };

    const statusConfig = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;
    const StatusIcon = statusConfig.icon;

    return (
        <AdminLayout>
            <Head title={`Order #${order.order_number} - Admin`} />

            <div className="space-y-6">
                {/* Header with Navigation and Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/orders"
                            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs"
                            title="Back to Orders List"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
                                    Order #{order.order_number}
                                </h1>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {statusConfig.label}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Placed on {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {order.status !== 'cancelled' && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setCancelModalOpen(true)}
                                className="text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                Cancel Order
                            </Button>
                        )}

                        {paymentSummary.is_paid && !paymentSummary.is_refunded && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setRefundModalOpen(true)}
                                className="text-xs text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                            >
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                Issue Refund
                            </Button>
                        )}
                    </div>
                </div>

                {/* Status Advancement Banner */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusConfig.bg} ${statusConfig.text}`}>
                            <StatusIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                Order Status Workflow
                            </div>
                            <div className="text-xs text-slate-500">
                                Current stage: <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{order.status}</span>. You can change the fulfillment status order-wise below.
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Update Status:
                        </label>
                        <select
                            value={order.status}
                            disabled={isUpdatingStatus}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                        >
                            {availableStatuses.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                        {isUpdatingStatus && (
                            <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        )}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column (2 Cols): Line Items and Finances */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Purchased Line Items */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-indigo-500" />
                                    <span>Purchased Items ({order.items?.length || 0})</span>
                                </h3>
                                <span className="text-xs font-medium text-slate-400">
                                    Items dispatched with atomic stock reservation
                                </span>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                {order.items?.map((item) => (
                                    <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.product_name}
                                                    className="w-14 h-14 object-contain rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-1 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center shrink-0">
                                                    <ShoppingCart className="w-6 h-6 text-slate-400" />
                                                </div>
                                            )}

                                            <div className="min-w-0">
                                                <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                                                    {item.product_name}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    {item.variant_name && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 font-mono">
                                                            {item.variant_name}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] font-mono text-slate-400">
                                                        SKU: {item.sku || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {currency}{Number(item.price).toFixed(2)} × {item.quantity} unit{item.quantity > 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                                {currency}{Number(item.subtotal).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                <span>Financial Breakdown</span>
                            </h3>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Subtotal</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        {currency}{Number(order.subtotal).toFixed(2)}
                                    </span>
                                </div>

                                {Number(order.discount_amount) > 0 && (
                                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                        <span className="flex items-center gap-1.5">
                                            <Tag className="w-3.5 h-3.5" />
                                            <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                                        </span>
                                        <span className="font-semibold">
                                            -{currency}{Number(order.discount_amount).toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Shipping Fee {order.shipping_carrier ? `(${order.shipping_carrier})` : ''}</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        {currency}{Number(order.shipping_fee).toFixed(2)}
                                    </span>
                                </div>

                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Tax / VAT</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        {currency}{Number(order.tax).toFixed(2)}
                                    </span>
                                </div>

                                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between text-base font-bold text-slate-900 dark:text-white">
                                    <span>Total Payable</span>
                                    <span className="text-indigo-600 dark:text-indigo-400">
                                        {currency}{Number(order.total).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Transactions Ledger */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-purple-500" />
                                    <span>Payment Ledger & Transactions ({order.payments?.length || 0})</span>
                                </h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    order.payment_status === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                        : order.payment_status === 'refunded'
                                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                }`}>
                                    Status: {order.payment_status}
                                </span>
                            </div>

                            {order.payments && order.payments.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                <th className="py-2.5 px-4">Transaction ID</th>
                                                <th className="py-2.5 px-4">Gateway</th>
                                                <th className="py-2.5 px-4">Type</th>
                                                <th className="py-2.5 px-4">Amount</th>
                                                <th className="py-2.5 px-4">Status</th>
                                                <th className="py-2.5 px-4">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                            {order.payments.map((p) => (
                                                <tr key={p.id}>
                                                    <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                                                        {p.transaction_id || 'N/A'}
                                                    </td>
                                                    <td className="py-3 px-4 capitalize">
                                                        {p.gateway}
                                                    </td>
                                                    <td className="py-3 px-4 uppercase font-bold text-[10px] text-slate-500">
                                                        {p.type}
                                                    </td>
                                                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                                        {currency}{Number(p.amount).toFixed(2)}
                                                    </td>
                                                    <td className="py-3 px-4 capitalize">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                            p.status === 'paid'
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                                : p.status === 'refunded'
                                                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400'
                                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                                        }`}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                                                        {p.paid_at || p.created_at ? new Date(p.paid_at || p.created_at || '').toLocaleDateString() : 'N/A'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-6 text-center text-xs text-slate-400">
                                    No gateway payments recorded yet for this order. Payment method is set to <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">{order.payment_method}</span>.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column (1 Col): Customer, Addresses, Carrier & Notes */}
                    <div className="space-y-6">
                        {/* Customer Information Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <User className="w-4 h-4 text-indigo-500" />
                                    <span>Customer Account</span>
                                </h3>
                                {order.customer_id && (
                                    <Link
                                        href={`/admin/customers/${order.customer_id}`}
                                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                    >
                                        <span>View Profile</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                )}
                            </div>

                            <div className="space-y-2 text-xs">
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Full Name</span>
                                    <div className="font-semibold text-slate-900 dark:text-white text-sm">
                                        {order.customer_name}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Email Address</span>
                                    <div className="text-slate-700 dark:text-slate-300">
                                        {order.customer_email}
                                    </div>
                                </div>

                                {order.customer_phone && (
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Phone Number</span>
                                        <div className="text-slate-700 dark:text-slate-300">
                                            {order.customer_phone}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Shipping Address */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-emerald-500" />
                                <span>Shipping Destination</span>
                            </h3>

                            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                                {order.shipping_address || 'No shipping address provided.'}
                            </p>
                        </div>

                        {/* Billing Address */}
                        {order.billing_address && (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <span>Billing Address</span>
                                </h3>

                                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                                    {order.billing_address}
                                </p>
                            </div>
                        )}

                        {/* Shipping Carrier & Tracking */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Truck className="w-4 h-4 text-sky-500" />
                                <span>Shipment & Dispatch</span>
                            </h3>

                            <div className="space-y-2 text-xs">
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Carrier & Method</span>
                                    <div className="text-slate-800 dark:text-slate-200 font-medium capitalize">
                                        {order.shipping_carrier || 'Standard Carrier'} {order.shipping_method ? `(${order.shipping_method})` : ''}
                                    </div>
                                </div>

                                {order.tracking_number && (
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Tracking Number</span>
                                        <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                            {order.tracking_number}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Notes / Cancellation Timeline */}
                        {order.notes && (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-2">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-amber-500" />
                                    <span>Notes & Operational Log</span>
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 font-mono">
                                    {order.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Cancel Order */}
            <Modal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                title={`Cancel Order #${order.order_number}`}
                size="md"
            >
                <form onSubmit={handleConfirmCancel} className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                        <div>
                            <span className="font-bold block">Inventory Will Be Restocked</span>
                            Cancelling this order will automatically restore stock for all {order.items?.length || 0} product and variant SKUs.
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Reason for Cancellation
                        </label>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            required
                            rows={3}
                            placeholder="e.g. Customer requested cancellation before dispatch..."
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {paymentSummary.is_paid && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={cancelAutoRefund}
                                    onChange={(e) => setCancelAutoRefund(e.target.checked)}
                                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    Also process full refund ({currency}{Number(order.total).toFixed(2)}) to customer
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setCancelModalOpen(false)}
                            disabled={isCancelling}
                        >
                            Back
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                            isLoading={isCancelling}
                        >
                            Confirm Cancellation
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Process Refund */}
            <Modal
                isOpen={refundModalOpen}
                onClose={() => setRefundModalOpen(false)}
                title={`Issue Refund for Order #${order.order_number}`}
                size="md"
            >
                <form onSubmit={handleConfirmRefund} className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-300 text-xs">
                        <div className="font-bold mb-1">Payment Gateway Integration</div>
                        This action will invoke the registered gateway refund driver (e.g. Stripe, PayPal, COD) and append a refund record to the order payments ledger.
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Refund Amount ({currency})
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={order.total}
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            required
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-[11px] text-slate-400 mt-1 block">
                            Maximum refundable: {currency}{Number(order.total).toFixed(2)}
                        </span>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Refund Reason
                        </label>
                        <textarea
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            required
                            rows={2}
                            placeholder="Reason for processing refund..."
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {order.status !== 'cancelled' && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={refundMarkCancelled}
                                    onChange={(e) => setRefundMarkCancelled(e.target.checked)}
                                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    Also mark order as Cancelled and restock product inventory
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setRefundModalOpen(false)}
                            disabled={isRefunding}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isRefunding}
                        >
                            Process Refund
                        </Button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}


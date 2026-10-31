import React from 'react';
import { Link } from '@inertiajs/react';
import { CheckCircle2, Clock, AlertCircle, XCircle, ExternalLink, ChevronRight } from 'lucide-react';
import { RecentOrder } from '../types';

interface RecentOrdersTableProps {
    orders: RecentOrder[];
    orderStatusMap?: Record<string, string>;
}

const DEFAULT_ORDER_STATUS_MAP: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    failed: 'Failed',
};

export default function RecentOrdersTable({
    orders,
    orderStatusMap = DEFAULT_ORDER_STATUS_MAP,
}: RecentOrdersTableProps) {
    const statusMap = { ...DEFAULT_ORDER_STATUS_MAP, ...orderStatusMap };

    const getStatusBadge = (status: RecentOrder['status']) => {
        const label = statusMap[status] || status;
        const s = String(status).toLowerCase();

        let Icon = Clock;
        let className = 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20';

        if (s.includes('deliver') || s.includes('complete')) {
            Icon = CheckCircle2;
            className = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
        } else if (s.includes('process') || s.includes('pend')) {
            Icon = AlertCircle;
            className = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
        } else if (s.includes('cancel') || s.includes('fail')) {
            Icon = XCircle;
            className = 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20';
        }

        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${className}`}
            >
                <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                {label}
            </span>
        );
    };

    const getInitials = (name?: string) => {
        if (!name) return 'C';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <div className="rounded-3xl bg-[var(--admin-surface)] border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-white/5">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Recent Orders</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Latest transactions from checkout</p>
                </div>
                <Link
                    href="/admin/orders"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--admin-primary)] bg-[var(--admin-primary-subtle)] hover:bg-[var(--admin-primary)]/15 border border-[var(--admin-primary)]/20 rounded-xl transition-all tap-bounce"
                >
                    <span>View All</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Mobile Native Card View (< md) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
                {orders.map((order) => (
                    <Link
                        key={order.id}
                        href={`/admin/orders/${order.id}`}
                        className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors tap-bounce"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-white/10">
                                {getInitials(order.customer)}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-[var(--admin-primary)]">
                                        #{order.id}
                                    </span>
                                    <span className="text-[10px] text-slate-400">· {order.date}</span>
                                </div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {order.customer}
                                </div>
                                <div className="mt-1">
                                    {getStatusBadge(order.status)}
                                </div>
                            </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2">
                            <div>
                                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                                    {order.amount}
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <th className="py-3.5 px-6">Order ID</th>
                            <th className="py-3.5 px-6">Customer</th>
                            <th className="py-3.5 px-6">Date</th>
                            <th className="py-3.5 px-6">Amount</th>
                            <th className="py-3.5 px-6">Status</th>
                            <th className="py-3.5 px-6 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                        {orders.map((order) => (
                            <tr
                                key={order.id}
                                className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors group"
                            >
                                <td className="py-4 px-6 font-mono font-bold text-[var(--admin-primary)]">
                                    #{order.id}
                                </td>
                                <td className="py-4 px-6">
                                    <div className="font-bold text-slate-900 dark:text-white">{order.customer}</div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{order.email}</div>
                                </td>
                                <td className="py-4 px-6 text-slate-500 dark:text-slate-400">{order.date}</td>
                                <td className="py-4 px-6 font-extrabold text-slate-900 dark:text-white">{order.amount}</td>
                                <td className="py-4 px-6">{getStatusBadge(order.status)}</td>
                                <td className="py-4 px-6 text-right">
                                    <Link
                                        href={`/admin/orders/${order.id}`}
                                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

import { CheckCircle2, Clock, AlertCircle, XCircle, ExternalLink } from 'lucide-react';
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
        let className = 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-500/20';

        if (s.includes('deliver') || s.includes('complete')) {
            Icon = CheckCircle2;
            className = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/20';
        } else if (s.includes('process') || s.includes('pend')) {
            Icon = AlertCircle;
            className = 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-500/20';
        } else if (s.includes('cancel') || s.includes('fail')) {
            Icon = XCircle;
            className = 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/20';
        }

        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}
            >
                <Icon className="w-3.5 h-3.5" />
                {label}
            </span>
        );
    };

    return (
        <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/80">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Recent Orders</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Latest transactions from store checkout</p>
                </div>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100/80 dark:hover:bg-indigo-500/20 border border-indigo-200/80 dark:border-indigo-500/20 rounded-xl transition-all">
                    <span>View All</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/40 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <th className="py-3 px-5">Order ID</th>
                            <th className="py-3 px-5">Customer</th>
                            <th className="py-3 px-5">Date</th>
                            <th className="py-3 px-5">Amount</th>
                            <th className="py-3 px-5">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                        {orders.map((order) => (
                            <tr
                                key={order.id}
                                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                            >
                                <td className="py-3.5 px-5 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                                    {order.id}
                                </td>
                                <td className="py-3.5 px-5">
                                    <div className="font-semibold text-slate-900 dark:text-white">{order.customer}</div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{order.email}</div>
                                </td>
                                <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400">{order.date}</td>
                                <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">{order.amount}</td>
                                <td className="py-3.5 px-5">{getStatusBadge(order.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

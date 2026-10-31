import React from 'react';
import { ActivityItem } from '../types';
import { ShoppingCart, Tag, RefreshCw, Database } from 'lucide-react';

interface ActivityListProps {
    activities: ActivityItem[];
    activityMap?: Record<string, string>;
}

const DEFAULT_ACTIVITY_MAP: Record<string, string> = {
    completed: 'Completed',
    pending: 'Pending',
    failed: 'Failed',
    cancelled: 'Cancelled',
};

export default function ActivityList({
    activities,
    activityMap = DEFAULT_ACTIVITY_MAP,
}: ActivityListProps) {
    const statusMap = { ...DEFAULT_ACTIVITY_MAP, ...activityMap };

    const getIcon = (target: string) => {
        if (target.includes('ORD')) return ShoppingCart;
        if (target.includes('Backup') || target.includes('Storage')) return Database;
        if (target.includes('refund')) return RefreshCw;
        return Tag;
    };

    return (
        <div className="rounded-3xl bg-[var(--admin-surface)] border border-slate-200/80 dark:border-white/10 shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Audit Log</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Recent store events &amp; operations</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live Feed</span>
                </div>
            </div>

            <div className="space-y-3.5">
                {activities.map((item) => {
                    const Icon = getIcon(item.target);
                    const label = statusMap[item.status] || item.status;
                    const s = String(item.status).toLowerCase();
                    const badgeClass =
                        s === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                            : s === 'pending'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20';

                    return (
                        <div key={item.id} className="flex items-start gap-3 text-xs p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[var(--admin-primary)] border border-slate-200/80 dark:border-white/10 mt-0.5 shrink-0 shadow-2xs">
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-slate-700 dark:text-slate-300 leading-snug">
                                    <span className="font-bold text-slate-900 dark:text-white">{item.user}</span>{' '}
                                    <span className="text-slate-500 dark:text-slate-400">{item.action}</span>{' '}
                                    <span className="font-semibold text-[var(--admin-primary)] break-words">
                                        {item.target}
                                    </span>
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                        {item.time}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${badgeClass}`}>
                                        {label}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

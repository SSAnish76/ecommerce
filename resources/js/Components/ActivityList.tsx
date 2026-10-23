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
        <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-xs p-5">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Audit Log</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Recent store events &amp; operations</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500 animate-ping" />
            </div>

            <div className="space-y-4">
                {activities.map((item) => {
                    const Icon = getIcon(item.target);
                    const label = activityMap[item.status] || item.status;
                    const s = String(item.status).toLowerCase();
                    const badgeClass =
                        s === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                            : s === 'pending'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400';

                    return (
                        <div key={item.id} className="flex items-start gap-3 text-xs">
                            <div className="p-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/50 text-indigo-600 dark:text-indigo-400 mt-0.5 shadow-2xs">
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-slate-600 dark:text-slate-300 leading-snug">
                                    <span className="font-semibold text-slate-900 dark:text-white">{item.user}</span>{' '}
                                    <span className="text-slate-500 dark:text-slate-400">{item.action}</span>{' '}
                                    <span className="font-medium text-indigo-600 dark:text-indigo-400 break-words">
                                        {item.target}
                                    </span>
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 inline-block">
                                        {item.time}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${badgeClass}`}>
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

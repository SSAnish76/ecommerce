import React from 'react';
import {
    DollarSign,
    ShoppingBag,
    Users,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import { MetricCardData } from '../types';

interface StatCardProps {
    metric: MetricCardData;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    DollarSign,
    ShoppingBag,
    Users,
    TrendingUp,
};

export default function StatCard({ metric }: StatCardProps) {
    const IconComponent = iconMap[metric.icon] || TrendingUp;

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all duration-300 group">
            {/* Top gradient glow subtle */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all duration-300 pointer-events-none" />

            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                    {metric.title}
                </span>
                <div className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 transition-all duration-200 shadow-2xs">
                    <IconComponent className="w-5 h-5" />
                </div>
            </div>

            <div className="flex items-baseline justify-between">
                <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {metric.value}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metric.description}</p>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <div
                    className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md ${
                        metric.isPositive
                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20'
                            : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20'
                    }`}
                >
                    {metric.isPositive ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    <span>{metric.change}</span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">vs past cycle</span>
            </div>
        </div>
    );
}

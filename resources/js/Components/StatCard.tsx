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
        <div className="relative overflow-hidden rounded-3xl bg-[var(--admin-surface)] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-[var(--admin-primary)]/40 transition-all duration-300 group tap-bounce">
            {/* Top gradient glow subtle */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-[var(--admin-primary-subtle)] rounded-full blur-2xl group-hover:scale-125 transition-transform duration-300 pointer-events-none" />

            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase truncate pr-2">
                    {metric.title}
                </span>
                <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-[var(--admin-primary)] group-hover:scale-110 group-hover:bg-[var(--admin-primary-subtle)] transition-all duration-200 shadow-2xs shrink-0">
                    <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
            </div>

            <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {metric.value}
                </h3>
                {metric.description && (
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                        {metric.description}
                    </p>
                )}
            </div>

            <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                <div
                    className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full ${
                        metric.isPositive
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20'
                            : 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20'
                    }`}
                >
                    {metric.isPositive ? (
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                    <span>{metric.change}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">vs last cycle</span>
            </div>
        </div>
    );
}

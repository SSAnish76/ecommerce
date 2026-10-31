import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import StatCard from '../../Components/StatCard';
import RecentOrdersTable from '../../Components/RecentOrdersTable';
import ActivityList from '../../Components/ActivityList';
import { MetricCardData, RecentOrder, ActivityItem, User } from '../../types';
import { Button } from '../../Components/UI';
import {
    Plus,
    Download,
    Users as UsersIcon,
    Sparkles,
    ShoppingBag,
    TrendingUp,
    ShieldCheck,
    ArrowRight,
    Boxes,
} from 'lucide-react';

interface DashboardProps {
    metrics: MetricCardData[];
    recentOrders: RecentOrder[];
    recentUsers: User[];
    activityFeed: ActivityItem[];
    orderStatusMap?: Record<string, string>;
    activityMap?: Record<string, string>;
}

export default function Dashboard({
    metrics,
    recentOrders,
    recentUsers,
    activityFeed,
    orderStatusMap,
    activityMap,
}: DashboardProps) {
    return (
        <AdminLayout title="Operations Hub">
            <Head title="Admin Dashboard" />

            {/* Mobile Native Quick Actions & Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[var(--admin-surface)] to-[var(--admin-surface-subtle)] border border-slate-200/80 dark:border-white/10 p-5 sm:p-7 mb-6 shadow-xs">
                {/* Background accent glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--admin-primary-subtle)] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--admin-primary-subtle)] border border-[var(--admin-primary)]/20 text-[var(--admin-primary)] text-xs font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Commerce Command Center</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Store Performance Overview
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                            Real-time order throughput, revenue velocity, and live audit telemetry across your store.
                        </p>
                    </div>

                    {/* Quick action buttons - mobile friendly */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap pt-1 sm:pt-0">
                        <Link href="/admin/products/create" className="flex-1 sm:flex-initial">
                            <Button
                                variant="primary"
                                size="md"
                                pill
                                leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                                className="w-full sm:w-auto shadow-md shadow-indigo-500/20"
                            >
                                Add Product
                            </Button>
                        </Link>
                        <Link href="/admin/orders" className="flex-1 sm:flex-initial">
                            <Button
                                variant="outline"
                                size="md"
                                pill
                                leftIcon={<ShoppingBag className="w-4 h-4" />}
                                className="w-full sm:w-auto"
                            >
                                Orders
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Metrics cards row: 2-cols on mobile for great glanceability, 4-cols on lg */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6">
                {metrics.map((metric) => (
                    <StatCard key={metric.title} metric={metric} />
                ))}
            </div>

            {/* Sales Performance & New Members Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 mb-6">
                {/* Revenue Velocity Card */}
                <div className="lg:col-span-2 rounded-3xl bg-[var(--admin-surface)] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                Weekly Revenue Velocity
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Daily sales distribution &amp; volumes</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>This Month: +14.2%</span>
                        </span>
                    </div>

                    {/* Bar visualization */}
                    <div className="space-y-3.5 pt-1">
                        {[
                            { day: 'Mon', amount: '$6,420', percentage: '65%' },
                            { day: 'Tue', amount: '$8,140', percentage: '82%' },
                            { day: 'Wed', amount: '$5,900', percentage: '58%' },
                            { day: 'Thu', amount: '$9,300', percentage: '94%' },
                            { day: 'Fri', amount: '$11,450', percentage: '100%' },
                            { day: 'Sat', amount: '$7,800', percentage: '76%' },
                            { day: 'Sun', amount: '$4,240', percentage: '45%' },
                        ].map((item) => (
                            <div key={item.day} className="flex items-center gap-3 sm:gap-4 text-xs">
                                <span className="w-8 font-bold text-slate-500 dark:text-slate-400">{item.day}</span>
                                <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                                    <div
                                        className="h-full rounded-full bg-[var(--admin-primary)] transition-all duration-700"
                                        style={{ width: item.percentage }}
                                    />
                                </div>
                                <span className="w-16 font-mono font-bold text-slate-900 dark:text-white text-right">
                                    {item.amount}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recently Registered Members */}
                <div className="rounded-3xl bg-[var(--admin-surface)] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <UsersIcon className="w-4 h-4 text-[var(--admin-primary)]" />
                                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                    New Members
                                </h3>
                            </div>
                            <Link
                                href="/admin/users"
                                className="text-xs text-[var(--admin-primary)] hover:underline font-bold"
                            >
                                View All
                            </Link>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Latest registered accounts
                        </p>

                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {recentUsers.slice(0, 5).map((user) => {
                                const roleObjOrName = user.role;
                                const roleRawName = typeof roleObjOrName === 'object' && roleObjOrName
                                    ? (roleObjOrName as any).name
                                    : (typeof roleObjOrName === 'string' ? roleObjOrName : null);
                                const roleLabel = roleRawName
                                    ? roleRawName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                                    : (Array.isArray(user.roles) && user.roles[0] && typeof user.roles[0] === 'object'
                                        ? (user.roles[0] as any).name?.replace(/[-_]/g, ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase())
                                        : '');

                                return (
                                    <div key={user.id} className="py-3 flex items-center justify-between tap-bounce">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] border border-[var(--admin-primary)]/20 flex items-center justify-center font-bold text-xs shrink-0">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                    {user.name}
                                                </p>
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {Boolean(user.is_2fa) && (
                                                <span
                                                    title="2FA Active"
                                                    className="inline-flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20"
                                                >
                                                    <ShieldCheck className="w-3 h-3 mr-0.5" />
                                                    2FA
                                                </span>
                                            )}
                                            {roleLabel && (
                                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full shrink-0">
                                                    {roleLabel}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 mt-2">
                        <Link
                            href="/admin/users"
                            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[var(--admin-primary)] transition-colors tap-bounce"
                        >
                            <span>Manage user directory</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Orders & Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
                <div className="lg:col-span-2">
                    <RecentOrdersTable orders={recentOrders} orderStatusMap={orderStatusMap} />
                </div>
                <div>
                    <ActivityList activities={activityFeed} activityMap={activityMap} />
                </div>
            </div>
        </AdminLayout>
    );
}

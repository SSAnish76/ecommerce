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
    ArrowUpRight,
    Sparkles,
    ShoppingBag,
    TrendingUp,
    ShieldCheck,
} from 'lucide-react';

interface DashboardProps {
    metrics: MetricCardData[];
    recentOrders: RecentOrder[];
    recentUsers: User[];
    activityFeed: ActivityItem[];
}

export default function Dashboard({
    metrics,
    recentOrders,
    recentUsers,
    activityFeed,
}: DashboardProps) {
    return (
        <AdminLayout title="Dashboard Overview">
            <Head title="Admin Dashboard" />

            {/* Welcome banner & Actions */}
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 mb-6 shadow-xs">
                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 text-xs font-semibold mb-3">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Ecommerce Operations Suite</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Store Overview &amp; Control
                        </h2>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                            Real-time transaction monitoring, performance metrics, and system status across your online store.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <Link href="/admin/users">
                            <Button
                                variant="primary"
                                size="sm"
                                pill
                                leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                                className="shadow-md shadow-indigo-600/20 font-medium px-4.5 py-1.5 rounded-full whitespace-nowrap"
                            >
                                Add
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            size="md"
                            leftIcon={<Download className="w-4 h-4" />}
                            onClick={() => alert('Exporting store operational report...')}
                        >
                            Export Report
                        </Button>
                    </div>
                </div>
            </div>

            {/* Metrics cards row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
                {metrics.map((metric) => (
                    <StatCard key={metric.title} metric={metric} />
                ))}
            </div>

            {/* Sales Chart / Performance Preview & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Revenue Highlights Card */}
                <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                Weekly Revenue Velocity
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Daily sales distribution &amp; volumes</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>This Month: +14.2%</span>
                        </span>
                    </div>

                    {/* Visual Bar representation */}
                    <div className="space-y-4 pt-2">
                        {[
                            { day: 'Mon', amount: '$6,420', percentage: '65%' },
                            { day: 'Tue', amount: '$8,140', percentage: '82%' },
                            { day: 'Wed', amount: '$5,900', percentage: '58%' },
                            { day: 'Thu', amount: '$9,300', percentage: '94%' },
                            { day: 'Fri', amount: '$11,450', percentage: '100%' },
                            { day: 'Sat', amount: '$7,800', percentage: '76%' },
                            { day: 'Sun', amount: '$4,240', percentage: '45%' },
                        ].map((item) => (
                            <div key={item.day} className="flex items-center gap-4 text-xs">
                                <span className="w-8 font-semibold text-slate-500 dark:text-slate-400">{item.day}</span>
                                <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                                    <div
                                        className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-700"
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

                {/* Recently Registered Users */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <UsersIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                    New Members
                                </h3>
                            </div>
                            <Link
                                href="/admin/users"
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold"
                            >
                                View All
                            </Link>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Latest registered member accounts
                        </p>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
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
                                    <div key={user.id} className="py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
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
                                                    title="Two-Factor Authentication Protected"
                                                    className="inline-flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40"
                                                >
                                                    <ShieldCheck className="w-3 h-3 mr-0.5" />
                                                    2FA
                                                </span>
                                            )}
                                            {roleLabel && (
                                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                                                    {roleLabel}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders & Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RecentOrdersTable orders={recentOrders} />
                </div>
                <div>
                    <ActivityList activities={activityFeed} />
                </div>
            </div>
        </AdminLayout>
    );
}

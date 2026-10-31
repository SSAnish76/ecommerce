import React from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    PageHeader,
    Badge,
} from '../../Components/UI';
import {
    BarChart3,
    Smartphone,
    Laptop,
    Eye,
    ShoppingCart,
    CreditCard,
    ArrowUpRight,
    TrendingUp,
    Compass,
} from 'lucide-react';

export default function Analytics() {
    return (
        <AdminLayout title="Analytics &amp; Intelligence">
            <Head title="Analytics" />

            <PageHeader
                title="Performance &amp; Traffic Intelligence"
                description="Monitor customer acquisition channels, shopping cart funnel velocity, and platform device usage."
                badge={
                    <Badge variant="indigo" size="md" dot>
                        Live Tracking
                    </Badge>
                }
            />

            {/* Funnel Metrics: 1-col on mobile, 3-cols on sm */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5 mb-6">
                <Card className="hover:border-[var(--admin-primary)]/40 transition-all tap-bounce">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Store Impressions
                            </span>
                            <div className="p-2.5 rounded-2xl bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)]">
                                <Eye className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            128,400
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>+22.4% vs previous week</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:border-[var(--admin-primary)]/40 transition-all tap-bounce">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Cart Additions
                            </span>
                            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <ShoppingCart className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            14,890
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>11.6% add-to-cart rate</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:border-[var(--admin-primary)]/40 transition-all tap-bounce">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Completed Purchases
                            </span>
                            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CreditCard className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            1,428
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>9.6% checkout conversion</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Channels & Device Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                {/* Traffic Channels */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Traffic Acquisition Sources</CardTitle>
                        <CardDescription>Customer session breakdown by inbound channel</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { channel: 'Direct / Bookmarks', share: '42%', color: 'bg-[var(--admin-primary)]' },
                            { channel: 'Organic Search (Google)', share: '31%', color: 'bg-purple-600' },
                            { channel: 'Social Media (Instagram/TikTok)', share: '18%', color: 'bg-pink-500' },
                            { channel: 'Referral & Affiliates', share: '9%', color: 'bg-emerald-500' },
                        ].map((ch) => (
                            <div key={ch.channel} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-slate-700 dark:text-slate-300">{ch.channel}</span>
                                    <span className="text-slate-900 dark:text-white font-mono font-bold">{ch.share}</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${ch.color}`}
                                        style={{ width: ch.share }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Device Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Device &amp; Platform Distribution</CardTitle>
                        <CardDescription>Breakdown across visitor browsing form-factors</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col items-center justify-center text-center">
                                <Smartphone className="w-8 h-8 text-[var(--admin-primary)] mb-2" />
                                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">68.4%</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-bold">Mobile Devices</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col items-center justify-center text-center">
                                <Laptop className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
                                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">31.6%</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-bold">Desktop &amp; Tablet</span>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-[var(--admin-primary-subtle)] border border-[var(--admin-primary)]/20 text-xs text-slate-900 dark:text-white flex items-start gap-2.5">
                            <Compass className="w-4 h-4 text-[var(--admin-primary)] shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                                Mobile storefront conversion rate rose by <strong>+18%</strong> with mobile-native layout optimizations.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}

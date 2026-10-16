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
    Share2,
} from 'lucide-react';

export default function Analytics() {
    return (
        <AdminLayout title="Analytics &amp; Intelligence">
            <Head title="Analytics" />

            {/* Header */}
            <PageHeader
                title="Performance &amp; Traffic Intelligence"
                description="Monitor customer acquisition channels, shopping cart funnel velocity, and platform device usage."
                badge={
                    <Badge variant="indigo" size="md" dot>
                        Live Tracking
                    </Badge>
                }
            />

            {/* Funnel Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                <Card className="hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Store Impressions
                            </span>
                            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                                <Eye className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            128,400
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>+22.4% vs previous week</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Cart Additions
                            </span>
                            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                                <ShoppingCart className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            14,890
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>11.6% add-to-cart rate</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Completed Purchases
                            </span>
                            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                <CreditCard className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            1,428
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>9.6% checkout conversion</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Channels & Device Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Traffic Channels */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Traffic Acquisition Sources</CardTitle>
                        <CardDescription>Customer session breakdown by inbound channel</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { channel: 'Direct / Bookmarks', share: '42%', color: 'bg-indigo-600' },
                            { channel: 'Organic Search (Google)', share: '31%', color: 'bg-purple-600' },
                            { channel: 'Social Media (Instagram/TikTok)', share: '18%', color: 'bg-pink-500' },
                            { channel: 'Referral & Affiliates', share: '9%', color: 'bg-emerald-500' },
                        ].map((ch) => (
                            <div key={ch.channel} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-slate-700 dark:text-slate-300">{ch.channel}</span>
                                    <span className="text-slate-900 dark:text-white font-mono font-bold">{ch.share}</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 flex flex-col items-center justify-center text-center">
                                <Smartphone className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-2" />
                                <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">68.4%</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mobile Devices</span>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 flex flex-col items-center justify-center text-center">
                                <Laptop className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
                                <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">31.6%</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Desktop &amp; Tablet</span>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2.5">
                            <Compass className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                                Mobile storefront conversion rate rose by <strong>+18%</strong> after responsive navigation refinements.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}

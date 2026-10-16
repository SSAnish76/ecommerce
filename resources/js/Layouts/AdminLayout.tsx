import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '../Components/Sidebar';
import Navbar from '../Components/Navbar';
import { PageProps } from '../types';
import { CheckCircle2, AlertCircle, X, Info, AlertTriangle } from 'lucide-react';
import { ThemeProvider } from '../Contexts/ThemeContext';

interface AdminLayoutProps {
    children: React.ReactNode;
    title?: string;
    breadcrumbs?: { label: string; href?: string }[];
}

function AdminLayoutInner({ children, title, breadcrumbs }: AdminLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { flash, app_name, store } = usePage<PageProps>().props;
    const [dismissFlash, setDismissFlash] = useState(false);
    const appName = store?.name || app_name || 'E-Commerce';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
            {/* Sidebar component */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main content wrapper shifted on desktop for fixed sidebar */}
            <div className="lg:pl-72 flex flex-col flex-1 min-h-screen">
                {/* Navbar */}
                <Navbar
                    onMenuClick={() => setSidebarOpen(true)}
                    title={title}
                    breadcrumbs={breadcrumbs}
                />

                {/* Flash Messages */}
                {flash?.success && !dismissFlash && (
                    <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex items-center justify-between shadow-2xs animate-in fade-in">
                        <div className="flex items-center gap-3 min-w-0">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-xs sm:text-sm font-semibold truncate">{flash.success}</span>
                        </div>
                        <button
                            onClick={() => setDismissFlash(true)}
                            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                            aria-label="Close message"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {flash?.error && !dismissFlash && (
                    <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 flex items-center justify-between shadow-2xs animate-in fade-in">
                        <div className="flex items-center gap-3 min-w-0">
                            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span className="text-xs sm:text-sm font-semibold truncate">{flash.error}</span>
                        </div>
                        <button
                            onClick={() => setDismissFlash(true)}
                            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-950 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                            aria-label="Close message"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {flash?.message && !dismissFlash && (
                    <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/30 text-indigo-900 dark:text-indigo-200 flex items-center justify-between shadow-2xs animate-in fade-in">
                        <div className="flex items-center gap-3 min-w-0">
                            <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span className="text-xs sm:text-sm font-semibold truncate">{flash.message}</span>
                        </div>
                        <button
                            onClick={() => setDismissFlash(true)}
                            className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400 hover:text-indigo-950 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                            aria-label="Close message"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Page content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
                    {children}
                </main>

                {/* Footer */}
                <footer className="px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-200/80 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 text-center sm:flex sm:items-center sm:justify-between text-xs text-slate-500 dark:text-slate-400 transition-colors">
                    <p>© {new Date().getFullYear()} {appName}. All rights reserved.</p>
                    <div className="flex items-center justify-center gap-3 mt-2 sm:mt-0 font-medium">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            System Operational
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span>v2.4.0</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default function AdminLayout(props: AdminLayoutProps) {
    return (
        <ThemeProvider>
            <AdminLayoutInner {...props} />
        </ThemeProvider>
    );
}

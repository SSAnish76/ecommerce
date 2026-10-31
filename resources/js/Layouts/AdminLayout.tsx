import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '../Components/Sidebar';
import Navbar from '../Components/Navbar';
import MobileNav from '../Components/MobileNav';
import { PageProps } from '../types';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
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
        <div className="min-h-[100dvh] bg-[var(--admin-bg)] text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-[var(--admin-primary)] selection:text-white transition-colors duration-200">
            {/* Desktop Sidebar & Mobile Bottom-Sheet Drawer */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main content wrapper shifted on desktop for fixed sidebar */}
            <div className="lg:pl-72 flex flex-col flex-1 min-h-[100dvh]">
                {/* Navbar / Mobile Top App Bar */}
                <Navbar
                    onMenuClick={() => setSidebarOpen(true)}
                    title={title}
                    breadcrumbs={breadcrumbs}
                />

                {/* Flash Messages with Modern Token Styles */}
                {flash?.success && !dismissFlash && (
                    <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="p-1 rounded-xl bg-emerald-500 text-white shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                            </span>
                            <span className="text-xs sm:text-sm font-semibold truncate">{flash.success}</span>
                        </div>
                        <button
                            onClick={() => setDismissFlash(true)}
                            className="p-1.5 hover:bg-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer shrink-0"
                            aria-label="Close message"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {flash?.error && !dismissFlash && (
                    <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-950 dark:text-rose-200 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="p-1 rounded-xl bg-rose-500 text-white shrink-0">
                                <AlertCircle className="w-4 h-4" />
                            </span>
                            <span className="text-xs sm:text-sm font-semibold truncate">{flash.error}</span>
                        </div>
                        <button
                            onClick={() => setDismissFlash(true)}
                            className="p-1.5 hover:bg-rose-500/20 rounded-xl text-rose-700 dark:text-rose-300 transition-colors cursor-pointer shrink-0"
                            aria-label="Close message"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {flash?.message && !dismissFlash && (
                    <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-4 rounded-3xl bg-[var(--admin-primary-subtle)] border border-[var(--admin-primary)]/20 text-slate-900 dark:text-white flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="p-1 rounded-xl bg-[var(--admin-primary)] text-white shrink-0">
                                <Info className="w-4 h-4" />
                            </span>
                            <span className="text-xs sm:text-sm font-semibold truncate">{flash.message}</span>
                        </div>
                        <button
                            onClick={() => setDismissFlash(true)}
                            className="p-1.5 hover:bg-[var(--admin-primary)]/10 rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                            aria-label="Close message"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Page Content: pb-28 on mobile gives ample breathing room above the fixed mobile bar */}
                <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto pb-28 lg:pb-8">
                    {children}
                </main>

                {/* Desktop Footer */}
                <footer className="hidden lg:flex px-6 lg:px-8 py-4 border-t border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 text-center sm:items-center sm:justify-between text-xs text-slate-500 dark:text-slate-400 transition-colors">
                    <p>© {new Date().getFullYear()} {appName}. All rights reserved.</p>
                    <div className="flex items-center justify-center gap-3 font-medium">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Operations Active
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span>Aura Admin v3.0</span>
                    </div>
                </footer>
            </div>

            {/* Mobile Native Bottom Navigation Bar */}
            <MobileNav
                onOpenMore={() => setSidebarOpen(true)}
                isMoreOpen={sidebarOpen}
            />
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

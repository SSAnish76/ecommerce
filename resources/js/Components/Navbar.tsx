import React, { useState } from 'react';
import { usePage, Link } from '@inertiajs/react';
import { Search, Bell, Sparkles, Sun, Moon, CheckCheck, X, Store as StoreIcon } from 'lucide-react';
import { useTheme } from '../Contexts/ThemeContext';
import { PageProps } from '../types';
import UserMenuDropdown from './UserMenuDropdown';

interface NavbarProps {
    onMenuClick: () => void;
    title?: string;
    breadcrumbs?: { label: string; href?: string }[];
}

export default function Navbar({ onMenuClick, title = 'Overview', breadcrumbs }: NavbarProps) {
    const { app_name, store, auth } = usePage<PageProps>().props;
    const appName = store?.name || app_name || 'E-Commerce';
    const { theme, toggleTheme } = useTheme();
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'Store system backup completed', time: '12m ago', unread: true },
        { id: 2, title: 'Security policy settings updated', time: '1h ago', unread: true },
        { id: 3, title: 'Payment gateway sync healthy', time: '4h ago', unread: false },
    ]);

    const unreadCount = notifications.filter((n) => n.unread).length;

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    };

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between h-15 sm:h-16 px-4 sm:px-6 lg:px-8 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 transition-colors duration-200">
            {/* Left section: App Brand on Mobile / Breadcrumbs on Desktop */}
            <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Brand Icon */}
                <div className="lg:hidden flex items-center gap-2.5 min-w-0">
                    <Link href="/admin" className="flex items-center justify-center w-8 h-8 rounded-xl bg-linear-to-tr from-[var(--admin-primary)] to-indigo-700 text-white shadow-xs shrink-0">
                        <StoreIcon className="w-4 h-4" />
                    </Link>
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
                            {title}
                        </h1>
                        <span className="text-[10px] text-slate-400 font-medium truncate -mt-0.5">
                            {appName}
                        </span>
                    </div>
                </div>

                {/* Desktop Breadcrumbs & Title */}
                <div className="hidden lg:flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--admin-primary)] shrink-0">
                        {appName}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 font-bold shrink-0">/</span>
                    <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                        {title}
                    </h1>
                </div>
            </div>

            {/* Right section: Search, Theme Toggle, Notifications, User Menu */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
                {/* Search Bar - Desktop */}
                <div className="relative hidden md:block w-52 lg:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search products, orders..."
                        className="w-full pl-9 pr-8 py-2 bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)] transition-all shadow-2xs"
                    />
                    <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-md">
                        /
                    </kbd>
                </div>

                {/* Search Trigger - Mobile */}
                <button
                    type="button"
                    onClick={() => setSearchOpen(!searchOpen)}
                    className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/70 rounded-2xl transition-all cursor-pointer tap-bounce"
                    aria-label="Search"
                >
                    <Search className="w-4 h-4" />
                </button>

                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-2xl transition-all shadow-2xs cursor-pointer group tap-bounce"
                    title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
                    ) : (
                        <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 group-hover:-rotate-12" />
                    )}
                </button>

                {/* Notifications Button */}
                <div className="relative">
                    <button
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-2xl transition-all shadow-2xs cursor-pointer tap-bounce"
                        aria-label="Notifications"
                        title="Recent Notifications"
                    >
                        <Bell className="w-4 h-4" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[var(--admin-primary)] rounded-full ring-2 ring-white dark:ring-slate-900" />
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {notificationsOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-30"
                                onClick={() => setNotificationsOpen(false)}
                                aria-hidden="true"
                            />
                            <div className="absolute right-0 mt-2 w-80 sm:w-88 z-40 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-2xl p-4 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                            Notifications
                                        </h3>
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] rounded-full">
                                            {unreadCount} new
                                        </span>
                                    </div>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs text-[var(--admin-primary)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                        >
                                            <CheckCheck className="w-3.5 h-3.5" />
                                            <span>Mark read</span>
                                        </button>
                                    )}
                                </div>

                                <div className="divide-y divide-slate-100 dark:divide-white/5 mt-1 max-h-72 overflow-y-auto">
                                    {notifications.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`py-3 px-2 rounded-2xl flex items-start gap-3 transition-colors ${
                                                item.unread
                                                    ? 'bg-[var(--admin-primary-subtle)]'
                                                    : 'hover:bg-slate-50 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="p-1.5 rounded-xl bg-[var(--admin-primary)] text-white mt-0.5 shrink-0 shadow-xs">
                                                <Sparkles className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                    {item.title}
                                                </p>
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                                    {item.time}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* User Dropdown */}
                <UserMenuDropdown />
            </div>

            {/* Mobile Expandable Search Drawer */}
            {searchOpen && (
                <div className="md:hidden absolute inset-x-0 top-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 p-3 shadow-lg z-30 animate-in slide-in-from-top-2 duration-150">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search orders, products, customers..."
                            className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                        />
                        <button
                            onClick={() => setSearchOpen(false)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}

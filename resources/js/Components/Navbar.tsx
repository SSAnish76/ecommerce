import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Menu, Search, Bell, Sparkles, Sun, Moon, CheckCheck } from 'lucide-react';
import { useTheme } from '../Contexts/ThemeContext';
import { PageProps } from '../types';
import UserMenuDropdown from './UserMenuDropdown';

interface NavbarProps {
    onMenuClick: () => void;
    title?: string;
    breadcrumbs?: { label: string; href?: string }[];
}

export default function Navbar({ onMenuClick, title = 'Overview', breadcrumbs }: NavbarProps) {
    const { app_name, store } = usePage<PageProps>().props;
    const appName = store?.name || app_name || 'E-Commerce';
    const { theme, toggleTheme } = useTheme();
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
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 transition-colors duration-200">
            {/* Left section: Mobile Hamburger & Page Title */}
            <div className="flex items-center gap-3.5 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors cursor-pointer shrink-0"
                    aria-label="Open navigation menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 min-w-0">
                    <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 shrink-0">
                        {appName}
                    </span>
                    <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700 font-bold shrink-0">/</span>
                    <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                        {title}
                    </h1>
                </div>
            </div>

            {/* Right section: Search & Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Search input preview */}
                <div className="relative hidden md:block w-56 lg:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Quick search... (Press /)"
                        className="w-full pl-9 pr-8 py-1.5 bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all shadow-2xs"
                    />
                    <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
                        /
                    </kbd>
                </div>

                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-xl transition-all shadow-2xs cursor-pointer group"
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
                        className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-xl transition-all shadow-2xs cursor-pointer"
                        aria-label="Notifications"
                        title="Recent Notifications"
                    >
                        <Bell className="w-4 h-4" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 dark:bg-indigo-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
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
                            <div className="absolute right-0 mt-2 w-80 sm:w-88 z-40 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl p-4 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                            Notifications
                                        </h3>
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 rounded-full">
                                            {unreadCount} new
                                        </span>
                                    </div>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                                        >
                                            <CheckCheck className="w-3.5 h-3.5" />
                                            <span>Mark read</span>
                                        </button>
                                    )}
                                </div>

                                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 mt-1 max-h-72 overflow-y-auto">
                                    {notifications.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`py-3 px-2 rounded-xl flex items-start gap-3 transition-colors ${
                                                item.unread
                                                    ? 'bg-indigo-50/50 dark:bg-indigo-950/30'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                            }`}
                                        >
                                            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0">
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

                {/* Account Menu */}
                <UserMenuDropdown align="bottom-right" />
            </div>
        </header>
    );
}

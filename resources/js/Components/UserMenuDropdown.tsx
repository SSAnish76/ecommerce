import React, { useState, useEffect, useRef } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    MoreVertical,
    User as UserIcon,
    KeyRound,
    ShieldCheck,
    LogOut,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import { PageProps } from '../types';

interface UserMenuDropdownProps {
    align?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
    buttonClassName?: string;
}

export default function UserMenuDropdown({
    align = 'bottom-right',
    buttonClassName = '',
}: UserMenuDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { props } = usePage<PageProps>();
    const user = props.auth?.user;
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const getInitials = (name?: string) => {
        if (!name) return 'AU';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Position mapping
    const getDropdownPositionClasses = () => {
        switch (align) {
            case 'top-right':
                return 'bottom-full right-0 mb-2.5';
            case 'top-left':
                return 'bottom-full left-0 mb-2.5';
            case 'bottom-left':
                return 'top-full left-0 mt-2.5';
            case 'bottom-right':
            default:
                return 'top-full right-0 mt-2.5';
        }
    };

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            {/* 3-Dot Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label="Account Settings Menu"
                title="Account Settings (Profile, Password, 2FA)"
                className={
                    buttonClassName ||
                    `p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/90 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 rounded-xl transition-all shadow-xs cursor-pointer ${
                        isOpen ? 'ring-2 ring-indigo-500/25 border-indigo-500' : ''
                    }`
                }
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {/* Backdrop for click outside */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Menu Popover */}
            {isOpen && (
                <div
                    className={`absolute z-50 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-900/15 dark:shadow-black/60 p-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${getDropdownPositionClasses()}`}
                >
                    {/* User Profile Header */}
                    <div className="p-3 mb-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                                {getInitials(user?.name)}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {user?.name || 'Administrator'}
                                </p>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {user?.email || 'admin@store.com'}
                            </p>
                            <div className="mt-1 flex items-center gap-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20">
                                    {user?.role || (user?.is_super_admin ? 'Super Admin' : 'Admin')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items List */}
                    <div className="space-y-1">
                        {/* 1. Profile Update */}
                        <Link
                            href="/admin/profile#section-profile"
                            onClick={() => setIsOpen(false)}
                            className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                                    <UserIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        Profile Details
                                    </span>
                                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                        Update name &amp; email
                                    </span>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        {/* 2. Change Password */}
                        <Link
                            href="/admin/profile#section-password"
                            onClick={() => setIsOpen(false)}
                            className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                                    <KeyRound className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        Change Password
                                    </span>
                                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                        Update master login key
                                    </span>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        {/* 3. Two-Factor Authentication (inside profile) */}
                        <Link
                            href="/admin/profile#section-two-factor"
                            onClick={() => setIsOpen(false)}
                            className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        Two-Factor Auth (2FA)
                                    </span>
                                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                        TOTP app authentication
                                    </span>
                                </div>
                            </div>
                            <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    Boolean(user?.is_2fa)
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                                }`}
                            >
                                {user?.is_2fa ? 'Active' : 'Not Set'}
                            </span>
                        </Link>
                    </div>

                    {/* Divider */}
                    <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

                    {/* Sign Out Option */}
                    <Link
                        href="/admin/logout"
                        method="post"
                        as="button"
                        onClick={() => setIsOpen(false)}
                        className="w-full group flex items-center justify-between p-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                                <LogOut className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 text-left">
                                <span className="block text-xs font-bold text-rose-700 dark:text-rose-300">
                                    Sign Out
                                </span>
                                <span className="block text-[10px] text-rose-500/80 dark:text-rose-400/80">
                                    End current session
                                </span>
                            </div>
                        </div>
                        <span className="text-[10px] font-semibold text-rose-400 group-hover:translate-x-0.5 transition-transform">
                            →
                        </span>
                    </Link>
                </div>
            )}
        </div>
    );
}

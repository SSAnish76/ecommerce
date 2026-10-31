import React, { useState, useEffect, useRef } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    MoreVertical,
    User as UserIcon,
    KeyRound,
    ShieldCheck,
    LogOut,
    ChevronRight,
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
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label="Account Settings Menu"
                className={
                    buttonClassName ||
                    `p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-2xl transition-all shadow-xs cursor-pointer tap-bounce ${
                        isOpen ? 'ring-2 ring-[var(--admin-primary)]/30 border-[var(--admin-primary)]' : ''
                    }`
                }
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {isOpen && (
                <div
                    className={`absolute z-50 w-72 sm:w-80 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-2xl p-2.5 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ${getDropdownPositionClasses()}`}
                >
                    {/* User Profile Header */}
                    <div className="p-3 mb-1.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                        <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-[var(--admin-primary)] to-indigo-700 flex items-center justify-center text-white font-bold text-xs shadow-xs">
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
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] border border-[var(--admin-primary)]/20">
                                    {user?.role || (user?.is_super_admin ? 'Super Admin' : 'Admin')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items List */}
                    <div className="space-y-1">
                        <Link
                            href="/admin/profile#section-profile"
                            onClick={() => setIsOpen(false)}
                            className="group flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer tap-bounce"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-xl bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] group-hover:scale-105 transition-transform">
                                    <UserIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[var(--admin-primary)] transition-colors">
                                        Profile Details
                                    </span>
                                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                        Update name &amp; email
                                    </span>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[var(--admin-primary)] group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        <Link
                            href="/admin/profile#section-password"
                            onClick={() => setIsOpen(false)}
                            className="group flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer tap-bounce"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                                    <KeyRound className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        Change Password
                                    </span>
                                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                        Update master login key
                                    </span>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        <Link
                            href="/admin/profile#section-two-factor"
                            onClick={() => setIsOpen(false)}
                            className="group flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer tap-bounce"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
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
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                                }`}
                            >
                                {user?.is_2fa ? 'Active' : 'Not Set'}
                            </span>
                        </Link>
                    </div>

                    <div className="my-1.5 border-t border-slate-100 dark:border-white/5" />

                    <Link
                        href="/admin/logout"
                        method="post"
                        as="button"
                        onClick={() => setIsOpen(false)}
                        className="w-full group flex items-center justify-between p-2.5 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer tap-bounce"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
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
                        <span className="text-xs font-bold text-rose-400 group-hover:translate-x-0.5 transition-transform">
                            →
                        </span>
                    </Link>
                </div>
            )}
        </div>
    );
}

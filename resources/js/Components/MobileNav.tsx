import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, ShoppingBag, Boxes, Users, Menu, Sparkles } from 'lucide-react';
import { PageProps } from '../types';

interface MobileNavProps {
    onOpenMore: () => void;
    isMoreOpen: boolean;
}

export default function MobileNav({ onOpenMore, isMoreOpen }: MobileNavProps) {
    const { url } = usePage<PageProps>();

    const isActive = (href: string) => {
        if (!href) return false;
        if (href === '/admin') {
            return url === '/admin' || url === '/admin/';
        }
        return url.startsWith(href);
    };

    const navItems = [
        {
            name: 'Home',
            href: '/admin',
            icon: LayoutDashboard,
            active: isActive('/admin'),
        },
        {
            name: 'Orders',
            href: '/admin/orders',
            icon: ShoppingBag,
            active: isActive('/admin/orders'),
        },
        {
            name: 'Products',
            href: '/admin/products',
            icon: Boxes,
            active: isActive('/admin/products'),
        },
        {
            name: 'Customers',
            href: '/admin/customers',
            icon: Users,
            active: isActive('/admin/customers'),
        },
    ];

    return (
        <nav
            aria-label="Mobile Navigation Bar"
            className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 pb-safe transition-all shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
        >
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 tap-bounce transition-colors relative select-none ${
                                item.active
                                    ? 'text-[var(--admin-primary)] font-semibold'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            {/* Active pill background glow */}
                            {item.active && (
                                <span className="absolute top-1 w-9 h-7 rounded-xl bg-[var(--admin-primary-subtle)] -z-10 animate-fade-in" />
                            )}

                            <div className="relative">
                                <Icon
                                    className={`w-5 h-5 transition-transform duration-150 ${
                                        item.active ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                                    }`}
                                />
                                {item.active && (
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--admin-primary)]" />
                                )}
                            </div>
                            <span className="text-[10px] tracking-tight mt-1 truncate max-w-[60px]">
                                {item.name}
                            </span>
                        </Link>
                    );
                })}

                {/* More / All Menus Trigger */}
                <button
                    type="button"
                    onClick={onOpenMore}
                    aria-label="Open More Menus"
                    className={`flex flex-col items-center justify-center flex-1 py-1 px-1 tap-bounce transition-colors relative select-none cursor-pointer ${
                        isMoreOpen
                            ? 'text-[var(--admin-primary)] font-semibold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    {isMoreOpen && (
                        <span className="absolute top-1 w-9 h-7 rounded-xl bg-[var(--admin-primary-subtle)] -z-10" />
                    )}
                    <div className="relative">
                        <Menu
                            className={`w-5 h-5 transition-transform duration-150 ${
                                isMoreOpen ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                            }`}
                        />
                    </div>
                    <span className="text-[10px] tracking-tight mt-1 truncate max-w-[60px]">
                        More
                    </span>
                </button>
            </div>
        </nav>
    );
}


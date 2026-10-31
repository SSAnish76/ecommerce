import React, { useState, useEffect, useMemo } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { PageProps, MenuItem } from '../types';
import { useNavigationMenus } from '../hooks/useNavigationMenus';
import { useTheme } from '../Contexts/ThemeContext';
import {
    LayoutDashboard,
    Users,
    Shield,
    BarChart3,
    Settings,
    Store as StoreIcon,
    ShieldCheck,
    LogOut,
    ChevronRight,
    ChevronDown,
    Sparkles,
    X,
    UserCheck,
    Search,
    ShoppingBag,
    FolderTree,
    Boxes,
    ShoppingCart,
    TicketPercent,
    Sliders,
    Layers,
    Sun,
    Moon,
    Palette,
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface NavTreeItem {
    slug: string;
    parent_slug?: string | null;
    name: string;
    description?: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    sort_order?: string;
    badge?: string;
    children: NavTreeItem[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    LayoutDashboard,
    BarChart3,
    ShoppingBag,
    FolderTree,
    Boxes,
    ShoppingCart,
    UserCheck,
    TicketPercent,
    Sliders,
    Layers,
    Users,
    Shield,
    Store: StoreIcon,
    Settings,
    ShieldCheck,
    Sparkles,
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { url, props } = usePage<PageProps>();
    const { menus: navMenus, isLoading } = useNavigationMenus();
    const { theme, toggleTheme, preset, setPreset, availablePresets } = useTheme();
    const user = props.auth?.user;
    const appName = props.store?.name || props.app_name || 'E-Commerce';
    const [navSearch, setNavSearch] = useState('');
    const [expandedSlugs, setExpandedSlugs] = useState<Record<string, boolean>>({});

    const isActive = (href: string) => {
        if (!href) return false;
        if (href === '/admin') {
            return url === '/admin' || url === '/admin/';
        }
        return url.startsWith(href);
    };

    const hasAccess = (slug?: string): boolean => {
        if (!user) return false;
        if (user.is_super_admin) return true;
        if (!slug) return true;
        return true;
    };

    // Build the hierarchical Parent-Child menu tree
    const menuTree: NavTreeItem[] = useMemo(() => {
        const rawMenus: MenuItem[] = (navMenus as MenuItem[]) || [];
        if (rawMenus.length === 0) return [];

        const itemsMap: Record<string, NavTreeItem> = {};

        for (const m of rawMenus) {
            const IconComponent = (m.icon && iconMap[m.icon]) || LayoutDashboard;
            itemsMap[m.slug] = {
                slug: m.slug,
                parent_slug: m.parent_slug,
                name: m.name,
                description: m.description,
                href: m.href,
                icon: IconComponent,
                sort_order: m.sort_order,
                children: [],
            };
        }

        const roots: NavTreeItem[] = [];

        for (const m of rawMenus) {
            const item = itemsMap[m.slug];
            if (m.parent_slug && itemsMap[m.parent_slug]) {
                itemsMap[m.parent_slug].children.push(item);
            } else if (!m.parent_slug) {
                roots.push(item);
            }
        }

        roots.sort((a, b) => (a.sort_order || '').localeCompare(b.sort_order || ''));
        for (const r of roots) {
            r.children.sort((a, b) => (a.sort_order || '').localeCompare(b.sort_order || ''));
        }

        return roots;
    }, [navMenus]);

    // Automatically expand parent if a child is active
    useEffect(() => {
        const initialExpanded: Record<string, boolean> = {};
        for (const root of menuTree) {
            if (root.children.length > 0) {
                const hasActiveChild = root.children.some((c) => isActive(c.href));
                if (hasActiveChild) {
                    initialExpanded[root.slug] = true;
                }
            }
        }
        setExpandedSlugs((prev) => ({ ...initialExpanded, ...prev }));
    }, [url, menuTree]);

    const toggleExpand = (slug: string) => {
        setExpandedSlugs((prev) => ({
            ...prev,
            [slug]: !prev[slug],
        }));
    };

    const getInitials = (name?: string) => {
        if (!name) return 'AU';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const filteredTree = useMemo(() => {
        if (!navSearch.trim()) return menuTree;
        const q = navSearch.toLowerCase().trim();

        return menuTree
            .map((parent) => {
                const matchesParent = parent.name.toLowerCase().includes(q);
                const matchingChildren = parent.children.filter((c) =>
                    c.name.toLowerCase().includes(q)
                );

                if (matchesParent || matchingChildren.length > 0) {
                    return {
                        ...parent,
                        children: matchingChildren.length > 0 ? matchingChildren : parent.children,
                    };
                }
                return null;
            })
            .filter(Boolean) as NavTreeItem[];
    }, [menuTree, navSearch]);

    // Render tree items
    const renderNavItems = () => {
        if (isLoading && filteredTree.length === 0) {
            return (
                <div className="space-y-2 p-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-10 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                    ))}
                </div>
            );
        }

        return filteredTree.map((root) => {
            const accessibleChildren = root.children.filter((child) => hasAccess(child.slug));
            const isRootAccessible = hasAccess(root.slug);
            const hasVisibleChildren = accessibleChildren.length > 0;

            if (!isRootAccessible && !hasVisibleChildren) return null;

            const isRootActive = isActive(root.href);
            const isExpanded = expandedSlugs[root.slug] ?? false;
            const RootIcon = root.icon;

            if (hasVisibleChildren) {
                const hasActiveChild = accessibleChildren.some((c) => isActive(c.href));

                return (
                    <div key={root.slug} className="space-y-1">
                        <button
                            type="button"
                            onClick={() => toggleExpand(root.slug)}
                            className={`group relative flex items-center justify-between w-full px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-150 select-none text-left cursor-pointer tap-bounce ${
                                hasActiveChild
                                    ? 'bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] font-bold'
                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/5'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className={`p-1.5 rounded-xl transition-colors ${
                                    hasActiveChild
                                        ? 'bg-[var(--admin-primary)] text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                                }`}>
                                    <RootIcon className="w-4 h-4 shrink-0" />
                                </span>
                                <span className="truncate">{root.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 transition-transform duration-200" />
                                )}
                            </div>
                        </button>

                        {isExpanded && (
                            <div className="pl-5 ml-4 my-1 space-y-1 border-l-2 border-[var(--admin-border)] transition-all">
                                {accessibleChildren.map((child) => {
                                    const childActive = isActive(child.href);
                                    const ChildIcon = child.icon;

                                    return (
                                        <Link
                                            key={child.slug}
                                            href={child.href}
                                            onClick={onClose}
                                            className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all tap-bounce ${
                                                childActive
                                                    ? 'text-[var(--admin-primary)] font-bold bg-[var(--admin-primary-subtle)]'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <ChildIcon
                                                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                                        childActive
                                                            ? 'text-[var(--admin-primary)]'
                                                            : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                                                    }`}
                                                />
                                                <span className="truncate">{child.name}</span>
                                            </div>

                                            {childActive && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-primary)] shadow-[0_0_6px_var(--admin-primary)]" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            }

            return (
                <Link
                    key={root.slug}
                    href={root.href}
                    onClick={onClose}
                    className={`group relative flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-150 select-none tap-bounce ${
                        isRootActive
                            ? 'bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/5'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <span className={`p-1.5 rounded-xl transition-colors ${
                            isRootActive
                                ? 'bg-[var(--admin-primary)] text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}>
                            <RootIcon className="w-4 h-4 shrink-0" />
                        </span>
                        <span className="truncate">{root.name}</span>
                    </div>

                    <ChevronRight
                        className={`w-3.5 h-3.5 transition-all ${
                            isRootActive
                                ? 'text-[var(--admin-primary)] opacity-100'
                                : 'text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
                        }`}
                    />
                </Link>
            );
        });
    };

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs lg:hidden animate-sheet-backdrop"
                    aria-hidden="true"
                />
            )}

            {/* Mobile Bottom-Sheet Drawer (< lg) */}
            <div
                className={`fixed inset-x-0 bottom-0 z-50 lg:hidden flex flex-col max-h-[88dvh] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-white/10 shadow-2xl transition-transform duration-300 ease-out pb-safe ${
                    isOpen ? 'translate-y-0 animate-sheet-up' : 'translate-y-full pointer-events-none'
                }`}
                aria-label="Mobile Navigation Sheet"
            >
                {/* Drag Handle Indicator */}
                <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto my-3 shrink-0" />

                {/* Mobile Sheet Header */}
                <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100 dark:border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-tr from-[var(--admin-primary)] to-indigo-700 text-white shadow-xs">
                            <StoreIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                                {appName}
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-[var(--admin-primary)]" />
                                Navigation &amp; Tools
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Quick Theme Token Customizer (Mobile Tweak Pill Bar) */}
                <div className="px-5 py-3 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-100 dark:border-white/5 shrink-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Theme:</span>
                        <div className="flex items-center gap-1.5 ml-1">
                            {Object.entries(availablePresets).map(([key, p]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setPreset(key)}
                                    title={p.name}
                                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                                        preset === key ? 'scale-115 ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                                    }`}
                                    style={{ backgroundColor: p.primary }}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="p-1.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 text-xs font-medium cursor-pointer"
                    >
                        {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-5 pt-3 pb-1 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={navSearch}
                            onChange={(e) => setNavSearch(e.target.value)}
                            placeholder="Search all admin sections..."
                            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                        />
                        {navSearch && (
                            <button
                                onClick={() => setNavSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Navigation Items (Scrollable) */}
                <div className="flex-1 px-4 py-3 overflow-y-auto space-y-1 scrollbar-thin">
                    {renderNavItems()}
                </div>

                {/* User Info Bar at Bottom of Sheet */}
                <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-950/60 shrink-0">
                    <div className="flex items-center justify-between p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <Link
                            href="/admin/profile"
                            onClick={onClose}
                            className="flex items-center gap-3 min-w-0"
                        >
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-tr from-[var(--admin-primary)] to-indigo-700 text-white font-bold text-xs shrink-0 shadow-xs">
                                {getInitials(user?.name)}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                    {user?.name || 'Administrator'}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate">
                                    {user?.email || 'admin@store.test'}
                                </span>
                            </div>
                        </Link>

                        <Link
                            href="/admin/logout"
                            method="post"
                            as="button"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Desktop Fixed Sidebar (>= lg) */}
            <aside
                className="hidden lg:flex fixed top-0 bottom-0 left-0 z-30 flex-col w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-white/10 transition-colors duration-200"
                aria-label="Admin Navigation Sidebar"
            >
                {/* Brand Header */}
                <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200/80 dark:border-white/10 shrink-0">
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 group focus:outline-none"
                    >
                        <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-linear-to-tr from-[var(--admin-primary)] to-indigo-700 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                            <StoreIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                                {appName}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-[var(--admin-primary)]" />
                                Admin Console
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Quick Theme Preset Bar on Desktop */}
                <div className="px-5 py-2.5 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between shrink-0">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Accent:</span>
                    <div className="flex items-center gap-1.5">
                        {Object.entries(availablePresets).map(([key, p]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setPreset(key)}
                                title={p.name}
                                className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                                    preset === key ? 'scale-125 ring-2 ring-offset-1 ring-slate-800 dark:ring-white dark:ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: p.primary }}
                            />
                        ))}
                    </div>
                </div>

                {/* Search Filter in Sidebar */}
                <div className="px-4 pt-3 pb-1 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={navSearch}
                            onChange={(e) => setNavSearch(e.target.value)}
                            placeholder="Filter menus..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                        />
                        {navSearch && (
                            <button
                                onClick={() => setNavSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Nav Items Scrollable */}
                <div className="flex-1 px-3 py-3 overflow-y-auto space-y-1 scrollbar-thin">
                    {renderNavItems()}
                </div>

                {/* Footer User Profile & Logout */}
                <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-950/40 shrink-0">
                    <div className="flex items-center justify-between p-2 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <Link
                            href="/admin/profile"
                            className="flex items-center gap-2.5 min-w-0 group"
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-linear-to-tr from-[var(--admin-primary)] to-indigo-700 text-white font-bold text-xs shrink-0 shadow-xs">
                                {getInitials(user?.name)}
                            </div>
                            <div className="flex flex-col min-w-0 text-left">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-[var(--admin-primary)] transition-colors">
                                    {user?.name || 'Administrator'}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate">
                                    {user?.role_name || user?.role || 'Super Admin'}
                                </span>
                            </div>
                        </Link>

                        <Link
                            href="/admin/logout"
                            method="post"
                            as="button"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    );
}

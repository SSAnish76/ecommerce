import React, { useState, useEffect, useMemo } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { PageProps, MenuItem } from '../types';
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
    Users,
    Shield,
    Store: StoreIcon,
    Settings,
    ShieldCheck,
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { url, props } = usePage<PageProps>();
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
        if (slug && user.allowed_menus && user.allowed_menus.length > 0) {
            return user.allowed_menus.includes(slug);
        }
        return true;
    };

    // Build the hierarchical Parent-Child menu tree
    const menuTree: NavTreeItem[] = useMemo(() => {
        const rawMenus: MenuItem[] = props.navigation_menus || [];
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

        // Sort roots and their children by sort_order
        roots.sort((a, b) => (a.sort_order || '').localeCompare(b.sort_order || ''));
        for (const r of roots) {
            r.children.sort((a, b) => (a.sort_order || '').localeCompare(b.sort_order || ''));
        }

        return roots;
    }, [props.navigation_menus]);

    // Automatically expand any parent if a child is active
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

    // Filter tree by search if provided
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

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity duration-200"
                    aria-hidden="true"
                />
            )}

            {/* Sidebar container */}
            <aside
                className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
                    isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
                }`}
                aria-label="Admin Navigation"
            >
                {/* Header Brand */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
                    <Link
                        href="/admin"
                        onClick={onClose}
                        className="flex items-center gap-3 group focus:outline-hidden"
                    >
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                            <StoreIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                                {appName}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-indigo-500" />
                                Admin Console
                            </span>
                        </div>
                    </Link>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Optional Search filter inside Sidebar */}
                <div className="px-3 pt-3 pb-1 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={navSearch}
                            onChange={(e) => setNavSearch(e.target.value)}
                            placeholder="Filter menus..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                        {navSearch && (
                            <button
                                onClick={() => setNavSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Hierarchical Parent-Child Navigation */}
                <div className="flex-1 px-3 py-3 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {filteredTree.map((root) => {
                        const accessibleChildren = root.children.filter((child) => hasAccess(child.slug));
                        const isRootAccessible = hasAccess(root.slug);
                        const hasVisibleChildren = accessibleChildren.length > 0;

                        // If neither root nor any children are accessible, don't show
                        if (!isRootAccessible && !hasVisibleChildren) return null;

                        const isRootActive = isActive(root.href);
                        const isExpanded = expandedSlugs[root.slug] ?? false;
                        const RootIcon = root.icon;

                        // Case A: Root has Children -> Expandable Parent Item
                        if (hasVisibleChildren) {
                            const hasActiveChild = accessibleChildren.some((c) => isActive(c.href));

                            return (
                                <div key={root.slug} className="space-y-0.5">
                                    <button
                                        type="button"
                                        onClick={() => toggleExpand(root.slug)}
                                        className={`group relative flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 select-none text-left ${
                                            hasActiveChild
                                                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <RootIcon
                                                className={`w-4 h-4 shrink-0 transition-colors ${
                                                    hasActiveChild
                                                        ? 'text-indigo-600 dark:text-indigo-400'
                                                        : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                                                }`}
                                            />
                                            <span className="truncate">{root.name}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                                            {isExpanded ? (
                                                <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                                            ) : (
                                                <ChevronRight className="w-3.5 h-3.5 transition-transform" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Nested Children */}
                                    {isExpanded && (
                                        <div className="pl-6 ml-4 my-0.5 space-y-0.5 border-l-2 border-indigo-100 dark:border-indigo-950/70 transition-all">
                                            {accessibleChildren.map((child) => {
                                                const childActive = isActive(child.href);
                                                const ChildIcon = child.icon;

                                                return (
                                                    <Link
                                                        key={child.slug}
                                                        href={child.href}
                                                        onClick={onClose}
                                                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                            childActive
                                                                ? 'text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-950/60 shadow-2xs'
                                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <ChildIcon
                                                                className={`w-3.5 h-3.5 shrink-0 ${
                                                                    childActive
                                                                        ? 'text-indigo-600 dark:text-indigo-400'
                                                                        : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                                                                }`}
                                                            />
                                                            <span className="truncate">{child.name}</span>
                                                        </div>

                                                        {childActive && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                                        )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Case B: Root has NO children -> Direct Nav Link (e.g. Dashboard)
                        return (
                            <Link
                                key={root.slug}
                                href={root.href}
                                onClick={onClose}
                                className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 select-none ${
                                    isRootActive
                                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                                }`}
                            >
                                {isRootActive && (
                                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-indigo-600 dark:bg-indigo-400" />
                                )}

                                <div className="flex items-center gap-2.5 min-w-0">
                                    <RootIcon
                                        className={`w-4 h-4 shrink-0 transition-colors ${
                                            isRootActive
                                                ? 'text-indigo-600 dark:text-indigo-400'
                                                : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                                        }`}
                                    />
                                    <span className="truncate">{root.name}</span>
                                </div>

                                <ChevronRight
                                    className={`w-3.5 h-3.5 transition-all ${
                                        isRootActive
                                            ? 'text-indigo-600 dark:text-indigo-400 opacity-100'
                                            : 'text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
                                    }`}
                                />
                            </Link>
                        );
                    })}
                </div>

                {/* Footer User Info & Logout */}
                <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                        <Link
                            href="/admin/profile"
                            onClick={onClose}
                            className="flex items-center gap-2.5 min-w-0 group"
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-indigo-700 text-white font-bold text-xs shrink-0 shadow-xs">
                                {getInitials(user?.name)}
                            </div>
                            <div className="flex flex-col min-w-0 text-left">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {user?.name || 'Administrator'}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate">
                                    {user?.role_name || user?.role || 'Staff'}
                                </span>
                            </div>
                        </Link>

                        <Link
                            href="/admin/logout"
                            method="post"
                            as="button"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Sign out"
                            aria-label="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    );
}

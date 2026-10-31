import React from 'react';
import { cn } from '../../lib/utils';
import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export interface PageHeaderProps {
    title: string;
    description?: string;
    badge?: React.ReactNode;
    icon?: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    action?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    description,
    badge,
    icon,
    breadcrumbs,
    action,
    actions,
    className,
}) => {
    const renderActions = actions || action;
    return (
        <div className={cn('space-y-3 mb-6', className)}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto scrollbar-none py-0.5">
                    {breadcrumbs.map((item, index) => {
                        const isLast = index === breadcrumbs.length - 1;
                        return (
                            <React.Fragment key={item.label}>
                                {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                {item.href && !isLast ? (
                                    <Link
                                        href={item.href}
                                        className="hover:text-slate-900 dark:hover:text-white transition-colors truncate max-w-[120px] sm:max-w-none"
                                    >
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span className={isLast ? 'font-bold text-slate-800 dark:text-slate-200 truncate' : ''}>
                                        {item.label}
                                    </span>
                                )}
                            </React.Fragment>
                        );
                    })}
                </nav>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {icon && <span className="p-1.5 rounded-xl bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] shrink-0">{icon}</span>}
                        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                            {title}
                        </h1>
                        {badge && <div>{badge}</div>}
                    </div>
                    {description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>

                {renderActions && (
                    <div className="flex items-center gap-2 flex-wrap shrink-0 pt-1 sm:pt-0">
                        {renderActions}
                    </div>
                )}
            </div>
        </div>
    );
};

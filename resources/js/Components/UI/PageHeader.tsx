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
                <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {breadcrumbs.map((item, index) => {
                        const isLast = index === breadcrumbs.length - 1;
                        return (
                            <React.Fragment key={item.label}>
                                {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                {item.href && !isLast ? (
                                    <Link
                                        href={item.href}
                                        className="hover:text-slate-900 dark:hover:text-white transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span className={isLast ? 'font-semibold text-slate-800 dark:text-slate-200' : ''}>
                                        {item.label}
                                    </span>
                                )}
                            </React.Fragment>
                        );
                    })}
                </nav>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {icon && <span className="shrink-0">{icon}</span>}
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {title}
                        </h1>
                        {badge && <div>{badge}</div>}
                    </div>
                    {description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                            {description}
                        </p>
                    )}
                </div>

                {renderActions && <div className="flex items-center gap-2.5 flex-wrap shrink-0">{renderActions}</div>}
            </div>
        </div>
    );
};

import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
    icon?: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    action,
    className,
}) => {
    return (
        <div
            className={cn(
                'py-12 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto',
                className
            )}
        >
            {Icon && (
                <div className="w-14 h-14 rounded-3xl bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] border border-[var(--admin-primary)]/20 flex items-center justify-center mb-4 shadow-sm shadow-indigo-500/10">
                    {React.isValidElement(Icon) ? (
                        Icon
                    ) : typeof Icon === 'function' ? (
                        <Icon className="w-6 h-6 stroke-[2]" />
                    ) : null}
                </div>
            )}
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                {title}
            </h4>
            {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-sm">
                    {description}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
};

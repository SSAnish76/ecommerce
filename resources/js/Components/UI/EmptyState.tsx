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
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center mb-4 shadow-2xs">
                    {React.isValidElement(Icon) ? (
                        Icon
                    ) : typeof Icon === 'function' ? (
                        <Icon className="w-6 h-6" />
                    ) : null}
                </div>
            )}
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
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

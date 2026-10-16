import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'indigo' | 'purple' | 'emerald' | 'amber' | 'rose' | 'sky';
    size?: 'sm' | 'md';
    dot?: boolean;
    icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'sm',
    dot = false,
    icon,
    className,
    ...props
}) => {
    const variants = {
        default:
            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        indigo:
            'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60',
        purple:
            'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60',
        emerald:
            'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
        amber:
            'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
        rose:
            'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
        sky:
            'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60',
    };

    const dotColors = {
        default: 'bg-slate-500',
        indigo: 'bg-indigo-500',
        purple: 'bg-purple-500',
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500',
        sky: 'bg-sky-500',
    };

    const sizes = {
        sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-semibold rounded-md',
        md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold rounded-lg',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center border select-none transition-colors leading-none',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
            {icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
        </span>
    );
};

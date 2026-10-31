import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?:
        | 'default'
        | 'indigo'
        | 'purple'
        | 'emerald'
        | 'amber'
        | 'rose'
        | 'sky'
        | 'neutral'
        | 'success'
        | 'warning'
        | 'danger'
        | 'secondary'
        | 'primary';
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
    type CoreVariant = 'default' | 'indigo' | 'purple' | 'emerald' | 'amber' | 'rose' | 'sky';
    const resolvedVariant: CoreVariant =
        variant === 'neutral' || variant === 'secondary' || !variant
            ? 'default'
            : variant === 'success'
              ? 'emerald'
              : variant === 'warning'
                ? 'amber'
                : variant === 'danger'
                  ? 'rose'
                  : variant === 'primary'
                    ? 'indigo'
                    : variant;

    const variants: Record<CoreVariant, string> = {
        default:
            'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10',
        indigo:
            'bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] border-[var(--admin-primary)]/20',
        purple:
            'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
        emerald:
            'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        amber:
            'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
        rose:
            'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
        sky:
            'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    };

    const dotColors: Record<CoreVariant, string> = {
        default: 'bg-slate-400',
        indigo: 'bg-[var(--admin-primary)]',
        purple: 'bg-purple-500',
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500',
        sky: 'bg-sky-500',
    };

    const sizes = {
        sm: 'text-[11px] px-2.5 py-0.5 gap-1.5 font-semibold rounded-full',
        md: 'text-xs px-3 py-1 gap-1.5 font-bold rounded-full',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center border select-none transition-colors leading-none tracking-tight',
                variants[resolvedVariant],
                sizes[size],
                className
            )}
            {...props}
        >
            {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[resolvedVariant])} />}
            {icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
        </span>
    );
};

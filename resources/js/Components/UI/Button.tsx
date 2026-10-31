import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success' | 'soft';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    pill?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            pill = false,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        const variants = {
            primary:
                'bg-[var(--admin-primary)] hover:bg-[var(--admin-primary-hover)] active:bg-[var(--admin-primary-active)] text-white shadow-xs shadow-indigo-600/20 border border-transparent focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]/40',
            secondary:
                'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:active:bg-white/20 dark:text-slate-100 border border-transparent focus-visible:ring-2 focus-visible:ring-slate-400/30',
            outline:
                'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-white/10 shadow-2xs focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]/30',
            soft:
                'bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] hover:bg-[var(--admin-primary)]/15 active:bg-[var(--admin-primary)]/20 border border-transparent focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]/30 font-bold',
            danger:
                'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs shadow-rose-600/20 border border-transparent focus-visible:ring-2 focus-visible:ring-rose-500/30',
            ghost:
                'bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent focus-visible:ring-2 focus-visible:ring-slate-400/20',
            success:
                'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs shadow-emerald-600/20 border border-transparent focus-visible:ring-2 focus-visible:ring-emerald-500/30',
        };

        const sizes = {
            xs: 'h-8 px-2.5 text-xs rounded-xl gap-1.5 font-medium',
            sm: 'h-9 px-3.5 text-xs rounded-xl gap-1.5 font-semibold',
            md: 'h-11 sm:h-10 px-4 py-2 text-xs sm:text-sm rounded-2xl gap-2 font-semibold', // min 44px touch on mobile
            lg: 'h-12 px-5 py-2.5 text-sm sm:text-base rounded-2xl gap-2.5 font-semibold',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    'inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus:outline-none tap-bounce active:scale-[0.97]',
                    variants[variant],
                    sizes[size],
                    pill && 'rounded-full px-5',
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                    leftIcon && <span className="shrink-0 inline-flex items-center">{leftIcon}</span>
                )}
                {typeof children === 'string' ? (
                    <span className="truncate">{children}</span>
                ) : (
                    <span className="inline-flex items-center gap-1.5">{children}</span>
                )}
                {!isLoading && rightIcon && <span className="shrink-0 inline-flex items-center">{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = 'Button';

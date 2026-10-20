import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
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
                'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs shadow-indigo-600/20 border border-transparent focus-visible:ring-indigo-500/30',
            secondary:
                'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 dark:text-slate-100 border border-transparent focus-visible:ring-slate-500/20',
            outline:
                'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 active:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs focus-visible:ring-indigo-500/20',
            danger:
                'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs shadow-rose-600/20 border border-transparent focus-visible:ring-rose-500/30',
            ghost:
                'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent focus-visible:ring-slate-500/20',
            success:
                'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs shadow-emerald-600/20 border border-transparent focus-visible:ring-emerald-500/30',
        };

        const sizes = {
            xs: 'px-2.5 py-1 text-xs rounded-lg gap-1.5 font-medium',
            sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5 font-semibold',
            md: 'px-4 py-2 text-xs sm:text-sm rounded-xl gap-2 font-semibold',
            lg: 'px-5 py-2.5 text-sm sm:text-base rounded-2xl gap-2.5 font-semibold',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    'inline-flex items-center justify-center transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus:outline-none focus-visible:ring-2 active:scale-[0.98]',
                    variants[variant],
                    sizes[size],
                    pill && 'rounded-full px-4 py-1.5',
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                    leftIcon && <span className="shrink-0">{leftIcon}</span>
                )}
                <span>{children}</span>
                {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = 'Button';

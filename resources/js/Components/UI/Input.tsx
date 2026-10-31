import React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    helperText?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    prefixText?: string;
    suffixText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    (
        {
            className,
            label,
            helperText,
            error,
            leftIcon,
            rightIcon,
            prefixText,
            suffixText,
            id,
            required,
            disabled,
            ...props
        },
        ref
    ) => {
        const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-xs font-bold text-slate-700 dark:text-slate-200"
                    >
                        {label} {required && <span className="text-rose-500">*</span>}
                    </label>
                )}

                <div className="relative flex items-center rounded-2xl shadow-2xs">
                    {prefixText && (
                        <span className="inline-flex items-center px-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-r-0 border-slate-300 dark:border-white/10 rounded-l-2xl h-11 sm:h-10 select-none">
                            {prefixText}
                        </span>
                    )}

                    {leftIcon && (
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none shrink-0">
                            {leftIcon}
                        </div>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        disabled={disabled}
                        required={required}
                        className={cn(
                            'w-full h-11 sm:h-10 px-3.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 border border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 rounded-2xl transition-all duration-150',
                            'focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20 focus:border-[var(--admin-primary)]',
                            leftIcon && 'pl-10',
                            rightIcon && 'pr-10',
                            prefixText && 'rounded-l-none',
                            suffixText && 'rounded-r-none',
                            error &&
                                'border-rose-500 dark:border-rose-500 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/20 dark:bg-rose-950/20',
                            disabled &&
                                'opacity-60 bg-slate-100 dark:bg-white/5 cursor-not-allowed select-none',
                            className
                        )}
                        {...props}
                    />

                    {suffixText && (
                        <span className="inline-flex items-center px-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-l-0 border-slate-300 dark:border-white/10 rounded-r-2xl h-11 sm:h-10 select-none">
                            {suffixText}
                        </span>
                    )}

                    {rightIcon && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            {rightIcon}
                        </div>
                    )}
                </div>

                {error ? (
                    <p className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{error}</span>
                    </p>
                ) : helperText ? (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">{helperText}</p>
                ) : null}
            </div>
        );
    }
);

Input.displayName = 'Input';

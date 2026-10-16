import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, AlertCircle } from 'lucide-react';

export interface SelectOption {
    value: string | number;
    label: string;
    disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    helperText?: string;
    error?: string;
    options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, helperText, error, options, children, id, required, disabled, ...props }, ref) => {
        const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                        {label} {required && <span className="text-rose-500">*</span>}
                    </label>
                )}

                <div className="relative rounded-xl shadow-2xs">
                    <select
                        ref={ref}
                        id={selectId}
                        disabled={disabled}
                        required={required}
                        className={cn(
                            'w-full h-10 pl-3.5 pr-10 text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200/90 dark:border-slate-700/80 rounded-xl transition-all duration-150 appearance-none cursor-pointer',
                            'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                            error &&
                                'border-rose-400 dark:border-rose-500/60 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/20',
                            disabled &&
                                'opacity-60 bg-slate-100 dark:bg-slate-800 cursor-not-allowed select-none',
                            className
                        )}
                        {...props}
                    >
                        {options
                            ? options.map((opt) => (
                                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                                      {opt.label}
                                  </option>
                              ))
                            : children}
                    </select>

                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>

                {error ? (
                    <p className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{error}</span>
                    </p>
                ) : helperText ? (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
                ) : null}
            </div>
        );
    }
);

Select.displayName = 'Select';

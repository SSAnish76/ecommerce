import React from 'react';
import { cn } from '../../lib/utils';

export interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
    checked,
    onChange,
    label,
    description,
    disabled = false,
    className,
    id,
}) => {
    const toggleId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className={cn('flex items-start justify-between gap-4 py-2', className)}>
            {(label || description) && (
                <div className="space-y-0.5 min-w-0 pr-2">
                    {label && (
                        <label
                            htmlFor={toggleId}
                            className={cn(
                                'text-xs sm:text-sm font-semibold text-slate-900 dark:text-white cursor-pointer select-none block',
                                disabled && 'opacity-60 cursor-not-allowed'
                            )}
                        >
                            {label}
                        </label>
                    )}
                    {description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
            )}

            <button
                type="button"
                id={toggleId}
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30',
                    checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <span
                    aria-hidden="true"
                    className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out',
                        checked ? 'translate-x-5' : 'translate-x-0'
                    )}
                />
            </button>
        </div>
    );
};

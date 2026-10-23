import React, { useEffect, useState, useRef } from 'react';
import { Input, InputProps } from './Input';
import { slugify } from '../../lib/utils';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SlugInputProps extends Omit<InputProps, 'onChange' | 'value'> {
    value: string;
    onChange: (value: string) => void;
    sourceValue?: string;
    autoSync?: boolean;
    prefix?: string;
    showGenerateButton?: boolean;
    generateButtonText?: string;
    onGenerated?: (slug: string) => void;
}

export const SlugInput: React.FC<SlugInputProps> = ({
    label = 'Slug (URL identifier)',
    value,
    onChange,
    sourceValue,
    autoSync = true,
    prefix,
    showGenerateButton = true,
    generateButtonText = 'Auto-generate',
    placeholder = 'auto-generated from name',
    error,
    disabled = false,
    required = false,
    className,
    onGenerated,
    ...rest
}) => {
    const [isManuallyEdited, setIsManuallyEdited] = useState(() => Boolean(value));
    const [displayValue, setDisplayValue] = useState<string>(value || '');
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onGeneratedRef = useRef(onGenerated);
    onGeneratedRef.current = onGenerated;
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastEmittedValueRef = useRef<string>(value || '');

    // Synchronize displayValue when parent `value` prop changes externally (e.g. form reset, modal open)
    useEffect(() => {
        if (value !== lastEmittedValueRef.current) {
            setDisplayValue(value || '');
            lastEmittedValueRef.current = value || '';
            // If value is set externally (e.g. opening edit modal with existing slug),
            // preserve it by marking as manually edited. If reset to empty, allow auto-sync.
            setIsManuallyEdited(Boolean(value));
        }
    }, [value]);

    // Handle auto-sync from sourceValue smoothly without race condition flickering
    useEffect(() => {
        if (!autoSync || isManuallyEdited || sourceValue === undefined) {
            return;
        }

        const generated = slugify(sourceValue);

        // 1. Instantly update local UI display so it never flickers, clears, or lags
        setDisplayValue(generated);

        // 2. Debounce emitting to parent Inertia form to avoid state update collisions with rapid keystrokes
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            if (lastEmittedValueRef.current !== generated) {
                lastEmittedValueRef.current = generated;
                onChangeRef.current(generated);
                if (onGeneratedRef.current) {
                    onGeneratedRef.current(generated);
                }
            }
        }, 90);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [sourceValue, autoSync, isManuallyEdited]);

    const handleGenerate = () => {
        setIsManuallyEdited(false);
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        if (!sourceValue) return;
        const generated = slugify(sourceValue);
        setDisplayValue(generated);
        lastEmittedValueRef.current = generated;
        onChangeRef.current(generated);
        if (onGeneratedRef.current) {
            onGeneratedRef.current(generated);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsManuallyEdited(true);
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        const raw = e.target.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        setDisplayValue(raw);
        lastEmittedValueRef.current = raw;
        onChangeRef.current(raw);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        const cleaned = slugify(e.target.value);
        setDisplayValue(cleaned);
        if (lastEmittedValueRef.current !== cleaned) {
            lastEmittedValueRef.current = cleaned;
            onChangeRef.current(cleaned);
        }
    };

    return (
        <div className={cn('w-full space-y-1', className)}>
            <div className="flex items-center justify-between">
                {label && (
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                        {label}
                        {required && <span className="text-rose-500 ml-0.5">*</span>}
                    </label>
                )}

                {showGenerateButton && sourceValue && !disabled && (
                    <button
                        type="button"
                        onClick={handleGenerate}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                        title="Reset and re-generate slug from name"
                    >
                        <Sparkles className="w-3 h-3" />
                        <span>{generateButtonText}</span>
                    </button>
                )}
            </div>

            <div className="relative flex items-center">
                {prefix && (
                    <span className="inline-flex items-center pl-3 pr-1 text-xs font-mono text-slate-400 select-none">
                        {prefix}
                    </span>
                )}
                <Input
                    {...rest}
                    value={displayValue}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    error={error}
                    disabled={disabled}
                    className={cn('font-mono text-xs', prefix ? 'pl-1' : '', className)}
                />
            </div>
        </div>
    );
};

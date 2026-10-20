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
    const [isManuallyEdited, setIsManuallyEdited] = useState(false);
    const lastSourceRef = useRef(sourceValue);

    // If slug value became empty, re-enable auto-sync
    useEffect(() => {
        if (!value && isManuallyEdited) {
            setIsManuallyEdited(false);
        }
    }, [value, isManuallyEdited]);

    // Automatic real-time sync when sourceValue (e.g. name / title) changes
    useEffect(() => {
        if (!autoSync || isManuallyEdited || sourceValue === undefined) {
            return;
        }

        // Only run when sourceValue actually changed
        if (lastSourceRef.current !== sourceValue) {
            lastSourceRef.current = sourceValue;
            const generated = slugify(sourceValue);
            if (value !== generated) {
                onChange(generated);
                if (onGenerated) onGenerated(generated);
            }
        }
    }, [sourceValue, autoSync, isManuallyEdited, value, onChange, onGenerated]);

    const handleGenerate = () => {
        setIsManuallyEdited(false);
        if (!sourceValue) return;
        const generated = slugify(sourceValue);
        onChange(generated);
        if (onGenerated) onGenerated(generated);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsManuallyEdited(true);
        const raw = e.target.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        onChange(raw);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const cleaned = slugify(e.target.value);
        if (cleaned !== e.target.value) {
            onChange(cleaned);
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
                    value={value}
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

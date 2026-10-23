import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MultiSelectOption {
    value: string | number;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

export interface MultiSelectProps {
    id?: string;
    label?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    helperText?: string;
    error?: string;
    options: MultiSelectOption[];
    value: Array<string | number>;
    onChange: (values: string[]) => void;
    leftIcon?: React.ReactNode;
    showBadges?: boolean;
    searchable?: boolean;
    showSelectAll?: boolean;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    maxBadgeTextLength?: number;
    itemTypeLabel?: string;
}

export function MultiSelect({
    id,
    label,
    placeholder = 'Select options...',
    searchPlaceholder = 'Search...',
    helperText,
    error,
    options = [],
    value = [],
    onChange,
    leftIcon,
    showBadges = true,
    searchable = true,
    showSelectAll = true,
    required,
    disabled = false,
    className,
    maxBadgeTextLength = 24,
    itemTypeLabel = 'items',
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const isSelected = (val: string | number) => {
        return value.some((v) => String(v) === String(val));
    };

    const toggleOption = (val: string | number) => {
        if (disabled) return;
        const strVal = String(val);
        const exists = isSelected(val);
        const next = exists
            ? value.map(String).filter((v) => v !== strVal)
            : [...value.map(String), strVal];
        onChange(next);
    };

    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const q = searchQuery.toLowerCase().trim();
        return options.filter((opt) => {
            const labelMatch = opt.label.toLowerCase().includes(q);
            const descMatch = opt.description ? opt.description.toLowerCase().includes(q) : false;
            return labelMatch || descMatch;
        });
    }, [options, searchQuery]);

    const selectedOptions = useMemo(() => {
        return options.filter((opt) => isSelected(opt.value));
    }, [options, value]);

    const allFilteredSelected =
        filteredOptions.length > 0 &&
        filteredOptions.every((opt) => isSelected(opt.value));

    const handleSelectAllFiltered = () => {
        if (disabled) return;
        const filteredValues = filteredOptions
            .filter((opt) => !opt.disabled)
            .map((opt) => String(opt.value));
        const combined = Array.from(new Set([...value.map(String), ...filteredValues]));
        onChange(combined);
    };

    const handleDeselectAllFiltered = () => {
        if (disabled) return;
        const filteredValueSet = new Set(filteredOptions.map((opt) => String(opt.value)));
        const next = value.map(String).filter((v) => !filteredValueSet.has(v));
        onChange(next);
    };

    const handleClearAll = () => {
        if (disabled) return;
        onChange([]);
    };

    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className={cn('w-full space-y-1.5', className)} ref={containerRef}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}

            <div className="relative">
                {/* Trigger Button */}
                <button
                    id={inputId}
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsOpen((prev) => !prev)}
                    className={cn(
                        'w-full min-h-[42px] px-3.5 py-2 rounded-xl border transition-all flex items-center justify-between gap-2.5 text-left cursor-pointer bg-white dark:bg-slate-900',
                        isOpen
                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                        error && 'border-rose-500 ring-rose-500/20',
                        disabled && 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800'
                    )}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {leftIcon && (
                            <div className="text-slate-400 dark:text-slate-500 shrink-0">
                                {leftIcon}
                            </div>
                        )}

                        {selectedOptions.length === 0 ? (
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                {placeholder}
                            </span>
                        ) : selectedOptions.length === 1 ? (
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {selectedOptions[0].label}
                                {selectedOptions[0].description && (
                                    <span className="font-normal text-slate-400 dark:text-slate-500 ml-1">
                                        ({selectedOptions[0].description})
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {selectedOptions.length} {itemTypeLabel} selected
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                                    Active
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {selectedOptions.length > 0 && !disabled && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearAll();
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Clear selection"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <ChevronDown
                            className={cn(
                                'w-4 h-4 text-slate-400 transition-transform duration-200',
                                isOpen && 'rotate-180 text-blue-600 dark:text-blue-400'
                            )}
                        />
                    </div>
                </button>

                {/* Dropdown Menu & Click-outside Backdrop */}
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                            aria-hidden="true"
                        />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                            {/* Search Header */}
                            {searchable && (
                                <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={searchPlaceholder}
                                            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            autoFocus
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions Header */}
                            <div className="px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30">
                                <span>
                                    {selectedOptions.length} of {options.length} selected
                                </span>
                                {showSelectAll && filteredOptions.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={
                                            allFilteredSelected
                                                ? handleDeselectAllFiltered
                                                : handleSelectAllFiltered
                                        }
                                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                                    >
                                        {allFilteredSelected ? 'Deselect all' : 'Select all'}
                                    </button>
                                )}
                            </div>

                            {/* Options List */}
                            <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((opt) => {
                                        const isSel = isSelected(opt.value);
                                        return (
                                            <button
                                                key={String(opt.value)}
                                                type="button"
                                                disabled={opt.disabled}
                                                onClick={() => toggleOption(opt.value)}
                                                className={cn(
                                                    'w-full p-2.5 rounded-lg text-left border transition-all flex items-center justify-between gap-2.5 cursor-pointer',
                                                    isSel
                                                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-1 ring-blue-500/20'
                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600',
                                                    opt.disabled && 'opacity-50 cursor-not-allowed'
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {opt.icon && (
                                                        <div className="shrink-0 text-slate-500">
                                                            {opt.icon}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div
                                                            className={cn(
                                                                'text-xs font-semibold truncate',
                                                                isSel
                                                                    ? 'text-blue-700 dark:text-blue-300'
                                                                    : 'text-slate-800 dark:text-slate-200'
                                                            )}
                                                        >
                                                            {opt.label}
                                                        </div>
                                                        {opt.description && (
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                                {opt.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div
                                                    className={cn(
                                                        'w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all',
                                                        isSel
                                                            ? 'bg-blue-600 border-blue-600 text-white'
                                                            : 'border-slate-300 dark:border-slate-600'
                                                    )}
                                                >
                                                    {isSel && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                </div>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                                        {searchQuery
                                            ? `No results matching "${searchQuery}"`
                                            : 'No options available'}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                    Click any item to toggle
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Selected Pills / Badges */}
            {showBadges && selectedOptions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {selectedOptions.map((opt) => (
                        <span
                            key={String(opt.value)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 shadow-2xs"
                        >
                            <span
                                className="truncate font-semibold"
                                style={{ maxWidth: `${maxBadgeTextLength * 7}px` }}
                            >
                                {opt.label}
                            </span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => toggleOption(opt.value)}
                                    className="hover:bg-blue-200/60 dark:hover:bg-blue-900/80 rounded-full p-0.5 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                                    title={`Remove ${opt.label}`}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </span>
                    ))}
                    {selectedOptions.length > 1 && !disabled && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-[11px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 underline px-1.5 py-0.5 transition-colors cursor-pointer"
                        >
                            Clear all
                        </button>
                    )}
                </div>
            )}

            {helperText && !error && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
            )}

            {error && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                </p>
            )}
        </div>
    );
}

export default MultiSelect;

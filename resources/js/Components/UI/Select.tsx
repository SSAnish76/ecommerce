import React, { useMemo, useState } from 'react';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { ChevronDown, AlertCircle, Check, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
    value: string | number;
    label: string;
    description?: string;
    disabled?: boolean;
    group?: string;
    icon?: React.ReactNode;
    badge?: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    label?: string;
    helperText?: string;
    error?: string;
    options?: SelectOption[];
    searchable?: boolean;
    clearable?: boolean;
    leftIcon?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            className,
            label,
            helperText,
            error,
            options,
            children,
            id,
            name,
            value,
            defaultValue,
            onChange,
            required,
            disabled,
            searchable,
            clearable,
            leftIcon,
            size = 'md',
            placeholder = 'Select an option',
            ...props
        },
        ref
    ) => {
        const [searchQuery, setSearchQuery] = useState('');

        // Normalize options from options prop or from children (<option> / <optgroup>)
        const allOptions: SelectOption[] = useMemo(() => {
            if (options && options.length > 0) return options;
            if (!children) return [];

            const extracted: SelectOption[] = [];
            React.Children.forEach(children, (child) => {
                if (!React.isValidElement(child)) return;

                if (child.type === 'optgroup') {
                    const groupLabel = (child.props as any).label || '';
                    React.Children.forEach((child.props as any).children, (subChild) => {
                        if (React.isValidElement(subChild) && subChild.type === 'option') {
                            const subProps = subChild.props as any;
                            extracted.push({
                                value: subProps.value !== undefined ? String(subProps.value) : '',
                                label: String(subProps.children || subProps.value || ''),
                                disabled: subProps.disabled,
                                group: groupLabel,
                            });
                        }
                    });
                } else if (child.type === 'option') {
                    const optionProps = child.props as any;
                    extracted.push({
                        value: optionProps.value !== undefined ? String(optionProps.value) : '',
                        label: String(optionProps.children || optionProps.value || ''),
                        disabled: optionProps.disabled,
                    });
                }
            });

            return extracted;
        }, [options, children]);

        // Current internal/controlled value
        const isControlled = value !== undefined;
        const [internalValue, setInternalValue] = useState<string | number>(
            defaultValue !== undefined
                ? (Array.isArray(defaultValue) ? defaultValue[0] ?? '' : defaultValue)
                : (allOptions[0]?.value ?? '')
        );
        const currentValue = String(isControlled ? (value ?? '') : internalValue);

        // Auto-search if options >= 7 or searchable prop passed
        const shouldSearch = searchable ?? allOptions.length >= 7;

        // Filter options
        const filteredOptions = useMemo(() => {
            if (!searchQuery.trim()) return allOptions;
            const q = searchQuery.toLowerCase().trim();
            return allOptions.filter((opt) => {
                const labelMatch = opt.label.toLowerCase().includes(q);
                const descMatch = opt.description ? opt.description.toLowerCase().includes(q) : false;
                const groupMatch = opt.group ? opt.group.toLowerCase().includes(q) : false;
                return labelMatch || descMatch || groupMatch;
            });
        }, [allOptions, searchQuery]);

        const selectedOption = useMemo(() => {
            return allOptions.find((opt) => String(opt.value) === currentValue);
        }, [allOptions, currentValue]);

        // Handle selection
        const handleSelect = (newVal: string) => {
            if (!isControlled) {
                setInternalValue(newVal);
            }
            if (onChange) {
                const syntheticEvent = {
                    target: { name: name || '', value: newVal },
                    currentTarget: { name: name || '', value: newVal },
                } as unknown as React.ChangeEvent<HTMLSelectElement>;
                onChange(syntheticEvent);
            }
            setSearchQuery('');
        };

        const handleClear = (e: React.MouseEvent) => {
            e.stopPropagation();
            handleSelect('');
        };

        const sizeClasses = {
            sm: 'h-8.5 px-3 text-xs rounded-lg',
            md: 'h-10 px-3.5 text-xs sm:text-sm rounded-xl',
            lg: 'h-11 px-4 text-sm rounded-xl',
        }[size];

        const isValueEmpty = currentValue === '' || currentValue === null || currentValue === undefined;

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {label} {required && <span className="text-rose-500">*</span>}
                    </label>
                )}

                {/* Hidden native select for form integration */}
                <select
                    ref={ref}
                    name={name}
                    id={id}
                    disabled={disabled}
                    required={required}
                    value={currentValue}
                    onChange={(e) => handleSelect(e.target.value)}
                    className="sr-only pointer-events-none"
                    tabIndex={-1}
                    aria-hidden="true"
                    {...props}
                >
                    {allOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                <Listbox value={currentValue} onChange={handleSelect} disabled={disabled}>
                    {({ open }) => (
                        <div className="relative">
                            <ListboxButton
                                className={cn(
                                    'w-full flex items-center justify-between text-left transition-all duration-150 cursor-pointer select-none',
                                    'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200/90 dark:border-slate-700/80 shadow-2xs',
                                    'hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none',
                                    open && 'ring-2 ring-indigo-500/20 border-indigo-500 dark:border-indigo-500 shadow-xs',
                                    error && 'border-rose-400 dark:border-rose-500/60 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20',
                                    disabled && 'opacity-60 bg-slate-100 dark:bg-slate-800/60 cursor-not-allowed border-slate-200 dark:border-slate-800',
                                    sizeClasses,
                                    className
                                )}
                            >
                                <div className="flex items-center gap-2 truncate pr-2">
                                    {leftIcon && <span className="shrink-0 text-slate-400">{leftIcon}</span>}
                                    {selectedOption?.icon && (
                                        <span className="shrink-0 text-slate-500 dark:text-slate-400">
                                            {selectedOption.icon}
                                        </span>
                                    )}
                                    <span
                                        className={cn(
                                            'truncate',
                                            isValueEmpty
                                                ? 'text-slate-400 dark:text-slate-500 font-normal'
                                                : 'text-slate-900 dark:text-slate-100 font-medium'
                                        )}
                                    >
                                        {selectedOption ? selectedOption.label : placeholder}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0 text-slate-400">
                                    {clearable && !isValueEmpty && !disabled && (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={handleClear}
                                            className="p-1 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                                            title="Clear selection"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </span>
                                    )}
                                    <ChevronDown
                                        className={cn(
                                            'w-4 h-4 transition-transform duration-200',
                                            open && 'rotate-180 text-indigo-500'
                                        )}
                                    />
                                </div>
                            </ListboxButton>

                            <ListboxOptions
                                anchor={{ to: 'bottom start', gap: 6 }}
                                transition
                                className={cn(
                                    'z-50 w-[var(--button-width)] min-w-[200px] max-h-60 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl backdrop-blur-md p-1.5 space-y-0.5',
                                    'transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 focus:outline-none'
                                )}
                            >
                                {shouldSearch && (
                                    <div
                                        className="sticky top-0 z-10 -m-1.5 mb-1 p-2 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm"
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                    >
                                        <div className="relative flex items-center">
                                            <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search options..."
                                                className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {filteredOptions.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                                        No matching options found
                                    </div>
                                ) : (
                                    filteredOptions.map((opt) => (
                                        <ListboxOption
                                            key={opt.value}
                                            value={String(opt.value)}
                                            disabled={opt.disabled}
                                            className={({ active, selected, disabled: optDisabled }) =>
                                                cn(
                                                    'relative flex items-center justify-between w-full px-3 py-2 rounded-xl text-left transition-colors cursor-pointer select-none text-xs sm:text-sm',
                                                    selected
                                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                                                        : active
                                                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                                                        : 'text-slate-700 dark:text-slate-300',
                                                    optDisabled && 'opacity-40 cursor-not-allowed'
                                                )
                                            }
                                        >
                                            {({ selected }) => (
                                                <>
                                                    <div className="flex items-center gap-2 truncate pr-2">
                                                        {opt.icon && <span className="shrink-0 text-slate-400">{opt.icon}</span>}
                                                        <div className="truncate">
                                                            <div className="truncate">{opt.label}</div>
                                                            {opt.description && (
                                                                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal truncate">
                                                                    {opt.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {opt.badge && (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                                {opt.badge}
                                                            </span>
                                                        )}
                                                        {selected && (
                                                            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </ListboxOption>
                                    ))
                                )}
                            </ListboxOptions>
                        </div>
                    )}
                </Listbox>

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

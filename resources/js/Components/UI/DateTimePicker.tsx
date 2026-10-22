import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    format,
    isValid,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    addMonths,
    subMonths,
    setHours,
    setMinutes,
    addDays,
    isBefore,
    startOfDay,
    endOfDay,
} from 'date-fns';
import {
    Calendar as CalendarIcon,
    Clock,
    ChevronLeft,
    ChevronRight,
    X,
    Check,
    Sparkles,
    AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DateTimePickerPreset {
    label: string;
    getValue: () => Date;
    description?: string;
}

export interface DateTimePickerProps {
    value?: string;
    onChange: (isoString: string) => void;
    label?: string;
    placeholder?: string;
    helperText?: string;
    error?: string;
    minDate?: string | Date;
    maxDate?: string | Date;
    showTime?: boolean;
    presets?: DateTimePickerPreset[];
    required?: boolean;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export function DateTimePicker({
    value,
    onChange,
    label,
    placeholder = 'Select date & time...',
    helperText,
    error,
    minDate,
    maxDate,
    showTime = true,
    presets,
    required,
    disabled = false,
    className,
    id,
}: DateTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse incoming value to a Date object safely
    const parsedDate = useMemo(() => {
        if (!value) return null;
        try {
            const d = new Date(value);
            return isValid(d) ? d : null;
        } catch {
            return null;
        }
    }, [value]);

    // Active month shown in the calendar view
    const [viewDate, setViewDate] = useState<Date>(parsedDate || new Date());

    // When value changes from outside, sync viewDate if valid
    useEffect(() => {
        if (parsedDate) {
            setViewDate(parsedDate);
        }
    }, [parsedDate]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    // Helper to format date to YYYY-MM-DDTHH:mm for state & Laravel
    const formatToLocalISO = (d: Date): string => {
        return format(d, showTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
    };

    // Calculate minimum & maximum bounds
    const minBound = useMemo(() => {
        if (!minDate) return null;
        const d = typeof minDate === 'string' ? new Date(minDate) : minDate;
        return isValid(d) ? startOfDay(d) : null;
    }, [minDate]);

    const maxBound = useMemo(() => {
        if (!maxDate) return null;
        const d = typeof maxDate === 'string' ? new Date(maxDate) : maxDate;
        return isValid(d) ? endOfDay(d) : null;
    }, [maxDate]);

    const isDateDisabled = (day: Date) => {
        if (minBound && isBefore(endOfDay(day), minBound)) return true;
        if (maxBound && isBefore(maxBound, startOfDay(day))) return true;
        return false;
    };

    // Calendar grid calculations
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [viewDate]);

    // Current hour & minute components
    const currentHours = parsedDate ? parsedDate.getHours() : 12;
    const currentMinutes = parsedDate ? parsedDate.getMinutes() : 0;
    const isPM = currentHours >= 12;
    const displayHour12 = currentHours % 12 === 0 ? 12 : currentHours % 12;

    const handleSelectDay = (day: Date) => {
        if (isDateDisabled(day)) return;

        let target = new Date(day);
        if (showTime) {
            if (parsedDate) {
                target = setHours(target, parsedDate.getHours());
                target = setMinutes(target, parsedDate.getMinutes());
            } else {
                target = setHours(target, 12);
                target = setMinutes(target, 0);
            }
        } else {
            target = startOfDay(target);
        }

        onChange(formatToLocalISO(target));
    };

    const handleTimeChange = (newHour12: number, newMinutes: number, pm: boolean) => {
        const base = parsedDate || new Date();
        let hour24 = newHour12 % 12;
        if (pm) hour24 += 12;

        let target = setHours(base, hour24);
        target = setMinutes(target, newMinutes);

        onChange(formatToLocalISO(target));
    };

    const handleClear = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        onChange('');
    };

    const handlePresetClick = (preset: DateTimePickerPreset) => {
        const date = preset.getValue();
        onChange(formatToLocalISO(date));
        setViewDate(date);
    };

    // Quick preset buttons for convenience
    const quickTimePresets = [
        { label: '09:00 AM', hour: 9, minute: 0, pm: false },
        { label: '12:00 PM', hour: 12, minute: 0, pm: true },
        { label: '06:00 PM', hour: 6, minute: 0, pm: true },
        { label: '11:59 PM', hour: 11, minute: 59, pm: true },
    ];

    return (
        <div className={cn('relative w-full', className)} ref={containerRef}>
            {label && (
                <label
                    htmlFor={id}
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}

            {/* Trigger Input Display */}
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!disabled) setIsOpen(!isOpen);
                    }
                }}
                className={cn(
                    'group relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-all duration-200 cursor-pointer select-none',
                    'bg-white dark:bg-slate-800/90 shadow-2xs',
                    isOpen
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                        : error
                        ? 'border-rose-400 dark:border-rose-500 ring-1 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                    disabled && 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900'
                )}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div
                        className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            parsedDate
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-400'
                        )}
                    >
                        <CalendarIcon className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col text-left truncate">
                        {parsedDate ? (
                            <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                                <span>{format(parsedDate, 'MMM dd, yyyy')}</span>
                                {showTime && (
                                    <>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                                            {format(parsedDate, 'hh:mm a')}
                                        </span>
                                    </>
                                )}
                            </div>
                        ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                                {placeholder}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {parsedDate && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            title="Clear date"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <span
                        className={cn(
                            'text-slate-400 transition-transform duration-200',
                            isOpen && 'rotate-180 text-indigo-500'
                        )}
                    >
                        <Clock className="w-4 h-4" />
                    </span>
                </div>
            </div>

            {/* Error or Helper text */}
            {error ? (
                <p className="flex items-center gap-1 text-xs text-rose-500 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                </p>
            ) : helperText ? (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{helperText}</p>
            ) : null}

            {/* Popover Dropdown */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute left-0 top-full mt-2 z-50 w-full sm:w-[350px] p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-200 animate-in fade-in zoom-in-95',
                        'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800'
                    )}
                >
                    {/* Presets Row */}
                    {presets && presets.length > 0 && (
                        <div className="mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                <Sparkles className="w-3 h-3 text-indigo-500" />
                                <span>Quick Presets</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {presets.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handlePresetClick(preset)}
                                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/60"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Month / Year Navigation */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            type="button"
                            onClick={() => setViewDate(subMonths(viewDate, 1))}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                {format(viewDate, 'MMMM yyyy')}
                            </span>
                            {!isSameMonth(viewDate, new Date()) && (
                                <button
                                    type="button"
                                    onClick={() => setViewDate(new Date())}
                                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40"
                                >
                                    Today
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setViewDate(addMonths(viewDate, 1))}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, idx) => (
                            <span
                                key={idx}
                                className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-1"
                            >
                                {w}
                            </span>
                        ))}
                    </div>

                    {/* Day Cells Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                            const isCurrentMonth = isSameMonth(day, viewDate);
                            const isSelected = parsedDate ? isSameDay(day, parsedDate) : false;
                            const isCurrentToday = isToday(day);
                            const disabledDay = isDateDisabled(day);

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    disabled={disabledDay}
                                    onClick={() => handleSelectDay(day)}
                                    className={cn(
                                        'h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition-all relative',
                                        !isCurrentMonth && 'text-slate-300 dark:text-slate-600',
                                        isCurrentMonth && !isSelected && 'text-slate-700 dark:text-slate-200',
                                        isSelected
                                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/25 scale-105'
                                            : !disabledDay &&
                                                  'hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300',
                                        isCurrentToday &&
                                            !isSelected &&
                                            'border border-indigo-500 font-bold text-indigo-600 dark:text-indigo-400',
                                        disabledDay && 'opacity-25 cursor-not-allowed hover:bg-transparent'
                                    )}
                                >
                                    {format(day, 'd')}
                                    {isCurrentToday && !isSelected && (
                                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Time Picker Section */}
                    {showTime && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Time</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                    {parsedDate ? format(parsedDate, 'hh:mm a') : '12:00 PM'}
                                </span>
                            </div>

                            {/* Hours, Minutes & AM/PM Selector */}
                            <div className="flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                {/* Hour Select */}
                                <select
                                    value={displayHour12}
                                    onChange={(e) =>
                                        handleTimeChange(
                                            parseInt(e.target.value, 10),
                                            currentMinutes,
                                            isPM
                                        )
                                    }
                                    className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                        <option key={h} value={h}>
                                            {h.toString().padStart(2, '0')}
                                        </option>
                                    ))}
                                </select>

                                <span className="text-xs font-bold text-slate-400">:</span>

                                {/* Minute Select */}
                                <select
                                    value={currentMinutes}
                                    onChange={(e) =>
                                        handleTimeChange(
                                            displayHour12,
                                            parseInt(e.target.value, 10),
                                            isPM
                                        )
                                    }
                                    className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                >
                                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 41, 45, 50, 55, 59].map((m) => (
                                        <option key={m} value={m}>
                                            {m.toString().padStart(2, '0')}
                                        </option>
                                    ))}
                                </select>

                                {/* AM / PM Toggle */}
                                <div className="flex items-center ml-2 rounded-lg bg-slate-200 dark:bg-slate-700 p-0.5 text-xs font-bold">
                                    <button
                                        type="button"
                                        onClick={() => handleTimeChange(displayHour12, currentMinutes, false)}
                                        className={cn(
                                            'px-2 py-1 rounded-md transition-all',
                                            !isPM
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                        )}
                                    >
                                        AM
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleTimeChange(displayHour12, currentMinutes, true)}
                                        className={cn(
                                            'px-2 py-1 rounded-md transition-all',
                                            isPM
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                        )}
                                    >
                                        PM
                                    </button>
                                </div>
                            </div>

                            {/* Quick Time Pills */}
                            <div className="grid grid-cols-4 gap-1 mt-2">
                                {quickTimePresets.map((tp, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleTimeChange(tp.hour, tp.minute, tp.pm)}
                                        className="px-1.5 py-1 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors text-center"
                                    >
                                        {tp.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bottom Action Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                handleClear();
                                setIsOpen(false);
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                        >
                            Clear
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                        >
                            <Check className="w-3.5 h-3.5" />
                            <span>Done</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DateTimePicker;

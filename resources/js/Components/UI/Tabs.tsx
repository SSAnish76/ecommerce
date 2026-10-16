import React from 'react';
import { cn } from '../../lib/utils';

export interface TabItem<T extends string = string> {
    id: T;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    count?: number;
    badge?: string;
}

export interface TabsProps<T extends string = string> {
    tabs: TabItem<T>[];
    activeTab: T;
    onChange: (id: T) => void;
    className?: string;
    variant?: 'pills' | 'underline';
}

export function Tabs<T extends string = string>({
    tabs,
    activeTab,
    onChange,
    className,
    variant = 'pills',
}: TabsProps<T>) {
    if (variant === 'underline') {
        return (
            <div className={cn('border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 overflow-x-auto scrollbar-none', className)}>
                {tabs.map((tab) => {
                    const active = tab.id === activeTab;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onChange(tab.id)}
                            className={cn(
                                'flex items-center gap-2 py-3 px-1 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer select-none',
                                active
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                            )}
                        >
                            {Icon && <Icon className="w-4 h-4 shrink-0" />}
                            <span>{tab.label}</span>
                            {typeof tab.count === 'number' && (
                                <span
                                    className={cn(
                                        'px-2 py-0.5 text-[10px] font-bold rounded-full',
                                        active
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    )}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'inline-flex p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto max-w-full',
                className
            )}
        >
            {tabs.map((tab) => {
                const active = tab.id === activeTab;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer select-none',
                            active
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        )}
                    >
                        {Icon && (
                            <Icon
                                className={cn(
                                    'w-3.5 h-3.5 shrink-0',
                                    active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                                )}
                            />
                        )}
                        <span>{tab.label}</span>
                        {typeof tab.count === 'number' && (
                            <span
                                className={cn(
                                    'px-1.5 py-0.2 text-[10px] font-bold rounded-full',
                                    active
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                        : 'bg-slate-200/60 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                )}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

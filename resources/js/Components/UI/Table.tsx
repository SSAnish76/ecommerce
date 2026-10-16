import React from 'react';
import { cn } from '../../lib/utils';

export function TableContainer({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/80 shadow-xs overflow-hidden',
                className
            )}
            {...props}
        >
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                <table className="w-full text-left border-collapse">{children}</table>
            </div>
        </div>
    );
}

export function TableHead({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <thead
            className={cn(
                'bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/90 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none',
                className
            )}
            {...props}
        >
            {children}
        </thead>
    );
}

export function TableBody({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <tbody
            className={cn('divide-y divide-slate-100 dark:divide-slate-800/60 text-xs sm:text-sm', className)}
            {...props}
        >
            {children}
        </tbody>
    );
}

export function TableRow({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
    return (
        <tr
            className={cn(
                'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors',
                className
            )}
            {...props}
        >
            {children}
        </tr>
    );
}

export function TableHeaderCell({
    className,
    children,
    align = 'left',
    ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'center' | 'right' }) {
    const alignment = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    return (
        <th className={cn('py-3.5 px-5 font-bold', alignment[align], className)} {...props}>
            {children}
        </th>
    );
}

export function TableCell({
    className,
    children,
    align = 'left',
    ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'center' | 'right' }) {
    const alignment = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    return (
        <td
            className={cn('py-4 px-5 align-middle text-slate-700 dark:text-slate-300', alignment[align], className)}
            {...props}
        >
            {children}
        </td>
    );
}

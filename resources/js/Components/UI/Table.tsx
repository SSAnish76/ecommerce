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
                'rounded-3xl bg-[var(--admin-surface)] border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden transition-all',
                className
            )}
            {...props}
        >
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 -webkit-overflow-scrolling-touch">
                <table className="w-full text-left border-collapse min-w-full">{children}</table>
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
                'bg-slate-50/90 dark:bg-slate-950/50 border-b border-slate-200/80 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none',
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
            className={cn('divide-y divide-slate-100 dark:divide-white/5 text-xs sm:text-sm', className)}
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
                'hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors group',
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
        <th className={cn('py-3.5 px-4 sm:px-5 font-bold whitespace-nowrap', alignment[align], className)} {...props}>
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
            className={cn('py-3.5 sm:py-4 px-4 sm:px-5 align-middle text-slate-700 dark:text-slate-300', alignment[align], className)}
            {...props}
        >
            {children}
        </td>
    );
}

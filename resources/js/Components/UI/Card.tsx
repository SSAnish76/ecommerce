import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'rounded-3xl bg-[var(--admin-surface)] border border-slate-200/80 dark:border-white/10 shadow-xs transition-colors overflow-hidden',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-white/5 flex flex-col space-y-1',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardTitle({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn(
                'text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight',
                className
            )}
            {...props}
        >
            {children}
        </h3>
    );
}

export function CardDescription({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p className={cn('text-xs text-slate-500 dark:text-slate-400 leading-relaxed', className)} {...props}>
            {children}
        </p>
    );
}

export function CardContent({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('p-4 sm:p-6', className)} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 rounded-b-3xl flex items-center justify-between',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

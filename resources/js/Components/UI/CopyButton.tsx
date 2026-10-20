import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn, copyToClipboard } from '../../lib/utils';

export interface CopyButtonProps {
    text: string;
    title?: string;
    showText?: boolean;
    label?: string;
    copiedLabel?: string;
    size?: 'sm' | 'md';
    className?: string;
    onCopied?: () => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
    text,
    title = 'Copy to clipboard',
    showText = false,
    label = 'Copy',
    copiedLabel = 'Copied!',
    size = 'sm',
    className,
    onCopied,
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!text) return;

        const success = await copyToClipboard(text);
        if (success) {
            setCopied(true);
            if (onCopied) onCopied();
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const iconSizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    return (
        <button
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copied!' : title}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer select-none focus:outline-none',
                copied && 'text-emerald-500 hover:text-emerald-600 dark:text-emerald-400',
                className
            )}
        >
            {copied ? (
                <Check className={cn(iconSizeClass, 'text-emerald-500 shrink-0')} />
            ) : (
                <Copy className={cn(iconSizeClass, 'shrink-0')} />
            )}
            {showText && (
                <span className="text-xs font-medium">
                    {copied ? copiedLabel : label}
                </span>
            )}
        </button>
    );
};

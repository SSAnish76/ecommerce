import React, { useEffect, useRef, useId } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    className?: string;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
}

// Global scroll lock tracking across all modal instances
let lockCount = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';
let previousBodyPaddingRight = '';

export function lockScroll() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    if (lockCount === 0) {
        previousBodyOverflow = document.body.style.overflow;
        previousHtmlOverflow = document.documentElement.style.overflow;
        previousBodyPaddingRight = document.body.style.paddingRight;

        // Calculate scrollbar width to prevent page content layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
    }
    lockCount++;
}

export function unlockScroll() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
        document.documentElement.style.overflow = previousHtmlOverflow;
        document.body.style.overflow = previousBodyOverflow;
        document.body.style.paddingRight = previousBodyPaddingRight;
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
    }
}

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

function isElementVisible(el: HTMLElement): boolean {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length || el.offsetParent !== null);
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    maxWidth,
    size = 'lg',
    className,
    closeOnBackdrop = true,
    closeOnEscape = true,
}) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const headingId = useId();
    const descId = useId();

    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const closeOnEscapeRef = useRef(closeOnEscape);
    closeOnEscapeRef.current = closeOnEscape;

    useEffect(() => {
        if (!isOpen) return;

        // 1. Capture previously focused element to return focus after modal closes
        triggerRef.current = (document.activeElement as HTMLElement) || null;

        // 2. Lock scrolling globally
        lockScroll();

        // 3. Focus into modal on mount only if focus is not already inside
        const timer = setTimeout(() => {
            if (!dialogRef.current) return;

            // Do not steal focus if an element inside the dialog is already focused
            if (dialogRef.current.contains(document.activeElement)) {
                return;
            }

            // Check if there is an element with explicit autofocus
            const autoFocusEl = dialogRef.current.querySelector<HTMLElement>('[autofocus], [data-autofocus]');
            if (autoFocusEl && isElementVisible(autoFocusEl)) {
                autoFocusEl.focus();
                return;
            }

            const focusables = Array.from(
                dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            ).filter(isElementVisible);

            // Prefer focusing the first editable input/select/textarea if present inside the dialog body
            const firstInput = focusables.find((el) =>
                ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
            );

            if (firstInput) {
                firstInput.focus();
            } else if (focusables.length > 0) {
                focusables[0].focus();
            } else {
                dialogRef.current.focus();
            }
        }, 50);

        // 4. Trap Tab and Shift+Tab key navigation inside modal, handle Escape
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && closeOnEscapeRef.current) {
                e.preventDefault();
                e.stopPropagation();
                onCloseRef.current();
                return;
            }

            if (e.key === 'Tab') {
                if (!dialogRef.current) return;

                const focusables = Array.from(
                    dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
                ).filter(isElementVisible);

                if (focusables.length === 0) {
                    e.preventDefault();
                    dialogRef.current.focus();
                    return;
                }

                const firstElement = focusables[0];
                const lastElement = focusables[focusables.length - 1];

                if (e.shiftKey) {
                    // Shift + Tab (backward)
                    if (
                        document.activeElement === firstElement ||
                        !dialogRef.current.contains(document.activeElement)
                    ) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    // Tab (forward)
                    if (
                        document.activeElement === lastElement ||
                        !dialogRef.current.contains(document.activeElement)
                    ) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown);

            // Unlock scrolling globally
            unlockScroll();

            // Restore focus back to previous active element
            const elementToRestore = triggerRef.current;
            if (elementToRestore && typeof elementToRestore.focus === 'function') {
                setTimeout(() => {
                    try {
                        if (document.body.contains(elementToRestore)) {
                            elementToRestore.focus();
                        }
                    } catch {
                        // ignore if element is detached
                    }
                }, 0);
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const maxWidths = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
    };

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
            onClick={(e) => {
                if (closeOnBackdrop && e.target === overlayRef.current) {
                    onClose();
                }
            }}
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
                onClick={closeOnBackdrop ? onClose : undefined}
                aria-hidden="true"
            />

            {/* Modal Dialog */}
            <div
                ref={dialogRef}
                tabIndex={-1}
                className={cn(
                    'relative w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 outline-hidden overscroll-contain',
                    maxWidths[maxWidth || size || 'lg'],
                    className
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? headingId : undefined}
                aria-describedby={description ? descId : undefined}
            >
                {/* Header */}
                {(title || description) && (
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-4 shrink-0 bg-white/95 dark:bg-slate-900/95">
                        <div>
                            {title && (
                                <h2
                                    id={headingId}
                                    className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight"
                                >
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p id={descId} className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {description}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
                            aria-label="Close modal"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm overscroll-contain">
                    {children}
                </div>

                {/* Footer Actions */}
                {footer && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/50 flex items-center justify-end gap-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};


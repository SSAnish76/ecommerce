/**
 * Aura Admin Design Tokens & Theme Manager
 * 
 * Centralized design tokens enabling quick UI customization and theme switching.
 * Developers can tweak colors, radii, shadows, and spacing presets in one place.
 */

export interface ThemePreset {
    id: string;
    name: string;
    primary: string;
    primaryHover: string;
    primarySubtle: string;
    accent: string;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
    indigo: {
        id: 'indigo',
        name: 'Electric Indigo',
        primary: '#4f46e5',
        primaryHover: '#4338ca',
        primarySubtle: 'rgba(79, 70, 229, 0.1)',
        accent: '#06b6d4',
    },
    emerald: {
        id: 'emerald',
        name: 'Emerald Grove',
        primary: '#059669',
        primaryHover: '#047857',
        primarySubtle: 'rgba(5, 150, 105, 0.1)',
        accent: '#10b981',
    },
    violet: {
        id: 'violet',
        name: 'Royal Violet',
        primary: '#7c3aed',
        primaryHover: '#6d28d9',
        primarySubtle: 'rgba(124, 58, 237, 0.1)',
        accent: '#ec4899',
    },
    rose: {
        id: 'rose',
        name: 'Velvet Rose',
        primary: '#e11d48',
        primaryHover: '#be123c',
        primarySubtle: 'rgba(225, 29, 72, 0.1)',
        accent: '#f43f5e',
    },
    slate: {
        id: 'slate',
        name: 'Minimal Monochrome',
        primary: '#0f172a',
        primaryHover: '#1e293b',
        primarySubtle: 'rgba(15, 23, 42, 0.08)',
        accent: '#3b82f6',
    },
};

export const TOKENS = {
    radius: {
        xs: 'var(--admin-radius-xs, 6px)',
        sm: 'var(--admin-radius-sm, 8px)',
        md: 'var(--admin-radius-md, 12px)',
        lg: 'var(--admin-radius-lg, 16px)',
        xl: 'var(--admin-radius-xl, 20px)',
        '2xl': 'var(--admin-radius-2xl, 24px)',
        '3xl': 'var(--admin-radius-3xl, 32px)',
        full: 'var(--admin-radius-full, 9999px)',
    },
    touch: {
        minTarget: 'var(--admin-tap-min, 44px)',
        bottomNavHeight: 'var(--admin-bottom-nav-h, 66px)',
        topBarHeight: 'var(--admin-top-bar-h, 60px)',
    },
    colors: {
        bg: 'var(--admin-bg)',
        surface: 'var(--admin-surface)',
        surfaceSubtle: 'var(--admin-surface-subtle)',
        surfaceElevated: 'var(--admin-surface-elevated)',
        border: 'var(--admin-border)',
        borderSubtle: 'var(--admin-border-subtle)',
        borderStrong: 'var(--admin-border-strong)',
        textPrimary: 'var(--admin-text-primary)',
        textSecondary: 'var(--admin-text-secondary)',
        textMuted: 'var(--admin-text-muted)',
        primary: 'var(--admin-primary)',
        primaryHover: 'var(--admin-primary-hover)',
        primarySubtle: 'var(--admin-primary-subtle)',
        accent: 'var(--admin-accent)',
        success: 'var(--admin-success)',
        warning: 'var(--admin-warning)',
        danger: 'var(--admin-danger)',
        info: 'var(--admin-info)',
    },
} as const;

/**
 * Apply a color preset dynamically to the document root
 */
export function applyThemePreset(presetKey: keyof typeof THEME_PRESETS) {
    const preset = THEME_PRESETS[presetKey];
    if (!preset || typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--admin-primary', preset.primary);
    root.style.setProperty('--admin-primary-hover', preset.primaryHover);
    root.style.setProperty('--admin-primary-subtle', preset.primarySubtle);
    root.style.setProperty('--admin-accent', preset.accent);
    localStorage.setItem('admin-theme-preset', presetKey as string);
}

/**
 * Retrieve saved theme preset or default to indigo
 */
export function getSavedThemePreset(): string {
    if (typeof localStorage === 'undefined') return 'indigo';
    return localStorage.getItem('admin-theme-preset') || 'indigo';
}


import React, { createContext, useContext, useEffect, useState } from 'react';
import { THEME_PRESETS, ThemePreset, applyThemePreset, getSavedThemePreset } from '../lib/tokens';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    preset: string;
    setPreset: (presetKey: string) => void;
    availablePresets: typeof THEME_PRESETS;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');
    const [preset, setPresetState] = useState<string>('indigo');

    useEffect(() => {
        // 1. Initialize dark/light mode
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        if (storedTheme === 'dark' || document.documentElement.classList.contains('dark')) {
            setThemeState('dark');
            document.documentElement.classList.add('dark');
        } else {
            setThemeState('light');
            document.documentElement.classList.remove('dark');
        }

        // 2. Initialize color preset tokens
        const savedPreset = getSavedThemePreset();
        setPresetState(savedPreset);
        applyThemePreset(savedPreset as keyof typeof THEME_PRESETS);
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const setPreset = (newPreset: string) => {
        setPresetState(newPreset);
        applyThemePreset(newPreset as keyof typeof THEME_PRESETS);
    };

    return (
        <ThemeContext.Provider
            value={{
                theme,
                toggleTheme,
                setTheme,
                preset,
                setPreset,
                availablePresets: THEME_PRESETS,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        return {
            theme: isDark ? ('dark' as Theme) : ('light' as Theme),
            toggleTheme: () => {
                if (typeof document !== 'undefined') {
                    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
                    localStorage.setItem('theme', next);
                    document.documentElement.classList.toggle('dark', next === 'dark');
                }
            },
            setTheme: (t: Theme) => {
                if (typeof document !== 'undefined') {
                    localStorage.setItem('theme', t);
                    document.documentElement.classList.toggle('dark', t === 'dark');
                }
            },
            preset: 'indigo',
            setPreset: (p: string) => applyThemePreset(p as keyof typeof THEME_PRESETS),
            availablePresets: THEME_PRESETS,
        };
    }
    return context;
}

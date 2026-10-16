import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');

    useEffect(() => {
        // Check stored theme or check current HTML class
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        if (storedTheme === 'dark' || document.documentElement.classList.contains('dark')) {
            setThemeState('dark');
            document.documentElement.classList.add('dark');
        } else {
            setThemeState('light');
            document.documentElement.classList.remove('dark');
        }
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

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        // Fallback if rendered outside provider
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
        };
    }
    return context;
}

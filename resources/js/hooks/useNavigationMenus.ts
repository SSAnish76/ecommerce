import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import { PageProps, MenuItem } from '../types';

const STORAGE_KEY = 'admin_navigation_menus_cache';

interface CachedMenusPayload {
    userId: string;
    version: number;
    menus: MenuItem[];
    cachedAt: number;
}

// Global in-memory cache to prevent redundant fetches across multiple components on the same render
let memoryCache: {
    userId: string | null;
    version: number | null;
    menus: MenuItem[];
} | null = null;

let isFetching = false;
const subscribers = new Set<(menus: MenuItem[]) => void>();

function notifySubscribers(menus: MenuItem[]) {
    subscribers.forEach((cb) => cb(menus));
}

function getStoredCache(userId: string): CachedMenusPayload | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedMenusPayload;
        if (parsed && parsed.userId === userId && Array.isArray(parsed.menus)) {
            return parsed;
        }
    } catch {
        // Corrupted cache - ignore
    }
    return null;
}

function persistCache(userId: string, version: number, menus: MenuItem[]) {
    if (typeof window === 'undefined') return;
    try {
        const payload: CachedMenusPayload = {
            userId,
            version,
            menus,
            cachedAt: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        memoryCache = { userId, version, menus };
    } catch {
        // Storage quota or private mode issues - fallback to memoryCache
        memoryCache = { userId, version, menus };
    }
}

export function clearNavigationMenuCache() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(STORAGE_KEY);
        memoryCache = null;
        window.dispatchEvent(new CustomEvent('admin-menus-invalidated'));
    } catch {}
}

export function useNavigationMenus() {
    const { auth, menus: propsMenus, menu_delivery_mode = 'api', menu_version = 1 } = usePage<PageProps>().props;
    const user = auth?.user;
    const userId = user?.id;

    // Determine initial menus synchronously to avoid any flash of empty navigation
    const initialMenus = useMemo<MenuItem[]>(() => {
        if (!userId) return [];

        // 1. If server sent props.menus (Inertia Mode), use it directly
        if (Array.isArray(propsMenus) && propsMenus.length > 0) {
            persistCache(userId, menu_version, propsMenus);
            return propsMenus;
        }

        // 2. If already in memory cache for this user
        if (memoryCache && memoryCache.userId === userId && memoryCache.menus.length > 0) {
            return memoryCache.menus;
        }

        // 3. If in browser localStorage cache
        const stored = getStoredCache(userId);
        if (stored) {
            memoryCache = {
                userId,
                version: stored.version,
                menus: stored.menus,
            };
            return stored.menus;
        }

        return [];
    }, [userId, propsMenus, menu_version]);

    const [menus, setMenus] = useState<MenuItem[]>(initialMenus);
    const [isLoading, setIsLoading] = useState<boolean>(() => {
        if (!userId) return false;
        if (Array.isArray(propsMenus) && propsMenus.length > 0) return false;
        if (initialMenus.length > 0) return false;
        return menu_delivery_mode === 'api';
    });

    // Subscribe this component to external menu updates
    useEffect(() => {
        const subscriber = (newMenus: MenuItem[]) => {
            setMenus(newMenus);
            setIsLoading(false);
        };
        subscribers.add(subscriber);
        return () => {
            subscribers.delete(subscriber);
        };
    }, []);

    // Fetch menus from REST API endpoint
    const fetchFromApi = useCallback(async (forced = false) => {
        if (!userId || isFetching) return;

        isFetching = true;
        setIsLoading((prev) => (menus.length === 0 ? true : prev));

        try {
            const response = await fetch('/admin/menus', {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data.menus)) {
                    const fetchedVersion = typeof data.version === 'number' ? data.version : menu_version;
                    persistCache(userId, fetchedVersion, data.menus);
                    setMenus(data.menus);
                    notifySubscribers(data.menus);
                    window.dispatchEvent(new CustomEvent('admin-menus-updated', { detail: data.menus }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch navigation menus via API:', error);
        } finally {
            isFetching = false;
            setIsLoading(false);
        }
    }, [userId, menu_version, menus.length]);

    // Handle cache sync, version checks, and API delivery
    useEffect(() => {
        if (!userId) {
            clearNavigationMenuCache();
            setMenus([]);
            return;
        }

        // If server sent menus via Inertia props, sync state and local cache
        if (Array.isArray(propsMenus) && propsMenus.length > 0) {
            persistCache(userId, menu_version, propsMenus);
            setMenus(propsMenus);
            return;
        }

        // API mode: Check if we need to fetch
        const stored = getStoredCache(userId);
        const needsFetch =
            !stored ||
            stored.menus.length === 0 ||
            stored.version !== menu_version;

        if (needsFetch) {
            fetchFromApi();
        } else if (stored.menus.length > 0) {
            setMenus(stored.menus);
        }
    }, [userId, propsMenus, menu_version, menu_delivery_mode, fetchFromApi]);

    // Listen for cross-tab or cross-component cache invalidation events
    useEffect(() => {
        const handleInvalidated = () => {
            if (userId) {
                fetchFromApi(true);
            }
        };

        window.addEventListener('admin-menus-invalidated', handleInvalidated);
        return () => {
            window.removeEventListener('admin-menus-invalidated', handleInvalidated);
        };
    }, [userId, fetchFromApi]);

    return {
        menus,
        isLoading,
        deliveryMode: menu_delivery_mode,
        refreshMenus: () => fetchFromApi(true),
    };
}

import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { PageProps, MenuItem } from '../types';

export function usePermission() {
    const { auth, menus } = usePage<PageProps>().props;
    const user = auth?.user;
    const isSuperAdmin = Boolean(user?.is_super_admin);
    const menuList = (menus || []) as MenuItem[];

    // Index menu permissions by menu slug for O(1) fast lookup
    const permissions = useMemo(() => {
        const map: Record<string, NonNullable<MenuItem['permissions']>> = {};
        for (const m of menuList) {
            if (m.slug && m.permissions) {
                map[m.slug] = m.permissions;
            }
        }
        return map;
    }, [menuList]);

    /**
     * Check if user has permission for a given menu and action.
     * Actions: 'view', 'create', 'edit'/'update', 'delete', 'import', 'export'
     */
    const can = (
        menuSlug: string,
        action: 'view' | 'create' | 'edit' | 'update' | 'delete' | 'import' | 'export' = 'view'
    ): boolean => {
        if (!user) return false;
        if (isSuperAdmin) return true;

        const actionKey = action === 'edit' ? 'can_update' : `can_${action}`;
        const menuPerms = permissions[menuSlug];
        if (menuPerms && actionKey in menuPerms) {
            return Boolean(menuPerms[actionKey as keyof typeof menuPerms]);
        }

        return false;
    };

    return {
        can,
        isSuperAdmin,
        permissions,
    };
}

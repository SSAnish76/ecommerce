import { usePage } from '@inertiajs/react';
import { PageProps, EssentialsData, EnumDefinition, EnumOption } from '../types';

export function useEssentials() {
    const { props } = usePage<PageProps>();
    const essentials = props.essentials as EssentialsData | undefined;

    /**
     * Get an enum definition by key (e.g. 'sms_provider', 'mail_driver', 'order_status')
     */
    const getEnum = <T = string>(key: string): EnumDefinition<T> | undefined => {
        return essentials?.enums?.[key] as EnumDefinition<T> | undefined;
    };

    /**
     * Get select dropdown options for an enum.
     */
    const getOptions = <T = string>(key: string): EnumOption<T>[] => {
        return (essentials?.enums?.[key]?.options ?? []) as EnumOption<T>[];
    };

    /**
     * Get raw values for an enum.
     */
    const getValues = <T = string>(key: string): T[] => {
        return (essentials?.enums?.[key]?.values ?? []) as T[];
    };

    /**
     * Get key-value map for an enum.
     */
    const getMap = (key: string): Record<string, string> => {
        return essentials?.enums?.[key]?.map ?? {};
    };

    /**
     * Get all enums for a specific domain module (e.g. 'setting', 'order', 'product')
     */
    const getModuleEnums = (moduleName: string): Record<string, EnumDefinition> => {
        return essentials?.modules?.[moduleName] ?? {};
    };

    /**
     * Format an object dictionary into { value, label } options array.
     */
    const toOptions = (map: Record<string, string>): Array<{ value: string; label: string }> => {
        return Object.entries(map).map(([value, label]) => ({ value, label }));
    };

    return {
        essentials,
        enums: essentials?.enums ?? {},
        modules: essentials?.modules ?? {},
        constants: essentials?.constants ?? {
            timezones: {},
            currencies: [],
            currencies_map: {},
            vital_permissions: [],
        },
        getEnum,
        getOptions,
        getValues,
        getMap,
        getModuleEnums,
        toOptions,
    };
}

export type UserStatus = 'active' | 'inactive' | string;
export type RoleStatus = 'active' | 'inactive' | string;
export type StoreStatus = 'active' | 'inactive' | string;
export type MenuStatus = 'active' | 'inactive' | string;
export type ActivityStatus = string;
export type OrderStatus = string;
export type CurrencyPosition = 'prefix' | 'suffix' | string;
export type StockVisibility = 'hide' | 'badge' | 'backorder' | string;
export type MailDriver = 'smtp' | 'sendmail' | 'log' | string;
export type MailEncryption = 'tls' | 'ssl' | 'none' | string;
export type SmsProvider = 'twilio' | 'vonage' | 'aws_sns' | string;
export type SmtpPreset = 'gmail' | 'sendgrid' | 'mailgun' | 'mailtrap';

export const CURRENCY_DECIMAL_OPTIONS = [
    { value: 0, label: '0 (e.g. $100)' },
    { value: 2, label: '2 (e.g. $100.00)' },
    { value: 3, label: '3 (e.g. $100.000)' },
];

export const SMTP_PRESETS: Record<
    SmtpPreset,
    { mail_mailer: MailDriver; mail_host: string; mail_port: number; mail_encryption: MailEncryption }
> = {
    gmail: {
        mail_mailer: 'smtp',
        mail_host: 'smtp.gmail.com',
        mail_port: 587,
        mail_encryption: 'tls',
    },
    sendgrid: {
        mail_mailer: 'smtp',
        mail_host: 'smtp.sendgrid.net',
        mail_port: 587,
        mail_encryption: 'tls',
    },
    mailgun: {
        mail_mailer: 'smtp',
        mail_host: 'smtp.mailgun.org',
        mail_port: 587,
        mail_encryption: 'tls',
    },
    mailtrap: {
        mail_mailer: 'smtp',
        mail_host: 'smtp.mailtrap.io',
        mail_port: 2525,
        mail_encryption: 'tls',
    },
};

export interface MenuItem {
    slug: string;
    parent_slug?: string | null;
    name: string;
    description?: string;
    href: string;
    icon?: string;
    sort_order?: string;
    status?: MenuStatus;
    is_crud?: boolean;
    is_import_export?: boolean;
    is_active?: boolean;
    children?: MenuItem[];
}

export interface NavItem {
    slug?: string;
    parent_slug?: string | null;
    name: string;
    description?: string;
    href: string;
    icon?: unknown;
    permission?: string;
    sort_order?: string;
    badge?: string;
    children?: NavItem[];
}

export interface RolePermission {
    id?: string;
    role_id: string;
    menu_slug: string;
    can_view: boolean;
    can_add: boolean;
    can_update: boolean;
    can_delete: boolean;
    can_approve: boolean;
    can_import: boolean;
    can_export: boolean;
    menu?: MenuItem;
}

export interface Role {
    id: string;
    name: string;
    is_system?: boolean;
    status?: RoleStatus;
    users_count?: number;
    menus?: MenuItem[];
    menu_slugs?: string[];
    role_permissions?: RolePermission[];
    created_at?: string;
}

export interface Permission {
    id: string;
    name: string;
    module: string;
    menu_slug?: string | null;
    menu?: MenuItem | null;
    roles_count?: number;
    created_at?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role?: string;
    role_name?: string;
    role_id?: string;
    roles?: (Role | string)[];
    permissions?: string[];
    allowed_menus?: string[];
    is_super_admin?: boolean;
    is_2fa?: boolean;
    '2fa_confirmed_at'?: string | null;
    two_factor_confirmed_at?: string | null;
    has_2fa?: boolean;
    has_system_role?: boolean;
    status?: UserStatus;
    is_active?: boolean;
    avatar?: string;
    created_at?: string;
    last_login_at?: string;
}

export interface EnumOption<T = string> {
    value: T;
    label: string;
}

export interface EnumDefinition<T = string> {
    class: string;
    values: T[];
    options: EnumOption<T>[];
    map: Record<string, string>;
}

export interface EssentialsConstants {
    timezones: Record<string, string>;
    currencies: Array<{ code: string; symbol: string; name: string }>;
    currencies_map: Record<string, string>;
    date_formats: Record<string, string>;
    time_formats: Record<string, string>;
    vital_permissions: string[];
}

export interface EssentialsData {
    modules: Record<string, Record<string, EnumDefinition>>;
    enums: Record<string, EnumDefinition>;
    constants: EssentialsConstants;
}

export interface PageProps<T = Record<string, unknown>> {
    app_name?: string;
    store?: Partial<Store> | null;
    auth: {
        user: User | null;
    };
    navigation_menus?: MenuItem[];
    essentials?: EssentialsData;
    flash: {
        message?: string | null;
        success?: string | null;
        error?: string | null;
        warning?: string | null;
        status?: string | null;
        recovery_codes?: string[] | null;
    };
    [key: string]: unknown;
}

export interface MetricCardData {
    title: string;
    value: string;
    change: string;
    isPositive: boolean;
    icon: string;
    description: string;
}

export interface ActivityItem {
    id: string;
    user: string;
    action: string;
    target: string;
    time: string;
    status: ActivityStatus;
}

export interface RecentOrder {
    id: string;
    customer: string;
    email: string;
    amount: string;
    status: OrderStatus;
    date: string;
}

export interface Store {
    id: string;
    name: string;
    legal_name?: string | null;
    email: string;
    phone?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
    logo_url?: string | null;
    favicon_url?: string | null;
    currency: string;
    timezone: string;
    tax_number?: string | null;
    description?: string | null;
    website_url?: string | null;
    status: StoreStatus;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

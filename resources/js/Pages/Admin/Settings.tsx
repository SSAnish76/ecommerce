import React, { useState, useMemo } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import {
    PageProps,
    StockVisibility,
    MailEncryption,
    SmsProvider,
    CURRENCY_DECIMAL_OPTIONS,
} from '../../types';
import {
    Button,
    Input,
    Select,
    MultiSelect,
    Toggle,
    Badge,
    PageHeader,
} from '../../Components/UI';
import {
    DollarSign,
    ShoppingCart,
    CreditCard,
    Save,
    Lock,
    Bell,
    Wallet,
    Banknote,
    Zap,
    Eye,
    EyeOff,
    Mail,
    Key,
    Truck,
    HardDrive,
    ChevronDown,
    Search,
    Check,
    X,
    ShieldCheck,
    Cloud,
    MessageSquare,
    PackageCheck,
    AlertTriangle,
    Star,
    UserCheck,
    XCircle,
    Users,
    SlidersHorizontal,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { clearNavigationMenuCache } from '../../hooks/useNavigationMenus';

interface SettingsProps extends PageProps {
    settings: {
        currency_code: string;
        currency_symbol: string;
        currency_decimals: number;
        timezone: string;

        force_two_factor_all_admins: boolean;
        menu_delivery_mode?: 'inertia' | 'api';

        order_prefix: string;
        order_number_start: number;
        allow_customer_cancellation: boolean;

        low_stock_threshold: number;
        out_of_stock_visibility: StockVisibility;
        enable_customer_reviews: boolean;
        auto_approve_reviews: boolean;

        payment_cod_enabled?: boolean;
        payment_stripe_enabled?: boolean;
        payment_paypal_enabled?: boolean;
        payment_razorpay_enabled?: boolean;

        payment_settings?: {
            stripe?: { publishable_key?: string; secret_key?: string; webhook_secret?: string; enabled?: boolean };
            paypal?: { mode?: string; client_id?: string; client_secret?: string; enabled?: boolean };
            cod?: { instructions?: string; enabled?: boolean };
            razorpay?: { key_id?: string; key_secret?: string; webhook_secret?: string; enabled?: boolean };
        };

        storage_settings?: {
            default_disk?: string;
            s3?: { key?: string; secret?: string; region?: string; bucket?: string; url?: string; endpoint?: string };
        };

        shipping_flat_rate_enabled?: boolean;
        shipping_flat_rate_cost?: number;
        shipping_free_shipping_enabled?: boolean;
        shipping_free_shipping_min_order?: number;

        shipping_settings?: {
            flat_rate?: { cost?: number; enabled?: boolean };
            free_shipping?: { min_amount?: number; enabled?: boolean };
            carrier?: { provider?: string; account_number?: string; api_key?: string; api_secret?: string };
            fedex?: { enabled?: boolean; account_number?: string; api_key?: string; api_secret?: string };
            ups?: { enabled?: boolean; account_number?: string; api_key?: string; api_secret?: string };
            dhl?: { enabled?: boolean; account_number?: string; api_key?: string; api_secret?: string };
        };

        mail_host?: string;
        mail_port?: number;
        mail_username?: string;
        mail_password?: string;
        mail_encryption?: MailEncryption;
        mail_from_name?: string;
        mail_from_address?: string;

        sms_provider?: SmsProvider;
        sms_username?: string;
        sms_password?: string;
        sms_from_number?: string;
        enable_order_sms_notifications?: boolean;

        // Customer Alerts
        notify_order_placed_customer_email?: boolean;
        notify_order_placed_customer_sms?: boolean;
        notify_order_status_updated_email?: boolean;
        notify_order_status_updated_sms?: boolean;
        notify_order_delivered_customer_email?: boolean;
        notify_order_delivered_customer_sms?: boolean;
        notify_order_cancelled_customer_email?: boolean;
        notify_order_cancelled_customer_sms?: boolean;
        notify_new_customer_welcome_email?: boolean;
        notify_new_customer_welcome_sms?: boolean;

        // Admin & Staff Alerts
        notify_order_placed_admin_email?: boolean;
        notify_order_placed_admin_sms?: boolean;
        notify_order_cancelled_admin_email?: boolean;
        notify_order_cancelled_admin_sms?: boolean;
        notify_low_stock_admin_email?: boolean;
        notify_low_stock_admin_sms?: boolean;
        notify_new_review_admin_email?: boolean;
        notify_new_review_admin_sms?: boolean;

        // Admin Alert Routing
        admin_alert_recipient_type?: 'email' | 'roles' | 'users';
        admin_alert_email?: string;
        admin_alert_roles?: string[];
        admin_alert_users?: string[];
    };
    timezones: Record<string, string>;
    currencies: Array<{ code: string; symbol: string; name: string }>;
    roles?: Array<{ id: string; name: string }>;
    staffUsers?: Array<{ id: string; name: string; email: string; role_id?: string | null }>;
    stock_visibility_options?: Array<{ value: StockVisibility; label: string }>;
    mail_encryption_options?: Array<{ value: MailEncryption; label: string }>;
    sms_provider_options?: Array<{ value: SmsProvider; label: string }>;
}

const ALL_SECTION_IDS = ['localization', 'orders', 'payments', 'storage', 'email_sms', 'triggers'];

const CARRIER_CONFIGS = [
    {
        id: 'fedex' as const,
        name: 'FedEx Express',
        colorClass: 'border-indigo-300 dark:border-indigo-700',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/60',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        enabledKey: 'shipping_fedex_enabled' as const,
        accountKey: 'shipping_fedex_account_number' as const,
        apiKey: 'shipping_fedex_api_key' as const,
        secretKey: 'shipping_fedex_api_secret' as const,
    },
    {
        id: 'ups' as const,
        name: 'UPS Logistics',
        colorClass: 'border-amber-300 dark:border-amber-700',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60',
        iconColor: 'text-amber-600 dark:text-amber-400',
        enabledKey: 'shipping_ups_enabled' as const,
        accountKey: 'shipping_ups_account_number' as const,
        apiKey: 'shipping_ups_api_key' as const,
        secretKey: 'shipping_ups_api_secret' as const,
    },
    {
        id: 'dhl' as const,
        name: 'DHL Express',
        colorClass: 'border-rose-300 dark:border-rose-700',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60',
        iconColor: 'text-rose-600 dark:text-rose-400',
        enabledKey: 'shipping_dhl_enabled' as const,
        accountKey: 'shipping_dhl_account_number' as const,
        apiKey: 'shipping_dhl_api_key' as const,
        secretKey: 'shipping_dhl_api_secret' as const,
    },
];

const CUSTOMER_ALERTS = [
    {
        icon: ShoppingCart,
        iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40',
        title: 'Order Confirmation',
        description: 'Sent immediately when customer places an order',
        emailKey: 'notify_order_placed_customer_email' as const,
        smsKey: 'notify_order_placed_customer_sms' as const,
    },
    {
        icon: Truck,
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40',
        title: 'Order Shipped & In Transit',
        description: 'Sent when shipment is dispatched with courier tracking link',
        emailKey: 'notify_order_status_updated_email' as const,
        smsKey: 'notify_order_status_updated_sms' as const,
    },
    {
        icon: PackageCheck,
        iconBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200/50 dark:border-teal-800/40',
        title: 'Order Delivered',
        description: 'Sent when parcel is marked successfully delivered',
        emailKey: 'notify_order_delivered_customer_email' as const,
        smsKey: 'notify_order_delivered_customer_sms' as const,
    },
    {
        icon: XCircle,
        iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40',
        title: 'Order Cancelled / Refunded',
        description: 'Sent when an order is cancelled or refunded',
        emailKey: 'notify_order_cancelled_customer_email' as const,
        smsKey: 'notify_order_cancelled_customer_sms' as const,
    },
    {
        icon: UserCheck,
        iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/40',
        title: 'Customer Welcome',
        description: 'Sent upon new customer account registration',
        emailKey: 'notify_new_customer_welcome_email' as const,
        smsKey: 'notify_new_customer_welcome_sms' as const,
    },
];

const ADMIN_ALERTS = [
    {
        icon: ShoppingCart,
        iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40',
        title: 'New Order Received',
        description: 'Alert store team whenever a customer places an order',
        emailKey: 'notify_order_placed_admin_email' as const,
        smsKey: 'notify_order_placed_admin_sms' as const,
    },
    {
        icon: XCircle,
        iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40',
        title: 'Order Cancelled Notice',
        description: 'Alert staff when a customer or system cancels an order',
        emailKey: 'notify_order_cancelled_admin_email' as const,
        smsKey: 'notify_order_cancelled_admin_sms' as const,
    },
    {
        icon: AlertTriangle,
        iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40',
        title: 'Low Stock Inventory Warning',
        description: 'Alert inventory team when product stock falls below threshold',
        emailKey: 'notify_low_stock_admin_email' as const,
        smsKey: 'notify_low_stock_admin_sms' as const,
    },
    {
        icon: Star,
        iconBg: 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-600 dark:text-yellow-400 border border-yellow-200/50 dark:border-yellow-800/40',
        title: 'New Review Submitted',
        description: 'Alert staff to moderate and respond to new customer reviews',
        emailKey: 'notify_new_review_admin_email' as const,
        smsKey: 'notify_new_review_admin_sms' as const,
    },
];

interface SecretInputProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    isVisible: boolean;
    onToggle: () => void;
    error?: string;
}

function SecretInput({
    label,
    value,
    onChange,
    placeholder = 'Secret...',
    isVisible,
    onToggle,
    error,
}: SecretInputProps) {
    return (
        <Input
            label={label}
            type={isVisible ? 'text' : 'password'}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            error={error}
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
                <button
                    type="button"
                    onClick={onToggle}
                    className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    tabIndex={-1}
                >
                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            }
        />
    );
}

export default function Settings({
    settings,
    timezones,
    currencies,
    roles = [],
    staffUsers = [],
    stock_visibility_options = [],
    mail_encryption_options = [],
    sms_provider_options = [],
}: SettingsProps) {
    const stockVisibilityOptions = stock_visibility_options.length > 0
        ? stock_visibility_options
        : [
            { value: 'badge', label: "Display product with 'Sold Out' badge (Recommended)" },
            { value: 'hide', label: 'Hide product completely from catalog storefront' },
            { value: 'backorder', label: 'Allow customers to backorder' },
        ];

    const mailEncryptionOptions = mail_encryption_options.length > 0
        ? mail_encryption_options
        : [
            { value: 'tls', label: 'TLS' },
            { value: 'ssl', label: 'SSL' },
            { value: 'none', label: 'None' },
        ];

    const smsProviderOptions = sms_provider_options.length > 0
        ? sms_provider_options
        : [
            { value: 'twilio', label: 'Twilio' },
            { value: 'vonage', label: 'Vonage' },
            { value: 'aws_sns', label: 'AWS SNS' },
        ];

    // List expand/collapse state
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        localization: true,
    });

    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [savingSection, setSavingSection] = useState<string | null>(null);
    const [savedSection, setSavedSection] = useState<string | null>(null);

    // Unified secret visibility state
    const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
    const toggleSecret = (key: string) => {
        setShowSecret((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const pay = settings?.payment_settings;
    const storeDisk = settings?.storage_settings;
    const ship = settings?.shipping_settings;

    const form = useForm({
        currency_code: settings?.currency_code ?? 'USD',
        currency_symbol: settings?.currency_symbol ?? '$',
        currency_decimals: settings?.currency_decimals ?? 2,
        timezone: settings?.timezone ?? 'UTC',

        force_two_factor_all_admins: settings?.force_two_factor_all_admins ?? true,
        menu_delivery_mode: (settings?.menu_delivery_mode as 'inertia' | 'api') ?? 'api',

        order_prefix: settings?.order_prefix ?? 'ORD-',
        order_number_start: settings?.order_number_start ?? 1001,
        allow_customer_cancellation: settings?.allow_customer_cancellation ?? true,

        low_stock_threshold: settings?.low_stock_threshold ?? 5,
        out_of_stock_visibility: settings?.out_of_stock_visibility ?? 'badge',
        enable_customer_reviews: settings?.enable_customer_reviews ?? true,
        auto_approve_reviews: settings?.auto_approve_reviews ?? false,

        payment_cod_enabled: settings?.payment_cod_enabled ?? pay?.cod?.enabled ?? true,
        payment_stripe_enabled: settings?.payment_stripe_enabled ?? pay?.stripe?.enabled ?? true,
        payment_paypal_enabled: settings?.payment_paypal_enabled ?? pay?.paypal?.enabled ?? true,
        payment_razorpay_enabled: settings?.payment_razorpay_enabled ?? pay?.razorpay?.enabled ?? false,

        // Payment Gateway Credentials
        payment_stripe_publishable_key: pay?.stripe?.publishable_key ?? '',
        payment_stripe_secret_key: pay?.stripe?.secret_key ?? '',
        payment_stripe_webhook_secret: pay?.stripe?.webhook_secret ?? '',
        payment_paypal_mode: pay?.paypal?.mode ?? 'sandbox',
        payment_paypal_client_id: pay?.paypal?.client_id ?? '',
        payment_paypal_client_secret: pay?.paypal?.client_secret ?? '',
        payment_razorpay_key_id: pay?.razorpay?.key_id ?? '',
        payment_razorpay_key_secret: pay?.razorpay?.key_secret ?? '',
        payment_razorpay_webhook_secret: pay?.razorpay?.webhook_secret ?? '',
        payment_cod_instructions: pay?.cod?.instructions ?? '',

        // Storage Settings
        storage_default_disk: storeDisk?.default_disk ?? 'public',
        storage_s3_key: storeDisk?.s3?.key ?? '',
        storage_s3_secret: storeDisk?.s3?.secret ?? '',
        storage_s3_region: storeDisk?.s3?.region ?? 'us-east-1',
        storage_s3_bucket: storeDisk?.s3?.bucket ?? '',
        storage_s3_url: storeDisk?.s3?.url ?? '',
        storage_s3_endpoint: storeDisk?.s3?.endpoint ?? '',

        // Shipping Settings - Flat Rate & Free Shipping
        shipping_flat_rate_enabled: settings?.shipping_flat_rate_enabled ?? ship?.flat_rate?.enabled ?? true,
        shipping_flat_rate_cost: Number(settings?.shipping_flat_rate_cost ?? ship?.flat_rate?.cost ?? 10.00),
        shipping_free_shipping_enabled: settings?.shipping_free_shipping_enabled ?? ship?.free_shipping?.enabled ?? true,
        shipping_free_shipping_min_order: Number(settings?.shipping_free_shipping_min_order ?? ship?.free_shipping?.min_amount ?? 50.00),

        // Shipping Settings - Multi-Carrier Support
        shipping_fedex_enabled: ship?.fedex?.enabled ?? (ship?.carrier?.provider === 'fedex'),
        shipping_fedex_account_number: ship?.fedex?.account_number ?? (ship?.carrier?.provider === 'fedex' ? (ship?.carrier?.account_number ?? '') : ''),
        shipping_fedex_api_key: ship?.fedex?.api_key ?? (ship?.carrier?.provider === 'fedex' ? (ship?.carrier?.api_key ?? '') : ''),
        shipping_fedex_api_secret: ship?.fedex?.api_secret ?? (ship?.carrier?.provider === 'fedex' ? (ship?.carrier?.api_secret ?? '') : ''),

        shipping_ups_enabled: ship?.ups?.enabled ?? (ship?.carrier?.provider === 'ups'),
        shipping_ups_account_number: ship?.ups?.account_number ?? (ship?.carrier?.provider === 'ups' ? (ship?.carrier?.account_number ?? '') : ''),
        shipping_ups_api_key: ship?.ups?.api_key ?? (ship?.carrier?.provider === 'ups' ? (ship?.carrier?.api_key ?? '') : ''),
        shipping_ups_api_secret: ship?.ups?.api_secret ?? (ship?.carrier?.provider === 'ups' ? (ship?.carrier?.api_secret ?? '') : ''),

        shipping_dhl_enabled: ship?.dhl?.enabled ?? (ship?.carrier?.provider === 'dhl'),
        shipping_dhl_account_number: ship?.dhl?.account_number ?? (ship?.carrier?.provider === 'dhl' ? (ship?.carrier?.account_number ?? '') : ''),
        shipping_dhl_api_key: ship?.dhl?.api_key ?? (ship?.carrier?.provider === 'dhl' ? (ship?.carrier?.api_key ?? '') : ''),
        shipping_dhl_api_secret: ship?.dhl?.api_secret ?? (ship?.carrier?.provider === 'dhl' ? (ship?.carrier?.api_secret ?? '') : ''),

        // SMTP Credentials
        mail_host: settings?.mail_host ?? 'smtp.mailtrap.io',
        mail_port: settings?.mail_port ?? 587,
        mail_username: settings?.mail_username ?? '',
        mail_password: settings?.mail_password ?? '',
        mail_encryption: settings?.mail_encryption ?? 'tls',

        // SMS Credentials
        sms_provider: settings?.sms_provider ?? 'twilio',
        sms_username: settings?.sms_username ?? '',
        sms_password: settings?.sms_password ?? '',
        sms_from_number: settings?.sms_from_number ?? '',

        // Senders & Notifications
        mail_from_name: settings?.mail_from_name ?? 'E-Commerce Store',
        mail_from_address: settings?.mail_from_address ?? 'notifications@example.com',
        enable_order_sms_notifications: settings?.enable_order_sms_notifications ?? false,

        // Customer Alerts
        notify_order_placed_customer_email: settings?.notify_order_placed_customer_email ?? true,
        notify_order_placed_customer_sms: settings?.notify_order_placed_customer_sms ?? true,
        notify_order_status_updated_email: settings?.notify_order_status_updated_email ?? true,
        notify_order_status_updated_sms: settings?.notify_order_status_updated_sms ?? true,
        notify_order_delivered_customer_email: settings?.notify_order_delivered_customer_email ?? true,
        notify_order_delivered_customer_sms: settings?.notify_order_delivered_customer_sms ?? true,
        notify_order_cancelled_customer_email: settings?.notify_order_cancelled_customer_email ?? true,
        notify_order_cancelled_customer_sms: settings?.notify_order_cancelled_customer_sms ?? true,
        notify_new_customer_welcome_email: settings?.notify_new_customer_welcome_email ?? true,
        notify_new_customer_welcome_sms: settings?.notify_new_customer_welcome_sms ?? false,

        // Admin & Staff Alerts
        notify_order_placed_admin_email: settings?.notify_order_placed_admin_email ?? true,
        notify_order_placed_admin_sms: settings?.notify_order_placed_admin_sms ?? false,
        notify_order_cancelled_admin_email: settings?.notify_order_cancelled_admin_email ?? true,
        notify_order_cancelled_admin_sms: settings?.notify_order_cancelled_admin_sms ?? false,
        notify_low_stock_admin_email: settings?.notify_low_stock_admin_email ?? true,
        notify_low_stock_admin_sms: settings?.notify_low_stock_admin_sms ?? false,
        notify_new_review_admin_email: settings?.notify_new_review_admin_email ?? true,
        notify_new_review_admin_sms: settings?.notify_new_review_admin_sms ?? false,

        // Admin Alert Routing
        admin_alert_recipient_type: (settings?.admin_alert_recipient_type as 'email' | 'roles' | 'users') ?? 'email',
        admin_alert_email: settings?.admin_alert_email ?? 'admin@example.com',
        admin_alert_roles: Array.isArray(settings?.admin_alert_roles) ? settings.admin_alert_roles : [],
        admin_alert_users: Array.isArray(settings?.admin_alert_users) ? settings.admin_alert_users : [],
    });

    const handleCurrencySelect = (code: string) => {
        const matched = currencies?.find((c) => c.code === code);
        if (matched) {
            form.setData((prev) => ({
                ...prev,
                currency_code: matched.code,
                currency_symbol: matched.symbol,
            }));
        }
    };

    const toggleSection = (id: string) => {
        setOpenSections((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const handleExpandAll = () => {
        const all: Record<string, boolean> = {};
        ALL_SECTION_IDS.forEach((key) => {
            all[key] = true;
        });
        setOpenSections(all);
    };

    const handleCollapseAll = () => {
        setOpenSections({});
    };

    const handleSaveSection = (sectionId: string) => {
        setSavingSection(sectionId);
        form.post('/admin/settings', {
            preserveScroll: true,
            onSuccess: () => {
                if (sectionId === 'localization') {
                    clearNavigationMenuCache();
                }
                setSavedSection(sectionId);
                setTimeout(() => setSavedSection(null), 3000);
            },
            onFinish: () => {
                setSavingSection(null);
            },
        });
    };

    const activePaymentCount = [
        form.data.payment_razorpay_enabled,
        form.data.payment_stripe_enabled,
        form.data.payment_paypal_enabled,
        form.data.payment_cod_enabled,
    ].filter(Boolean).length;

    const activeShippingCount = [
        form.data.shipping_flat_rate_enabled,
        form.data.shipping_free_shipping_enabled,
        form.data.shipping_fedex_enabled,
        form.data.shipping_ups_enabled,
        form.data.shipping_dhl_enabled,
    ].filter(Boolean).length;

    interface SettingListItem {
        id: string;
        category: 'store' | 'orders' | 'payments' | 'storage' | 'notifications';
        categoryLabel: string;
        title: string;
        description: string;
        icon: React.ComponentType<{ className?: string }>;
        iconBg: string;
        iconColor: string;
        badges: Array<{ label: string; variant?: 'indigo' | 'emerald' | 'amber' | 'sky' | 'rose' | 'slate' }>;
        renderForm: () => React.ReactNode;
    }

    const settingsList: SettingListItem[] = useMemo(() => [
        {
            id: 'localization',
            category: 'store',
            categoryLabel: 'Storefront',
            title: 'Store Localization & Security',
            description: 'Currency, decimals, timezone, and two-factor authentication.',
            icon: DollarSign,
            iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/60',
            iconColor: 'text-indigo-600 dark:text-indigo-400',
            badges: [
                { label: `${form.data.currency_code} (${form.data.currency_symbol})`, variant: 'indigo' },
                { label: form.data.timezone, variant: 'slate' },
                {
                    label: form.data.force_two_factor_all_admins ? '2FA Active' : '2FA Off',
                    variant: form.data.force_two_factor_all_admins ? 'emerald' : 'slate',
                },
                // {
                //     label: form.data.menu_delivery_mode === 'api' ? 'Nav: REST API' : 'Nav: Inertia Props',
                //     variant: form.data.menu_delivery_mode === 'api' ? 'sky' : 'indigo',
                // },
            ],
            renderForm: () => (
                <div className="space-y-3.5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {currencies && currencies.length > 0 && (
                            <Select
                                label="Currency Preset"
                                value={form.data.currency_code}
                                onChange={(e) => handleCurrencySelect(e.target.value)}
                            >
                                {currencies.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.code} ({c.symbol}) - {c.name}
                                    </option>
                                ))}
                            </Select>
                        )}

                        <Input
                            label="Currency Symbol"
                            required
                            value={form.data.currency_symbol}
                            onChange={(e) => form.setData('currency_symbol', e.target.value)}
                            error={form.errors.currency_symbol}
                        />

                        <Select
                            label="Decimal Places"
                            value={form.data.currency_decimals}
                            onChange={(e) =>
                                form.setData('currency_decimals', parseInt(e.target.value, 10))
                            }
                        >
                            {CURRENCY_DECIMAL_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                            label="Currency ISO Code"
                            required
                            value={form.data.currency_code}
                            onChange={(e) =>
                                form.setData('currency_code', e.target.value.toUpperCase())
                            }
                            error={form.errors.currency_code}
                        />

                        <Select
                            label="Timezone"
                            value={form.data.timezone}
                            onChange={(e) => form.setData('timezone', e.target.value)}
                            error={form.errors.timezone}
                        >
                            {Object.entries(timezones || {}).map(([tz, label]) => (
                                <option key={tz} value={tz}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div
                        className={`p-3.5 rounded-xl border transition-all ${
                            form.data.force_two_factor_all_admins
                                ? 'bg-white dark:bg-slate-800/90 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                                : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 shrink-0">
                                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                    Enforce Two-Factor Authentication (2FA) for All Admins
                                </span>
                            </div>
                            <Toggle
                                checked={form.data.force_two_factor_all_admins}
                                onChange={(checked) =>
                                    form.setData('force_two_factor_all_admins', checked)
                                }
                            />
                        </div>
                    </div>

                    {/* Navigation Delivery Strategy Mode */}
                    {/* <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                    <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                                    Navigation & Menu Delivery Strategy
                                </span>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Control whether role-based navigation menus and permissions are sent with page payloads or loaded via REST API with browser caching.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => form.setData('menu_delivery_mode', 'inertia')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                        form.data.menu_delivery_mode === 'inertia'
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    Inertia Props (Classic)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => form.setData('menu_delivery_mode', 'api')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                        form.data.menu_delivery_mode === 'api'
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    REST API + LocalStorage
                                </button>
                            </div>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                            {form.data.menu_delivery_mode === 'api' ? (
                                <span>
                                    ⚡ <strong>REST API Mode (Option 2):</strong> Inertia page responses do not contain menu data, making navigation responses lightweight. Menus are cached in <code className="text-indigo-500 font-semibold">localStorage</code> and synced automatically when role permissions change.
                                </span>
                            ) : (
                                <span>
                                    📦 <strong>Inertia Props Mode (Option 1):</strong> Navigation menus are shared directly inside every Inertia page payload by the server middleware.
                                </span>
                            )}
                        </div>
                    </div> */}
                </div>
            ),
        },
        {
            id: 'orders',
            category: 'orders',
            categoryLabel: 'Orders & Catalog',
            title: 'Orders, Invoicing & Inventory',
            description: 'Order prefix, min checkout subtotal, low stock limits, and reviews.',
            icon: ShoppingCart,
            iconBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/60',
            iconColor: 'text-purple-600 dark:text-purple-400',
            badges: [
                { label: `Prefix: ${form.data.order_prefix}${form.data.order_number_start}`, variant: 'indigo' },
                { label: `Low stock: ${form.data.low_stock_threshold}`, variant: 'amber' },
            ],
            renderForm: () => (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Order Prefix"
                            placeholder="ORD-"
                            required
                            value={form.data.order_prefix}
                            onChange={(e) => form.setData('order_prefix', e.target.value)}
                            error={form.errors.order_prefix}
                        />
                        <Input
                            label="Sequence Start"
                            type="number"
                            required
                            value={form.data.order_number_start}
                            onChange={(e) =>
                                form.setData('order_number_start', parseInt(e.target.value, 10))
                            }
                            error={form.errors.order_number_start}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <Input
                            label="Low Stock Warning Threshold"
                            type="number"
                            suffixText="units"
                            value={form.data.low_stock_threshold}
                            onChange={(e) =>
                                form.setData('low_stock_threshold', parseInt(e.target.value, 10))
                            }
                        />

                        <Select
                            label="Out-of-Stock Catalog Visibility"
                            value={form.data.out_of_stock_visibility}
                            onChange={(e) =>
                                form.setData(
                                    'out_of_stock_visibility',
                                    e.target.value as StockVisibility
                                )
                            }
                        >
                            {stockVisibilityOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                            <Toggle
                                label="Allow Customer Cancellation"
                                checked={form.data.allow_customer_cancellation}
                                onChange={(checked) =>
                                    form.setData('allow_customer_cancellation', checked)
                                }
                            />
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                            <Toggle
                                label="Enable Reviews & Ratings"
                                checked={form.data.enable_customer_reviews}
                                onChange={(checked) =>
                                    form.setData('enable_customer_reviews', checked)
                                }
                            />
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                            <Toggle
                                label="Auto-Approve Reviews"
                                checked={form.data.auto_approve_reviews}
                                onChange={(checked) => form.setData('auto_approve_reviews', checked)}
                            />
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'payments',
            category: 'payments',
            categoryLabel: 'Payments & Shipping',
            title: 'Payment & Shipping Methods',
            description: 'Checkout payment gateways (Razorpay, Stripe, PayPal, COD) and delivery logistics (Flat Rate, Free Shipping, Live Carriers).',
            icon: CreditCard,
            iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/60',
            iconColor: 'text-blue-600 dark:text-blue-400',
            badges: [
                { label: `${activePaymentCount} Gateways Active`, variant: activePaymentCount > 0 ? 'emerald' : 'amber' },
                {
                    label: activeShippingCount > 0
                        ? `${activeShippingCount} Carriers Active`
                        : 'Manual Delivery',
                    variant: activeShippingCount > 0 ? 'indigo' : 'slate',
                },
            ],
            renderForm: () => (
                <div className="space-y-6">
                    {/* Payment Gateways Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                                    Payment Gateways
                                </span>
                                <span className="text-2xs text-slate-400">
                                    Enable credit card processors, payment providers, and cash on delivery.
                                </span>
                            </div>
                            <span className="text-2xs font-medium text-slate-400">
                                {activePaymentCount} of 4 Active
                            </span>
                        </div>

                        {/* Razorpay */}
                        <div
                            className={`rounded-xl border transition-all ${
                                form.data.payment_razorpay_enabled
                                    ? 'bg-white dark:bg-slate-800/90 border-blue-300 dark:border-blue-700 shadow-2xs'
                                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                            }`}
                        >
                            <div className="p-3.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 shrink-0">
                                        <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Razorpay</span>
                                </div>
                                <Toggle
                                    checked={form.data.payment_razorpay_enabled}
                                    onChange={(checked) =>
                                        form.setData('payment_razorpay_enabled', checked)
                                    }
                                />
                            </div>

                            {form.data.payment_razorpay_enabled && (
                                <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-700/60 mt-1 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                                        <Input
                                            label="Key ID"
                                            placeholder="rzp_live_... or rzp_test_..."
                                            value={form.data.payment_razorpay_key_id}
                                            onChange={(e) => form.setData('payment_razorpay_key_id', e.target.value)}
                                            leftIcon={<Key className="w-4 h-4" />}
                                        />
                                        <SecretInput
                                            label="Key Secret"
                                            placeholder="Razorpay Secret Key..."
                                            value={form.data.payment_razorpay_key_secret}
                                            onChange={(e) => form.setData('payment_razorpay_key_secret', e.target.value)}
                                            isVisible={Boolean(showSecret['payment_razorpay_key_secret'])}
                                            onToggle={() => toggleSecret('payment_razorpay_key_secret')}
                                        />
                                    </div>
                                    <SecretInput
                                        label="Webhook Secret"
                                        placeholder="Razorpay Webhook Secret..."
                                        value={form.data.payment_razorpay_webhook_secret}
                                        onChange={(e) => form.setData('payment_razorpay_webhook_secret', e.target.value)}
                                        isVisible={Boolean(showSecret['payment_razorpay_webhook_secret'])}
                                        onToggle={() => toggleSecret('payment_razorpay_webhook_secret')}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Stripe */}
                        <div
                            className={`rounded-xl border transition-all ${
                                form.data.payment_stripe_enabled
                                    ? 'bg-white dark:bg-slate-800/90 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                            }`}
                        >
                            <div className="p-3.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 shrink-0">
                                        <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Stripe</span>
                                </div>
                                <Toggle
                                    checked={form.data.payment_stripe_enabled}
                                    onChange={(checked) =>
                                        form.setData('payment_stripe_enabled', checked)
                                    }
                                />
                            </div>

                            {form.data.payment_stripe_enabled && (
                                <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-700/60 mt-1 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                                        <Input
                                            label="Publishable Key"
                                            placeholder="pk_live_..."
                                            value={form.data.payment_stripe_publishable_key}
                                            onChange={(e) => form.setData('payment_stripe_publishable_key', e.target.value)}
                                            leftIcon={<Key className="w-4 h-4" />}
                                        />
                                        <SecretInput
                                            label="Secret Key"
                                            placeholder="sk_live_..."
                                            value={form.data.payment_stripe_secret_key}
                                            onChange={(e) => form.setData('payment_stripe_secret_key', e.target.value)}
                                            isVisible={Boolean(showSecret['payment_stripe_secret_key'])}
                                            onToggle={() => toggleSecret('payment_stripe_secret_key')}
                                        />
                                    </div>
                                    <SecretInput
                                        label="Webhook Secret"
                                        placeholder="whsec_..."
                                        value={form.data.payment_stripe_webhook_secret}
                                        onChange={(e) => form.setData('payment_stripe_webhook_secret', e.target.value)}
                                        isVisible={Boolean(showSecret['payment_stripe_webhook_secret'])}
                                        onToggle={() => toggleSecret('payment_stripe_webhook_secret')}
                                    />
                                </div>
                            )}
                        </div>

                        {/* PayPal */}
                        <div
                            className={`rounded-xl border transition-all ${
                                form.data.payment_paypal_enabled
                                    ? 'bg-white dark:bg-slate-800/90 border-sky-300 dark:border-sky-700 shadow-2xs'
                                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                            }`}
                        >
                            <div className="p-3.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 shrink-0">
                                        <Wallet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">PayPal</span>
                                </div>
                                <Toggle
                                    checked={form.data.payment_paypal_enabled}
                                    onChange={(checked) =>
                                        form.setData('payment_paypal_enabled', checked)
                                    }
                                />
                            </div>

                            {form.data.payment_paypal_enabled && (
                                <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                                        <Select
                                            label="Environment"
                                            value={form.data.payment_paypal_mode}
                                            onChange={(e) => form.setData('payment_paypal_mode', e.target.value)}
                                        >
                                            <option value="sandbox">Sandbox</option>
                                            <option value="live">Live</option>
                                        </Select>
                                        <Input
                                            label="Client ID"
                                            placeholder="Client ID..."
                                            value={form.data.payment_paypal_client_id}
                                            onChange={(e) => form.setData('payment_paypal_client_id', e.target.value)}
                                            leftIcon={<Key className="w-4 h-4" />}
                                        />
                                        <SecretInput
                                            label="Client Secret"
                                            placeholder="Secret Key..."
                                            value={form.data.payment_paypal_client_secret}
                                            onChange={(e) => form.setData('payment_paypal_client_secret', e.target.value)}
                                            isVisible={Boolean(showSecret['payment_paypal_client_secret'])}
                                            onToggle={() => toggleSecret('payment_paypal_client_secret')}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cash on Delivery */}
                        <div
                            className={`rounded-xl border transition-all ${
                                form.data.payment_cod_enabled
                                    ? 'bg-white dark:bg-slate-800/90 border-emerald-300 dark:border-emerald-700 shadow-2xs'
                                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                            }`}
                        >
                            <div className="p-3.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                                        <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Cash on Delivery</span>
                                </div>
                                <Toggle
                                    checked={form.data.payment_cod_enabled}
                                    onChange={(checked) =>
                                        form.setData('payment_cod_enabled', checked)
                                    }
                                />
                            </div>

                            {form.data.payment_cod_enabled && (
                                <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                                    <div className="pt-3">
                                        <Input
                                            label="COD Instructions"
                                            placeholder="Instructions for customer at checkout..."
                                            value={form.data.payment_cod_instructions}
                                            onChange={(e) => form.setData('payment_cod_instructions', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Shipping & Delivery Logistics Section */}
                    <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                                    Shipping & Delivery Logistics
                                </span>
                                <span className="text-2xs text-slate-400">
                                    Configure store delivery methods and live carrier parcel tracking APIs.
                                </span>
                            </div>
                            <span className="text-2xs font-medium text-slate-400">
                                {activeShippingCount} of 5 Active
                            </span>
                        </div>

                        {/* Flat Rate Shipping */}
                        <div
                            className={`rounded-xl border transition-all ${
                                form.data.shipping_flat_rate_enabled
                                    ? 'bg-white dark:bg-slate-800/90 border-teal-300 dark:border-teal-700 shadow-2xs'
                                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                            }`}
                        >
                            <div className="p-3.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 shrink-0">
                                        <Truck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Flat Rate Shipping</span>
                                        <span className="text-2xs text-slate-400">Standard fixed delivery fee for customer orders</span>
                                    </div>
                                </div>
                                <Toggle
                                    checked={form.data.shipping_flat_rate_enabled}
                                    onChange={(checked) =>
                                        form.setData('shipping_flat_rate_enabled', checked)
                                    }
                                />
                            </div>

                            {form.data.shipping_flat_rate_enabled && (
                                <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                                    <div className="pt-3 max-w-xs">
                                        <Input
                                            label="Flat Rate Fee ($)"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="10.00"
                                            value={String(form.data.shipping_flat_rate_cost)}
                                            onChange={(e) => form.setData('shipping_flat_rate_cost', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Free Shipping */}
                        <div
                            className={`rounded-xl border transition-all ${
                                form.data.shipping_free_shipping_enabled
                                    ? 'bg-white dark:bg-slate-800/90 border-green-300 dark:border-green-700 shadow-2xs'
                                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                            }`}
                        >
                            <div className="p-3.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800/60 shrink-0">
                                        <PackageCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Free Shipping</span>
                                        <span className="text-2xs text-slate-400">Automatic free shipping for orders reaching cart threshold</span>
                                    </div>
                                </div>
                                <Toggle
                                    checked={form.data.shipping_free_shipping_enabled}
                                    onChange={(checked) =>
                                        form.setData('shipping_free_shipping_enabled', checked)
                                    }
                                />
                            </div>

                            {form.data.shipping_free_shipping_enabled && (
                                <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                                    <div className="pt-3 max-w-xs">
                                        <Input
                                            label="Minimum Cart Subtotal ($)"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="50.00"
                                            value={String(form.data.shipping_free_shipping_min_order)}
                                            onChange={(e) => form.setData('shipping_free_shipping_min_order', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {CARRIER_CONFIGS.map((carrier) => {
                            const isEnabled = Boolean(form.data[carrier.enabledKey]);
                            return (
                                <div
                                    key={carrier.id}
                                    className={`rounded-xl border transition-all ${
                                        isEnabled
                                            ? `bg-white dark:bg-slate-800/90 ${carrier.colorClass} shadow-2xs`
                                            : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                                    }`}
                                >
                                    <div className="p-3.5 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`p-1.5 rounded-lg border shrink-0 ${carrier.badgeBg}`}>
                                                <Truck className={`w-4 h-4 ${carrier.iconColor}`} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{carrier.name}</span>
                                        </div>
                                        <Toggle
                                            checked={isEnabled}
                                            onChange={(checked) =>
                                                form.setData(carrier.enabledKey, checked)
                                            }
                                        />
                                    </div>

                                    {isEnabled && (
                                        <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                                                <Input
                                                    label="Account Number"
                                                    placeholder="Account number..."
                                                    value={String(form.data[carrier.accountKey] ?? '')}
                                                    onChange={(e) => form.setData(carrier.accountKey, e.target.value)}
                                                />
                                                <Input
                                                    label="API Key"
                                                    placeholder="API key..."
                                                    value={String(form.data[carrier.apiKey] ?? '')}
                                                    onChange={(e) => form.setData(carrier.apiKey, e.target.value)}
                                                    leftIcon={<Key className="w-4 h-4" />}
                                                />
                                                <SecretInput
                                                    label="API Secret"
                                                    placeholder="Secret..."
                                                    value={String(form.data[carrier.secretKey] ?? '')}
                                                    onChange={(e) => form.setData(carrier.secretKey, e.target.value)}
                                                    isVisible={Boolean(showSecret[carrier.secretKey])}
                                                    onToggle={() => toggleSecret(carrier.secretKey)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ),
        },
        {
            id: 'storage',
            category: 'storage',
            categoryLabel: 'Storage',
            title: 'Media & Cloud Storage Disks',
            description: 'Local uploads, Amazon S3, or Cloudflare R2.',
            icon: HardDrive,
            iconBg: 'bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-800/60',
            iconColor: 'text-violet-600 dark:text-violet-400',
            badges: [
                {
                    label: form.data.storage_default_disk === 's3' ? 'Disk: S3 CLOUD' : 'Disk: LOCAL',
                    variant: 'indigo',
                },
            ],
            renderForm: () => (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Local Storage */}
                        <div
                            onClick={() => form.setData('storage_default_disk', 'public')}
                            className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                                form.data.storage_default_disk !== 's3'
                                    ? 'bg-white dark:bg-slate-800/90 border-violet-300 dark:border-violet-700 shadow-2xs ring-1 ring-violet-500/20'
                                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 shrink-0">
                                        <HardDrive className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                        Local Storage
                                    </span>
                                </div>
                                <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                        form.data.storage_default_disk !== 's3'
                                            ? 'border-violet-600 bg-violet-600'
                                            : 'border-slate-300 dark:border-slate-600'
                                    }`}
                                >
                                    {form.data.storage_default_disk !== 's3' && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Amazon S3 Cloud */}
                        <div
                            onClick={() => form.setData('storage_default_disk', 's3')}
                            className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                                form.data.storage_default_disk === 's3'
                                    ? 'bg-white dark:bg-slate-800/90 border-violet-300 dark:border-violet-700 shadow-2xs ring-1 ring-violet-500/20'
                                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 shrink-0">
                                        <Cloud className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                        Amazon S3 Cloud
                                    </span>
                                </div>
                                <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                        form.data.storage_default_disk === 's3'
                                            ? 'border-violet-600 bg-violet-600'
                                            : 'border-slate-300 dark:border-slate-600'
                                    }`}
                                >
                                    {form.data.storage_default_disk === 's3' && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* S3 Configuration Section */}
                    {form.data.storage_default_disk === 's3' && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                S3 / Cloud Storage Credentials
                            </span>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input
                                    label="AWS Access Key"
                                    placeholder="Key..."
                                    value={form.data.storage_s3_key}
                                    onChange={(e) => form.setData('storage_s3_key', e.target.value)}
                                    leftIcon={<Key className="w-4 h-4" />}
                                />
                                <SecretInput
                                    label="AWS Secret Key"
                                    placeholder="Secret..."
                                    value={form.data.storage_s3_secret}
                                    onChange={(e) => form.setData('storage_s3_secret', e.target.value)}
                                    isVisible={Boolean(showSecret['storage_s3_secret'])}
                                    onToggle={() => toggleSecret('storage_s3_secret')}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input
                                    label="Bucket Name"
                                    placeholder="Bucket..."
                                    value={form.data.storage_s3_bucket}
                                    onChange={(e) => form.setData('storage_s3_bucket', e.target.value)}
                                />
                                <Input
                                    label="Region"
                                    placeholder="us-east-1"
                                    value={form.data.storage_s3_region}
                                    onChange={(e) => form.setData('storage_s3_region', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input
                                    label="Custom CDN URL (Optional)"
                                    placeholder="https://cdn.yourstore.com"
                                    value={form.data.storage_s3_url}
                                    onChange={(e) => form.setData('storage_s3_url', e.target.value)}
                                />
                                <Input
                                    label="Custom S3 Endpoint (Optional for R2/MinIO)"
                                    placeholder="https://..."
                                    value={form.data.storage_s3_endpoint}
                                    onChange={(e) => form.setData('storage_s3_endpoint', e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'email_sms',
            category: 'notifications',
            categoryLabel: 'Communications',
            title: 'Email & SMS Gateway',
            description: 'SMTP mail credentials and SMS telephony provider.',
            icon: Mail,
            iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/60',
            iconColor: 'text-indigo-600 dark:text-indigo-400',
            badges: [
                { label: `Mail: ${form.data.mail_host ? 'Configured' : 'SMTP'}`, variant: 'indigo' },
                {
                    label: form.data.enable_order_sms_notifications
                        ? `SMS: ${form.data.sms_provider.toUpperCase()}`
                        : 'SMS Disabled',
                    variant: form.data.enable_order_sms_notifications ? 'emerald' : 'slate',
                },
            ],
            renderForm: () => (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                            label="SMTP Host"
                            placeholder="smtp.example.com"
                            value={form.data.mail_host}
                            onChange={(e) => form.setData('mail_host', e.target.value)}
                            error={form.errors.mail_host}
                        />

                        <Input
                            label="Port"
                            type="number"
                            placeholder="587"
                            value={form.data.mail_port}
                            onChange={(e) =>
                                form.setData('mail_port', parseInt(e.target.value, 10))
                            }
                            error={form.errors.mail_port}
                        />

                        <Select
                            label="Encryption"
                            value={form.data.mail_encryption}
                            onChange={(e) =>
                                form.setData('mail_encryption', e.target.value as MailEncryption)
                            }
                        >
                            {mailEncryptionOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                            label="SMTP Username"
                            placeholder="Username..."
                            value={form.data.mail_username}
                            onChange={(e) => form.setData('mail_username', e.target.value)}
                            error={form.errors.mail_username}
                            leftIcon={<Key className="w-4 h-4" />}
                        />

                        <SecretInput
                            label="SMTP Password"
                            placeholder="••••••••"
                            value={form.data.mail_password}
                            onChange={(e) => form.setData('mail_password', e.target.value)}
                            error={form.errors.mail_password}
                            isVisible={Boolean(showSecret['mail_password'])}
                            onToggle={() => toggleSecret('mail_password')}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                            label="Sender Name"
                            placeholder="Store Name..."
                            value={form.data.mail_from_name}
                            onChange={(e) => form.setData('mail_from_name', e.target.value)}
                            error={form.errors.mail_from_name}
                        />

                        <Input
                            label="Sender Email"
                            type="email"
                            placeholder="noreply@store.com"
                            value={form.data.mail_from_address}
                            onChange={(e) => form.setData('mail_from_address', e.target.value)}
                            error={form.errors.mail_from_address}
                        />
                    </div>

                    {/* SMS Gateway Section */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                            <Toggle
                                label="Enable SMS Gateway"
                                checked={form.data.enable_order_sms_notifications}
                                onChange={(checked) =>
                                    form.setData('enable_order_sms_notifications', checked)
                                }
                            />
                        </div>

                        {form.data.enable_order_sms_notifications && (
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                    SMS Provider Credentials
                                </span>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Select
                                        label="SMS Provider"
                                        value={form.data.sms_provider}
                                        onChange={(e) => form.setData('sms_provider', e.target.value as SmsProvider)}
                                    >
                                        {smsProviderOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </Select>

                                    <Input
                                        label="Sender Number / ID"
                                        placeholder="+1..."
                                        value={form.data.sms_from_number}
                                        onChange={(e) => form.setData('sms_from_number', e.target.value)}
                                        error={form.errors.sms_from_number}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Input
                                        label="Account SID / API Key"
                                        placeholder="SID or Key..."
                                        value={form.data.sms_username}
                                        onChange={(e) => form.setData('sms_username', e.target.value)}
                                        error={form.errors.sms_username}
                                        leftIcon={<Key className="w-4 h-4" />}
                                    />

                                    <SecretInput
                                        label="Auth Token / Secret"
                                        placeholder="••••••••"
                                        value={form.data.sms_password}
                                        onChange={(e) => form.setData('sms_password', e.target.value)}
                                        error={form.errors.sms_password}
                                        isVisible={Boolean(showSecret['sms_password'])}
                                        onToggle={() => toggleSecret('sms_password')}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'triggers',
            category: 'notifications',
            categoryLabel: 'Communications',
            title: 'Automated Notifications & Alerts',
            description: 'Customer order event triggers and admin staff alerts.',
            icon: Bell,
            iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60',
            iconColor: 'text-amber-600 dark:text-amber-400',
            badges: [
                { label: 'Event Triggers', variant: 'indigo' },
            ],
            renderForm: () => {
                const isSmsEnabled = Boolean(form.data.enable_order_sms_notifications);

                const renderAlertRow = (alert: (typeof CUSTOMER_ALERTS)[number] | (typeof ADMIN_ALERTS)[number]) => (
                    <div
                        key={alert.title}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${alert.iconBg}`}>
                                <alert.icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                    {alert.title}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {alert.description}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 w-full sm:w-auto justify-end">
                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                <Mail className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Email</span>
                                <Toggle
                                    size="sm"
                                    checked={Boolean(form.data[alert.emailKey])}
                                    onChange={(checked) => form.setData(alert.emailKey, checked)}
                                />
                            </div>

                            {isSmsEnabled && (
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">SMS</span>
                                    <Toggle
                                        size="sm"
                                        checked={Boolean(form.data[alert.smsKey])}
                                        onChange={(checked) => form.setData(alert.smsKey, checked)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );

                return (
                    <div className="space-y-6">
                        {/* Customer Alerts Group */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/80">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                        Customer Alerts
                                    </span>
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-medium">
                                        5 Events
                                    </span>
                                </div>
                                <div className="hidden sm:flex items-center gap-5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 pr-2">
                                    <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-blue-500" /> Email</span>
                                    {isSmsEnabled && (
                                        <span className="flex items-center gap-1.5"><MessageSquare className="w-3 h-3 text-emerald-500" /> SMS</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                                {CUSTOMER_ALERTS.map(renderAlertRow)}
                            </div>
                        </div>

                        {/* Admin Alerts Group */}
                        <div className="space-y-3.5 pt-2">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/80">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                                        Admin & Staff Alerts
                                    </span>
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-medium">
                                        4 Events
                                    </span>
                                </div>
                                <div className="hidden sm:flex items-center gap-5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 pr-2">
                                    <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-blue-500" /> Email</span>
                                    {isSmsEnabled && (
                                        <span className="flex items-center gap-1.5"><MessageSquare className="w-3 h-3 text-emerald-500" /> SMS</span>
                                    )}
                                </div>
                            </div>

                            {/* Recipient Delivery Target Configuration */}
                            <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            Admin Alerts Delivery Target
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Choose who receives notifications for admin events
                                        </div>
                                    </div>

                                    {/* Routing Mode Toggle: Email / Roles / Users */}
                                    <div className="inline-flex p-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={() => form.setData('admin_alert_recipient_type', 'email')}
                                            className={cn(
                                                'px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer',
                                                form.data.admin_alert_recipient_type === 'email'
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                            )}
                                        >
                                            <Mail className="w-3.5 h-3.5" />
                                            Default Email
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => form.setData('admin_alert_recipient_type', 'roles')}
                                            className={cn(
                                                'px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer',
                                                form.data.admin_alert_recipient_type === 'roles'
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                            )}
                                        >
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            By Role
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => form.setData('admin_alert_recipient_type', 'users')}
                                            className={cn(
                                                'px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer',
                                                form.data.admin_alert_recipient_type === 'users'
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                            )}
                                        >
                                            <Users className="w-3.5 h-3.5" />
                                            By User
                                        </button>
                                    </div>
                                </div>

                                {/* Option 1: Default Email */}
                                {form.data.admin_alert_recipient_type === 'email' && (
                                    <div className="pt-1">
                                        <Input
                                            label="Alert Recipient Email Address"
                                            placeholder="e.g. admin@yourstore.com"
                                            value={form.data.admin_alert_email}
                                            onChange={(e) => form.setData('admin_alert_email', e.target.value)}
                                            error={form.errors.admin_alert_email}
                                            leftIcon={<Mail className="w-4 h-4" />}
                                        />
                                    </div>
                                )}

                                {/* Option 2: By Role */}
                                {form.data.admin_alert_recipient_type === 'roles' && (
                                    <div className="pt-1 space-y-2">
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                                            Select Roles to Receive Alerts
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {roles && roles.length > 0 ? (
                                                roles.map((role) => {
                                                    const isSelected = form.data.admin_alert_roles?.includes(role.id);
                                                    return (
                                                        <button
                                                            key={role.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const current = form.data.admin_alert_roles || [];
                                                                const next = isSelected
                                                                    ? current.filter((id) => id !== role.id)
                                                                    : [...current, role.id];
                                                                form.setData('admin_alert_roles', next);
                                                            }}
                                                            className={cn(
                                                                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 cursor-pointer',
                                                                isSelected
                                                                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20'
                                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                                            )}
                                                        >
                                                            <span className={cn('w-2 h-2 rounded-full', isSelected ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600')} />
                                                            {role.name}
                                                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-xs text-slate-400 italic">No roles configured</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Option 3: By Specific Users */}
                                {form.data.admin_alert_recipient_type === 'users' && (
                                    <div className="pt-1">
                                        <MultiSelect
                                            label="Select Staff Users to Receive Alerts"
                                            placeholder="Select staff users to receive alerts..."
                                            searchPlaceholder="Search staff by name or email..."
                                            options={(staffUsers || []).map((u) => ({
                                                value: String(u.id),
                                                label: u.name,
                                                description: u.email,
                                            }))}
                                            value={form.data.admin_alert_users || []}
                                            onChange={(nextUsers) => form.setData('admin_alert_users', nextUsers)}
                                            error={form.errors.admin_alert_users}
                                            leftIcon={<Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
                                            itemTypeLabel="staff users"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                                {ADMIN_ALERTS.map(renderAlertRow)}
                            </div>
                        </div>
                    </div>
                );
            },
        },
    ], [
        form.data,
        form.errors,
        currencies,
        timezones,
        stockVisibilityOptions,
        mailEncryptionOptions,
        smsProviderOptions,
        roles,
        staffUsers,
        showSecret,
        activePaymentCount,
        activeShippingCount,
    ]);

    // Filter list by search query and category
    const filteredSettings = useMemo(() => {
        return settingsList.filter((item) => {
            if (selectedCategory !== 'all' && item.category !== selectedCategory) {
                return false;
            }
            if (!searchQuery.trim()) {
                return true;
            }
            const query = searchQuery.toLowerCase();
            return (
                item.title.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query) ||
                item.categoryLabel.toLowerCase().includes(query)
            );
        });
    }, [settingsList, searchQuery, selectedCategory]);

    const categories = useMemo(() => [
        { id: 'all', label: 'All', count: settingsList.length },
        { id: 'store', label: 'Storefront', count: 1 },
        { id: 'orders', label: 'Orders & Catalog', count: 1 },
        { id: 'payments', label: 'Payments & Shipping', count: 1 },
        { id: 'storage', label: 'Storage', count: 1 },
        { id: 'notifications', label: 'Communications', count: 2 },
    ], [settingsList.length]);

    const openCount = Object.values(openSections).filter(Boolean).length;

    return (
        <AdminLayout title="Platform & System Settings">
            <Head title="Platform Settings" />

            <div className="space-y-5">
                {/* Standard Clean Page Header */}
                <PageHeader
                    title="Platform Settings"
                    description="Configure store settings, payments, shipping, and automated notifications."
                    badge={
                        <Badge variant="emerald" size="md" dot>
                            Live Storefront
                        </Badge>
                    }
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={openCount === settingsList.length ? handleCollapseAll : handleExpandAll}
                        >
                            {openCount === settingsList.length ? 'Collapse All' : 'Expand All'}
                        </Button>
                    }
                />

                {/* Search & Category Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-3xl bg-[var(--admin-surface)] border border-slate-200/80 dark:border-white/10 shadow-xs">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Filter settings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 rounded-2xl text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20 focus:border-[var(--admin-primary)] text-slate-900 dark:text-white placeholder-slate-400"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                        {categories.map((cat) => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer tap-bounce ${
                                        isSelected
                                            ? 'bg-[var(--admin-primary)] text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* The Settings List */}
                <div className="space-y-3">
                    {filteredSettings.length === 0 ? (
                        <div className="p-8 text-center rounded-3xl bg-[var(--admin-surface)] border border-dashed border-slate-200 dark:border-white/10">
                            <SlidersHorizontal className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                No matching settings found
                            </h4>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory('all');
                                }}
                                className="mt-3"
                            >
                                Reset
                            </Button>
                        </div>
                    ) : (
                        filteredSettings.map((item) => {
                            const Icon = item.icon;
                            const isOpen = !!openSections[item.id];
                            const isSaving = savingSection === item.id;
                            const isSaved = savedSection === item.id;

                            return (
                                <div
                                    key={item.id}
                                    className={`rounded-3xl border transition-all duration-200 bg-[var(--admin-surface)] ${
                                        isOpen
                                            ? 'border-[var(--admin-primary)] shadow-sm ring-1 ring-[var(--admin-primary)]/20'
                                            : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs'
                                    }`}
                                >
                                    {/* List Row Header */}
                                    <div
                                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none group"
                                        onClick={() => toggleSection(item.id)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                toggleSection(item.id);
                                            }
                                        }}
                                    >
                                        {/* Left Side: Icon, Title, and Category Label */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`p-2 rounded-xl border shrink-0 transition-transform duration-200 group-hover:scale-105 ${item.iconBg} ${item.iconColor}`}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                                        {item.title}
                                                    </h3>
                                                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                        {item.categoryLabel}
                                                    </span>
                                                </div>

                                                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Side: Badges + Chevron Toggle Button */}
                                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                                            {/* Summary Badges */}
                                            <div className="hidden md:flex items-center gap-1.5">
                                                {item.badges.map((badge, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                                            badge.variant === 'emerald'
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                                                                : badge.variant === 'indigo'
                                                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50'
                                                                : badge.variant === 'amber'
                                                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/60'
                                                        }`}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Clear, elegant Chevron Toggle Indicator */}
                                            <div
                                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                                                    isOpen
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                                        : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-400 group-hover:bg-slate-200/70 dark:group-hover:bg-slate-700/70 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                                                }`}
                                            >
                                                <ChevronDown
                                                    className={`w-4 h-4 transition-transform duration-200 ${
                                                        isOpen ? 'rotate-180' : ''
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Clean Form */}
                                    {isOpen && (
                                        <div className="border-t border-slate-200 dark:border-slate-800/80 px-4 pt-4 pb-4 sm:px-5 sm:pt-5 sm:pb-5 bg-slate-50/30 dark:bg-slate-900/40 animate-fade-in">
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    handleSaveSection(item.id);
                                                }}
                                            >
                                                {item.renderForm()}

                                                {/* Clean Action Footer */}
                                                <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                                                    {isSaved && (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
                                                            <Check className="w-3.5 h-3.5" /> Saved successfully
                                                        </span>
                                                    )}

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toggleSection(item.id)}
                                                    >
                                                        Close
                                                    </Button>

                                                    <Button
                                                        type="submit"
                                                        variant="primary"
                                                        size="sm"
                                                        isLoading={isSaving}
                                                        disabled={form.processing}
                                                        leftIcon={<Save className="w-3.5 h-3.5" />}
                                                    >
                                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                                    </Button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

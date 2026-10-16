import React, { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import {
    PageProps,
    CurrencyPosition,
    StockVisibility,
    MailDriver,
    MailEncryption,
    SmsProvider,
    SmtpPreset,
    CURRENCY_DECIMAL_OPTIONS,
    SMTP_PRESETS,
} from '../../types';
import { useEssentials } from '../../hooks/useEssentials';
import {
    Button,
    Input,
    Select,
    Toggle,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    PageHeader,
} from '../../Components/UI';
import {
    Clock,
    DollarSign,
    ShieldCheck,
    ShoppingCart,
    Package,
    CreditCard,
    Wrench,
    Save,
    CheckCircle2,
    Lock,
    Sparkles,
    AlertTriangle,
    Bell,
    Mail,
    Send,
    Smartphone,
    Inbox,
    Wallet,
    Building2,
    Banknote,
    MessageSquare,
    Eye,
    EyeOff,
    Server,
    Key,
    Truck,
    HardDrive,
    Cloud,
} from 'lucide-react';

interface SettingsProps extends PageProps {
    settings: {
        currency_code: string;
        currency_symbol: string;
        currency_position: CurrencyPosition;
        currency_decimals: number;
        timezone: string;
        date_format: string;
        time_format: string;

        force_two_factor_all_admins: boolean;
        session_lifetime_minutes: number;
        max_login_attempts: number;
        lockout_duration_minutes: number;
        require_strong_passwords: boolean;

        order_prefix: string;
        order_number_start: number;
        min_order_amount: number;
        allow_customer_cancellation: boolean;

        low_stock_threshold: number;
        out_of_stock_visibility: StockVisibility;
        enable_customer_reviews: boolean;
        auto_approve_reviews: boolean;

        payment_cod_enabled: boolean;
        payment_stripe_enabled: boolean;
        payment_paypal_enabled: boolean;
        payment_bank_transfer_enabled: boolean;

        mail_mailer?: MailDriver;
        mail_host?: string;
        mail_port?: number;
        mail_username?: string;
        mail_password?: string;
        mail_encryption?: MailEncryption;

        sms_provider?: SmsProvider;
        sms_username?: string;
        sms_password?: string;
        sms_from_number?: string;

        mail_from_name?: string;
        mail_from_address?: string;
        admin_alert_email?: string;
        enable_email_notifications?: boolean;
        enable_in_app_notifications?: boolean;
        enable_order_sms_notifications?: boolean;
        notify_order_placed_customer?: boolean;
        notify_order_placed_admin?: boolean;
        notify_order_status_updated?: boolean;
        notify_order_cancelled?: boolean;
        notify_low_stock_admin?: boolean;
        notify_new_customer_welcome?: boolean;
        notify_new_review_admin?: boolean;

        maintenance_mode: boolean;
        maintenance_notice?: string;
        allow_admin_bypass_maintenance: boolean;
    };
    timezones: Record<string, string>;
    currencies: Array<{ code: string; symbol: string; name: string }>;
}

type TabType = 'localization' | 'security' | 'orders' | 'shipping' | 'storage' | 'notifications' | 'inventory' | 'maintenance';
type NotificationSubTab = 'smtp' | 'sms' | 'triggers';

export default function Settings({ settings, timezones, currencies, flash }: SettingsProps) {
    const { getOptions, constants, toOptions } = useEssentials();

    const currencyPositionOptions = getOptions<CurrencyPosition>('currency_position');
    const stockVisibilityOptions = getOptions<StockVisibility>('stock_visibility');
    const mailDriverOptions = getOptions<MailDriver>('mail_driver');
    const mailEncryptionOptions = getOptions<MailEncryption>('mail_encryption');
    const smsProviderOptions = getOptions<SmsProvider>('sms_provider');
    const dateFormatOptions = toOptions(constants.date_formats);
    const timeFormatOptions = toOptions(constants.time_formats);

    const [activeTab, setActiveTab] = useState<TabType>('localization');
    const [notificationSubTab, setNotificationSubTab] = useState<NotificationSubTab>('smtp');
    const [currentTimePreview, setCurrentTimePreview] = useState<string>('');
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

    // Password & Secret visibility toggles
    const [showSmtpPassword, setShowSmtpPassword] = useState<boolean>(false);
    const [showSmsPassword, setShowSmsPassword] = useState<boolean>(false);
    const [showStripeSecret, setShowStripeSecret] = useState<boolean>(false);
    const [showStripeWebhookSecret, setShowStripeWebhookSecret] = useState<boolean>(false);
    const [showPaypalSecret, setShowPaypalSecret] = useState<boolean>(false);
    const [showS3Secret, setShowS3Secret] = useState<boolean>(false);
    const [showCarrierSecret, setShowCarrierSecret] = useState<boolean>(false);

    const form = useForm({
        currency_code: settings?.currency_code ?? 'USD',
        currency_symbol: settings?.currency_symbol ?? '$',
        currency_position: settings?.currency_position ?? 'prefix',
        currency_decimals: settings?.currency_decimals ?? 2,
        timezone: settings?.timezone ?? 'UTC',
        date_format: settings?.date_format ?? 'Y-m-d',
        time_format: settings?.time_format ?? 'h:i A',

        force_two_factor_all_admins: settings?.force_two_factor_all_admins ?? true,
        session_lifetime_minutes: settings?.session_lifetime_minutes ?? 120,
        max_login_attempts: settings?.max_login_attempts ?? 5,
        lockout_duration_minutes: settings?.lockout_duration_minutes ?? 15,
        require_strong_passwords: settings?.require_strong_passwords ?? true,

        order_prefix: settings?.order_prefix ?? 'ORD-',
        order_number_start: settings?.order_number_start ?? 1001,
        min_order_amount: settings?.min_order_amount ?? 10.0,
        allow_customer_cancellation: settings?.allow_customer_cancellation ?? true,

        low_stock_threshold: settings?.low_stock_threshold ?? 5,
        out_of_stock_visibility: settings?.out_of_stock_visibility ?? 'badge',
        enable_customer_reviews: settings?.enable_customer_reviews ?? true,
        auto_approve_reviews: settings?.auto_approve_reviews ?? false,

        payment_cod_enabled: settings?.payment_cod_enabled ?? true,
        payment_stripe_enabled: settings?.payment_stripe_enabled ?? true,
        payment_paypal_enabled: settings?.payment_paypal_enabled ?? true,
        payment_bank_transfer_enabled: settings?.payment_bank_transfer_enabled ?? false,

        // Payment Gateway Credentials
        payment_stripe_publishable_key: (settings as any)?.payment_settings?.stripe?.publishable_key ?? '',
        payment_stripe_secret_key: (settings as any)?.payment_settings?.stripe?.secret_key ?? '',
        payment_stripe_webhook_secret: (settings as any)?.payment_settings?.stripe?.webhook_secret ?? '',
        payment_paypal_mode: (settings as any)?.payment_settings?.paypal?.mode ?? 'sandbox',
        payment_paypal_client_id: (settings as any)?.payment_settings?.paypal?.client_id ?? '',
        payment_paypal_client_secret: (settings as any)?.payment_settings?.paypal?.client_secret ?? '',
        payment_bank_name: (settings as any)?.payment_settings?.bank_transfer?.bank_name ?? '',
        payment_bank_account_name: (settings as any)?.payment_settings?.bank_transfer?.account_name ?? '',
        payment_bank_account_number: (settings as any)?.payment_settings?.bank_transfer?.account_number ?? '',
        payment_bank_routing_number: (settings as any)?.payment_settings?.bank_transfer?.routing_number ?? '',
        payment_bank_swift_code: (settings as any)?.payment_settings?.bank_transfer?.swift_code ?? '',
        payment_bank_instructions: (settings as any)?.payment_settings?.bank_transfer?.instructions ?? '',
        payment_cod_instructions: (settings as any)?.payment_settings?.cod?.instructions ?? '',

        // Storage Settings
        storage_default_disk: (settings as any)?.storage_settings?.default_disk ?? 'public',
        storage_s3_key: (settings as any)?.storage_settings?.s3?.key ?? '',
        storage_s3_secret: (settings as any)?.storage_settings?.s3?.secret ?? '',
        storage_s3_region: (settings as any)?.storage_settings?.s3?.region ?? 'us-east-1',
        storage_s3_bucket: (settings as any)?.storage_settings?.s3?.bucket ?? '',
        storage_s3_url: (settings as any)?.storage_settings?.s3?.url ?? '',
        storage_s3_endpoint: (settings as any)?.storage_settings?.s3?.endpoint ?? '',

        // Shipping Settings
        shipping_default_method: (settings as any)?.shipping_settings?.default_method ?? 'flat_rate',
        shipping_flat_rate_cost: (settings as any)?.shipping_settings?.flat_rate?.cost ?? 10.0,
        shipping_free_shipping_enabled: (settings as any)?.shipping_settings?.free_shipping?.enabled ?? true,
        shipping_free_shipping_min_order: (settings as any)?.shipping_settings?.free_shipping?.min_order_amount ?? 100.0,
        shipping_carrier_provider: (settings as any)?.shipping_settings?.carrier?.provider ?? 'none',
        shipping_carrier_account_number: (settings as any)?.shipping_settings?.carrier?.account_number ?? '',
        shipping_carrier_api_key: (settings as any)?.shipping_settings?.carrier?.api_key ?? '',
        shipping_carrier_api_secret: (settings as any)?.shipping_settings?.carrier?.api_secret ?? '',

        // SMTP Credentials
        mail_mailer: settings?.mail_mailer ?? 'smtp',
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
        admin_alert_email: settings?.admin_alert_email ?? 'admin@example.com',
        enable_email_notifications: settings?.enable_email_notifications ?? true,
        enable_in_app_notifications: settings?.enable_in_app_notifications ?? true,
        enable_order_sms_notifications: settings?.enable_order_sms_notifications ?? false,
        notify_order_placed_customer: settings?.notify_order_placed_customer ?? true,
        notify_order_placed_admin: settings?.notify_order_placed_admin ?? true,
        notify_order_status_updated: settings?.notify_order_status_updated ?? true,
        notify_order_cancelled: settings?.notify_order_cancelled ?? true,
        notify_low_stock_admin: settings?.notify_low_stock_admin ?? true,
        notify_new_customer_welcome: settings?.notify_new_customer_welcome ?? true,
        notify_new_review_admin: settings?.notify_new_review_admin ?? true,

        maintenance_mode: settings?.maintenance_mode ?? false,
        maintenance_notice:
            settings?.maintenance_notice ??
            'We are currently performing scheduled maintenance to improve your shopping experience. Please check back shortly!',
        allow_admin_bypass_maintenance: settings?.allow_admin_bypass_maintenance ?? true,
    });

    useEffect(() => {
        const updateClock = () => {
            try {
                const now = new Date();
                const formatted = new Intl.DateTimeFormat('en-US', {
                    timeZone: form.data.timezone || 'UTC',
                    dateStyle: 'full',
                    timeStyle: 'medium',
                }).format(now);
                setCurrentTimePreview(formatted);
            } catch {
                setCurrentTimePreview(new Date().toUTCString());
            }
        };

        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, [form.data.timezone]);

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

    // Quick SMTP Presets
    const applySmtpPreset = (preset: SmtpPreset) => {
        const presetConfig = SMTP_PRESETS[preset];
        if (presetConfig) {
            form.setData((prev) => ({
                ...prev,
                ...presetConfig,
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/settings', {
            preserveScroll: true,
            onSuccess: () => {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3500);
            },
        });
    };

    const sampleAmount = 1499.5;
    const formattedSample =
        form.data.currency_position === 'prefix'
            ? `${form.data.currency_symbol}${sampleAmount.toFixed(form.data.currency_decimals)}`
            : `${sampleAmount.toFixed(form.data.currency_decimals)} ${form.data.currency_symbol}`;

    const activePaymentCount = [
        form.data.payment_stripe_enabled,
        form.data.payment_paypal_enabled,
        form.data.payment_cod_enabled,
        form.data.payment_bank_transfer_enabled,
    ].filter(Boolean).length;

    const tabs: Array<{
        id: TabType;
        label: string;
        description: string;
        icon: React.ComponentType<{ className?: string }>;
        badge?: string;
    }> = [
        {
            id: 'localization',
            label: 'Localization & Currency',
            description: 'Currency, timezone & formatting',
            icon: Clock,
            badge: form.data.currency_code,
        },
        {
            id: 'security',
            label: 'Security & Access',
            description: '2FA policy & rate limiting',
            icon: ShieldCheck,
            badge: form.data.force_two_factor_all_admins ? '2FA Active' : undefined,
        },
        {
            id: 'orders',
            label: 'Orders & Payments',
            description: 'Invoicing & payment gateways',
            icon: ShoppingCart,
            badge: `${activePaymentCount} Gateways`,
        },
        {
            id: 'shipping',
            label: 'Shipping & Delivery',
            description: 'Flat rate, free delivery & carriers',
            icon: Truck,
            badge: form.data.shipping_free_shipping_enabled ? 'Free Delivery On' : undefined,
        },
        {
            id: 'storage',
            label: 'Storage & Cloud Assets',
            description: 'Media upload disk & S3 buckets',
            icon: HardDrive,
            badge: (form.data.storage_default_disk ?? 'public').toUpperCase(),
        },
        {
            id: 'notifications',
            label: 'Notifications, SMTP & SMS',
            description: 'Mail credentials & triggers',
            icon: Bell,
        },
        {
            id: 'inventory',
            label: 'Catalog & Inventory',
            description: 'Stock thresholds & reviews',
            icon: Package,
            badge: `${form.data.low_stock_threshold} units`,
        },
        {
            id: 'maintenance',
            label: 'System & Maintenance',
            description: 'Store maintenance & notice',
            icon: Wrench,
            badge: form.data.maintenance_mode ? 'Active' : undefined,
        },
    ];

    return (
        <AdminLayout title="Platform & System Settings">
            <Head title="Platform Settings" />

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Clean Standard PageHeader (Replaces bulky dark banner) */}
                <PageHeader
                    title="Platform & Store Settings"
                    description="Configure global business currencies, payment gateways, outbound SMTP email credentials, SMS gateway credentials, and automated notifications."
                    badge={
                        form.data.maintenance_mode ? (
                            <Badge variant="amber" size="md" dot icon={<AlertTriangle className="w-3.5 h-3.5" />}>
                                Maintenance Active
                            </Badge>
                        ) : (
                            <Badge variant="emerald" size="md" dot>
                                Live Storefront
                            </Badge>
                        )
                    }
                    actions={
                        <div className="flex items-center gap-3">
                            {saveSuccess && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl">
                                    <CheckCircle2 className="w-4 h-4" /> Changes saved!
                                </span>
                            )}
                            <Button
                                type="submit"
                                variant="primary"
                                size="md"
                                isLoading={form.processing}
                                leftIcon={<Save className="w-4 h-4" />}
                            >
                                Save All Settings
                            </Button>
                        </div>
                    }
                />

                {/* Mobile Horizontal Pill Navigation (Only visible on small screens) */}
                <div className="lg:hidden flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-x-auto scrollbar-none">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span
                                        className={`px-1.5 py-0.2 text-[10px] font-bold rounded-md ${
                                            isActive
                                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}
                                    >
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Desktop 2-Column Responsive Settings Layout: Left Navigation + Right Content */}
                <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
                    {/* Left Column: Dedicated Vertical Tab Navigation (Tabs are ALWAYS fully visible) */}
                    <div className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-6">
                        <div className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-1">
                            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Configuration Categories
                            </div>

                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer select-none group ${
                                            isActive
                                                ? 'bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                            <div
                                                className={`p-2 rounded-xl shrink-0 transition-colors ${
                                                    isActive
                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold leading-tight truncate">
                                                    {tab.label}
                                                </div>
                                                <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                                    {tab.description}
                                                </div>
                                            </div>
                                        </div>

                                        {tab.badge && (
                                            <span
                                                className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-md leading-none ${
                                                    isActive
                                                        ? 'bg-indigo-200/70 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                {tab.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Column: Settings Content Cards */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                        {/* ================= TAB 1: Localization & Currency ================= */}
                        {activeTab === 'localization' && (
                            <div className="space-y-6 animate-fade-in">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                                                <DollarSign className="w-5 h-5" />
                                            </span>
                                            <div>
                                                <CardTitle>Store Currency Configuration</CardTitle>
                                                <CardDescription>
                                                    Define primary currency, ISO codes, symbol positioning, and display decimals.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-2">
                                        {currencies && currencies.length > 0 && (
                                            <Select
                                                label="Currency Quick Preset"
                                                value={form.data.currency_code}
                                                onChange={(e) => handleCurrencySelect(e.target.value)}
                                                helperText="Selecting a preset automatically fills the ISO code and symbol."
                                            >
                                                {currencies.map((c) => (
                                                    <option key={c.code} value={c.code}>
                                                        {c.code} ({c.symbol}) - {c.name}
                                                    </option>
                                                ))}
                                            </Select>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input
                                                label="Currency ISO Code"
                                                required
                                                value={form.data.currency_code}
                                                onChange={(e) =>
                                                    form.setData('currency_code', e.target.value.toUpperCase())
                                                }
                                                error={form.errors.currency_code}
                                            />
                                            <Input
                                                label="Currency Symbol"
                                                required
                                                value={form.data.currency_symbol}
                                                onChange={(e) => form.setData('currency_symbol', e.target.value)}
                                                error={form.errors.currency_symbol}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Select
                                                label="Symbol Placement"
                                                value={form.data.currency_position}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'currency_position',
                                                        e.target.value as CurrencyPosition
                                                    )
                                                }
                                            >
                                                {currencyPositionOptions.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </Select>

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

                                        {/* Live preview card */}
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    Live Price Display Preview
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                                                    Formatted Total
                                                </span>
                                            </div>
                                            <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                                                {formattedSample}
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                                Visual presentation across product catalog cards, cart subtotals, and receipts.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50">
                                                <Clock className="w-5 h-5" />
                                            </span>
                                            <div>
                                                <CardTitle>Timezone &amp; Timestamp Formatting</CardTitle>
                                                <CardDescription>
                                                    Synchronize order logs, flash sale schedules, and audit records with your regional timezone.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-2">
                                        <Select
                                            label="Server & Store Timezone"
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

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Select
                                                label="Date Format"
                                                value={form.data.date_format}
                                                onChange={(e) => form.setData('date_format', e.target.value)}
                                            >
                                                {dateFormatOptions.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </Select>

                                            <Select
                                                label="Time Format"
                                                value={form.data.time_format}
                                                onChange={(e) => form.setData('time_format', e.target.value)}
                                            >
                                                {timeFormatOptions.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </Select>
                                        </div>

                                        {/* Time preview */}
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    Current Localized Clock
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    {form.data.timezone}
                                                </span>
                                            </div>
                                            <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                                                {currentTimePreview}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-1">
                                                Administrative reports and timestamps reflect this active regional clock.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ================= TAB 2: Security & Access ================= */}
                        {activeTab === 'security' && (
                            <div className="space-y-6 animate-fade-in">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                                                <ShieldCheck className="w-5 h-5" />
                                            </span>
                                            <div>
                                                <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                                                <CardDescription>
                                                    Strengthen administrative console protection with mandatory TOTP authenticator requirements.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-2">
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                            <Toggle
                                                label="Enforce Two-Factor Authentication (2FA) for All Admins"
                                                description="Prevent administrative access until the user has successfully configured a TOTP authenticator app."
                                                checked={form.data.force_two_factor_all_admins}
                                                onChange={(checked) =>
                                                    form.setData('force_two_factor_all_admins', checked)
                                                }
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50">
                                                <Lock className="w-5 h-5" />
                                            </span>
                                            <div>
                                                <CardTitle>Session Security &amp; Brute-Force Defense</CardTitle>
                                                <CardDescription>
                                                    Mitigate credential attacks, control idle timeouts, and enforce password complexity.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-2">
                                        <Input
                                            label="Session Inactivity Lifetime (Minutes)"
                                            type="number"
                                            suffixText="min"
                                            required
                                            value={form.data.session_lifetime_minutes}
                                            onChange={(e) =>
                                                form.setData('session_lifetime_minutes', parseInt(e.target.value, 10))
                                            }
                                            error={form.errors.session_lifetime_minutes}
                                            helperText="Staff members will be logged out after this duration of inactivity."
                                        />

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input
                                                label="Max Failed Login Attempts"
                                                type="number"
                                                required
                                                value={form.data.max_login_attempts}
                                                onChange={(e) =>
                                                    form.setData('max_login_attempts', parseInt(e.target.value, 10))
                                                }
                                                error={form.errors.max_login_attempts}
                                                helperText="Attempts before temporary lockout."
                                            />

                                            <Input
                                                label="Lockout Duration (Minutes)"
                                                type="number"
                                                suffixText="min"
                                                required
                                                value={form.data.lockout_duration_minutes}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'lockout_duration_minutes',
                                                        parseInt(e.target.value, 10)
                                                    )
                                                }
                                                error={form.errors.lockout_duration_minutes}
                                                helperText="Penalty cooling off duration."
                                            />
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <Toggle
                                                label="Require Strong Password Complexity"
                                                description="Enforce minimum 8 characters with a mix of letters, numbers, and symbols."
                                                checked={form.data.require_strong_passwords}
                                                onChange={(checked) =>
                                                    form.setData('require_strong_passwords', checked)
                                                }
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ================= TAB 3: Orders & Payments ================= */}
                        {activeTab === 'orders' && (
                            <div className="space-y-6 animate-fade-in">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                                                <ShoppingCart className="w-5 h-5" />
                                            </span>
                                            <div>
                                                <CardTitle>Order Numbering &amp; Identification</CardTitle>
                                                <CardDescription>
                                                    Customize invoice reference prefixes and starting sequential counter.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-2">
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
                                                label="Sequence Counter Start"
                                                type="number"
                                                required
                                                value={form.data.order_number_start}
                                                onChange={(e) =>
                                                    form.setData('order_number_start', parseInt(e.target.value, 10))
                                                }
                                                error={form.errors.order_number_start}
                                            />
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                                                Next Order Invoice Number Preview
                                            </span>
                                            <span className="font-mono font-bold text-lg text-indigo-600 dark:text-indigo-400 mt-1 block">
                                                {form.data.order_prefix}
                                                {form.data.order_number_start}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                                                <Sparkles className="w-5 h-5" />
                                            </span>
                                            <div>
                                                <CardTitle>Checkout Rules &amp; Order Policies</CardTitle>
                                                <CardDescription>
                                                    Establish minimum checkout values and customer cancellation rules.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-2">
                                        <Input
                                            label="Minimum Order Subtotal"
                                            type="number"
                                            step="0.01"
                                            prefixText={form.data.currency_symbol}
                                            value={form.data.min_order_amount}
                                            onChange={(e) =>
                                                form.setData('min_order_amount', parseFloat(e.target.value))
                                            }
                                            helperText="Customers cannot proceed to checkout if cart subtotal is below this threshold."
                                        />

                                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                            <Toggle
                                                label="Allow Self-Service Order Cancellation"
                                                description="Customers can cancel orders directly from their account dashboard while order status is 'Pending'."
                                                checked={form.data.allow_customer_cancellation}
                                                onChange={(checked) =>
                                                    form.setData('allow_customer_cancellation', checked)
                                                }
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Payment Gateways Card */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                                                    <CreditCard className="w-5 h-5" />
                                                </span>
                                                <div>
                                                    <CardTitle>Checkout Payment Gateways &amp; Methods</CardTitle>
                                                    <CardDescription>
                                                        Configure which payment channels customers can select during checkout.
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <Badge variant="indigo" size="sm">
                                                {activePaymentCount} Active
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Stripe */}
                                            <div
                                                className={`p-4 rounded-2xl border transition-all ${
                                                    form.data.payment_stripe_enabled
                                                        ? 'bg-white dark:bg-slate-800/90 border-indigo-300 dark:border-indigo-700 shadow-xs'
                                                        : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-75'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 shrink-0">
                                                            <CreditCard className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                                Stripe (Cards)
                                                                {form.data.payment_stripe_enabled && (
                                                                    <Badge variant="emerald" size="sm">
                                                                        Active
                                                                    </Badge>
                                                                )}
                                                            </h4>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                Visa, Mastercard, Amex, Apple Pay &amp; Google Pay.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Toggle
                                                        checked={form.data.payment_stripe_enabled}
                                                        onChange={(checked) =>
                                                            form.setData('payment_stripe_enabled', checked)
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* PayPal */}
                                            <div
                                                className={`p-4 rounded-2xl border transition-all ${
                                                    form.data.payment_paypal_enabled
                                                        ? 'bg-white dark:bg-slate-800/90 border-sky-300 dark:border-sky-700 shadow-xs'
                                                        : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-75'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50 shrink-0">
                                                            <Wallet className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                                PayPal Express
                                                                {form.data.payment_paypal_enabled && (
                                                                    <Badge variant="emerald" size="sm">
                                                                        Active
                                                                    </Badge>
                                                                )}
                                                            </h4>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                One-touch payments via PayPal wallet &amp; Pay in 4.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Toggle
                                                        checked={form.data.payment_paypal_enabled}
                                                        onChange={(checked) =>
                                                            form.setData('payment_paypal_enabled', checked)
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* COD */}
                                            <div
                                                className={`p-4 rounded-2xl border transition-all ${
                                                    form.data.payment_cod_enabled
                                                        ? 'bg-white dark:bg-slate-800/90 border-emerald-300 dark:border-emerald-700 shadow-xs'
                                                        : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-75'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 shrink-0">
                                                            <Banknote className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                                Cash on Delivery (COD)
                                                                {form.data.payment_cod_enabled && (
                                                                    <Badge variant="emerald" size="sm">
                                                                        Active
                                                                    </Badge>
                                                                )}
                                                            </h4>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                Customer pays cash to delivery courier upon arrival.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Toggle
                                                        checked={form.data.payment_cod_enabled}
                                                        onChange={(checked) =>
                                                            form.setData('payment_cod_enabled', checked)
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* Bank Wire */}
                                            <div
                                                className={`p-4 rounded-2xl border transition-all ${
                                                    form.data.payment_bank_transfer_enabled
                                                        ? 'bg-white dark:bg-slate-800/90 border-amber-300 dark:border-amber-700 shadow-xs'
                                                        : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-75'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 shrink-0">
                                                            <Building2 className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                                Direct Bank Wire Transfer
                                                                {form.data.payment_bank_transfer_enabled && (
                                                                    <Badge variant="emerald" size="sm">
                                                                        Active
                                                                    </Badge>
                                                                )}
                                                            </h4>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                Offline wire transfers held pending manual approval.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Toggle
                                                        checked={form.data.payment_bank_transfer_enabled}
                                                        onChange={(checked) =>
                                                            form.setData('payment_bank_transfer_enabled', checked)
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stripe Credentials Section (when enabled) */}
                                        {form.data.payment_stripe_enabled && (
                                            <div className="mt-6 p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                                                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm">
                                                    <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                    <span>Stripe API Credentials (Encrypted at Rest)</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <Input
                                                        label="Publishable API Key"
                                                        placeholder="pk_live_..."
                                                        value={form.data.payment_stripe_publishable_key}
                                                        onChange={(e) => form.setData('payment_stripe_publishable_key', e.target.value)}
                                                        leftIcon={<Key className="w-4 h-4" />}
                                                    />
                                                    <Input
                                                        label="Secret API Key"
                                                        type={showStripeSecret ? 'text' : 'password'}
                                                        placeholder="sk_live_..."
                                                        value={form.data.payment_stripe_secret_key}
                                                        onChange={(e) => form.setData('payment_stripe_secret_key', e.target.value)}
                                                        leftIcon={<Lock className="w-4 h-4" />}
                                                        rightIcon={
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowStripeSecret(!showStripeSecret)}
                                                                className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                                                tabIndex={-1}
                                                            >
                                                                {showStripeSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        }
                                                    />
                                                </div>
                                                <Input
                                                    label="Stripe Webhook Signing Secret"
                                                    type={showStripeWebhookSecret ? 'text' : 'password'}
                                                    placeholder="whsec_..."
                                                    value={form.data.payment_stripe_webhook_secret}
                                                    onChange={(e) => form.setData('payment_stripe_webhook_secret', e.target.value)}
                                                    leftIcon={<Lock className="w-4 h-4" />}
                                                    rightIcon={
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowStripeWebhookSecret(!showStripeWebhookSecret)}
                                                            className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                                            tabIndex={-1}
                                                        >
                                                            {showStripeWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    }
                                                />
                                            </div>
                                        )}

                                        {/* PayPal Credentials Section (when enabled) */}
                                        {form.data.payment_paypal_enabled && (
                                            <div className="mt-4 p-5 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-4">
                                                <div className="flex items-center gap-2 text-sky-900 dark:text-sky-200 font-bold text-sm">
                                                    <Lock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                                    <span>PayPal API Credentials (Encrypted at Rest)</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <Select
                                                        label="PayPal Environment"
                                                        value={form.data.payment_paypal_mode}
                                                        onChange={(e) => form.setData('payment_paypal_mode', e.target.value)}
                                                    >
                                                        <option value="sandbox">Sandbox (Testing)</option>
                                                        <option value="live">Live (Production)</option>
                                                    </Select>
                                                    <Input
                                                        label="PayPal Client ID"
                                                        placeholder="Client ID..."
                                                        value={form.data.payment_paypal_client_id}
                                                        onChange={(e) => form.setData('payment_paypal_client_id', e.target.value)}
                                                        leftIcon={<Key className="w-4 h-4" />}
                                                    />
                                                    <Input
                                                        label="PayPal Client Secret"
                                                        type={showPaypalSecret ? 'text' : 'password'}
                                                        placeholder="Secret Key..."
                                                        value={form.data.payment_paypal_client_secret}
                                                        onChange={(e) => form.setData('payment_paypal_client_secret', e.target.value)}
                                                        leftIcon={<Lock className="w-4 h-4" />}
                                                        rightIcon={
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPaypalSecret(!showPaypalSecret)}
                                                                className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                                                tabIndex={-1}
                                                            >
                                                                {showPaypalSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ================= TAB: Shipping & Delivery ================= */}
                        {activeTab === 'shipping' && (
                            <div className="space-y-6 animate-fade-in">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                                                <Truck className="w-5 h-5" />
                                            </span>
                                            <div>
                                                <CardTitle>Shipping &amp; Delivery Configuration</CardTitle>
                                                <CardDescription>
                                                    Configure default delivery rates, free shipping cart thresholds, and live courier carrier API credentials.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5 pt-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Select
                                                label="Primary Shipping Calculation Method"
                                                value={form.data.shipping_default_method}
                                                onChange={(e) => form.setData('shipping_default_method', e.target.value)}
                                            >
                                                <option value="flat_rate">Flat Rate Per Order</option>
                                                <option value="free_shipping">Free Shipping on All Orders</option>
                                                <option value="carrier_api">Real-time Carrier Calculation (FedEx / UPS / DHL)</option>
                                            </Select>

                                            <Input
                                                label="Standard Flat Rate Cost ($)"
                                                type="number"
                                                step="0.01"
                                                value={form.data.shipping_flat_rate_cost}
                                                onChange={(e) => form.setData('shipping_flat_rate_cost', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
                                            <Toggle
                                                label="Enable Free Shipping on Order Minimums"
                                                description="Automatically grant free delivery when customer cart subtotal meets or exceeds threshold."
                                                checked={form.data.shipping_free_shipping_enabled}
                                                onChange={(checked) => form.setData('shipping_free_shipping_enabled', checked)}
                                            />

                                            {form.data.shipping_free_shipping_enabled && (
                                                <Input
                                                    label="Free Shipping Cart Subtotal Threshold ($)"
                                                    type="number"
                                                    step="0.01"
                                                    value={form.data.shipping_free_shipping_min_order}
                                                    onChange={(e) => form.setData('shipping_free_shipping_min_order', parseFloat(e.target.value) || 0)}
                                                    helperText="Orders with subtotal above this amount get free shipping automatically."
                                                />
                                            )}
                                        </div>

                                        {/* Carrier API Configuration */}
                                        <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
                                            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                                                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                <span>Carrier API Integration (Encrypted Credentials)</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Select
                                                    label="Carrier Provider"
                                                    value={form.data.shipping_carrier_provider}
                                                    onChange={(e) => form.setData('shipping_carrier_provider', e.target.value)}
                                                >
                                                    <option value="none">None (Manual Rates)</option>
                                                    <option value="fedex">FedEx Express & Ground</option>
                                                    <option value="ups">UPS Logistics</option>
                                                    <option value="dhl">DHL Express Worldwide</option>
                                                </Select>

                                                <Input
                                                    label="Carrier Account / Meter Number"
                                                    placeholder="Account number..."
                                                    value={form.data.shipping_carrier_account_number}
                                                    onChange={(e) => form.setData('shipping_carrier_account_number', e.target.value)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input
                                                    label="Carrier API Client ID / Key"
                                                    placeholder="API key..."
                                                    value={form.data.shipping_carrier_api_key}
                                                    onChange={(e) => form.setData('shipping_carrier_api_key', e.target.value)}
                                                    leftIcon={<Key className="w-4 h-4" />}
                                                />
                                                <Input
                                                    label="Carrier API Secret (Encrypted)"
                                                    type={showCarrierSecret ? 'text' : 'password'}
                                                    placeholder="••••••••••••••••"
                                                    value={form.data.shipping_carrier_api_secret}
                                                    onChange={(e) => form.setData('shipping_carrier_api_secret', e.target.value)}
                                                    leftIcon={<Lock className="w-4 h-4" />}
                                                    rightIcon={
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCarrierSecret(!showCarrierSecret)}
                                                            className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                                            tabIndex={-1}
                                                        >
                                                            {showCarrierSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ================= TAB: Storage & Cloud Assets ================= */}
                        {activeTab === 'storage' && (
                            <div className="space-y-6 animate-fade-in">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/50">
                                                <HardDrive className="w-5 h-5" />
                                            </span>
                                            <div>
                                                <CardTitle>Storage &amp; Cloud Asset Delivery</CardTitle>
                                                <CardDescription>
                                                    Configure file storage disks for product photos, customer invoices, and Amazon S3 or S3-compatible cloud storage.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5 pt-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Select
                                                label="Default Upload Filesystem Disk"
                                                value={form.data.storage_default_disk}
                                                onChange={(e) => form.setData('storage_default_disk', e.target.value)}
                                                helperText="Disk used for product galleries, customer uploads, and invoice PDFs."
                                            >
                                                <option value="public">Local Public Disk (storage/app/public)</option>
                                                <option value="local">Local Private Disk (storage/app/private)</option>
                                                <option value="s3">Amazon S3 / S3-Compatible Cloud Storage</option>
                                            </Select>
                                        </div>

                                        {/* S3 Configuration Section */}
                                        <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
                                            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                                                <Cloud className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                                <span>Amazon S3 / S3-Compatible Cloud Storage Credentials (Encrypted)</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input
                                                    label="AWS Access Key ID"
                                                    placeholder="AKIAIOSFODNN7EXAMPLE"
                                                    value={form.data.storage_s3_key}
                                                    onChange={(e) => form.setData('storage_s3_key', e.target.value)}
                                                    leftIcon={<Key className="w-4 h-4" />}
                                                />
                                                <Input
                                                    label="AWS Secret Access Key (Encrypted)"
                                                    type={showS3Secret ? 'text' : 'password'}
                                                    placeholder="••••••••••••••••"
                                                    value={form.data.storage_s3_secret}
                                                    onChange={(e) => form.setData('storage_s3_secret', e.target.value)}
                                                    leftIcon={<Lock className="w-4 h-4" />}
                                                    rightIcon={
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowS3Secret(!showS3Secret)}
                                                            className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                                            tabIndex={-1}
                                                        >
                                                            {showS3Secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    }
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input
                                                    label="S3 Bucket Name"
                                                    placeholder="e.g. store-production-media"
                                                    value={form.data.storage_s3_bucket}
                                                    onChange={(e) => form.setData('storage_s3_bucket', e.target.value)}
                                                />
                                                <Input
                                                    label="AWS Region"
                                                    placeholder="us-east-1"
                                                    value={form.data.storage_s3_region}
                                                    onChange={(e) => form.setData('storage_s3_region', e.target.value)}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input
                                                    label="Custom CDN URL (Optional)"
                                                    placeholder="https://cdn.yourstore.com"
                                                    value={form.data.storage_s3_url}
                                                    onChange={(e) => form.setData('storage_s3_url', e.target.value)}
                                                    helperText="CloudFront CDN or custom asset domain."
                                                />
                                                <Input
                                                    label="Custom S3 Endpoint (Optional for Cloudflare R2 / MinIO)"
                                                    placeholder="https://<account_id>.r2.cloudflarestorage.com"
                                                    value={form.data.storage_s3_endpoint}
                                                    onChange={(e) => form.setData('storage_s3_endpoint', e.target.value)}
                                                    helperText="Only required if using MinIO, Wasabi, or Cloudflare R2."
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ================= TAB 4: Notifications, SMTP & SMS ================= */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Clear Segmented Navigation inside Notifications */}
                                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                                    <button
                                        type="button"
                                        onClick={() => setNotificationSubTab('smtp')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            notificationSubTab === 'smtp'
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <Server className="w-4 h-4 shrink-0" />
                                        <span>SMTP Email Server</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setNotificationSubTab('sms')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            notificationSubTab === 'sms'
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <Smartphone className="w-4 h-4 shrink-0" />
                                        <span>SMS Gateway</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setNotificationSubTab('triggers')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            notificationSubTab === 'triggers'
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <Bell className="w-4 h-4 shrink-0" />
                                        <span>Alert &amp; Event Triggers</span>
                                    </button>
                                </div>

                                {/* SUBTAB 1: SMTP EMAIL CREDENTIALS */}
                                {notificationSubTab === 'smtp' && (
                                    <Card className="animate-fade-in">
                                        <CardHeader>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                                                        <Server className="w-5 h-5" />
                                                    </span>
                                                    <div>
                                                        <CardTitle>Outbound SMTP Email Server Configuration</CardTitle>
                                                        <CardDescription>
                                                            Authenticate and route transactional emails through your SMTP server or relay provider.
                                                        </CardDescription>
                                                    </div>
                                                </div>

                                                {/* Presets */}
                                                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                                                    <span className="text-[11px] font-bold text-slate-400 mr-1">Presets:</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => applySmtpPreset('mailtrap')}
                                                        className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                                    >
                                                        Mailtrap
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applySmtpPreset('sendgrid')}
                                                        className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                                    >
                                                        SendGrid
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applySmtpPreset('mailgun')}
                                                        className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                                    >
                                                        Mailgun
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applySmtpPreset('gmail')}
                                                        className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                                    >
                                                        Gmail
                                                    </button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-5 pt-2">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <Select
                                                    label="Mail Driver Protocol"
                                                    value={form.data.mail_mailer}
                                                    onChange={(e) => form.setData('mail_mailer', e.target.value as MailDriver)}
                                                    helperText="Driver used to deliver email."
                                                >
                                                    {mailDriverOptions.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </Select>

                                                <Input
                                                    label="SMTP Server Host"
                                                    placeholder="e.g. smtp.mailgun.org"
                                                    value={form.data.mail_host}
                                                    onChange={(e) => form.setData('mail_host', e.target.value)}
                                                    error={form.errors.mail_host}
                                                    helperText="Hostname or IP address."
                                                />

                                                <div className="grid grid-cols-2 gap-3">
                                                    <Input
                                                        label="SMTP Port"
                                                        type="number"
                                                        placeholder="587"
                                                        value={form.data.mail_port}
                                                        onChange={(e) =>
                                                            form.setData('mail_port', parseInt(e.target.value, 10))
                                                        }
                                                        error={form.errors.mail_port}
                                                        helperText="587 or 465"
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
                                            </div>

                                            {/* Credentials (Username & Password) */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <Input
                                                    label="SMTP Username"
                                                    placeholder="e.g. postmaster@yourdomain.com"
                                                    value={form.data.mail_username}
                                                    onChange={(e) => form.setData('mail_username', e.target.value)}
                                                    error={form.errors.mail_username}
                                                    leftIcon={<Key className="w-4 h-4" />}
                                                    helperText="Account login username or API user."
                                                />

                                                <Input
                                                    label="SMTP Password"
                                                    type={showSmtpPassword ? 'text' : 'password'}
                                                    placeholder="••••••••••••••••"
                                                    value={form.data.mail_password}
                                                    onChange={(e) => form.setData('mail_password', e.target.value)}
                                                    error={form.errors.mail_password}
                                                    leftIcon={<Lock className="w-4 h-4" />}
                                                    rightIcon={
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                                            className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none cursor-pointer"
                                                            tabIndex={-1}
                                                        >
                                                            {showSmtpPassword ? (
                                                                <EyeOff className="w-4 h-4" />
                                                            ) : (
                                                                <Eye className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    }
                                                    helperText="SMTP authentication password or secret API token."
                                                />
                                            </div>

                                            {/* Sender Details */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <Input
                                                    label="Sender Display Name"
                                                    placeholder="e.g. Acme Support Team"
                                                    value={form.data.mail_from_name}
                                                    onChange={(e) => form.setData('mail_from_name', e.target.value)}
                                                    error={form.errors.mail_from_name}
                                                    helperText="From Name visible to customer email recipients."
                                                />

                                                <Input
                                                    label="Sender Email Address"
                                                    type="email"
                                                    placeholder="noreply@yourstore.com"
                                                    value={form.data.mail_from_address}
                                                    onChange={(e) =>
                                                        form.setData('mail_from_address', e.target.value)
                                                    }
                                                    error={form.errors.mail_from_address}
                                                    helperText="Outbound email address displayed in customer inboxes."
                                                />
                                            </div>

                                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                                <Toggle
                                                    label="Enable Automated Outbound Emails"
                                                    description="Master switch to activate system emails (order receipts, shipping notices, account resets)."
                                                    checked={form.data.enable_email_notifications}
                                                    onChange={(checked) =>
                                                        form.setData('enable_email_notifications', checked)
                                                    }
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* SUBTAB 2: SMS GATEWAY */}
                                {notificationSubTab === 'sms' && (
                                    <Card className="animate-fade-in">
                                        <CardHeader>
                                            <div className="flex items-center gap-2.5">
                                                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                                                    <Smartphone className="w-5 h-5" />
                                                </span>
                                                <div>
                                                    <CardTitle>SMS Gateway API Configuration</CardTitle>
                                                    <CardDescription>
                                                        Connect Twilio, Vonage, or AWS SNS to send automated text messages to customers.
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-5 pt-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Select
                                                    label="SMS Provider Service"
                                                    value={form.data.sms_provider}
                                                    onChange={(e) => form.setData('sms_provider', e.target.value as SmsProvider)}
                                                    helperText="Select your active third-party SMS telephony provider."
                                                >
                                                    {smsProviderOptions.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </Select>

                                                <Input
                                                    label="Registered Sender Phone Number / Sender ID"
                                                    placeholder="e.g. +1 (555) 019-2834 or MYSTORE"
                                                    value={form.data.sms_from_number}
                                                    onChange={(e) => form.setData('sms_from_number', e.target.value)}
                                                    error={form.errors.sms_from_number}
                                                    helperText="Approved telephone number or alphanumeric Sender ID."
                                                />
                                            </div>

                                            {/* SMS Credentials */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <Input
                                                    label={
                                                        form.data.sms_provider === 'twilio'
                                                            ? 'Twilio Account SID (Username)'
                                                            : 'API Key / Account Username'
                                                    }
                                                    placeholder={
                                                        form.data.sms_provider === 'twilio'
                                                            ? 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                                                            : 'api_key_xxxxxxxx'
                                                    }
                                                    value={form.data.sms_username}
                                                    onChange={(e) => form.setData('sms_username', e.target.value)}
                                                    error={form.errors.sms_username}
                                                    leftIcon={<Key className="w-4 h-4" />}
                                                    helperText="Provider account identifier or public API key."
                                                />

                                                <Input
                                                    label={
                                                        form.data.sms_provider === 'twilio'
                                                            ? 'Twilio Auth Token (Password)'
                                                            : 'API Secret / Auth Password'
                                                    }
                                                    type={showSmsPassword ? 'text' : 'password'}
                                                    placeholder="••••••••••••••••••••••••••••••••"
                                                    value={form.data.sms_password}
                                                    onChange={(e) => form.setData('sms_password', e.target.value)}
                                                    error={form.errors.sms_password}
                                                    leftIcon={<Lock className="w-4 h-4" />}
                                                    rightIcon={
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowSmsPassword(!showSmsPassword)}
                                                            className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none cursor-pointer"
                                                            tabIndex={-1}
                                                        >
                                                            {showSmsPassword ? (
                                                                <EyeOff className="w-4 h-4" />
                                                            ) : (
                                                                <Eye className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    }
                                                    helperText="Private authorization token or secret key."
                                                />
                                            </div>

                                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                                <Toggle
                                                    label="Enable Customer SMS Dispatch Notifications"
                                                    description="Send text messages to customer mobile numbers when orders are shipped out or delivered."
                                                    checked={form.data.enable_order_sms_notifications}
                                                    onChange={(checked) =>
                                                        form.setData('enable_order_sms_notifications', checked)
                                                    }
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* SUBTAB 3: EVENT TRIGGERS */}
                                {notificationSubTab === 'triggers' && (
                                    <div className="space-y-6 animate-fade-in">
                                        <Card>
                                            <CardHeader>
                                                <div className="flex items-center gap-2.5">
                                                    <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                                                        <Inbox className="w-5 h-5" />
                                                    </span>
                                                    <div>
                                                        <CardTitle>
                                                            Administrative Alert Inbox &amp; In-App Alerts
                                                        </CardTitle>
                                                        <CardDescription>
                                                            Configure destination staff inbox and real-time dashboard notifications.
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4 pt-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <Input
                                                        label="Admin Alert Recipient Email"
                                                        type="email"
                                                        placeholder="admin@yourstore.com"
                                                        value={form.data.admin_alert_email}
                                                        onChange={(e) =>
                                                            form.setData('admin_alert_email', e.target.value)
                                                        }
                                                        error={form.errors.admin_alert_email}
                                                        helperText="Inbox where new order alerts and low stock warnings arrive."
                                                    />

                                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                                        <Toggle
                                                            label="Admin In-App Bell Alerts"
                                                            description="Display real-time notification toasts and counters in the admin navigation bar."
                                                            checked={form.data.enable_in_app_notifications}
                                                            onChange={(checked) =>
                                                                form.setData('enable_in_app_notifications', checked)
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Customer Email Triggers */}
                                            <Card>
                                                <CardHeader>
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                                                            <Send className="w-5 h-5" />
                                                        </span>
                                                        <div>
                                                            <CardTitle>Customer Event Triggers</CardTitle>
                                                            <CardDescription>
                                                                Specify when automated emails are sent to customers.
                                                            </CardDescription>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-3 pt-2">
                                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                                        <Toggle
                                                            label="Order Confirmation Email"
                                                            description="Send an instant itemized invoice & confirmation receipt immediately after customer checkout."
                                                            checked={form.data.notify_order_placed_customer}
                                                            onChange={(checked) =>
                                                                form.setData(
                                                                    'notify_order_placed_customer',
                                                                    checked
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                                        <Toggle
                                                            label="Order Status & Dispatch Tracking"
                                                            description="Email the customer whenever order status transitions to Processing, Shipped, or Delivered."
                                                            checked={form.data.notify_order_status_updated}
                                                            onChange={(checked) =>
                                                                form.setData(
                                                                    'notify_order_status_updated',
                                                                    checked
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                                        <Toggle
                                                            label="Order Cancellation & Refund Notice"
                                                            description="Send an email update when an order is cancelled or refunded."
                                                            checked={form.data.notify_order_cancelled}
                                                            onChange={(checked) =>
                                                                form.setData('notify_order_cancelled', checked)
                                                            }
                                                        />
                                                    </div>

                                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                                        <Toggle
                                                            label="Customer Welcome Onboarding Email"
                                                            description="Send a welcome email with account guidance whenever a new shopper registers."
                                                            checked={form.data.notify_new_customer_welcome}
                                                            onChange={(checked) =>
                                                                form.setData('notify_new_customer_welcome', checked)
                                                            }
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Admin Alert Triggers */}
                                            <Card>
                                                <CardHeader>
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                                                            <Bell className="w-5 h-5" />
                                                        </span>
                                                        <div>
                                                            <CardTitle>Administrative Alert Triggers</CardTitle>
                                                            <CardDescription>
                                                                Specify store events that alert the store admin inbox.
                                                            </CardDescription>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-3 pt-2">
                                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                                        <Toggle
                                                            label="New Order Received Alert"
                                                            description="Immediately email store managers when a customer completes a new order."
                                                            checked={form.data.notify_order_placed_admin}
                                                            onChange={(checked) =>
                                                                form.setData('notify_order_placed_admin', checked)
                                                            }
                                                        />
                                                    </div>

                                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                                        <Toggle
                                                            label="Low Stock Inventory Warning"
                                                            description={`Send alert email to admin when any product stock drops to or below ${form.data.low_stock_threshold} units.`}
                                                            checked={form.data.notify_low_stock_admin}
                                                            onChange={(checked) =>
                                                                form.setData('notify_low_stock_admin', checked)
                                                            }
                                                        />
                                                    </div>

                                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                                        <Toggle
                                                            label="New Customer Review Submitted"
                                                            description="Alert staff when a buyer writes a review so moderators can inspect or publish it."
                                                            checked={form.data.notify_new_review_admin}
                                                            onChange={(checked) =>
                                                                form.setData('notify_new_review_admin', checked)
                                                            }
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ================= TAB 5: Catalog & Inventory ================= */}
                        {activeTab === 'inventory' && (
                            <div className="space-y-6 animate-fade-in">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/50">
                                                <Package className="w-5 h-5" />
                                            </span>
                                            <div>
                                                <CardTitle>Inventory &amp; Stock Availability</CardTitle>
                                                <CardDescription>
                                                    Define threshold alerts and storefront behavior for depleted inventory items.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-2">
                                        <Input
                                            label="Low Stock Warning Threshold"
                                            type="number"
                                            suffixText="units"
                                            value={form.data.low_stock_threshold}
                                            onChange={(e) =>
                                                form.setData('low_stock_threshold', parseInt(e.target.value, 10))
                                            }
                                            helperText="Triggers low inventory badges and sends manager alert emails."
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
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                                                <MessageSquare className="w-5 h-5" />
                                            </span>
                                            <div>
                                                <CardTitle>Customer Reviews &amp; Social Proof</CardTitle>
                                                <CardDescription>
                                                    Enable product star ratings and configure automatic approval rules.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-2">
                                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                            <Toggle
                                                label="Enable Product Reviews &amp; Ratings"
                                                description="Allow customers to submit star ratings and detailed product feedback."
                                                checked={form.data.enable_customer_reviews}
                                                onChange={(checked) =>
                                                    form.setData('enable_customer_reviews', checked)
                                                }
                                            />
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                            <Toggle
                                                label="Auto-Approve Customer Reviews"
                                                description="Automatically display submitted customer reviews on the product page without manual admin approval."
                                                checked={form.data.auto_approve_reviews}
                                                onChange={(checked) => form.setData('auto_approve_reviews', checked)}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ================= TAB 6: System & Maintenance ================= */}
                        {activeTab === 'maintenance' && (
                            <Card className="animate-fade-in">
                                <CardHeader>
                                    <div className="flex items-center gap-2.5">
                                        <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                                            <Wrench className="w-5 h-5" />
                                        </span>
                                        <div>
                                            <CardTitle>Storefront Maintenance Mode</CardTitle>
                                            <CardDescription>
                                                Temporarily take the customer catalog offline for upgrades or server maintenance.
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-5 pt-2">
                                    {form.data.maintenance_mode && (
                                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold text-sm">
                                                    Storefront is Currently Closed for Maintenance
                                                </p>
                                                <p className="mt-1 text-amber-800 dark:text-amber-300">
                                                    Regular store visitors will see the maintenance landing announcement message below instead of catalog pages.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                        <Toggle
                                            label="Activate Store Maintenance Mode"
                                            description="When active, visitors are redirected to the maintenance notice page."
                                            checked={form.data.maintenance_mode}
                                            onChange={(checked) => form.setData('maintenance_mode', checked)}
                                        />
                                    </div>

                                    <Input
                                        label="Public Maintenance Notice Message"
                                        value={form.data.maintenance_notice}
                                        onChange={(e) => form.setData('maintenance_notice', e.target.value)}
                                        helperText="Custom announcement banner displayed to customers."
                                    />

                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                                        <Toggle
                                            label="Allow Authenticated Admins to Bypass Maintenance"
                                            description="Allows logged-in administrators and staff to browse and test the live storefront normally."
                                            checked={form.data.allow_admin_bypass_maintenance}
                                            onChange={(checked) =>
                                                form.setData('allow_admin_bypass_maintenance', checked)
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Floating Bottom Sticky Save Bar */}
                <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <span
                            className={`w-2.5 h-2.5 rounded-full ${
                                form.isDirty ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
                            }`}
                        />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {form.isDirty ? 'Unsaved modifications detected' : 'All settings synchronized'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Click save to update database and purge cache
                            </span>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={form.processing}
                        leftIcon={<Save className="w-4 h-4" />}
                        className="shadow-md shadow-indigo-600/30 font-semibold"
                    >
                        Save Settings
                    </Button>
                </div>
            </form>
        </AdminLayout>
    );
}

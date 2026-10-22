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
import { useEssentials } from '../../hooks/useEssentials';
import {
    Button,
    Input,
    Select,
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
    SlidersHorizontal,
    Check,
    X,
} from 'lucide-react';

interface SettingsProps extends PageProps {
    settings: {
        currency_code: string;
        currency_symbol: string;
        currency_decimals: number;
        timezone: string;

        force_two_factor_all_admins: boolean;

        order_prefix: string;
        order_number_start: number;
        allow_customer_cancellation: boolean;

        low_stock_threshold: number;
        out_of_stock_visibility: StockVisibility;
        enable_customer_reviews: boolean;
        auto_approve_reviews: boolean;

        payment_cod_enabled: boolean;
        payment_stripe_enabled: boolean;
        payment_paypal_enabled: boolean;
        payment_razorpay_enabled?: boolean;

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
        enable_order_sms_notifications?: boolean;
        notify_order_placed_customer?: boolean;
        notify_order_placed_admin?: boolean;
        notify_order_status_updated?: boolean;
        notify_order_cancelled?: boolean;
        notify_low_stock_admin?: boolean;
        notify_new_customer_welcome?: boolean;
        notify_new_review_admin?: boolean;
    };
    timezones: Record<string, string>;
    currencies: Array<{ code: string; symbol: string; name: string }>;
}

export default function Settings({ settings, timezones, currencies }: SettingsProps) {
    const { getOptions, constants, toOptions } = useEssentials();

    const stockVisibilityOptions = getOptions<StockVisibility>('stock_visibility');
    const mailEncryptionOptions = getOptions<MailEncryption>('mail_encryption');
    const smsProviderOptions = getOptions<SmsProvider>('sms_provider');

    // List expand/collapse state
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        localization: true,
    });

    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [savingSection, setSavingSection] = useState<string | null>(null);
    const [savedSection, setSavedSection] = useState<string | null>(null);

    // Password & Secret visibility toggles
    const [showSmtpPassword, setShowSmtpPassword] = useState<boolean>(false);
    const [showSmsPassword, setShowSmsPassword] = useState<boolean>(false);
    const [showStripeSecret, setShowStripeSecret] = useState<boolean>(false);
    const [showStripeWebhookSecret, setShowStripeWebhookSecret] = useState<boolean>(false);
    const [showPaypalSecret, setShowPaypalSecret] = useState<boolean>(false);
    const [showRazorpaySecret, setShowRazorpaySecret] = useState<boolean>(false);
    const [showRazorpayWebhookSecret, setShowRazorpayWebhookSecret] = useState<boolean>(false);
    const [showS3Secret, setShowS3Secret] = useState<boolean>(false);
    const [showFedexSecret, setShowFedexSecret] = useState<boolean>(false);
    const [showUpsSecret, setShowUpsSecret] = useState<boolean>(false);
    const [showDhlSecret, setShowDhlSecret] = useState<boolean>(false);

    const form = useForm({
        currency_code: settings?.currency_code ?? 'USD',
        currency_symbol: settings?.currency_symbol ?? '$',
        currency_decimals: settings?.currency_decimals ?? 2,
        timezone: settings?.timezone ?? 'UTC',

        force_two_factor_all_admins: settings?.force_two_factor_all_admins ?? true,

        order_prefix: settings?.order_prefix ?? 'ORD-',
        order_number_start: settings?.order_number_start ?? 1001,
        allow_customer_cancellation: settings?.allow_customer_cancellation ?? true,

        low_stock_threshold: settings?.low_stock_threshold ?? 5,
        out_of_stock_visibility: settings?.out_of_stock_visibility ?? 'badge',
        enable_customer_reviews: settings?.enable_customer_reviews ?? true,
        auto_approve_reviews: settings?.auto_approve_reviews ?? false,

        payment_cod_enabled: settings?.payment_cod_enabled ?? true,
        payment_stripe_enabled: settings?.payment_stripe_enabled ?? true,
        payment_paypal_enabled: settings?.payment_paypal_enabled ?? true,
        payment_razorpay_enabled:
            settings?.payment_razorpay_enabled ??
            (settings as any)?.payment_settings?.razorpay?.enabled ??
            false,

        // Payment Gateway Credentials
        payment_stripe_publishable_key: (settings as any)?.payment_settings?.stripe?.publishable_key ?? '',
        payment_stripe_secret_key: (settings as any)?.payment_settings?.stripe?.secret_key ?? '',
        payment_stripe_webhook_secret: (settings as any)?.payment_settings?.stripe?.webhook_secret ?? '',
        payment_paypal_mode: (settings as any)?.payment_settings?.paypal?.mode ?? 'sandbox',
        payment_paypal_client_id: (settings as any)?.payment_settings?.paypal?.client_id ?? '',
        payment_paypal_client_secret: (settings as any)?.payment_settings?.paypal?.client_secret ?? '',
        payment_razorpay_key_id: (settings as any)?.payment_settings?.razorpay?.key_id ?? '',
        payment_razorpay_key_secret: (settings as any)?.payment_settings?.razorpay?.key_secret ?? '',
        payment_razorpay_webhook_secret: (settings as any)?.payment_settings?.razorpay?.webhook_secret ?? '',
        payment_cod_instructions: (settings as any)?.payment_settings?.cod?.instructions ?? '',

        // Storage Settings
        storage_default_disk: (settings as any)?.storage_settings?.default_disk ?? 'public',
        storage_s3_key: (settings as any)?.storage_settings?.s3?.key ?? '',
        storage_s3_secret: (settings as any)?.storage_settings?.s3?.secret ?? '',
        storage_s3_region: (settings as any)?.storage_settings?.s3?.region ?? 'us-east-1',
        storage_s3_bucket: (settings as any)?.storage_settings?.s3?.bucket ?? '',
        storage_s3_url: (settings as any)?.storage_settings?.s3?.url ?? '',
        storage_s3_endpoint: (settings as any)?.storage_settings?.s3?.endpoint ?? '',

        // Shipping Settings - Multi-Carrier Support
        shipping_fedex_enabled:
            (settings as any)?.shipping_settings?.fedex?.enabled ??
            ((settings as any)?.shipping_settings?.carrier?.provider === 'fedex'),
        shipping_fedex_account_number:
            (settings as any)?.shipping_settings?.fedex?.account_number ??
            ((settings as any)?.shipping_settings?.carrier?.provider === 'fedex'
                ? (settings as any)?.shipping_settings?.carrier?.account_number
                : '') ??
            '',
        shipping_fedex_api_key:
            (settings as any)?.shipping_settings?.fedex?.api_key ??
            ((settings as any)?.shipping_settings?.carrier?.provider === 'fedex'
                ? (settings as any)?.shipping_settings?.carrier?.api_key
                : '') ??
            '',
        shipping_fedex_api_secret:
            (settings as any)?.shipping_settings?.fedex?.api_secret ??
            ((settings as any)?.shipping_settings?.carrier?.provider === 'fedex'
                ? (settings as any)?.shipping_settings?.carrier?.api_secret
                : '') ??
            '',

        shipping_ups_enabled:
            (settings as any)?.shipping_settings?.ups?.enabled ??
            ((settings as any)?.shipping_settings?.carrier?.provider === 'ups'),
        shipping_ups_account_number:
            (settings as any)?.shipping_settings?.ups?.account_number ??
            ((settings as any)?.shipping_settings?.carrier?.provider === 'ups'
                ? (settings as any)?.shipping_settings?.carrier?.account_number
                : '') ??
            '',
        shipping_ups_api_key:
            (settings as any)?.shipping_settings?.ups?.api_key ??
            ((settings as any)?.shipping_settings?.carrier?.provider === 'ups'
                ? (settings as any)?.shipping_settings?.carrier?.api_key
                : '') ??
            '',
        shipping_ups_api_secret:
            (settings as any)?.shipping_settings?.ups?.api_secret ??
            ((settings as any)?.shipping_settings?.carrier?.provider === 'ups'
                ? (settings as any)?.shipping_settings?.carrier?.api_secret
                : '') ??
            '',

        shipping_dhl_enabled:
            (settings as any)?.shipping_settings?.dhl?.enabled ??
            ((settings as any)?.shipping_settings?.carrier?.provider === 'dhl'),
        shipping_dhl_account_number:
            (settings as any)?.shipping_settings?.dhl?.account_number ??
            ((settings as any)?.shipping_settings?.carrier?.provider === 'dhl'
                ? (settings as any)?.shipping_settings?.carrier?.account_number
                : '') ??
            '',
        shipping_dhl_api_key:
            (settings as any)?.shipping_settings?.dhl?.api_key ??
            ((settings as any)?.shipping_settings?.carrier?.provider === 'dhl'
                ? (settings as any)?.shipping_settings?.carrier?.api_key
                : '') ??
            '',
        shipping_dhl_api_secret:
            (settings as any)?.shipping_settings?.dhl?.api_secret ??
            ((settings as any)?.shipping_settings?.carrier?.provider === 'dhl'
                ? (settings as any)?.shipping_settings?.carrier?.api_secret
                : '') ??
            '',

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
        notify_order_placed_customer: settings?.notify_order_placed_customer ?? true,
        notify_order_placed_admin: settings?.notify_order_placed_admin ?? true,
        notify_order_status_updated: settings?.notify_order_status_updated ?? true,
        notify_order_cancelled: settings?.notify_order_cancelled ?? true,
        notify_low_stock_admin: settings?.notify_low_stock_admin ?? true,
        notify_new_customer_welcome: settings?.notify_new_customer_welcome ?? true,
        notify_new_review_admin: settings?.notify_new_review_admin ?? true,
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
        allListKeys.forEach((key) => {
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
        form.data.shipping_fedex_enabled,
        form.data.shipping_ups_enabled,
        form.data.shipping_dhl_enabled,
    ].filter(Boolean).length;

    interface SettingListItem {
        id: string;
        category: 'store' | 'orders' | 'inventory' | 'payments' | 'storage' | 'notifications';
        categoryLabel: string;
        title: string;
        description: string;
        icon: React.ComponentType<{ className?: string }>;
        iconBg: string;
        iconColor: string;
        badges: Array<{ label: string; variant?: 'indigo' | 'emerald' | 'amber' | 'sky' | 'rose' | 'slate' }>;
        renderForm: () => React.ReactNode;
    }

    const settingsList: SettingListItem[] = [
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
            ],
            renderForm: () => (
                <div className="space-y-4">
                    {currencies && currencies.length > 0 && (
                        <Select
                            label="Currency Quick Preset"
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

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                        <Toggle
                            label="Enforce Two-Factor Authentication (2FA) for All Admins"
                            checked={form.data.force_two_factor_all_admins}
                            onChange={(checked) =>
                                form.setData('force_two_factor_all_admins', checked)
                            }
                        />
                    </div>
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
            description: 'Checkout payment gateways (Razorpay, Stripe, PayPal, COD) and courier shipping logistics.',
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
                                        <Input
                                            label="Key Secret"
                                            type={showRazorpaySecret ? 'text' : 'password'}
                                            placeholder="Razorpay Secret Key..."
                                            value={form.data.payment_razorpay_key_secret}
                                            onChange={(e) => form.setData('payment_razorpay_key_secret', e.target.value)}
                                            leftIcon={<Lock className="w-4 h-4" />}
                                            rightIcon={
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                                                    className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                                    tabIndex={-1}
                                                >
                                                    {showRazorpaySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            }
                                        />
                                    </div>
                                    <Input
                                        label="Webhook Secret"
                                        type={showRazorpayWebhookSecret ? 'text' : 'password'}
                                        placeholder="Razorpay Webhook Secret..."
                                        value={form.data.payment_razorpay_webhook_secret}
                                        onChange={(e) => form.setData('payment_razorpay_webhook_secret', e.target.value)}
                                        leftIcon={<Lock className="w-4 h-4" />}
                                        rightIcon={
                                            <button
                                                type="button"
                                                onClick={() => setShowRazorpayWebhookSecret(!showRazorpayWebhookSecret)}
                                                className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                                tabIndex={-1}
                                            >
                                                {showRazorpayWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        }
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
                                        <Input
                                            label="Secret Key"
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
                                        label="Webhook Secret"
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
                                        <Input
                                            label="Client Secret"
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
                    <div className="space-y-3 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                                    Courier & Shipping Logistics
                                </span>
                                <span className="text-2xs text-slate-400">
                                    Enable carrier rate calculation and live parcel tracking API.
                                </span>
                            </div>
                            <span className="text-2xs font-medium text-slate-400">
                                {activeShippingCount} of 3 Active
                            </span>
                        </div>

                        {/* FedEx */}
                        <div
                            className={`rounded-xl border transition-all ${
                                form.data.shipping_fedex_enabled
                                    ? 'bg-white dark:bg-slate-800/90 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                            }`}
                        >
                            <div className="p-3.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 shrink-0">
                                        <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">FedEx Express</span>
                                </div>
                                <Toggle
                                    checked={form.data.shipping_fedex_enabled}
                                    onChange={(checked) =>
                                        form.setData('shipping_fedex_enabled', checked)
                                    }
                                />
                            </div>

                            {form.data.shipping_fedex_enabled && (
                                <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                                        <Input
                                            label="Account Number"
                                            placeholder="Account number..."
                                            value={form.data.shipping_fedex_account_number}
                                            onChange={(e) => form.setData('shipping_fedex_account_number', e.target.value)}
                                        />
                                        <Input
                                            label="API Key"
                                            placeholder="API key..."
                                            value={form.data.shipping_fedex_api_key}
                                            onChange={(e) => form.setData('shipping_fedex_api_key', e.target.value)}
                                            leftIcon={<Key className="w-4 h-4" />}
                                        />
                                        <Input
                                            label="API Secret"
                                            type={showFedexSecret ? 'text' : 'password'}
                                            placeholder="Secret..."
                                            value={form.data.shipping_fedex_api_secret}
                                            onChange={(e) => form.setData('shipping_fedex_api_secret', e.target.value)}
                                            leftIcon={<Lock className="w-4 h-4" />}
                                            rightIcon={
                                                <button
                                                    type="button"
                                                    onClick={() => setShowFedexSecret(!showFedexSecret)}
                                                    className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                                    tabIndex={-1}
                                                >
                                                    {showFedexSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* UPS */}
                        <div
                            className={`rounded-xl border transition-all ${
                                form.data.shipping_ups_enabled
                                    ? 'bg-white dark:bg-slate-800/90 border-amber-300 dark:border-amber-700 shadow-2xs'
                                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                            }`}
                        >
                            <div className="p-3.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 shrink-0">
                                        <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">UPS Logistics</span>
                                </div>
                                <Toggle
                                    checked={form.data.shipping_ups_enabled}
                                    onChange={(checked) =>
                                        form.setData('shipping_ups_enabled', checked)
                                    }
                                />
                            </div>

                            {form.data.shipping_ups_enabled && (
                                <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                                        <Input
                                            label="Account Number"
                                            placeholder="Account number..."
                                            value={form.data.shipping_ups_account_number}
                                            onChange={(e) => form.setData('shipping_ups_account_number', e.target.value)}
                                        />
                                        <Input
                                            label="API Key"
                                            placeholder="API key..."
                                            value={form.data.shipping_ups_api_key}
                                            onChange={(e) => form.setData('shipping_ups_api_key', e.target.value)}
                                            leftIcon={<Key className="w-4 h-4" />}
                                        />
                                        <Input
                                            label="API Secret"
                                            type={showUpsSecret ? 'text' : 'password'}
                                            placeholder="Secret..."
                                            value={form.data.shipping_ups_api_secret}
                                            onChange={(e) => form.setData('shipping_ups_api_secret', e.target.value)}
                                            leftIcon={<Lock className="w-4 h-4" />}
                                            rightIcon={
                                                <button
                                                    type="button"
                                                    onClick={() => setShowUpsSecret(!showUpsSecret)}
                                                    className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                                    tabIndex={-1}
                                                >
                                                    {showUpsSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DHL */}
                        <div
                            className={`rounded-xl border transition-all ${
                                form.data.shipping_dhl_enabled
                                    ? 'bg-white dark:bg-slate-800/90 border-rose-300 dark:border-rose-700 shadow-2xs'
                                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                            }`}
                        >
                            <div className="p-3.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 shrink-0">
                                        <Truck className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">DHL Express</span>
                                </div>
                                <Toggle
                                    checked={form.data.shipping_dhl_enabled}
                                    onChange={(checked) =>
                                        form.setData('shipping_dhl_enabled', checked)
                                    }
                                />
                            </div>

                            {form.data.shipping_dhl_enabled && (
                                <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                                        <Input
                                            label="Account Number"
                                            placeholder="Account number..."
                                            value={form.data.shipping_dhl_account_number}
                                            onChange={(e) => form.setData('shipping_dhl_account_number', e.target.value)}
                                        />
                                        <Input
                                            label="API Key"
                                            placeholder="API key..."
                                            value={form.data.shipping_dhl_api_key}
                                            onChange={(e) => form.setData('shipping_dhl_api_key', e.target.value)}
                                            leftIcon={<Key className="w-4 h-4" />}
                                        />
                                        <Input
                                            label="API Secret"
                                            type={showDhlSecret ? 'text' : 'password'}
                                            placeholder="Secret..."
                                            value={form.data.shipping_dhl_api_secret}
                                            onChange={(e) => form.setData('shipping_dhl_api_secret', e.target.value)}
                                            leftIcon={<Lock className="w-4 h-4" />}
                                            rightIcon={
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDhlSecret(!showDhlSecret)}
                                                    className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                                    tabIndex={-1}
                                                >
                                                    {showDhlSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
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
                { label: `Disk: ${(form.data.storage_default_disk ?? 'public').toUpperCase()}`, variant: 'indigo' },
            ],
            renderForm: () => (
                <div className="space-y-4">
                    <Select
                        label="Default Upload Disk"
                        value={form.data.storage_default_disk}
                        onChange={(e) => form.setData('storage_default_disk', e.target.value)}
                    >
                        <option value="public">Local Public (storage/app/public)</option>
                        <option value="local">Local Private (storage/app/private)</option>
                        <option value="s3">Amazon S3 / S3-Compatible</option>
                    </Select>

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
                                <Input
                                    label="AWS Secret Key"
                                    type={showS3Secret ? 'text' : 'password'}
                                    placeholder="Secret..."
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

                        <Input
                            label="SMTP Password"
                            type={showSmtpPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={form.data.mail_password}
                            onChange={(e) => form.setData('mail_password', e.target.value)}
                            error={form.errors.mail_password}
                            leftIcon={<Lock className="w-4 h-4" />}
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                    className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                    tabIndex={-1}
                                >
                                    {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
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

                                    <Input
                                        label="Auth Token / Secret"
                                        type={showSmsPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={form.data.sms_password}
                                        onChange={(e) => form.setData('sms_password', e.target.value)}
                                        error={form.errors.sms_password}
                                        leftIcon={<Lock className="w-4 h-4" />}
                                        rightIcon={
                                            <button
                                                type="button"
                                                onClick={() => setShowSmsPassword(!showSmsPassword)}
                                                className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                                tabIndex={-1}
                                            >
                                                {showSmsPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        }
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
            renderForm: () => (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Customer Email Triggers */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Customer Triggers
                            </span>
                            <Toggle
                                label="Order Confirmation"
                                checked={form.data.notify_order_placed_customer}
                                onChange={(checked) =>
                                    form.setData('notify_order_placed_customer', checked)
                                }
                            />
                            <Toggle
                                label="Order Dispatch & Tracking"
                                checked={form.data.notify_order_status_updated}
                                onChange={(checked) =>
                                    form.setData('notify_order_status_updated', checked)
                                }
                            />
                            <Toggle
                                label="Order Cancellation Notice"
                                checked={form.data.notify_order_cancelled}
                                onChange={(checked) =>
                                    form.setData('notify_order_cancelled', checked)
                                }
                            />
                            <Toggle
                                label="Customer Welcome Email"
                                checked={form.data.notify_new_customer_welcome}
                                onChange={(checked) =>
                                    form.setData('notify_new_customer_welcome', checked)
                                }
                            />
                        </div>

                        {/* Admin Alert Triggers */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Admin Staff Triggers
                            </span>
                            <Toggle
                                label="New Order Alert"
                                checked={form.data.notify_order_placed_admin}
                                onChange={(checked) =>
                                    form.setData('notify_order_placed_admin', checked)
                                }
                            />
                            <Toggle
                                label="Low Stock Warning"
                                checked={form.data.notify_low_stock_admin}
                                onChange={(checked) =>
                                    form.setData('notify_low_stock_admin', checked)
                                }
                            />
                            <Toggle
                                label="New Review Submitted"
                                checked={form.data.notify_new_review_admin}
                                onChange={(checked) =>
                                    form.setData('notify_new_review_admin', checked)
                                }
                            />
                        </div>
                    </div>
                </div>
            ),
        },
    ];

    const allListKeys = useMemo(() => settingsList.map((item) => item.id), []);

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

    const categories = [
        { id: 'all', label: 'All', count: settingsList.length },
        { id: 'store', label: 'Storefront', count: settingsList.filter((s) => s.category === 'store').length },
        { id: 'orders', label: 'Orders & Catalog', count: settingsList.filter((s) => s.category === 'orders').length },
        { id: 'payments', label: 'Payments & Shipping', count: settingsList.filter((s) => s.category === 'payments').length },
        { id: 'storage', label: 'Storage', count: settingsList.filter((s) => s.category === 'storage').length },
        { id: 'notifications', label: 'Communications', count: settingsList.filter((s) => s.category === 'notifications').length },
    ];

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
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Filter settings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
                                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
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
                                    className={`rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 ${
                                        isOpen
                                            ? 'border-indigo-300 dark:border-indigo-800 shadow-sm ring-1 ring-indigo-500/10'
                                            : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
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

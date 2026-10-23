import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { Coupon, CouponType, CouponApplyTo, Product, Brand, Category } from '../../../types';
import {
    Button,
    Input,
    Select,
    Toggle,
    DateTimePicker,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
    MultiSelect,
} from '../../../Components/UI';
import {
    ArrowLeft,
    Sparkles,
} from 'lucide-react';
import {
    format,
    isValid,
    addDays,
    addHours,
    endOfDay,
    endOfMonth,
    setHours,
    setMinutes,
} from 'date-fns';

interface Options {
    products: (Product & { sale_price?: string | number; retail_price?: string | number; category_id?: string })[];
    brands: Brand[];
    categories: Category[];
    types: { value: string; label: string }[];
    applies_to: { value: string; label: string }[];
}

interface CreateOrEditProps {
    coupon: Coupon | null;
    options: Options;
}

const startPresets = [
    { label: 'Right Now', getValue: () => new Date() },
    { label: 'Tomorrow 9 AM', getValue: () => setHours(setMinutes(addDays(new Date(), 1), 0), 9) },
    { label: 'Next Week', getValue: () => setHours(setMinutes(addDays(new Date(), 7), 0), 9) },
];

const expiryPresets = (base?: string) => {
    const d = base ? new Date(base) : new Date();
    const validBase = isValid(d) ? d : new Date();
    return [
        { label: '24 Hours', getValue: () => addHours(validBase, 24) },
        { label: '7 Days', getValue: () => endOfDay(addDays(validBase, 7)) },
        { label: '30 Days', getValue: () => endOfDay(addDays(validBase, 30)) },
        { label: 'End of Month', getValue: () => endOfDay(endOfMonth(validBase)) },
    ];
};

const generateCode = () => {
    const prefixes = ['SAVE', 'DEAL', 'SUPER', 'FEST', 'MEGA', 'OFFER', 'VIP'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    return `${prefix}${num}`;
};

export default function CouponCreateOrEdit({ coupon, options }: CreateOrEditProps) {
    const isEdit = Boolean(coupon?.id);

    const formatDateForInput = (iso?: string | null) => {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            return isValid(d) ? format(d, "yyyy-MM-dd'T'HH:mm") : '';
        } catch { return ''; }
    };

    const { data, setData, post, put, processing, errors } = useForm<{
        code: string;
        name: string;
        description: string;
        type: CouponType;
        value: string | number;
        min_order_amount: string | number;
        max_discount_amount: string | number;
        applies_to: CouponApplyTo;
        product_ids: string[];
        brand_ids: string[];
        category_ids: string[];
        usage_limit: string | number;
        usage_limit_per_customer: string | number;
        starts_at: string;
        expires_at: string;
        is_active: boolean;
    }>({
        code: coupon?.code || generateCode(),
        name: coupon?.name || '',
        description: coupon?.description || '',
        type: coupon?.type || 'percentage',
        value: coupon?.value ?? '10',
        min_order_amount: coupon?.min_order_amount ?? '',
        max_discount_amount: coupon?.max_discount_amount ?? '',
        applies_to: (coupon?.applies_to as CouponApplyTo) || 'all',
        product_ids: coupon?.products ? coupon.products.map((p) => p.id) : [],
        brand_ids: coupon?.brands ? coupon.brands.map((b) => b.id) : [],
        category_ids: coupon?.categories ? coupon.categories.map((c) => c.id) : [],
        usage_limit: coupon?.usage_limit ?? '',
        usage_limit_per_customer: coupon?.usage_limit_per_customer ?? '1',
        starts_at: formatDateForInput(coupon?.starts_at),
        expires_at: formatDateForInput(coupon?.expires_at),
        is_active: coupon?.is_active ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && coupon) {
            put(`/admin/coupons/${coupon.id}`);
        } else {
            post('/admin/coupons');
        }
    };

    const pageTitle = isEdit ? `Edit Coupon: ${coupon?.code}` : 'Create Coupon';

    const productOptions = (options.products || []).map((p) => ({
        value: p.id,
        label: p.name,
        description: `${p.sku ? `[${p.sku}] ` : ''}$${parseFloat(String(p.sale_price || p.retail_price || 0)).toFixed(2)}`,
    }));

    const brandOptions = (options.brands || []).map((b) => ({
        value: b.id,
        label: b.name,
    }));

    const categoryOptions = (options.categories || []).map((c) => ({
        value: c.id,
        label: c.name,
    }));

    return (
        <AdminLayout title={pageTitle}>
            <Head title={pageTitle} />

            <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/coupons"
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                            aria-label="Back to coupons"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {pageTitle}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link href="/admin/coupons">
                            <Button type="button" variant="secondary" size="md">
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            isLoading={processing}
                        >
                            {isEdit ? 'Update Coupon' : 'Save Coupon'}
                        </Button>
                    </div>
                </div>

                {/* Coupon Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Coupon Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Coupon Code <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 uppercase font-mono font-bold text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setData('code', generateCode())}
                                        className="shrink-0 px-2.5"
                                        title="Generate Random Code"
                                    >
                                        <Sparkles className="w-4 h-4 text-indigo-500" />
                                    </Button>
                                </div>
                                {errors.code && <p className="text-xs text-rose-500 mt-1">{errors.code}</p>}
                            </div>

                            <Input
                                label="Campaign Name"
                                required
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                placeholder="e.g. Summer Special"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Description
                            </label>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Optional description..."
                                rows={2}
                                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Select
                                label="Discount Type"
                                required
                                value={data.type}
                                onChange={(e) => setData('type', e.target.value as CouponType)}
                                error={errors.type}
                                options={[
                                    { value: 'percentage', label: 'Percentage (%)' },
                                    { value: 'fixed', label: 'Fixed Amount ($)' },
                                ]}
                            />
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {data.type === 'percentage' ? 'Percentage' : 'Amount ($)'} <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={data.type === 'percentage' ? '100' : undefined}
                                        value={data.value}
                                        onChange={(e) => setData('value', e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        required
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        {data.type === 'percentage' ? '%' : '$'}
                                    </span>
                                </div>
                                {errors.value && <p className="text-xs text-rose-500 mt-1">{errors.value}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Minimum Order Amount ($)"
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.min_order_amount}
                                onChange={(e) => setData('min_order_amount', e.target.value)}
                                placeholder="No minimum"
                            />
                            <Input
                                label="Max Discount Cap ($)"
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.max_discount_amount}
                                onChange={(e) => setData('max_discount_amount', e.target.value)}
                                placeholder="No cap"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                Active Status
                            </span>
                            <Toggle
                                checked={data.is_active}
                                onChange={(val) => setData('is_active', val)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Applicability & Usage Limits Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Applicability & Limits</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select
                            label="Applies To"
                            required
                            value={data.applies_to}
                            onChange={(e) => setData('applies_to', e.target.value as CouponApplyTo)}
                            options={[
                                { value: 'all', label: 'All Products (Entire Store)' },
                                { value: 'products', label: 'Specific Products' },
                                { value: 'brands', label: 'Specific Brands' },
                                { value: 'categories', label: 'Specific Categories' },
                            ]}
                        />

                        {data.applies_to === 'products' && (
                            <MultiSelect
                                label="Select Products"
                                placeholder="Choose products..."
                                searchPlaceholder="Search products by name or SKU..."
                                options={productOptions}
                                value={data.product_ids}
                                onChange={(vals) => setData('product_ids', vals)}
                            />
                        )}

                        {data.applies_to === 'brands' && (
                            <MultiSelect
                                label="Select Brands"
                                placeholder="Choose brands..."
                                searchPlaceholder="Search brands..."
                                options={brandOptions}
                                value={data.brand_ids}
                                onChange={(vals) => setData('brand_ids', vals)}
                            />
                        )}

                        {data.applies_to === 'categories' && (
                            <MultiSelect
                                label="Select Categories"
                                placeholder="Choose categories..."
                                searchPlaceholder="Search categories..."
                                options={categoryOptions}
                                value={data.category_ids}
                                onChange={(vals) => setData('category_ids', vals)}
                            />
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <Input
                                label="Total Usage Limit"
                                type="number"
                                min="1"
                                value={data.usage_limit}
                                onChange={(e) => setData('usage_limit', e.target.value)}
                                placeholder="Unlimited"
                            />
                            <Input
                                label="Limit Per Customer"
                                type="number"
                                min="1"
                                value={data.usage_limit_per_customer}
                                onChange={(e) => setData('usage_limit_per_customer', e.target.value)}
                                placeholder="1"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DateTimePicker
                                label="Start Date & Time"
                                placeholder="Immediately"
                                value={data.starts_at}
                                onChange={(val) => setData('starts_at', val)}
                                presets={startPresets}
                                error={errors.starts_at}
                            />
                            <DateTimePicker
                                label="Expiration Date & Time"
                                placeholder="Never expires"
                                value={data.expires_at}
                                onChange={(val) => setData('expires_at', val)}
                                minDate={data.starts_at || undefined}
                                presets={expiryPresets(data.starts_at)}
                                error={errors.expires_at}
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-end gap-2.5">
                        <Link href="/admin/coupons">
                            <Button type="button" variant="secondary" size="md">
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            isLoading={processing}
                        >
                            {isEdit ? 'Update Coupon' : 'Save Coupon'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </AdminLayout>
    );
}

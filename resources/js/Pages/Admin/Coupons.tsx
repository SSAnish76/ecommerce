import React, { useState, useMemo } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { Coupon, CouponType, CouponApplyTo, PageProps, Product, Category, Collection } from '../../types';
import {
    Button,
    Input,
    Select,
    Badge,
    Modal,
    TableContainer,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableHeaderCell,
    EmptyState,
    CopyButton,
    Toggle,
    Card,
    CardContent,
    DateTimePicker,
} from '../../Components/UI';
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
import {
    TicketPercent,
    Plus,
    Search,
    RotateCcw,
    Layers,
    Pencil,
    Trash2,
    Calendar,
    Users,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertCircle,
    X,
    Filter,
    Table as TableIcon,
    LayoutGrid,
    Sparkles,
    ShoppingBag,
    FolderTree,
    Tag,
    DollarSign,
    Percent,
    ExternalLink,
    Check,
} from 'lucide-react';

interface PaginatedCoupons {
    data: Coupon[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface CouponsPageProps {
    coupons: PaginatedCoupons;
    filters: {
        search?: string;
        status?: string;
        type?: string;
        applies_to?: string;
    };
    options: {
        products: (Product & { category_id?: string })[];
        categories: Category[];
        collections: Collection[];
        types: { value: string; label: string }[];
        applies_to: { value: string; label: string }[];
    };
}

const couponStartDatePresets = [
    {
        label: 'Right Now',
        getValue: () => new Date(),
    },
    {
        label: 'Tomorrow 9 AM',
        getValue: () => setHours(setMinutes(addDays(new Date(), 1), 0), 9),
    },
    {
        label: 'Next Week',
        getValue: () => setHours(setMinutes(addDays(new Date(), 7), 0), 9),
    },
    {
        label: 'In 30 Days',
        getValue: () => setHours(setMinutes(addDays(new Date(), 30), 0), 9),
    },
];

const couponExpiryDatePresets = (baseStartDate?: string) => {
    const base = baseStartDate ? new Date(baseStartDate) : new Date();
    const validBase = isValid(base) ? base : new Date();
    return [
        {
            label: '24 Hours',
            getValue: () => addHours(validBase, 24),
        },
        {
            label: '3 Days',
            getValue: () => endOfDay(addDays(validBase, 3)),
        },
        {
            label: '7 Days',
            getValue: () => endOfDay(addDays(validBase, 7)),
        },
        {
            label: '30 Days',
            getValue: () => endOfDay(addDays(validBase, 30)),
        },
        {
            label: 'End of Month',
            getValue: () => endOfDay(endOfMonth(validBase)),
        },
    ];
};

export default function CouponsPage({ coupons, filters, options }: CouponsPageProps) {
    const { auth } = usePage<PageProps>().props;
    const canCreate = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('coupons.create');
    const canEdit = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('coupons.edit');
    const canDelete = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('coupons.delete');

    // Filtering & View state
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [appliesToFilter, setAppliesToFilter] = useState(filters.applies_to || '');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
    const [inspectingCoupon, setInspectingCoupon] = useState<Coupon | null>(null);

    // Form setup for Create
    const createForm = useForm<{
        code: string;
        name: string;
        description: string;
        type: CouponType;
        value: string | number;
        min_order_amount: string | number;
        max_discount_amount: string | number;
        applies_to: CouponApplyTo;
        product_ids: string[];
        category_ids: string[];
        collection_ids: string[];
        usage_limit: string | number;
        usage_limit_per_customer: string | number;
        starts_at: string;
        expires_at: string;
        is_active: boolean;
    }>({
        code: '',
        name: '',
        description: '',
        type: 'percentage',
        value: '10',
        min_order_amount: '',
        max_discount_amount: '',
        applies_to: 'all',
        product_ids: [],
        category_ids: [],
        collection_ids: [],
        usage_limit: '',
        usage_limit_per_customer: '1',
        starts_at: '',
        expires_at: '',
        is_active: true,
    });

    // Form setup for Edit
    const editForm = useForm<{
        code: string;
        name: string;
        description: string;
        type: CouponType;
        value: string | number;
        min_order_amount: string | number;
        max_discount_amount: string | number;
        applies_to: CouponApplyTo;
        product_ids: string[];
        category_ids: string[];
        collection_ids: string[];
        usage_limit: string | number;
        usage_limit_per_customer: string | number;
        starts_at: string;
        expires_at: string;
        is_active: boolean;
    }>({
        code: '',
        name: '',
        description: '',
        type: 'percentage',
        value: '',
        min_order_amount: '',
        max_discount_amount: '',
        applies_to: 'all',
        product_ids: [],
        category_ids: [],
        collection_ids: [],
        usage_limit: '',
        usage_limit_per_customer: '1',
        starts_at: '',
        expires_at: '',
        is_active: true,
    });

    // Generate random promotional code helper
    const generateCode = (form: typeof createForm) => {
        const prefixes = ['SAVE', 'DEAL', 'SUPER', 'FEST', 'MEGA', 'OFFER', 'VIP'];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const numbers = Math.floor(10 + Math.random() * 90);
        form.setData('code', `${randomPrefix}${numbers}`);
    };

    // Filter submit
    const applyFilters = () => {
        router.get(
            '/admin/coupons',
            {
                search: search || undefined,
                status: statusFilter || undefined,
                type: typeFilter || undefined,
                applies_to: appliesToFilter || undefined,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    const resetFilters = () => {
        setSearch('');
        setStatusFilter('');
        setTypeFilter('');
        setAppliesToFilter('');
        router.get('/admin/coupons');
    };

    // Open Edit modal
    const startEdit = (coupon: Coupon) => {
        setEditingCoupon(coupon);

        const formatDateForInput = (iso?: string | null) => {
            if (!iso) return '';
            try {
                const date = new Date(iso);
                return isValid(date) ? format(date, "yyyy-MM-dd'T'HH:mm") : '';
            } catch {
                return '';
            }
        };

        editForm.setData({
            code: coupon.code,
            name: coupon.name,
            description: coupon.description || '',
            type: coupon.type,
            value: coupon.value,
            min_order_amount: coupon.min_order_amount ?? '',
            max_discount_amount: coupon.max_discount_amount ?? '',
            applies_to: coupon.applies_to,
            product_ids: coupon.products ? coupon.products.map((p) => p.id) : [],
            category_ids: coupon.categories ? coupon.categories.map((c) => c.id) : [],
            collection_ids: coupon.collections ? coupon.collections.map((c) => c.id) : [],
            usage_limit: coupon.usage_limit ?? '',
            usage_limit_per_customer: coupon.usage_limit_per_customer ?? '1',
            starts_at: formatDateForInput(coupon.starts_at),
            expires_at: formatDateForInput(coupon.expires_at),
            is_active: coupon.is_active,
        });
    };

    // Submit Create
    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/coupons', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    // Submit Edit
    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCoupon) return;
        editForm.put(`/admin/coupons/${editingCoupon.id}`, {
            onSuccess: () => {
                setEditingCoupon(null);
            },
        });
    };

    // Submit Delete
    const handleDelete = () => {
        if (!deletingCoupon) return;
        router.delete(`/admin/coupons/${deletingCoupon.id}`, {
            onSuccess: () => setDeletingCoupon(null),
        });
    };

    // Toggle active status
    const handleToggle = (coupon: Coupon) => {
        router.patch(
            `/admin/coupons/${coupon.id}/toggle-status`,
            {},
            { preserveScroll: true }
        );
    };

    // Helper for Status Badge styling
    const renderStatusBadge = (coupon: Coupon) => {
        const badge = coupon.status_badge || (coupon.is_active ? 'active' : 'inactive');

        switch (badge) {
            case 'active':
                return (
                    <Badge variant="emerald" size="sm" dot>
                        Active
                    </Badge>
                );
            case 'scheduled':
                return (
                    <Badge variant="sky" size="sm" dot>
                        Scheduled
                    </Badge>
                );
            case 'expired':
                return (
                    <Badge variant="rose" size="sm" dot>
                        Expired
                    </Badge>
                );
            case 'exhausted':
                return (
                    <Badge variant="amber" size="sm" dot>
                        Limit Reached
                    </Badge>
                );
            default:
                return (
                    <Badge variant="default" size="sm">
                        Inactive
                    </Badge>
                );
        }
    };

    // Helper for Discount Value text
    const formatDiscountValue = (coupon: Coupon) => {
        if (coupon.type === 'percentage') {
            return `${parseFloat(String(coupon.value))}% OFF`;
        }
        return `$${parseFloat(String(coupon.value)).toFixed(2)} OFF`;
    };

    // Helper for Scope Badge
    const renderScopeBadge = (coupon: Coupon) => {
        switch (coupon.applies_to) {
            case 'products':
                return (
                    <span className="inline-flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        {coupon.products?.length || 0} Products
                    </span>
                );
            case 'categories':
                return (
                    <span className="inline-flex items-center gap-1 text-xs text-purple-700 dark:text-purple-400 font-medium">
                        <FolderTree className="w-3.5 h-3.5" />
                        {coupon.categories?.length || 0} Categories
                    </span>
                );
            case 'collections':
                return (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
                        <Sparkles className="w-3.5 h-3.5" />
                        {coupon.collections?.length || 0} Collections
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                        <Tag className="w-3.5 h-3.5" />
                        All Products
                    </span>
                );
        }
    };

    return (
        <AdminLayout
            title="Coupons & Discount Management"
            breadcrumbs={[
                { label: 'Admin', href: '/admin' },
                { label: 'Sales', href: '/admin/orders' },
                { label: 'Coupons & Deals' },
            ]}
        >
            <Head title="Coupons & Discount Management - Catalog Admin" />

            <div className="space-y-6">
                {/* Header & Main Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <TicketPercent className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                            Coupons & Discounts
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Create promotional vouchers, configure percentage or fixed discounts, and apply to products, categories or collections.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        {canCreate && (
                            <Button
                                variant="primary"
                                onClick={() => {
                                    createForm.reset();
                                    generateCode(createForm);
                                    setIsCreateOpen(true);
                                }}
                                className="gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create Coupon</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Search, Filter Toolbar & View Toggle */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {/* Search input */}
                        <div className="lg:col-span-2">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search coupon code, campaign name or description..."
                                leftIcon={<Search className="w-4 h-4" />}
                            />
                        </div>

                        {/* Status filter */}
                        <div>
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'All Statuses' },
                                    { value: 'active', label: 'Active & Live' },
                                    { value: 'inactive', label: 'Inactive' },
                                    { value: 'scheduled', label: 'Scheduled (Future)' },
                                    { value: 'expired', label: 'Expired' },
                                    { value: 'exhausted', label: 'Limit Reached' },
                                ]}
                            />
                        </div>

                        {/* Type filter */}
                        <div>
                            <Select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'All Types' },
                                    { value: 'percentage', label: 'Percentage (%)' },
                                    { value: 'fixed', label: 'Fixed Amount ($)' },
                                ]}
                            />
                        </div>

                        {/* Applies To filter */}
                        <div>
                            <Select
                                value={appliesToFilter}
                                onChange={(e) => setAppliesToFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'All Scopes' },
                                    { value: 'all', label: 'Entire Store' },
                                    { value: 'products', label: 'Specific Products' },
                                    { value: 'categories', label: 'Specific Categories' },
                                    { value: 'collections', label: 'Specific Collections' },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="primary" onClick={applyFilters} className="gap-1.5">
                                <Filter className="w-3.5 h-3.5" />
                                <span>Apply Filters</span>
                            </Button>

                            {(search || statusFilter || typeFilter || appliesToFilter) && (
                                <Button size="sm" variant="secondary" onClick={resetFilters} className="gap-1.5">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reset</span>
                                </Button>
                            )}
                        </div>

                        {/* View toggle */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                                title="Table View"
                            >
                                <TableIcon className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    viewMode === 'grid'
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                                title="Card Grid View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Coupons Data View */}
                {coupons.data.length === 0 ? (
                    <EmptyState
                        title="No Coupons Found"
                        description={
                            search || statusFilter || typeFilter || appliesToFilter
                                ? 'No coupons matched your filter criteria. Try adjusting or resetting your search.'
                                : 'Get started by creating your first promotional coupon discount.'
                        }
                        action={
                            canCreate ? (
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        createForm.reset();
                                        generateCode(createForm);
                                        setIsCreateOpen(true);
                                    }}
                                    className="gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Create Coupon</span>
                                </Button>
                            ) : undefined
                        }
                    />
                ) : viewMode === 'table' ? (
                    /* Table View */
                    <TableContainer>
                        <table className="w-full text-left text-xs sm:text-sm">
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell>Coupon Code & Name</TableHeaderCell>
                                    <TableHeaderCell>Discount</TableHeaderCell>
                                    <TableHeaderCell>Scope</TableHeaderCell>
                                    <TableHeaderCell>Usage & Redemptions</TableHeaderCell>
                                    <TableHeaderCell>Validity Period</TableHeaderCell>
                                    <TableHeaderCell>Status</TableHeaderCell>
                                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {coupons.data.map((coupon) => (
                                    <TableRow key={coupon.id}>
                                        {/* Code & Name */}
                                        <TableCell>
                                            <div className="flex flex-col gap-1 min-w-[180px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold tracking-wider text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 select-all">
                                                        {coupon.code}
                                                    </span>
                                                    <CopyButton text={coupon.code} />
                                                </div>
                                                <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                    {coupon.name}
                                                </span>
                                                {coupon.description && (
                                                    <span className="text-[11px] text-slate-400 line-clamp-1">
                                                        {coupon.description}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Discount */}
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                    {formatDiscountValue(coupon)}
                                                </span>
                                                {coupon.min_order_amount && (
                                                    <span className="text-[11px] text-slate-400">
                                                        Min spend: ${parseFloat(String(coupon.min_order_amount)).toFixed(2)}
                                                    </span>
                                                )}
                                                {coupon.max_discount_amount && (
                                                    <span className="text-[11px] text-slate-400">
                                                        Max cap: ${parseFloat(String(coupon.max_discount_amount)).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Scope */}
                                        <TableCell>
                                            <div>{renderScopeBadge(coupon)}</div>
                                        </TableCell>

                                        {/* Usage */}
                                        <TableCell>
                                            <div className="flex flex-col gap-1 min-w-[120px]">
                                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                    <span>{coupon.times_used} used</span>
                                                    {coupon.usage_limit && (
                                                        <span className="text-slate-400">
                                                            / {coupon.usage_limit} max
                                                        </span>
                                                    )}
                                                </div>
                                                {coupon.usage_limit && (
                                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                coupon.times_used >= coupon.usage_limit
                                                                    ? 'bg-rose-500'
                                                                    : 'bg-indigo-600 dark:bg-indigo-400'
                                                            }`}
                                                            style={{
                                                                width: `${Math.min(
                                                                    100,
                                                                    (coupon.times_used / coupon.usage_limit) * 100
                                                                )}%`,
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                {coupon.usage_limit_per_customer && (
                                                    <span className="text-[10px] text-slate-400">
                                                        {coupon.usage_limit_per_customer} per customer
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Validity */}
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-300">
                                                {coupon.starts_at ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        {new Date(coupon.starts_at).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">Always valid</span>
                                                )}

                                                {coupon.expires_at ? (
                                                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        Exp: {new Date(coupon.expires_at).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                        No expiration
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {renderStatusBadge(coupon)}
                                                {canEdit && (
                                                    <Toggle
                                                        checked={coupon.is_active}
                                                        onChange={() => handleToggle(coupon)}
                                                        size="sm"
                                                    />
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setInspectingCoupon(coupon)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                    title="View Details"
                                                >
                                                    <Layers className="w-4 h-4" />
                                                </button>

                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(coupon)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="Edit Coupon"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeletingCoupon(coupon)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                        title="Delete Coupon"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </table>
                    </TableContainer>
                ) : (
                    /* Card Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {coupons.data.map((coupon) => (
                            <Card key={coupon.id} className="relative overflow-hidden group">
                                <div className="p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold tracking-wider text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300">
                                                    {coupon.code}
                                                </span>
                                                <CopyButton text={coupon.code} />
                                            </div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 mt-1">
                                                {coupon.name}
                                            </h3>
                                        </div>
                                        {renderStatusBadge(coupon)}
                                    </div>

                                    {/* Discount & Scope Banner */}
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                Discount Value
                                            </span>
                                            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                                {formatDiscountValue(coupon)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                                                Applies To
                                            </span>
                                            {renderScopeBadge(coupon)}
                                        </div>
                                    </div>

                                    {coupon.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                            {coupon.description}
                                        </p>
                                    )}

                                    {/* Progress & Details */}
                                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                                        <div className="flex items-center justify-between font-medium">
                                            <span className="text-slate-500">Redemptions:</span>
                                            <span className="text-slate-800 dark:text-slate-200 font-semibold">
                                                {coupon.times_used} {coupon.usage_limit ? `/ ${coupon.usage_limit}` : 'times'}
                                            </span>
                                        </div>

                                        {coupon.min_order_amount && (
                                            <div className="flex items-center justify-between text-slate-500 text-[11px]">
                                                <span>Min Spend:</span>
                                                <span>${parseFloat(String(coupon.min_order_amount)).toFixed(2)}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                                            <span>Expires:</span>
                                            <span>
                                                {coupon.expires_at
                                                    ? new Date(coupon.expires_at).toLocaleDateString()
                                                    : 'Never (Always active)'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {canEdit && (
                                                <Toggle
                                                    checked={coupon.is_active}
                                                    onChange={() => handleToggle(coupon)}
                                                    size="sm"
                                                />
                                            )}
                                            <span className="text-xs text-slate-500 font-medium">
                                                {coupon.is_active ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setInspectingCoupon(coupon)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                title="View Details"
                                            >
                                                <Layers className="w-4 h-4" />
                                            </button>

                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(coupon)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                    title="Edit Coupon"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}

                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDeletingCoupon(coupon)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                    title="Delete Coupon"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Pagination Controls */}
                {coupons.last_page > 1 && (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Showing page {coupons.current_page} of {coupons.last_page} ({coupons.total} total coupons)
                        </span>

                        <div className="flex items-center gap-1.5">
                            {coupons.links.map((link, idx) => {
                                if (!link.url && !link.active) {
                                    return (
                                        <span
                                            key={idx}
                                            className="px-3 py-1.5 text-xs text-slate-300 dark:text-slate-700 select-none"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    );
                                }
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                            link.active
                                                ? 'bg-indigo-600 text-white shadow-2xs'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* CREATE COUPON MODAL */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create Promotional Coupon"
                size="2xl"
            >
                <form onSubmit={handleCreate} className="space-y-6">
                    {/* Section 1: Code & Basic Details */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            1. Coupon Code & Identity
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Coupon Code <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={createForm.data.code}
                                        onChange={(e) => createForm.setData('code', e.target.value.toUpperCase())}
                                        placeholder="e.g. SUMMER20"
                                        className="w-full px-3 py-2 uppercase font-mono font-bold text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => generateCode(createForm)}
                                        title="Auto-generate code"
                                        className="shrink-0 text-xs px-2.5"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                    </Button>
                                </div>
                                {createForm.errors.code && (
                                    <p className="text-xs text-rose-500 mt-1">{createForm.errors.code}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Campaign Title / Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    placeholder="e.g. Summer Season Special Discount"
                                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    required
                                />
                                {createForm.errors.name && (
                                    <p className="text-xs text-rose-500 mt-1">{createForm.errors.name}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Description / Customer Terms
                            </label>
                            <textarea
                                value={createForm.data.description}
                                onChange={(e) => createForm.setData('description', e.target.value)}
                                placeholder="Add optional details, terms of use, or internal promotional notes..."
                                rows={2}
                                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Section 2: Discount Rules */}
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            2. Discount Type & Value
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Select
                                    label="Discount Calculation Type"
                                    required
                                    value={createForm.data.type}
                                    onChange={(e) => createForm.setData('type', e.target.value as CouponType)}
                                    error={createForm.errors.type}
                                    options={[
                                        { value: 'percentage', label: 'Percentage Discount (%)' },
                                        { value: 'fixed', label: 'Fixed Amount Discount ($)' },
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    {createForm.data.type === 'percentage' ? 'Percentage (e.g. 20 for 20%)' : 'Fixed Amount ($)'} <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={createForm.data.type === 'percentage' ? '100' : undefined}
                                        value={createForm.data.value}
                                        onChange={(e) => createForm.setData('value', e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        required
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        {createForm.data.type === 'percentage' ? '%' : '$'}
                                    </span>
                                </div>
                                {createForm.errors.value && (
                                    <p className="text-xs text-rose-500 mt-1">{createForm.errors.value}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Minimum Order Value ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={createForm.data.min_order_amount}
                                    onChange={(e) => createForm.setData('min_order_amount', e.target.value)}
                                    placeholder="Leave blank for no minimum"
                                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                <span className="text-[11px] text-slate-400 mt-0.5 block">
                                    Cart subtotal required to unlock coupon.
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Maximum Discount Cap ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={createForm.data.max_discount_amount}
                                    onChange={(e) => createForm.setData('max_discount_amount', e.target.value)}
                                    placeholder="Leave blank for no cap"
                                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                <span className="text-[11px] text-slate-400 mt-0.5 block">
                                    Caps percentage discount to this amount.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Scope (Applies To) */}
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            3. Application Scope (Applies To)
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { value: 'all', label: 'All Products', icon: Tag },
                                { value: 'products', label: 'Specific Products', icon: ShoppingBag },
                                { value: 'categories', label: 'Categories', icon: FolderTree },
                                { value: 'collections', label: 'Collections', icon: Sparkles },
                            ].map((scope) => {
                                const Icon = scope.icon;
                                const isSelected = createForm.data.applies_to === scope.value;
                                return (
                                    <button
                                        key={scope.value}
                                        type="button"
                                        onClick={() => createForm.setData('applies_to', scope.value as CouponApplyTo)}
                                        className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                                            isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-xs font-bold mt-1">{scope.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Selected Products Picker */}
                        {createForm.data.applies_to === 'products' && (
                            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Select Eligible Products ({createForm.data.product_ids.length} selected)
                                </label>
                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                    {options.products.map((p) => {
                                        const isChecked = createForm.data.product_ids.includes(p.id);
                                        return (
                                            <label
                                                key={p.id}
                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                                                    isChecked
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200'
                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const newIds = e.target.checked
                                                                ? [...createForm.data.product_ids, p.id]
                                                                : createForm.data.product_ids.filter((id) => id !== p.id);
                                                            createForm.setData('product_ids', newIds);
                                                        }}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="font-medium truncate max-w-xs">{p.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">({p.sku})</span>
                                                </div>
                                                <span className="font-semibold text-slate-500">
                                                    ${parseFloat(String(p.sale_price || p.retail_price)).toFixed(2)}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Selected Categories Picker */}
                        {createForm.data.applies_to === 'categories' && (
                            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Select Eligible Categories ({createForm.data.category_ids.length} selected)
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                    {options.categories.map((c) => {
                                        const isChecked = createForm.data.category_ids.includes(c.id);
                                        return (
                                            <label
                                                key={c.id}
                                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                                                    isChecked
                                                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const newIds = e.target.checked
                                                            ? [...createForm.data.category_ids, c.id]
                                                            : createForm.data.category_ids.filter((id) => id !== c.id);
                                                        createForm.setData('category_ids', newIds);
                                                    }}
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="font-medium truncate">{c.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Selected Collections Picker */}
                        {createForm.data.applies_to === 'collections' && (
                            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Select Eligible Collections ({createForm.data.collection_ids.length} selected)
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                    {options.collections.map((col) => {
                                        const isChecked = createForm.data.collection_ids.includes(col.id);
                                        return (
                                            <label
                                                key={col.id}
                                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                                                    isChecked
                                                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const newIds = e.target.checked
                                                            ? [...createForm.data.collection_ids, col.id]
                                                            : createForm.data.collection_ids.filter((id) => id !== col.id);
                                                        createForm.setData('collection_ids', newIds);
                                                    }}
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <span className="font-medium truncate">{col.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 4: Usage Limits & Dates */}
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            4. Limits, Validity Dates & Status
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Total Usage Limit
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={createForm.data.usage_limit}
                                    onChange={(e) => createForm.setData('usage_limit', e.target.value)}
                                    placeholder="Unlimited redemptions"
                                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                <span className="text-[11px] text-slate-400 mt-0.5 block">
                                    Total times this coupon can be used overall.
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Usage Limit Per Customer
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={createForm.data.usage_limit_per_customer}
                                    onChange={(e) => createForm.setData('usage_limit_per_customer', e.target.value)}
                                    placeholder="1"
                                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                <span className="text-[11px] text-slate-400 mt-0.5 block">
                                    Redemptions allowed per email address.
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <DateTimePicker
                                    label="Start Date & Time"
                                    placeholder="Immediately (or pick date)"
                                    value={createForm.data.starts_at}
                                    onChange={(val) => createForm.setData('starts_at', val)}
                                    presets={couponStartDatePresets}
                                    helperText="Leave blank to activate coupon immediately."
                                    error={createForm.errors.starts_at}
                                />
                            </div>

                            <div>
                                <DateTimePicker
                                    label="Expiration Date & Time"
                                    placeholder="Never expires (or pick date)"
                                    value={createForm.data.expires_at}
                                    onChange={(val) => createForm.setData('expires_at', val)}
                                    minDate={createForm.data.starts_at || undefined}
                                    presets={couponExpiryDatePresets(createForm.data.starts_at)}
                                    helperText="Leave blank for unlimited validity period."
                                    error={createForm.errors.expires_at}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <div>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                                    Active Status
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    When disabled, customers cannot apply this coupon.
                                </span>
                            </div>
                            <Toggle
                                checked={createForm.data.is_active}
                                onChange={(val) => createForm.setData('is_active', val)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={createForm.processing}>
                            {createForm.processing ? 'Creating...' : 'Save & Publish Coupon'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* EDIT COUPON MODAL */}
            {editingCoupon && (
                <Modal
                    isOpen={true}
                    onClose={() => setEditingCoupon(null)}
                    title={`Edit Coupon: ${editingCoupon.code}`}
                    size="2xl"
                >
                    <form onSubmit={handleUpdate} className="space-y-6">
                        {/* Section 1: Code & Basic Details */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                1. Coupon Code & Identity
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Coupon Code <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.code}
                                        onChange={(e) => editForm.setData('code', e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 uppercase font-mono font-bold text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        required
                                    />
                                    {editForm.errors.code && (
                                        <p className="text-xs text-rose-500 mt-1">{editForm.errors.code}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Campaign Title / Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.name}
                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        required
                                    />
                                    {editForm.errors.name && (
                                        <p className="text-xs text-rose-500 mt-1">{editForm.errors.name}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Description / Customer Terms
                                </label>
                                <textarea
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Section 2: Discount Rules */}
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                2. Discount Type & Value
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Select
                                        label="Discount Calculation Type"
                                        required
                                        value={editForm.data.type}
                                        onChange={(e) => editForm.setData('type', e.target.value as CouponType)}
                                        error={editForm.errors.type}
                                        options={[
                                            { value: 'percentage', label: 'Percentage Discount (%)' },
                                            { value: 'fixed', label: 'Fixed Amount Discount ($)' },
                                        ]}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        {editForm.data.type === 'percentage' ? 'Percentage (e.g. 20 for 20%)' : 'Fixed Amount ($)'} <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            max={editForm.data.type === 'percentage' ? '100' : undefined}
                                            value={editForm.data.value}
                                            onChange={(e) => editForm.setData('value', e.target.value)}
                                            className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            required
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                            {editForm.data.type === 'percentage' ? '%' : '$'}
                                        </span>
                                    </div>
                                    {editForm.errors.value && (
                                        <p className="text-xs text-rose-500 mt-1">{editForm.errors.value}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Minimum Order Value ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editForm.data.min_order_amount}
                                        onChange={(e) => editForm.setData('min_order_amount', e.target.value)}
                                        placeholder="Leave blank for no minimum"
                                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Maximum Discount Cap ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editForm.data.max_discount_amount}
                                        onChange={(e) => editForm.setData('max_discount_amount', e.target.value)}
                                        placeholder="Leave blank for no cap"
                                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Scope */}
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                3. Application Scope (Applies To)
                            </h4>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                    { value: 'all', label: 'All Products', icon: Tag },
                                    { value: 'products', label: 'Specific Products', icon: ShoppingBag },
                                    { value: 'categories', label: 'Categories', icon: FolderTree },
                                    { value: 'collections', label: 'Collections', icon: Sparkles },
                                ].map((scope) => {
                                    const Icon = scope.icon;
                                    const isSelected = editForm.data.applies_to === scope.value;
                                    return (
                                        <button
                                            key={scope.value}
                                            type="button"
                                            onClick={() => editForm.setData('applies_to', scope.value as CouponApplyTo)}
                                            className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                                                isSelected
                                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="text-xs font-bold mt-1">{scope.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {editForm.data.applies_to === 'products' && (
                                <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Select Eligible Products ({editForm.data.product_ids.length} selected)
                                    </label>
                                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                        {options.products.map((p) => {
                                            const isChecked = editForm.data.product_ids.includes(p.id);
                                            return (
                                                <label
                                                    key={p.id}
                                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                                                        isChecked
                                                            ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200'
                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const newIds = e.target.checked
                                                                    ? [...editForm.data.product_ids, p.id]
                                                                    : editForm.data.product_ids.filter((id) => id !== p.id);
                                                                editForm.setData('product_ids', newIds);
                                                            }}
                                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <span className="font-medium truncate max-w-xs">{p.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">({p.sku})</span>
                                                    </div>
                                                    <span className="font-semibold text-slate-500">
                                                        ${parseFloat(String(p.sale_price || p.retail_price)).toFixed(2)}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {editForm.data.applies_to === 'categories' && (
                                <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Select Eligible Categories ({editForm.data.category_ids.length} selected)
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                        {options.categories.map((c) => {
                                            const isChecked = editForm.data.category_ids.includes(c.id);
                                            return (
                                                <label
                                                    key={c.id}
                                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                                                        isChecked
                                                            ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const newIds = e.target.checked
                                                                ? [...editForm.data.category_ids, c.id]
                                                                : editForm.data.category_ids.filter((id) => id !== c.id);
                                                            editForm.setData('category_ids', newIds);
                                                        }}
                                                        className="rounded text-purple-600 focus:ring-purple-500"
                                                    />
                                                    <span className="font-medium truncate">{c.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {editForm.data.applies_to === 'collections' && (
                                <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Select Eligible Collections ({editForm.data.collection_ids.length} selected)
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                        {options.collections.map((col) => {
                                            const isChecked = editForm.data.collection_ids.includes(col.id);
                                            return (
                                                <label
                                                    key={col.id}
                                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                                                        isChecked
                                                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const newIds = e.target.checked
                                                                ? [...editForm.data.collection_ids, col.id]
                                                                : editForm.data.collection_ids.filter((id) => id !== col.id);
                                                            editForm.setData('collection_ids', newIds);
                                                        }}
                                                        className="rounded text-amber-600 focus:ring-amber-500"
                                                    />
                                                    <span className="font-medium truncate">{col.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 4: Limits & Status */}
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                4. Limits, Validity Dates & Status
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Total Usage Limit
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editForm.data.usage_limit}
                                        onChange={(e) => editForm.setData('usage_limit', e.target.value)}
                                        placeholder="Unlimited"
                                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Usage Limit Per Customer
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editForm.data.usage_limit_per_customer}
                                        onChange={(e) => editForm.setData('usage_limit_per_customer', e.target.value)}
                                        placeholder="1"
                                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <DateTimePicker
                                        label="Start Date & Time"
                                        placeholder="Immediately (or pick date)"
                                        value={editForm.data.starts_at}
                                        onChange={(val) => editForm.setData('starts_at', val)}
                                        presets={couponStartDatePresets}
                                        helperText="Leave blank to activate coupon immediately."
                                        error={editForm.errors.starts_at}
                                    />
                                </div>

                                <div>
                                    <DateTimePicker
                                        label="Expiration Date & Time"
                                        placeholder="Never expires (or pick date)"
                                        value={editForm.data.expires_at}
                                        onChange={(val) => editForm.setData('expires_at', val)}
                                        minDate={editForm.data.starts_at || undefined}
                                        presets={couponExpiryDatePresets(editForm.data.starts_at)}
                                        helperText="Leave blank for unlimited validity period."
                                        error={editForm.errors.expires_at}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                <div>
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                                        Active Status
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        When disabled, customers cannot apply this coupon.
                                    </span>
                                </div>
                                <Toggle
                                    checked={editForm.data.is_active}
                                    onChange={(val) => editForm.setData('is_active', val)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button type="button" variant="secondary" onClick={() => setEditingCoupon(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" disabled={editForm.processing}>
                                {editForm.processing ? 'Saving...' : 'Update Coupon'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deletingCoupon && (
                <Modal
                    isOpen={true}
                    onClose={() => setDeletingCoupon(null)}
                    title="Confirm Delete Coupon"
                    size="md"
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200">
                            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                            <p className="text-xs">
                                Are you sure you want to permanently delete coupon{' '}
                                <strong className="font-mono">{deletingCoupon.code}</strong>? Past order history using
                                this coupon code will be preserved.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3">
                            <Button variant="secondary" onClick={() => setDeletingCoupon(null)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={handleDelete}>
                                Delete Permanently
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* COUPON DETAILS INSPECTOR MODAL */}
            {inspectingCoupon && (
                <Modal
                    isOpen={true}
                    onClose={() => setInspectingCoupon(null)}
                    title={`Coupon Details: ${inspectingCoupon.code}`}
                    size="xl"
                >
                    <div className="space-y-5">
                        {/* Summary Header Card */}
                        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-base text-indigo-700 dark:text-indigo-300">
                                        {inspectingCoupon.code}
                                    </span>
                                    <CopyButton text={inspectingCoupon.code} />
                                </div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                                    {inspectingCoupon.name}
                                </h4>
                            </div>

                            <div className="text-right">
                                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                                    {formatDiscountValue(inspectingCoupon)}
                                </span>
                                <div className="mt-1">{renderStatusBadge(inspectingCoupon)}</div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400 block font-medium">Calculation Type</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block capitalize">
                                    {inspectingCoupon.type}
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400 block font-medium">Minimum Order Amount</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                                    {inspectingCoupon.min_order_amount
                                        ? `$${parseFloat(String(inspectingCoupon.min_order_amount)).toFixed(2)}`
                                        : 'None'}
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400 block font-medium">Max Discount Cap</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                                    {inspectingCoupon.max_discount_amount
                                        ? `$${parseFloat(String(inspectingCoupon.max_discount_amount)).toFixed(2)}`
                                        : 'Uncapped'}
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400 block font-medium">Total Times Redeemed</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                                    {inspectingCoupon.times_used} uses
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400 block font-medium">Global Limit</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                                    {inspectingCoupon.usage_limit ? `${inspectingCoupon.usage_limit} uses` : 'Unlimited'}
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400 block font-medium">Per-Customer Limit</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                                    {inspectingCoupon.usage_limit_per_customer || 1} per buyer
                                </span>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                            <div>
                                <span className="text-slate-400 block font-medium">Valid From:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {inspectingCoupon.starts_at
                                        ? new Date(inspectingCoupon.starts_at).toLocaleString()
                                        : 'Immediate'}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-slate-400 block font-medium">Expires On:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {inspectingCoupon.expires_at
                                        ? new Date(inspectingCoupon.expires_at).toLocaleString()
                                        : 'Never expires'}
                                </span>
                            </div>
                        </div>

                        {/* Associated Entities */}
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                                Scope: {inspectingCoupon.applies_to}
                            </span>

                            {inspectingCoupon.applies_to === 'products' && (
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 max-h-40 overflow-y-auto space-y-1">
                                    {inspectingCoupon.products && inspectingCoupon.products.length > 0 ? (
                                        inspectingCoupon.products.map((p) => (
                                            <div
                                                key={p.id}
                                                className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
                                            >
                                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                                    {p.name}
                                                </span>
                                                <span className="font-mono text-slate-400 text-[11px] shrink-0">
                                                    ${parseFloat(String(p.sale_price || p.retail_price)).toFixed(2)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400">No specific products linked.</p>
                                    )}
                                </div>
                            )}

                            {inspectingCoupon.applies_to === 'categories' && (
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                                    {inspectingCoupon.categories && inspectingCoupon.categories.length > 0 ? (
                                        inspectingCoupon.categories.map((c) => (
                                            <Badge key={c.id} variant="purple" size="sm">
                                                {c.name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400">No categories linked.</p>
                                    )}
                                </div>
                            )}

                            {inspectingCoupon.applies_to === 'collections' && (
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                                    {inspectingCoupon.collections && inspectingCoupon.collections.length > 0 ? (
                                        inspectingCoupon.collections.map((col) => (
                                            <Badge key={col.id} variant="amber" size="sm">
                                                {col.name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400">No collections linked.</p>
                                    )}
                                </div>
                            )}

                            {inspectingCoupon.applies_to === 'all' && (
                                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs">
                                    Universal Coupon: Valid across every product in the catalog.
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                            <Button variant="secondary" size="sm" onClick={() => setInspectingCoupon(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </AdminLayout>
    );
}

import React, { useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { Product, ProductVariant } from '../../types';
import { usePermission } from '../../hooks/usePermission';
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
} from '../../Components/UI';
import {
    Search,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Pencil,
    ChevronDown,
    ChevronRight,
    Check,
    Plus,
    Lock,
    Save,
    Undo2,
    TableProperties,
} from 'lucide-react';

interface PaginatedProducts {
    data: (Product & { variants?: ProductVariant[] })[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface InventoryProps {
    products: PaginatedProducts;
    filters: {
        search: string;
        stock_status?: string;
    };
}

const STORAGE_KEY = 'inventory_pending_stock';
const BULK_MODE_KEY = 'inventory_bulk_mode';

export default function InventoryPage({
    products,
    filters,
}: InventoryProps) {
    const { can } = usePermission();
    const canCreate = can('products', 'create') || can('inventory', 'create');
    const canEdit = can('inventory', 'edit');

    const [search, setSearch] = useState(filters.search || '');
    const [stockFilter, setStockFilter] = useState(filters.stock_status || '');
    const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        products.data.forEach((p) => {
            if (p.has_variants && p.variants && p.variants.length > 0) {
                initial[p.id] = true;
            }
        });
        return initial;
    });

    // Toggle bulk edit mode (grid inputs only active when true)
    const [isBulkEditMode, setIsBulkEditMode] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        try {
            return sessionStorage.getItem(BULK_MODE_KEY) === 'true';
        } catch {
            return false;
        }
    });

    // Track modified inline stock quantities across pagination: { "product:ID": number, "variant:ID": number }
    const [modifiedStock, setModifiedStock] = useState<Record<string, number>>(() => {
        if (typeof window === 'undefined') return {};
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const [savingItemKey, setSavingItemKey] = useState<string | null>(null);
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    // Sync bulk edit mode to sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem(BULK_MODE_KEY, isBulkEditMode ? 'true' : 'false');
        } catch {
            // ignore
        }
    }, [isBulkEditMode]);

    // Sync modifiedStock to sessionStorage so pagination visits retain all previous changes
    useEffect(() => {
        try {
            if (Object.keys(modifiedStock).length > 0) {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(modifiedStock));
            } else {
                sessionStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            // ignore
        }
    }, [modifiedStock]);

    // Modal for threshold adjustments / single item editing in normal flow
    const [editingItem, setEditingItem] = useState<{
        id: string;
        type: 'product' | 'variant';
        name: string;
        sku: string;
        stock_quantity: number;
        low_stock_threshold: number;
        parentName?: string;
    } | null>(null);

    const editForm = useForm({
        stock_quantity: 0,
        low_stock_threshold: 5,
    });

    const toggleExpand = (productId: string) => {
        setExpandedProductIds((prev) => ({
            ...prev,
            [productId]: !prev[productId],
        }));
    };

    const handleStockChange = (key: string, value: string, originalStock: number) => {
        const parsed = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
        setModifiedStock((prev) => {
            if (parsed === originalStock) {
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return {
                ...prev,
                [key]: parsed,
            };
        });
    };

    const discardSingleItem = (key: string) => {
        setModifiedStock((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const discardAllModified = () => {
        setModifiedStock({});
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore
        }
    };

    const toggleBulkEditMode = () => {
        setIsBulkEditMode((prev) => !prev);
    };

    const saveSingleItem = (id: string, type: 'product' | 'variant') => {
        const key = `${type}:${id}`;
        const newStock = modifiedStock[key];
        if (newStock === undefined) return;

        setSavingItemKey(key);
        const url = type === 'product' ? `/admin/inventory/product/${id}` : `/admin/inventory/variant/${id}`;

        router.put(
            url,
            { stock_quantity: newStock },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setModifiedStock((prev) => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                    });
                    setSavingItemKey(null);
                },
                onError: () => {
                    setSavingItemKey(null);
                },
            }
        );
    };

    const saveAllModified = () => {
        const keys = Object.keys(modifiedStock);
        if (keys.length === 0) return;

        const items = keys.map((key) => {
            const [type, id] = key.split(':');
            return {
                id,
                type: type as 'product' | 'variant',
                stock_quantity: modifiedStock[key],
            };
        });

        setIsBulkSaving(true);
        router.post(
            '/admin/inventory/batch-update',
            { items },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setModifiedStock({});
                    try {
                        sessionStorage.removeItem(STORAGE_KEY);
                    } catch {
                        // ignore
                    }
                    setIsBulkSaving(false);
                    setIsBulkEditMode(false);
                },
                onError: () => {
                    setIsBulkSaving(false);
                },
            }
        );
    };

    const openEditModal = (item: {
        id: string;
        type: 'product' | 'variant';
        name: string;
        sku: string;
        stock_quantity: number;
        low_stock_threshold: number;
        parentName?: string;
    }) => {
        setEditingItem(item);
        editForm.setData({
            stock_quantity: item.stock_quantity,
            low_stock_threshold: item.low_stock_threshold,
        });
    };

    const submitModalStockUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        const url =
            editingItem.type === 'product'
                ? `/admin/inventory/product/${editingItem.id}`
                : `/admin/inventory/variant/${editingItem.id}`;

        editForm.put(url, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                const key = `${editingItem.type}:${editingItem.id}`;
                setModifiedStock((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
                setEditingItem(null);
            },
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/inventory',
            { search, stock_status: stockFilter },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setStockFilter('');
        router.get('/admin/inventory', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const modifiedCount = Object.keys(modifiedStock).length;

    return (
        <AdminLayout
            title="Inventory"
            breadcrumbs={[{ label: 'Catalog' }, { label: 'Inventory' }]}
        >
            <Head title="Inventory - Admin" />

            <div className="space-y-4">
                {/* Header with Bulk Update Mode Toggle Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--admin-surface)] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Inventory
                        </h1>
                        <Badge variant="amber" size="sm" className="font-bold">
                            {products.total} Products
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* Bulk Update Mode Toggle Button */}
                        {canEdit && (
                            <Button
                                type="button"
                                variant={isBulkEditMode ? 'primary' : 'secondary'}
                                size="md"
                                onClick={toggleBulkEditMode}
                                leftIcon={
                                    isBulkEditMode ? (
                                        <Check className="w-3.5 h-3.5" />
                                    ) : (
                                        <TableProperties className="w-3.5 h-3.5 text-[var(--admin-primary)]" />
                                    )
                                }
                                className="tap-bounce"
                            >
                                {isBulkEditMode ? 'Exit Bulk Edit' : 'Bulk Update'}
                            </Button>
                        )}

                        {canCreate && (
                            <Link href="/admin/products/create">
                                <Button
                                    variant="primary"
                                    size="md"
                                    pill
                                    leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                                    className="shadow-sm shadow-indigo-500/20 font-bold tap-bounce"
                                >
                                    Add Product
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="bg-[var(--admin-surface)] p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2.5">
                        <div className="relative flex-1 w-full">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name, SKU, or variant..."
                                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                                rightIcon={
                                    search ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch('');
                                                router.get(
                                                    '/admin/inventory',
                                                    { stock_status: stockFilter },
                                                    { preserveState: true, preserveScroll: true }
                                                );
                                            }}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer text-xs"
                                        >
                                            ✕
                                        </button>
                                    ) : undefined
                                }
                                className="w-full text-xs"
                            />
                        </div>

                        <div className="w-full sm:w-52 shrink-0">
                            <Select
                                value={stockFilter}
                                onChange={(e) => {
                                    setStockFilter(e.target.value);
                                    router.get(
                                        '/admin/inventory',
                                        { search, stock_status: e.target.value },
                                        { preserveState: true, preserveScroll: true }
                                    );
                                }}
                                options={[
                                    { value: '', label: 'All Stock Health' },
                                    { value: 'in', label: 'In Stock' },
                                    { value: 'low', label: 'Low Stock' },
                                    { value: 'out', label: 'Out of Stock' },
                                ]}
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <Button type="submit" variant="secondary" size="sm" className="w-full sm:w-auto">
                                Filter
                            </Button>

                            {(search || stockFilter) && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleReset}
                                    className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                    title="Reset"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Unsaved Changes Banner (Active in Bulk Mode or when items modified) */}
                {modifiedCount > 0 && (
                    <div className="px-4 py-2.5 rounded-xl bg-amber-50/95 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
                                {modifiedCount} {modifiedCount === 1 ? 'item' : 'items'} modified across pages
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={discardAllModified}
                                disabled={isBulkSaving}
                                className="text-xs py-1 h-7.5"
                            >
                                Discard
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={saveAllModified}
                                isLoading={isBulkSaving}
                                leftIcon={<Save className="w-3.5 h-3.5" />}
                                className="text-xs py-1 h-7.5 font-semibold"
                            >
                                Save All ({modifiedCount})
                            </Button>
                        </div>
                    </div>
                )}

                {/* Table Container: Normal View or Bulk Edit Grid */}
                <TableContainer>
                    <TableHead>
                        <TableRow>
                            <TableHeaderCell className="min-w-[260px]">Product / Variant</TableHeaderCell>
                            <TableHeaderCell className="w-36">
                                {isBulkEditMode ? 'Stock (Edit)' : 'Stock'}
                            </TableHeaderCell>
                            <TableHeaderCell className="w-24">Min Alert</TableHeaderCell>
                            <TableHeaderCell className="w-28">Status</TableHeaderCell>
                            <TableHeaderCell className="text-right w-24">Action</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {products.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    <EmptyState
                                        title="No inventory records found"
                                        description="Try adjusting your search criteria."
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.data.map((prod) => {
                                const hasVariants = Boolean(prod.has_variants && prod.variants && prod.variants.length > 0);
                                const isExpanded = Boolean(expandedProductIds[prod.id]);
                                const prodKey = `product:${prod.id}`;

                                const parentDisplayStock = hasVariants
                                    ? prod.variants!.reduce((sum, v) => {
                                          const vKey = `variant:${v.id}`;
                                          return sum + (modifiedStock[vKey] ?? v.stock_quantity);
                                      }, 0)
                                    : (modifiedStock[prodKey] ?? prod.stock_quantity);

                                const isParentLowStock =
                                    parentDisplayStock > 0 &&
                                    parentDisplayStock <= prod.low_stock_threshold;
                                const isParentOutOfStock = parentDisplayStock <= 0;
                                const isProdModified = modifiedStock[prodKey] !== undefined;

                                return (
                                    <React.Fragment key={`prod-${prod.id}`}>
                                        <TableRow className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                            {/* Product Name & SKU */}
                                            <TableCell>
                                                <div className="flex items-center gap-2 py-0.5">
                                                    {hasVariants && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpand(prod.id)}
                                                            className="p-0.5 -ml-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronDown className="w-4 h-4 text-indigo-600" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    )}

                                                    <span className="font-semibold text-slate-900 dark:text-white text-sm">
                                                        {prod.name}
                                                    </span>

                                                    {prod.sku && (
                                                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                                                            {prod.sku}
                                                        </span>
                                                    )}

                                                    {hasVariants && (
                                                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium shrink-0">
                                                            ({prod.variants?.length} variants)
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Stock Column: Input in bulk mode; Normal text in view mode */}
                                            <TableCell>
                                                {hasVariants ? (
                                                    <div className="flex items-center gap-1.5 font-mono py-0.5">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                            {parentDisplayStock}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-sans font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 shrink-0">
                                                            Units
                                                        </span>
                                                    </div>
                                                ) : isBulkEditMode ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            disabled={!canEdit}
                                                            value={parentDisplayStock}
                                                            onChange={(e) =>
                                                                handleStockChange(prodKey, e.target.value, prod.stock_quantity)
                                                            }
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    saveSingleItem(prod.id, 'product');
                                                                }
                                                            }}
                                                            className={`w-24 px-2.5 py-1 text-sm font-bold rounded-lg border text-right transition-all font-mono focus:outline-none focus:ring-2 shadow-2xs ${
                                                                isProdModified
                                                                    ? 'border-amber-500 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 ring-1 ring-amber-400'
                                                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-600 focus:ring-indigo-500/20'
                                                            }`}
                                                        />
                                                        {isProdModified && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-baseline gap-1 font-mono py-0.5">
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                            {parentDisplayStock}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-sans">units</span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Min Alert Threshold */}
                                            <TableCell>
                                                <span className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                    {prod.low_stock_threshold}
                                                </span>
                                            </TableCell>

                                            {/* Status Badge */}
                                            <TableCell>
                                                {isParentOutOfStock ? (
                                                    <Badge variant="danger" size="sm">
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                        Out
                                                    </Badge>
                                                ) : isParentLowStock ? (
                                                    <Badge variant="warning" size="sm">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        Low
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="success" size="sm">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        In Stock
                                                    </Badge>
                                                )}
                                            </TableCell>

                                            {/* Action */}
                                            <TableCell className="text-right">
                                                {hasVariants ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 select-none">
                                                        <Lock className="w-3 h-3" />
                                                        Synced
                                                    </span>
                                                ) : isBulkEditMode && isProdModified ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => discardSingleItem(prodKey)}
                                                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                                                            title="Undo"
                                                        >
                                                            <Undo2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            onClick={() => saveSingleItem(prod.id, 'product')}
                                                            isLoading={savingItemKey === prodKey}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-xs h-7"
                                                        >
                                                            <Check className="w-3 h-3 stroke-[3]" />
                                                        </Button>
                                                    </div>
                                                ) : canEdit ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            openEditModal({
                                                                id: prod.id,
                                                                type: 'product',
                                                                name: prod.name,
                                                                sku: prod.sku,
                                                                stock_quantity: prod.stock_quantity,
                                                                low_stock_threshold: prod.low_stock_threshold,
                                                            })
                                                        }
                                                        className="text-slate-500 hover:text-indigo-600 p-1 text-xs h-7"
                                                    >
                                                        <Pencil className="w-3 h-3 mr-1" />
                                                        Adjust
                                                    </Button>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>

                                        {/* Child Variant Rows */}
                                        {hasVariants &&
                                            isExpanded &&
                                            prod.variants!.map((v) => {
                                                const vKey = `variant:${v.id}`;
                                                const currentVStock = modifiedStock[vKey] ?? v.stock_quantity;
                                                const isVLow =
                                                    currentVStock > 0 &&
                                                    currentVStock <= (v.low_stock_threshold ?? 5);
                                                const isVOut = currentVStock <= 0;
                                                const isVModified = modifiedStock[vKey] !== undefined;

                                                return (
                                                    <TableRow
                                                        key={`var-${v.id}`}
                                                        className={`text-xs border-b border-slate-100 dark:border-slate-800/60 transition-colors ${
                                                            isBulkEditMode && isVModified
                                                                ? 'bg-amber-50/30 dark:bg-amber-950/20'
                                                                : 'bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                                        }`}
                                                    >
                                                        {/* Indented Variant Title & SKU */}
                                                        <TableCell className="pl-6">
                                                            <div className="flex items-center gap-2 py-0.5">
                                                                <span className="text-slate-300 dark:text-slate-600 font-mono select-none">
                                                                    ↳
                                                                </span>
                                                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                                                    {v.name}
                                                                </span>
                                                                {v.sku && (
                                                                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                                        {v.sku}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        {/* Variant Stock: Input in bulk mode; Normal text in view mode */}
                                                        <TableCell>
                                                            {isBulkEditMode ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        disabled={!canEdit}
                                                                        value={currentVStock}
                                                                        onChange={(e) =>
                                                                            handleStockChange(vKey, e.target.value, v.stock_quantity)
                                                                        }
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                if (v.id) saveSingleItem(v.id, 'variant');
                                                                            }
                                                                        }}
                                                                        className={`w-24 px-2.5 py-1 text-sm font-bold rounded-lg border text-right transition-all font-mono focus:outline-none focus:ring-2 shadow-2xs ${
                                                                            isVModified
                                                                                ? 'border-amber-500 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 ring-1 ring-amber-400'
                                                                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-600 focus:ring-indigo-500/20'
                                                                        }`}
                                                                    />
                                                                    {isVModified && (
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-baseline gap-1 font-mono py-0.5">
                                                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                                        {currentVStock}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 font-sans">units</span>
                                                                </div>
                                                            )}
                                                        </TableCell>

                                                        {/* Variant Threshold */}
                                                        <TableCell>
                                                            <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                                                                {v.low_stock_threshold ?? 5}
                                                            </span>
                                                        </TableCell>

                                                        {/* Variant Status */}
                                                        <TableCell>
                                                            {isVOut ? (
                                                                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                                                                    <XCircle className="w-3 h-3" />
                                                                    Out
                                                                </span>
                                                            ) : isVLow ? (
                                                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    Low
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    In Stock
                                                                </span>
                                                            )}
                                                        </TableCell>

                                                        {/* Variant Actions */}
                                                        <TableCell className="text-right">
                                                            {isBulkEditMode && isVModified && v.id ? (
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => discardSingleItem(vKey)}
                                                                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                                                                        title="Undo"
                                                                    >
                                                                        <Undo2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="primary"
                                                                        onClick={() => saveSingleItem(v.id!, 'variant')}
                                                                        isLoading={savingItemKey === vKey}
                                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-xs h-7"
                                                                    >
                                                                        <Check className="w-3 h-3 stroke-[3]" />
                                                                    </Button>
                                                                </div>
                                                            ) : canEdit && v.id ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        openEditModal({
                                                                            id: v.id!,
                                                                            type: 'variant',
                                                                            name: v.name,
                                                                            parentName: prod.name,
                                                                            sku: v.sku,
                                                                            stock_quantity: v.stock_quantity,
                                                                            low_stock_threshold: v.low_stock_threshold ?? 5,
                                                                        })
                                                                    }
                                                                    className="text-slate-500 hover:text-indigo-600 p-1 text-xs h-7"
                                                                >
                                                                    <Pencil className="w-3 h-3 mr-1" />
                                                                    Adjust
                                                                </Button>
                                                            ) : null}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </TableContainer>

                {/* Pagination */}
                {products.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-2 gap-3">
                        <span>
                            Showing {products.data.length} of {products.total} items
                        </span>
                        <div className="flex gap-1.5 flex-wrap justify-center">
                            {products.links.map((link, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                                    disabled={!link.url || link.active}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                        link.active
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                            : link.url
                                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            : 'border-transparent text-slate-400 opacity-40 cursor-not-allowed'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal for threshold adjustments without verbose hints */}
            <Modal
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                title={`Adjust: ${editingItem?.name}`}
                description={
                    editingItem?.parentName
                        ? `Product: ${editingItem.parentName} • SKU: ${editingItem.sku}`
                        : `SKU: ${editingItem?.sku ?? '—'}`
                }
            >
                <form onSubmit={submitModalStockUpdate} className="space-y-4 pt-1">
                    <Input
                        label="Stock Quantity"
                        required
                        type="number"
                        min="0"
                        value={String(editForm.data.stock_quantity)}
                        onChange={(e) => editForm.setData('stock_quantity', Math.max(0, parseInt(e.target.value, 10) || 0))}
                        error={editForm.errors.stock_quantity}
                    />

                    <Input
                        label="Low Stock Alert Threshold"
                        required
                        type="number"
                        min="1"
                        value={String(editForm.data.low_stock_threshold)}
                        onChange={(e) => editForm.setData('low_stock_threshold', Math.max(1, parseInt(e.target.value, 10) || 1))}
                        error={editForm.errors.low_stock_threshold}
                    />

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setEditingItem(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={editForm.processing}
                        >
                            Save
                        </Button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

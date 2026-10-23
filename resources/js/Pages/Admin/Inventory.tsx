import React, { useState } from 'react';
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
    Layers,
    Pencil,
    ChevronDown,
    ChevronRight,
    Copy,
    Check,
    Plus,
    Lock,
    Info,
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
        // By default, expand products that have variants so their variants are clearly visible
        const initial: Record<string, boolean> = {};
        products.data.forEach((p) => {
            if (p.has_variants && p.variants && p.variants.length > 0) {
                initial[p.id] = true;
            }
        });
        return initial;
    });
    const [copiedSku, setCopiedSku] = useState<string | null>(null);

    // Single item edit modal (variants or simple products only)
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

    const openEdit = (item: {
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

    const submitStockUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        const url =
            editingItem.type === 'product'
                ? `/admin/inventory/product/${editingItem.id}`
                : `/admin/inventory/variant/${editingItem.id}`;

        editForm.put(url, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingItem(null);
            },
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/inventory',
            { search, stock_status: stockFilter },
            { preserveState: true, replace: true }
        );
    };

    const handleStatusFilter = (status: string) => {
        setStockFilter(status);
        router.get(
            '/admin/inventory',
            { search, stock_status: status },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setStockFilter('');
        router.get('/admin/inventory', {}, { preserveState: true, replace: true });
    };

    const handleCopySku = (sku: string) => {
        navigator.clipboard?.writeText(sku);
        setCopiedSku(sku);
        setTimeout(() => setCopiedSku(null), 2000);
    };

    const quickAdjustQuantity = (delta: number) => {
        editForm.setData('stock_quantity', Math.max(0, editForm.data.stock_quantity + delta));
    };

    return (
        <AdminLayout
            title="Inventory"
            breadcrumbs={[{ label: 'Catalog' }, { label: 'Inventory' }]}
        >
            <Head title="Inventory Management - Admin" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Stock &amp; Inventory Management
                            </h1>
                            <Badge variant="amber" size="sm" className="font-semibold">
                                {products.total} {products.total === 1 ? 'Product' : 'Products'}
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Monitor catalog stock levels, low-stock threshold alerts, and manage product inventory.
                        </p>
                    </div>

                    {canCreate && (
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <Link href="/admin/products/create">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    pill
                                    leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                                    className="shadow-md shadow-indigo-600/20 font-medium px-4.5 py-1.5 rounded-full whitespace-nowrap"
                                >
                                    Add Product
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Filters Bar */}
                <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2.5">
                        <div className="relative flex-1 w-full">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by product name, SKU, or variant..."
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
                                                    { preserveState: true }
                                                );
                                            }}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer text-xs"
                                            title="Clear search"
                                        >
                                            ✕
                                        </button>
                                    ) : undefined
                                }
                                className="w-full text-xs"
                            />
                        </div>

                        <div className="w-full sm:w-56 shrink-0">
                            <Select
                                value={stockFilter}
                                onChange={(e) => handleStatusFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'All Stock Levels' },
                                    { value: 'in', label: 'In Stock Only' },
                                    { value: 'low', label: 'Low Stock Alert Only' },
                                    { value: 'out', label: 'Out of Stock Only' },
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
                                    title="Reset filters"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Clean Inventory Table */}
                <TableContainer>
                    <TableHead>
                        <TableRow>
                            <TableHeaderCell>Product / Variant</TableHeaderCell>
                            <TableHeaderCell>SKU</TableHeaderCell>
                            <TableHeaderCell>Available Stock</TableHeaderCell>
                            <TableHeaderCell>Min Threshold</TableHeaderCell>
                            <TableHeaderCell>Stock Status</TableHeaderCell>
                            <TableHeaderCell className="text-right">Action</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {products.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6}>
                                    <EmptyState
                                        title="No inventory records found"
                                        description="Try adjusting your search criteria or clear the stock filter."
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.data.map((prod) => {
                                const isLowStock =
                                    prod.stock_quantity > 0 &&
                                    prod.stock_quantity <= prod.low_stock_threshold;
                                const isOutOfStock = prod.stock_quantity <= 0;
                                const hasVariants = Boolean(prod.has_variants && prod.variants && prod.variants.length > 0);
                                const isExpanded = Boolean(expandedProductIds[prod.id]);

                                return (
                                    <React.Fragment key={`prod-${prod.id}`}>
                                        <TableRow className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                            {/* Product Column with Brand/Category info */}
                                            <TableCell>
                                                <div className="flex items-start gap-2.5">
                                                    {hasVariants ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpand(prod.id)}
                                                            className="mt-0.5 p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title={isExpanded ? 'Collapse variants' : 'Expand variants'}
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronDown className="w-4 h-4 text-indigo-600" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <span className="w-4 mt-0.5" />
                                                    )}

                                                    <div className="space-y-0.5">
                                                        <div className="font-semibold text-slate-900 dark:text-white text-sm">
                                                            {prod.name}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                            {prod.brand?.name && (
                                                                <span>{prod.brand.name}</span>
                                                            )}
                                                            {prod.brand?.name && prod.category?.name && (
                                                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                                            )}
                                                            {prod.category?.name && (
                                                                <span>{prod.category.name}</span>
                                                            )}

                                                            {hasVariants && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpand(prod.id)}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
                                                                >
                                                                    <Layers className="w-3 h-3" />
                                                                    <span>
                                                                        {prod.variants?.length} {prod.variants?.length === 1 ? 'Variant' : 'Variants'}
                                                                    </span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* SKU */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                                                    <span>{prod.sku || '—'}</span>
                                                    {prod.sku && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopySku(prod.sku)}
                                                            className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5"
                                                            title="Copy SKU"
                                                        >
                                                            {copiedSku === prod.sku ? (
                                                                <Check className="w-3 h-3 text-emerald-500" />
                                                            ) : (
                                                                <Copy className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Current Stock */}
                                            <TableCell>
                                                <div>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                            {prod.stock_quantity}
                                                        </span>
                                                        <span className="text-xs text-slate-400">units</span>
                                                    </div>
                                                    {hasVariants && (
                                                        <span className="text-[10px] text-slate-400 font-medium block">
                                                            Auto-calculated
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Min Threshold */}
                                            <TableCell>
                                                <span className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                    {prod.low_stock_threshold}
                                                </span>
                                            </TableCell>

                                            {/* Stock Status Badge */}
                                            <TableCell>
                                                {isOutOfStock ? (
                                                    <Badge variant="danger" size="sm">
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                        Out of Stock
                                                    </Badge>
                                                ) : isLowStock ? (
                                                    <Badge variant="warning" size="sm">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        Low Stock
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="success" size="sm">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        In Stock
                                                    </Badge>
                                                )}
                                            </TableCell>

                                            {/* Action Column: Variants only / Simple product only */}
                                            <TableCell className="text-right">
                                                {hasVariants ? (
                                                    // Product has variants: Direct update is disabled!
                                                    <span
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 cursor-default select-none"
                                                        title="Parent stock is automatically calculated from variant quantities. Update individual variants below."
                                                    >
                                                        <Lock className="w-3 h-3 text-slate-400" />
                                                        Auto-synced
                                                    </span>
                                                ) : canEdit ? (
                                                    // Simple product with NO variants: Admin can adjust stock
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            openEdit({
                                                                id: prod.id,
                                                                type: 'product',
                                                                name: prod.name,
                                                                sku: prod.sku,
                                                                stock_quantity: prod.stock_quantity,
                                                                low_stock_threshold: prod.low_stock_threshold,
                                                            })
                                                        }
                                                        className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 p-1.5 text-xs font-medium"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5 mr-1" />
                                                        Adjust Stock
                                                    </Button>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>

                                        {/* Child Variant Rows */}
                                        {hasVariants &&
                                            isExpanded &&
                                            prod.variants!.map((v) => {
                                                const vLow =
                                                    v.stock_quantity > 0 &&
                                                    v.stock_quantity <= (v.low_stock_threshold ?? 5);
                                                const vOut = v.stock_quantity <= 0;

                                                return (
                                                    <TableRow
                                                        key={`var-${v.id}`}
                                                        className="bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-xs border-b border-slate-100 dark:border-slate-800/60"
                                                    >
                                                        {/* Indented Variant Name */}
                                                        <TableCell className="pl-10">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-300 dark:text-slate-600 font-mono text-sm select-none">
                                                                    ↳
                                                                </span>
                                                                <span className="font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                                    {v.name}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                                                    Variant
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Variant SKU */}
                                                        <TableCell>
                                                            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                                                                <span>{v.sku}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopySku(v.sku)}
                                                                    className="hover:text-slate-700 text-slate-400 p-0.5"
                                                                    title="Copy SKU"
                                                                >
                                                                    {copiedSku === v.sku ? (
                                                                        <Check className="w-3 h-3 text-emerald-500" />
                                                                    ) : (
                                                                        <Copy className="w-3 h-3" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </TableCell>

                                                        {/* Variant Stock */}
                                                        <TableCell>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="font-bold text-slate-900 dark:text-slate-200 text-xs">
                                                                    {v.stock_quantity}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">units</span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Variant Threshold */}
                                                        <TableCell>
                                                            <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                                                                {v.low_stock_threshold ?? 5}
                                                            </span>
                                                        </TableCell>

                                                        {/* Variant Health Badge */}
                                                        <TableCell>
                                                            {vOut ? (
                                                                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                                                                    <XCircle className="w-3 h-3" />
                                                                    Out of Stock
                                                                </span>
                                                            ) : vLow ? (
                                                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    Low ({v.stock_quantity})
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    In Stock
                                                                </span>
                                                            )}
                                                        </TableCell>

                                                        {/* Variant Adjust Action (allowed for variants!) */}
                                                        <TableCell className="text-right">
                                                            {canEdit && v.id && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        openEdit({
                                                                            id: v.id!,
                                                                            type: 'variant',
                                                                            name: v.name,
                                                                            parentName: prod.name,
                                                                            sku: v.sku,
                                                                            stock_quantity: v.stock_quantity,
                                                                            low_stock_threshold: v.low_stock_threshold ?? 5,
                                                                        })
                                                                    }
                                                                    className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 p-1 text-xs font-medium"
                                                                >
                                                                    <Pencil className="w-3 h-3 mr-1" />
                                                                    Adjust Stock
                                                                </Button>
                                                            )}
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
                    <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-3 gap-3">
                        <span>
                            Showing {products.data.length} of {products.total} items
                        </span>
                        <div className="flex gap-1.5 flex-wrap justify-center">
                            {products.links.map((link, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => link.url && router.get(link.url)}
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

            {/* Quick Adjust Stock Modal */}
            <Modal
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                title={`Adjust Stock: ${editingItem?.name}`}
                description={
                    editingItem?.parentName
                        ? `Product: ${editingItem.parentName} • SKU: ${editingItem.sku}`
                        : `SKU: ${editingItem?.sku ?? '—'} • Standard Product`
                }
            >
                <form onSubmit={submitStockUpdate} className="space-y-4 pt-2">
                    {/* Variant notice info */}
                    {editingItem?.type === 'variant' && (
                        <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-start gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
                            <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                            <div>
                                <span className="font-semibold block">Automatic Parent Sync</span>
                                Updating this variant will automatically recalculate and update the main product's total inventory count.
                            </div>
                        </div>
                    )}

                    {/* Projected Health Preview */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                Projected Status
                            </span>
                            <div className="mt-1">
                                {editForm.data.stock_quantity <= 0 ? (
                                    <Badge variant="danger" size="sm">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Will become Out of Stock
                                    </Badge>
                                ) : editForm.data.stock_quantity <= editForm.data.low_stock_threshold ? (
                                    <Badge variant="warning" size="sm">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Will trigger Low Stock Alert
                                    </Badge>
                                ) : (
                                    <Badge variant="success" size="sm">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Healthy Stock
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="text-right">
                            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                Current
                            </span>
                            <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                                {editingItem?.stock_quantity ?? 0}
                            </span>
                        </div>
                    </div>

                    <div>
                        <Input
                            label="Stock Quantity (Units)"
                            required
                            type="number"
                            min="0"
                            value={String(editForm.data.stock_quantity)}
                            onChange={(e) => editForm.setData('stock_quantity', Math.max(0, parseInt(e.target.value, 10) || 0))}
                            error={editForm.errors.stock_quantity}
                        />

                        {/* Quick increment buttons */}
                        <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Add:</span>
                            <button
                                type="button"
                                onClick={() => quickAdjustQuantity(5)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                +5
                            </button>
                            <button
                                type="button"
                                onClick={() => quickAdjustQuantity(10)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                +10
                            </button>
                            <button
                                type="button"
                                onClick={() => quickAdjustQuantity(50)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                +50
                            </button>
                            <button
                                type="button"
                                onClick={() => editForm.setData('stock_quantity', 0)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors"
                            >
                                Clear to 0
                            </button>
                        </div>
                    </div>

                    <Input
                        label="Low Stock Alert Threshold"
                        required
                        type="number"
                        min="1"
                        value={String(editForm.data.low_stock_threshold)}
                        onChange={(e) => editForm.setData('low_stock_threshold', Math.max(1, parseInt(e.target.value, 10) || 1))}
                        error={editForm.errors.low_stock_threshold}
                        helperText="Triggers low-stock warnings when inventory drops at or below this count"
                    />

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
                            Save Stock
                        </Button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

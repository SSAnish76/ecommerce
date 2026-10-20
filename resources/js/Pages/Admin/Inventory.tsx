import React, { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { Product, ProductVariant, PageProps } from '../../types';
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
    PageHeader,
} from '../../Components/UI';
import {
    Boxes,
    Search,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Layers,
    Save,
    Pencil,
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
    metrics: {
        total_products: number;
        in_stock: number;
        low_stock: number;
        out_of_stock: number;
    };
    filters: {
        search: string;
        stock_status?: string;
    };
}

export default function InventoryPage({
    products,
    metrics,
    filters,
}: InventoryProps) {
    const { auth } = usePage<PageProps>().props;
    const canEdit = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('inventory.edit');

    const [search, setSearch] = useState(filters.search || '');
    const [stockFilter, setStockFilter] = useState(filters.stock_status || '');

    // Single item edit modal
    const [editingItem, setEditingItem] = useState<{
        id: number;
        type: 'product' | 'variant';
        name: string;
        sku: string;
        stock_quantity: number;
        low_stock_threshold: number;
    } | null>(null);

    const editForm = useForm({
        stock_quantity: 0,
        low_stock_threshold: 5,
    });

    const openEdit = (item: {
        id: number;
        type: 'product' | 'variant';
        name: string;
        sku: string;
        stock_quantity: number;
        low_stock_threshold: number;
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

    const handleReset = () => {
        setSearch('');
        setStockFilter('');
        router.get('/admin/inventory', {}, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout
            title="Inventory"
            breadcrumbs={[{ label: 'Catalog' }, { label: 'Inventory' }]}
        >
            <Head title="Inventory Stock Management - Admin" />

            <div className="space-y-6">
                <PageHeader
                    title="Warehouse Stock & Replenishment"
                    description="Live stock tracking, threshold warnings, low-stock replenishment, and variant stock breakdown"
                    badge="Fulfillment"
                />

                {/* Stock Telemetry Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">Catalog Items</span>
                            <Boxes className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {metrics.total_products}
                        </div>
                        <span className="text-[11px] text-slate-500">Active SKUs tracked</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Healthy Stock</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {metrics.in_stock}
                        </div>
                        <span className="text-[11px] text-slate-500">Above minimum threshold</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Low Stock Alert</span>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {metrics.low_stock}
                        </div>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Re-order required</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Out of Stock</span>
                            <XCircle className="w-4 h-4 text-rose-500" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {metrics.out_of_stock}
                        </div>
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Unavailable to order</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search inventory by product name or SKU..."
                                className="pl-9 w-full"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <Select
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'All Stock Health' },
                                    { value: 'low', label: 'Low Stock Alerts' },
                                    { value: 'out', label: 'Out of Stock' },
                                    { value: 'in', label: 'Healthy In Stock' },
                                ]}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button type="submit" variant="secondary" className="w-full sm:w-auto">
                                Filter
                            </Button>
                            {(search || stockFilter) && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleReset}
                                    className="p-2"
                                    title="Reset filters"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Inventory Table */}
                <TableContainer>
                    <TableHead>
                        <TableRow>
                            <TableHeaderCell>Product / Variant</TableHeaderCell>
                            <TableHeaderCell>SKU</TableHeaderCell>
                            <TableHeaderCell>Brand / Category</TableHeaderCell>
                            <TableHeaderCell>Available Stock</TableHeaderCell>
                            <TableHeaderCell>Alert Threshold</TableHeaderCell>
                            <TableHeaderCell>Health Status</TableHeaderCell>
                            <TableHeaderCell className="text-right">Quick Adjust</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {products.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <EmptyState
                                        title="No inventory records found"
                                        description="Try adjusting your search criteria."
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.data.map((prod) => {
                                const isLowStock =
                                    prod.stock_quantity > 0 &&
                                    prod.stock_quantity <= prod.low_stock_threshold;
                                const isOutOfStock = prod.stock_quantity <= 0;

                                return (
                                    <React.Fragment key={`prod-${prod.id}`}>
                                        <TableRow className="bg-slate-50/30 dark:bg-slate-900/40 font-medium">
                                            <TableCell>
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {prod.name}
                                                </div>
                                                {prod.has_variants && (
                                                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                                                        <Layers className="w-3 h-3" />
                                                        {prod.variants?.length ?? 0} Child Variants Below
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs">{prod.sku}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs text-slate-500">
                                                    {prod.brand?.name || '—'} / {prod.category?.name || '—'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {prod.stock_quantity}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-slate-500 font-mono">
                                                    {prod.low_stock_threshold}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {isOutOfStock ? (
                                                    <Badge variant="danger">Out of Stock</Badge>
                                                ) : isLowStock ? (
                                                    <Badge variant="warning">Low Stock</Badge>
                                                ) : (
                                                    <Badge variant="success">Healthy</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {canEdit && (
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
                                                        className="text-indigo-600 dark:text-indigo-400 p-1.5"
                                                    >
                                                        <Pencil className="w-4 h-4 mr-1" />
                                                        Adjust
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>

                                        {/* Render Variant Sub-rows if available */}
                                        {prod.has_variants &&
                                            prod.variants &&
                                            prod.variants.map((v) => {
                                                const vLow =
                                                    v.stock_quantity > 0 &&
                                                    v.stock_quantity <= (v.low_stock_threshold || 5);
                                                const vOut = v.stock_quantity <= 0;

                                                return (
                                                    <TableRow
                                                        key={`var-${v.id}`}
                                                        className="bg-white dark:bg-slate-950 text-xs text-slate-600 dark:text-slate-400"
                                                    >
                                                        <TableCell className="pl-8">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-300 dark:text-slate-700">↳</span>
                                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                                    {v.name}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-mono text-[11px] text-slate-500">
                                                                {v.sku}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-[11px] text-slate-400">Variant</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                                {v.stock_quantity}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-mono text-slate-400">
                                                                {v.low_stock_threshold ?? 5}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            {vOut ? (
                                                                <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                                                                    Out of Stock
                                                                </span>
                                                            ) : vLow ? (
                                                                <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                                                                    Low ({v.stock_quantity})
                                                                </span>
                                                            ) : (
                                                                <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                                                                    In Stock
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {canEdit && v.id && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        openEdit({
                                                                            id: v.id!,
                                                                            type: 'variant',
                                                                            name: `${prod.name} - ${v.name}`,
                                                                            sku: v.sku,
                                                                            stock_quantity: v.stock_quantity,
                                                                            low_stock_threshold: v.low_stock_threshold ?? 5,
                                                                        })
                                                                    }
                                                                    className="text-slate-600 dark:text-slate-400 p-1 text-xs"
                                                                >
                                                                    Adjust
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
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                        <span>
                            Showing {products.data.length} of {products.total} products
                        </span>
                        <div className="flex gap-1">
                            {products.links.map((link, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url || link.active}
                                    className={`px-3 py-1.5 rounded-lg border transition-colors ${
                                        link.active
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : link.url
                                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                            : 'border-transparent text-slate-400 opacity-50 cursor-not-allowed'
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
                description={`SKU: ${editingItem?.sku} (${editingItem?.type === 'product' ? 'Standard Product' : 'Variant Option'})`}
            >
                <form onSubmit={submitStockUpdate} className="space-y-4">
                    <Input
                        label="Available Stock Quantity (Units)"
                        required
                        type="number"
                        value={String(editForm.data.stock_quantity)}
                        onChange={(e) => editForm.setData('stock_quantity', Number(e.target.value))}
                        error={editForm.errors.stock_quantity}
                    />

                    <Input
                        label="Low Stock Alert Threshold"
                        required
                        type="number"
                        value={String(editForm.data.low_stock_threshold)}
                        onChange={(e) => editForm.setData('low_stock_threshold', Number(e.target.value))}
                        error={editForm.errors.low_stock_threshold}
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
                            Update Inventory
                        </Button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

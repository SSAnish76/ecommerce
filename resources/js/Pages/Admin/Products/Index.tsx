import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { Product, PageProps } from '../../../types';
import { usePermission } from '../../../hooks/usePermission';
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
} from '../../../Components/UI';
import {
    ShoppingBag,
    Search,
    Plus,
    Pencil,
    Trash2,
    RotateCcw,
    Layers,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    LayoutGrid,
    Table as TableIcon,
    Boxes,
} from 'lucide-react';

interface PaginatedProducts {
    data: Product[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface ProductsIndexProps {
    products: PaginatedProducts;
    brands: { id: string; name: string }[];
    categories: { id: string; name: string; parent_id?: string | null; parent?: { id: string; name: string } | null }[];
    statuses: { value: string; label: string }[];
    filters: {
        search: string;
        status?: string;
        brand_id?: string;
        category_id?: string;
        stock?: string;
    };
}

export default function ProductsIndexPage({
    products,
    brands,
    categories,
    statuses,
    filters,
}: ProductsIndexProps) {
    const { store } = usePage<PageProps>().props;
    const { can } = usePermission();
    const currency = store?.currency || '$';

    const canCreate = can('products', 'create');
    const canEdit = can('products', 'edit');
    const canDelete = can('products', 'delete');

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [brandFilter, setBrandFilter] = useState(filters.brand_id || '');
    const [categoryFilter, setCategoryFilter] = useState(filters.category_id || '');
    const [stockFilter, setStockFilter] = useState(filters.stock || '');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

    const totalCount = products.total;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/products',
            {
                search,
                status: statusFilter,
                brand_id: brandFilter,
                category_id: categoryFilter,
                stock: stockFilter,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setStatusFilter('');
        setBrandFilter('');
        setCategoryFilter('');
        setStockFilter('');
        router.get('/admin/products', {}, { preserveState: true, replace: true });
    };

    const toggleStatus = (prod: Product) => {
        router.patch(`/admin/products/${prod.id}/toggle-status`, {}, { preserveScroll: true });
    };

    const confirmDelete = () => {
        if (!deletingProduct) return;
        router.delete(`/admin/products/${deletingProduct.id}`, {
            onSuccess: () => setDeletingProduct(null),
        });
    };

    const activeFilterCount = [search, statusFilter, brandFilter, categoryFilter, stockFilter].filter(Boolean).length;

    return (
        <AdminLayout
            title="Products"
            breadcrumbs={[{ label: 'Catalog' }, { label: 'Products' }]}
        >
            <Head title="Product Catalog - Admin" />

            <div className="space-y-6">
                {/* Clean Mobile-First Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--admin-surface)] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Product Catalog
                            </h1>
                            <Badge variant="indigo" size="sm" className="font-bold">
                                {totalCount} {totalCount === 1 ? 'Product' : 'Products'}
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                            Manage retail pricing, wholesale MRP, image galleries, variants, warehouse stock levels, and storefront visibility.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                        {canCreate && (
                            <Link href="/admin/products/create">
                                <Button
                                    variant="primary"
                                    size="md"
                                    pill
                                    leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                                    className="shadow-md shadow-indigo-600/20 font-bold whitespace-nowrap tap-bounce"
                                >
                                    Add Product
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="bg-[var(--admin-surface)] p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
                    <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                        <div className="relative lg:col-span-4">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search product title or SKU..."
                                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                                rightIcon={
                                    search ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch('');
                                                router.get(
                                                    '/admin/products',
                                                    {
                                                        status: statusFilter,
                                                        brand_id: brandFilter,
                                                        category_id: categoryFilter,
                                                        stock: stockFilter,
                                                    },
                                                    { preserveState: true }
                                                );
                                            }}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer text-xs"
                                            title="Clear search"
                                        >
                                            ✕
                                        </button>
                                    ) : undefined
                                }
                                className="w-full text-xs sm:text-sm"
                            />
                        </div>

                        <div className="lg:col-span-2">
                            <Select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'All Categories' },
                                    ...categories.map((c) => ({
                                        value: String(c.id),
                                        label: c.parent ? `${c.parent.name} › ${c.name}` : (c.parent_id ? `— ${c.name}` : c.name),
                                    })),
                                ]}
                                clearable
                                searchable={categories.length > 5}
                            />
                        </div>

                        <div className="lg:col-span-2">
                            <Select
                                value={brandFilter}
                                onChange={(e) => setBrandFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'All Brands' },
                                    ...brands.map((b) => ({
                                        value: String(b.id),
                                        label: b.name,
                                    })),
                                ]}
                                clearable
                                searchable={brands.length > 5}
                            />
                        </div>

                        <div className="lg:col-span-2">
                            <Select
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'All Stock Levels' },
                                    { value: 'in', label: 'Healthy In Stock' },
                                    { value: 'low', label: 'Low Stock Alerts' },
                                    { value: 'out', label: 'Out of Stock' },
                                ]}
                            />
                        </div>

                        <div className="flex items-center gap-2 lg:col-span-2 justify-end">
                            <Button type="submit" variant="secondary" size="md" className="flex-1 lg:flex-none">
                                Filter
                            </Button>

                            {activeFilterCount > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="md"
                                    onClick={handleReset}
                                    className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                    title="Reset all filters"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                            )}

                            {/* View Mode Toggle */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 p-1 rounded-2xl shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-xl text-xs font-medium transition-colors tap-bounce cursor-pointer ${
                                        viewMode === 'grid'
                                            ? 'bg-white dark:bg-slate-900 text-[var(--admin-primary)] shadow-2xs'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                    title="Product Cards View"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`p-2 rounded-xl text-xs font-medium transition-colors tap-bounce cursor-pointer ${
                                        viewMode === 'table'
                                            ? 'bg-white dark:bg-slate-900 text-[var(--admin-primary)] shadow-2xs'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                    title="Data Table View"
                                >
                                    <TableIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Product Content: Grid Cards vs Data Table */}
                {products.data.length === 0 ? (
                    <div className="bg-[var(--admin-surface)] rounded-3xl border border-slate-200/80 dark:border-white/10 p-8 sm:p-12 text-center shadow-xs">
                        <EmptyState
                            icon={Boxes}
                            title="No products found"
                            description={
                                activeFilterCount > 0
                                    ? 'No products matched your search or filters. Try adjusting filter criteria.'
                                    : 'Your catalog has no products yet. Add your first product to start merchandising!'
                            }
                            action={
                                activeFilterCount > 0 ? (
                                    <Button
                                        variant="outline"
                                        size="md"
                                        pill
                                        onClick={handleReset}
                                    >
                                        Clear Filters
                                    </Button>
                                ) : canCreate ? (
                                    <Link href="/admin/products/create">
                                        <Button
                                            variant="primary"
                                            size="md"
                                            pill
                                            leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                                        >
                                            Add Product
                                        </Button>
                                    </Link>
                                ) : undefined
                            }
                        />
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Modern Product Grid View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {products.data.map((prod) => {
                            const isLowStock =
                                prod.stock_quantity > 0 &&
                                prod.stock_quantity <= prod.low_stock_threshold;
                            const isOutOfStock = prod.stock_quantity <= 0;
                            const imageUrl = prod.primary_image?.url;

                            return (
                                <div
                                    key={prod.id}
                                    className="group relative bg-[var(--admin-surface)] rounded-3xl border border-slate-200/80 dark:border-white/10 overflow-hidden hover:border-[var(--admin-primary)]/50 transition-all duration-200 hover:shadow-md flex flex-col justify-between tap-bounce"
                                >
                                    <div>
                                        {/* Image & Overlay Badges */}
                                        <div className="relative aspect-4/3 w-full bg-slate-50 dark:bg-slate-950/60 overflow-hidden flex items-center justify-center p-3 border-b border-slate-100 dark:border-white/5">
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={prod.name}
                                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                                    <ShoppingBag className="w-10 h-10 mb-1" />
                                                    <span className="text-[11px] font-medium">No Image</span>
                                                </div>
                                            )}

                                            {/* Stock Status Badge */}
                                            <div className="absolute top-2.5 left-2.5">
                                                {isOutOfStock ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-2xs">
                                                        <XCircle className="w-3 h-3" />
                                                        Out of Stock
                                                    </span>
                                                ) : isLowStock ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Low ({prod.stock_quantity} left)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white backdrop-blur-xs">
                                                        In Stock ({prod.stock_quantity})
                                                    </span>
                                                )}
                                            </div>

                                            {/* Discount Pill if available */}
                                            {prod.discount_value && Number(prod.discount_value) > 0 ? (
                                                <div className="absolute top-2.5 right-2.5">
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--admin-primary)] text-white shadow-2xs">
                                                        {prod.discount_type === 'fixed'
                                                            ? `${currency}${Number(prod.discount_value).toFixed(2)} OFF`
                                                            : `${Number(prod.discount_value)}% OFF`}
                                                    </span>
                                                </div>
                                            ) : null}

                                            {/* Variants indicator */}
                                            {prod.has_variants && (
                                                <div className="absolute bottom-2.5 right-2.5">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900/80 text-white backdrop-blur-xs">
                                                        <Layers className="w-3 h-3" />
                                                        {prod.variants_count ?? 0} Variants
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-4 space-y-2.5">
                                            {/* Brand & Category badges */}
                                            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                                {prod.brand && (
                                                    <span className="font-bold text-[var(--admin-primary)] bg-[var(--admin-primary-subtle)] px-2.5 py-0.5 rounded-full">
                                                        {prod.brand.name}
                                                    </span>
                                                )}
                                                {prod.category && (
                                                    <span className="text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 rounded-full font-medium">
                                                        {prod.category.name}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Title */}
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-[var(--admin-primary)] transition-colors">
                                                {prod.name}
                                            </h3>

                                            {/* SKU with copy button */}
                                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                                                <span>SKU: {prod.sku}</span>
                                                <CopyButton text={prod.sku} title="Copy SKU" />
                                            </div>

                                            {/* Pricing Row */}
                                            <div className="flex items-baseline gap-2 pt-1">
                                                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                                                    {currency}
                                                    {Number(prod.retail_price).toFixed(2)}
                                                </span>
                                                {prod.mrp && Number(prod.mrp) > Number(prod.retail_price) && (
                                                    <span className="text-xs text-slate-400 line-through">
                                                        {currency}
                                                        {Number(prod.mrp).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="p-3 bg-slate-50/70 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => canEdit && toggleStatus(prod)}
                                            disabled={!canEdit}
                                            className="cursor-pointer"
                                            title="Toggle active status"
                                        >
                                            <Badge variant={prod.status === 'active' ? 'success' : 'neutral'} dot>
                                                {prod.status}
                                            </Badge>
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {canEdit && (
                                                <Link href={`/admin/products/${prod.id}/edit`}>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-[var(--admin-primary)] rounded-xl"
                                                        title="Edit Product"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                </Link>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setDeletingProduct(prod)}
                                                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-xl"
                                                    title="Delete Product"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* High-Density Data Table View */
                    <TableContainer>
                        <TableHead>
                            <TableRow>
                                <TableHeaderCell>Product &amp; SKU</TableHeaderCell>
                                <TableHeaderCell>Brand / Category</TableHeaderCell>
                                <TableHeaderCell>Price &amp; MRP</TableHeaderCell>
                                <TableHeaderCell>Stock Status</TableHeaderCell>
                                <TableHeaderCell>Variants</TableHeaderCell>
                                <TableHeaderCell>Visibility</TableHeaderCell>
                                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.data.map((prod) => {
                                const isLowStock =
                                    prod.stock_quantity > 0 &&
                                    prod.stock_quantity <= prod.low_stock_threshold;
                                const isOutOfStock = prod.stock_quantity <= 0;
                                const imageUrl = prod.primary_image?.url;

                                return (
                                    <TableRow
                                        key={prod.id}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                                                    {imageUrl ? (
                                                        <img
                                                            src={imageUrl}
                                                            alt={prod.name}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <ShoppingBag className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                                                        {prod.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                                        <span>{prod.sku}</span>
                                                        <CopyButton text={prod.sku} title="Copy SKU" />
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-xs space-y-0.5">
                                                <div className="font-bold text-slate-800 dark:text-slate-200">
                                                    {prod.brand?.name || '—'}
                                                </div>
                                                <div className="text-slate-500">
                                                    {prod.category?.name || '—'}
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-xs">
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    {currency}
                                                    {Number(prod.retail_price).toFixed(2)}
                                                </span>
                                                {prod.mrp && Number(prod.mrp) > Number(prod.retail_price) && (
                                                    <div className="text-[11px] text-slate-400 line-through">
                                                        {currency}
                                                        {Number(prod.mrp).toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            {isOutOfStock ? (
                                                <Badge variant="danger" dot>
                                                    Out of Stock
                                                </Badge>
                                            ) : isLowStock ? (
                                                <Badge variant="warning" dot>
                                                    Low ({prod.stock_quantity})
                                                </Badge>
                                            ) : (
                                                <Badge variant="success" dot>
                                                    {prod.stock_quantity} In Stock
                                                </Badge>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            {prod.has_variants ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] text-xs font-bold">
                                                    <Layers className="w-3 h-3" />
                                                    {prod.variants_count ?? 0} Options
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">Single SKU</span>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() => canEdit && toggleStatus(prod)}
                                                disabled={!canEdit}
                                                className="cursor-pointer"
                                                title="Toggle status"
                                            >
                                                <Badge variant={prod.status === 'active' ? 'success' : 'neutral'} dot>
                                                    {prod.status}
                                                </Badge>
                                            </button>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {canEdit && (
                                                    <Link href={`/admin/products/${prod.id}/edit`}>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-[var(--admin-primary)]"
                                                            title="Edit Product"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setDeletingProduct(prod)}
                                                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </TableContainer>
                )}

                {/* Pagination */}
                {products.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-3 gap-3">
                        <span>
                            Showing {products.data.length} of {products.total} products
                        </span>
                        <div className="flex gap-1.5 flex-wrap justify-center">
                            {products.links.map((link, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url || link.active}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all tap-bounce ${
                                        link.active
                                            ? 'bg-[var(--admin-primary)] text-white border-[var(--admin-primary)] shadow-2xs'
                                            : link.url
                                            ? 'bg-[var(--admin-surface)] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                                            : 'border-transparent text-slate-400 opacity-40 cursor-not-allowed'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal (Native Bottom Sheet on Mobile, Dialog on Desktop) */}
            <Modal
                isOpen={!!deletingProduct}
                onClose={() => setDeletingProduct(null)}
                title="Delete Product"
                description={`Are you sure you want to delete '${deletingProduct?.name}'?`}
            >
                <div className="space-y-4 pt-2">
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3">
                        <Trash2 className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold block">Permanent Inventory Removal</span>
                            <span className="leading-relaxed">
                                This action permanently removes SKU <strong>{deletingProduct?.sku}</strong> and all associated variant records.
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setDeletingProduct(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={confirmDelete}
                        >
                            Confirm Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}

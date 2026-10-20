import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { Product, PageProps } from '../../../types';
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
    Eye,
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
    brands: { id: number; name: string }[];
    categories: { id: number; name: string; parent_id?: number | null }[];
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
    const { auth, store } = usePage<PageProps>().props;
    const currency = store?.currency || '$';

    const canCreate = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('products.create');
    const canEdit = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('products.edit');
    const canDelete = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('products.delete');

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [brandFilter, setBrandFilter] = useState(filters.brand_id || '');
    const [categoryFilter, setCategoryFilter] = useState(filters.category_id || '');
    const [stockFilter, setStockFilter] = useState(filters.stock || '');

    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

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

    return (
        <AdminLayout
            title="Products"
            breadcrumbs={[{ label: 'Catalog' }, { label: 'Products' }]}
        >
            <Head title="Products Catalog - Admin" />

            <div className="space-y-6">
                <PageHeader
                    title="Product Catalog"
                    description="Manage storefront products, inventory stock levels, pricing, variants, and visibility"
                    badge="Catalog"
                    actions={
                        canCreate && (
                            <Link href="/admin/products/create">
                                <Button variant="primary" className="flex items-center gap-2 shadow-sm">
                                    <Plus className="w-4 h-4" />
                                    Add New Product
                                </Button>
                            </Link>
                        )
                    }
                />

                {/* Filters */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                    <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                        <div className="relative lg:col-span-2">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or SKU..."
                                className="pl-9 w-full"
                            />
                        </div>

                        <div>
                            <Select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'All Categories' },
                                    ...categories.map((c) => ({
                                        value: String(c.id),
                                        label: c.name,
                                    })),
                                ]}
                            />
                        </div>

                        <div>
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
                            />
                        </div>

                        <div>
                            <Select
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'All Stock Levels' },
                                    { value: 'in', label: 'In Stock (>0)' },
                                    { value: 'low', label: 'Low Stock Alert' },
                                    { value: 'out', label: 'Out of Stock (0)' },
                                ]}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Button type="submit" variant="secondary" className="flex-1">
                                Filter
                            </Button>
                            {(search || statusFilter || brandFilter || categoryFilter || stockFilter) && (
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

                {/* Table */}
                <TableContainer>
                    <TableHead>
                        <TableRow>
                            <TableHeaderCell>Product & SKU</TableHeaderCell>
                            <TableHeaderCell>Brand / Category</TableHeaderCell>
                            <TableHeaderCell>Price & Discounts</TableHeaderCell>
                            <TableHeaderCell>Stock Status</TableHeaderCell>
                            <TableHeaderCell>Variants</TableHeaderCell>
                            <TableHeaderCell>Status</TableHeaderCell>
                            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {products.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <EmptyState
                                        title="No products found"
                                        description="No products match your selected filters. Try broadening your search or add a new product."
                                        action={
                                            canCreate ? (
                                                <Link href="/admin/products/create">
                                                    <Button variant="primary" size="sm">
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        Create First Product
                                                    </Button>
                                                </Link>
                                            ) : undefined
                                        }
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
                                    <TableRow key={prod.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                                    {prod.primary_image?.url ? (
                                                        <img
                                                            src={prod.primary_image.url}
                                                            alt={prod.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <ShoppingBag className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 max-w-xs">
                                                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                                                        {prod.name}
                                                    </div>
                                                    <div className="text-xs font-mono text-slate-500">
                                                        SKU: {prod.sku}
                                                    </div>
                                                    {prod.is_featured && (
                                                        <span className="inline-block px-1.5 py-0.5 mt-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                            Featured
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                    {prod.category?.name || 'Uncategorized'}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {prod.brand?.name || 'No Brand'}
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="space-y-0.5">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {currency}
                                                    {Number(prod.sale_price ?? prod.retail_price).toFixed(2)}
                                                </div>
                                                {prod.sale_price && (
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <span className="line-through text-slate-400">
                                                            {currency}
                                                            {Number(prod.retail_price).toFixed(2)}
                                                        </span>
                                                        {prod.discount_percentage && (
                                                            <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                                                                -{prod.discount_percentage}%
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                {isOutOfStock ? (
                                                    <Badge variant="danger">
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                        Out of Stock (0)
                                                    </Badge>
                                                ) : isLowStock ? (
                                                    <Badge variant="warning">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        Low Stock ({prod.stock_quantity})
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="success">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        In Stock ({prod.stock_quantity})
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            {prod.has_variants ? (
                                                <Badge variant="neutral">
                                                    <Layers className="w-3 h-3 mr-1" />
                                                    {prod.variants_count ?? 0} Variants
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-slate-400">Simple Product</span>
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
                                                <Badge variant={prod.status === 'active' ? 'success' : 'neutral'}>
                                                    {prod.status.toUpperCase()}
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
                                                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600"
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
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
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

            {/* Delete Modal */}
            <Modal
                isOpen={!!deletingProduct}
                onClose={() => setDeletingProduct(null)}
                title="Delete Product"
                description={`Are you sure you want to delete '${deletingProduct?.name}'? All gallery images and dynamic variants will be removed.`}
            >
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
                        Delete Product
                    </Button>
                </div>
            </Modal>
        </AdminLayout>
    );
}

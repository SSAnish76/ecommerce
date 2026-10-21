import React, { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { Collection, CollectionType, PageProps, Product, Brand, Category } from '../../types';
import {
    Button,
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
    ImagePicker,
} from '../../Components/UI';
import {
    Layers,
    Plus,
    Search,
    RotateCcw,
    Pencil,
    Trash2,
    ShoppingBag,
    Sparkles,
    FolderTree,
    AlertCircle,
    LayoutGrid,
    Table as TableIcon,
    CheckCircle2,
    Filter,
} from 'lucide-react';

interface PaginatedCollections {
    data: (Collection & {
        products?: Product[];
        brands?: Brand[];
        categories?: Category[];
        products_count?: number;
        brands_count?: number;
        categories_count?: number;
    })[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface CollectionsPageProps {
    collections: PaginatedCollections;
    filters: {
        search?: string;
        status?: string;
        type?: string;
    };
    metrics?: {
        total_collections: number;
        active_collections: number;
        product_collections: number;
        brand_collections: number;
        category_collections: number;
    };
    options: {
        products: Product[];
        brands: Brand[];
        categories: Category[];
        types: { value: string; label: string }[];
    };
}

export default function CollectionsPage({
    collections,
    filters,
    options,
}: CollectionsPageProps) {
    const { auth } = usePage<PageProps>().props;
    const canCreate = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('collections.create');
    const canEdit = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('collections.edit');
    const canDelete = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('collections.delete');

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
    const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);
    const [inspectingCollection, setInspectingCollection] = useState<
        (Collection & { products?: Product[]; brands?: Brand[]; categories?: Category[] }) | null
    >(null);

    // Filter inside modal
    const [itemSearch, setItemSearch] = useState('');

    // Create Form
    const createForm = useForm<{
        name: string;
        slug: string;
        type: CollectionType;
        description: string;
        image_id: string | null;
        image_url: string;
        sort_order: number | string;
        is_active: boolean;
        product_ids: string[];
        brand_ids: string[];
        category_ids: string[];
    }>({
        name: '',
        slug: '',
        type: 'product',
        description: '',
        image_id: null,
        image_url: '',
        sort_order: 0,
        is_active: true,
        product_ids: [],
        brand_ids: [],
        category_ids: [],
    });

    // Edit Form
    const editForm = useForm<{
        name: string;
        slug: string;
        type: CollectionType;
        description: string;
        image_id: string | null;
        image_url: string;
        sort_order: number | string;
        is_active: boolean;
        product_ids: string[];
        brand_ids: string[];
        category_ids: string[];
    }>({
        name: '',
        slug: '',
        type: 'product',
        description: '',
        image_id: null,
        image_url: '',
        sort_order: 0,
        is_active: true,
        product_ids: [],
        brand_ids: [],
        category_ids: [],
    });

    const applyFilters = () => {
        router.get(
            '/admin/collections',
            {
                search: search || undefined,
                status: statusFilter || undefined,
                type: typeFilter || undefined,
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
        router.get('/admin/collections');
    };

    const startEdit = (
        collection: Collection & { products?: Product[]; brands?: Brand[]; categories?: Category[] }
    ) => {
        setEditingCollection(collection);
        setItemSearch('');
        editForm.setData({
            name: collection.name,
            slug: collection.slug,
            type: collection.type || 'product',
            description: collection.description || '',
            image_id: collection.image_id || null,
            image_url: collection.image_url || '',
            sort_order: collection.sort_order ?? 0,
            is_active: collection.is_active,
            product_ids: collection.products ? collection.products.map((p) => p.id) : [],
            brand_ids: collection.brands ? collection.brands.map((b) => b.id) : [],
            category_ids: collection.categories ? collection.categories.map((c) => c.id) : [],
        });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/collections', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCollection) return;
        editForm.put(`/admin/collections/${editingCollection.id}`, {
            onSuccess: () => {
                setEditingCollection(null);
            },
        });
    };

    const handleDelete = () => {
        if (!deletingCollection) return;
        router.delete(`/admin/collections/${deletingCollection.id}`, {
            onSuccess: () => setDeletingCollection(null),
        });
    };

    const handleToggle = (collection: Collection) => {
        router.patch(
            `/admin/collections/${collection.id}/toggle-status`,
            {},
            { preserveScroll: true }
        );
    };

    // Filter products, brands, or categories for modal
    const getFilteredItems = (type: CollectionType) => {
        const q = itemSearch.toLowerCase().trim();
        if (type === 'product') {
            if (!q) return options.products;
            return options.products.filter(
                (p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
            );
        }
        if (type === 'brand') {
            if (!q) return options.brands;
            return options.brands.filter((b) => b.name.toLowerCase().includes(q));
        }
        if (type === 'category') {
            if (!q) return options.categories;
            return options.categories.filter((c) => c.name.toLowerCase().includes(q));
        }
        return [];
    };

    // Helper for Type Badge
    const renderTypeBadge = (type: CollectionType) => {
        switch (type) {
            case 'product':
                return (
                    <Badge variant="indigo" size="sm" icon={<ShoppingBag className="w-3 h-3" />}>
                        Products
                    </Badge>
                );
            case 'brand':
                return (
                    <Badge variant="amber" size="sm" icon={<Sparkles className="w-3 h-3" />}>
                        Brands
                    </Badge>
                );
            case 'category':
                return (
                    <Badge variant="purple" size="sm" icon={<FolderTree className="w-3 h-3" />}>
                        Categories
                    </Badge>
                );
            default:
                return (
                    <Badge variant="default" size="sm">
                        Products
                    </Badge>
                );
        }
    };

    // Helper for Items Count
    const getCollectionItemsCount = (
        collection: Collection & {
            products?: Product[];
            brands?: Brand[];
            categories?: Category[];
            products_count?: number;
            brands_count?: number;
            categories_count?: number;
        }
    ) => {
        const type = collection.type || 'product';
        if (type === 'product') {
            return {
                count: collection.products_count ?? collection.products?.length ?? 0,
                label: 'Products',
                icon: ShoppingBag,
            };
        }
        if (type === 'brand') {
            return {
                count: collection.brands_count ?? collection.brands?.length ?? 0,
                label: 'Brands',
                icon: Sparkles,
            };
        }
        return {
            count: collection.categories_count ?? collection.categories?.length ?? 0,
            label: 'Categories',
            icon: FolderTree,
        };
    };

    return (
        <AdminLayout
            title="Collections Management"
            breadcrumbs={[
                { label: 'Admin', href: '/admin' },
                { label: 'Catalog', href: '/admin/products' },
                { label: 'Collections' },
            ]}
        >
            <Head title="Collections Management - Catalog Admin" />

            <div className="space-y-6">
                {/* Header & Main Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Layers className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                            Collections Management
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Group catalog entities into curated showcases by Product, Brand, or Category (Trending, Featured Brands, Top Categories).
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        {canCreate && (
                            <Button
                                variant="primary"
                                onClick={() => {
                                    createForm.reset();
                                    setItemSearch('');
                                    setIsCreateOpen(true);
                                }}
                                className="gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create Collection</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex flex-1 flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search collection name or slug..."
                                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                        </div>

                        {/* Type Filter */}
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="py-2 px-3 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shrink-0"
                        >
                            <option value="">All Types</option>
                            <option value="product">Product Collections</option>
                            <option value="brand">Brand Showcases</option>
                            <option value="category">Category Groups</option>
                        </select>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="py-2 px-3 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shrink-0"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>

                        <Button size="sm" variant="primary" onClick={applyFilters} className="gap-1.5 shrink-0">
                            <Filter className="w-3.5 h-3.5" />
                            <span>Filter</span>
                        </Button>

                        {(search || statusFilter || typeFilter) && (
                            <Button size="sm" variant="secondary" onClick={resetFilters} className="gap-1.5 shrink-0">
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset</span>
                            </Button>
                        )}
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
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

                {/* Content View */}
                {collections.data.length === 0 ? (
                    <EmptyState
                        title="No Collections Found"
                        description={
                            search || statusFilter || typeFilter
                                ? 'No collections matched your search criteria. Try resetting your filter.'
                                : 'Start creating product, brand, or category collections.'
                        }
                        action={
                            canCreate ? (
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        createForm.reset();
                                        setItemSearch('');
                                        setIsCreateOpen(true);
                                    }}
                                    className="gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Create Collection</span>
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
                                    <TableHeaderCell>Collection</TableHeaderCell>
                                    <TableHeaderCell>Type</TableHeaderCell>
                                    <TableHeaderCell>Slug</TableHeaderCell>
                                    <TableHeaderCell>Linked Items</TableHeaderCell>
                                    <TableHeaderCell>Order</TableHeaderCell>
                                    <TableHeaderCell>Status</TableHeaderCell>
                                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {collections.data.map((collection) => {
                                    const itemsInfo = getCollectionItemsCount(collection);
                                    const ItemsIcon = itemsInfo.icon;

                                    return (
                                        <TableRow key={collection.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {collection.image_url ? (
                                                            <img
                                                                src={collection.image_url}
                                                                alt={collection.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <Layers className="w-5 h-5 text-indigo-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-slate-900 dark:text-white truncate">
                                                            {collection.name}
                                                        </span>
                                                        {collection.description && (
                                                            <span className="text-[11px] text-slate-400 line-clamp-1">
                                                                {collection.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>{renderTypeBadge(collection.type || 'product')}</TableCell>

                                            <TableCell>
                                                <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                        {collection.slug}
                                                    </span>
                                                    <CopyButton text={collection.slug} />
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <button
                                                    type="button"
                                                    onClick={() => setInspectingCollection(collection)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 font-semibold text-xs transition-colors"
                                                    title={`View linked ${itemsInfo.label}`}
                                                >
                                                    <ItemsIcon className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>
                                                        {itemsInfo.count} {itemsInfo.label}
                                                    </span>
                                                </button>
                                            </TableCell>

                                            <TableCell>
                                                <span className="font-mono text-xs font-semibold text-slate-500">
                                                    #{collection.sort_order ?? 0}
                                                </span>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={collection.is_active ? 'emerald' : 'default'}
                                                        size="sm"
                                                        dot
                                                    >
                                                        {collection.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                    {canEdit && (
                                                        <Toggle
                                                            checked={collection.is_active}
                                                            onChange={() => handleToggle(collection)}
                                                            size="sm"
                                                        />
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setInspectingCollection(collection)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="Inspect Items"
                                                    >
                                                        <Layers className="w-4 h-4" />
                                                    </button>

                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(collection)}
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="Edit Collection"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletingCollection(collection)}
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                            title="Delete Collection"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </table>
                    </TableContainer>
                ) : (
                    /* Grid Card View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {collections.data.map((collection) => {
                            const itemsInfo = getCollectionItemsCount(collection);
                            const ItemsIcon = itemsInfo.icon;

                            return (
                                <Card key={collection.id} className="relative overflow-hidden group">
                                    <div className="p-5 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center shrink-0 overflow-hidden">
                                                {collection.image_url ? (
                                                    <img
                                                        src={collection.image_url}
                                                        alt={collection.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                                        {collection.name}
                                                    </h3>
                                                    {renderTypeBadge(collection.type || 'product')}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px] text-slate-400">
                                                    <span>{collection.slug}</span>
                                                    <CopyButton text={collection.slug} />
                                                </div>
                                            </div>
                                        </div>

                                        {collection.description && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                {collection.description}
                                            </p>
                                        )}

                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setInspectingCollection(collection)}
                                                className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5 hover:underline"
                                            >
                                                <ItemsIcon className="w-3.5 h-3.5" />
                                                <span>
                                                    {itemsInfo.count} {itemsInfo.label}
                                                </span>
                                            </button>

                                            <Badge
                                                variant={collection.is_active ? 'emerald' : 'default'}
                                                size="sm"
                                                dot
                                            >
                                                {collection.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {canEdit && (
                                                    <Toggle
                                                        checked={collection.is_active}
                                                        onChange={() => handleToggle(collection)}
                                                        size="sm"
                                                    />
                                                )}
                                                <span className="text-xs text-slate-500 font-medium">
                                                    {collection.is_active ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setInspectingCollection(collection)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                    title="Inspect Items"
                                                >
                                                    <Layers className="w-4 h-4" />
                                                </button>

                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(collection)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="Edit Collection"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeletingCollection(collection)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                        title="Delete Collection"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {collections.last_page > 1 && (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Showing page {collections.current_page} of {collections.last_page} ({collections.total} total collections)
                        </span>

                        <div className="flex items-center gap-1.5">
                            {collections.links.map((link, idx) => {
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

            {/* CREATE MODAL */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create New Collection"
                size="2xl"
            >
                <form onSubmit={handleCreate} className="space-y-5">
                    {/* Choose Type */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                            1. Select Collection Type <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                {
                                    type: 'product',
                                    label: 'Product Collection',
                                    desc: 'Group specific items (Trending, Best Sellers, Clearance)',
                                    icon: ShoppingBag,
                                    color: 'indigo',
                                },
                                {
                                    type: 'brand',
                                    label: 'Brand Showcase',
                                    desc: 'Group top brands (Featured Brands, Premium Partners)',
                                    icon: Sparkles,
                                    color: 'amber',
                                },
                                {
                                    type: 'category',
                                    label: 'Category Group',
                                    desc: 'Group categories (Seasonal Categories, Deals Zones)',
                                    icon: FolderTree,
                                    color: 'purple',
                                },
                            ].map((opt) => {
                                const Icon = opt.icon;
                                const isSelected = createForm.data.type === opt.type;
                                return (
                                    <button
                                        key={opt.type}
                                        type="button"
                                        onClick={() => {
                                            createForm.setData('type', opt.type as CollectionType);
                                            setItemSearch('');
                                        }}
                                        className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                                            isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon
                                                className={`w-4 h-4 ${
                                                    isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                                                }`}
                                            />
                                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                {opt.label}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                            {opt.desc}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Collection Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                placeholder="e.g. Trending Now, Apple & Sony Brands"
                                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                required
                            />
                            {createForm.errors.name && (
                                <p className="text-xs text-rose-500 mt-1">{createForm.errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                URL Slug (Optional)
                            </label>
                            <input
                                type="text"
                                value={createForm.data.slug}
                                onChange={(e) => createForm.setData('slug', e.target.value)}
                                placeholder="Auto-generated if left blank"
                                className="w-full px-3 py-2 font-mono text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                            {createForm.errors.slug && (
                                <p className="text-xs text-rose-500 mt-1">{createForm.errors.slug}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={createForm.data.description}
                            onChange={(e) => createForm.setData('description', e.target.value)}
                            placeholder="Add brief details about this collection..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Collection Cover Image
                        </label>
                        <ImagePicker
                            value={createForm.data.image_url}
                            mediaId={createForm.data.image_id}
                            collection="collections"
                            onChange={({ id, url }) => {
                                createForm.setData('image_id', id);
                                createForm.setData('image_url', url);
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Sort Order
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={createForm.data.sort_order}
                                onChange={(e) => createForm.setData('sort_order', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <div>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                                    Active Status
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    Enable on store
                                </span>
                            </div>
                            <Toggle
                                checked={createForm.data.is_active}
                                onChange={(val) => createForm.setData('is_active', val)}
                            />
                        </div>
                    </div>

                    {/* Dynamic Items Picker according to selected type */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                {createForm.data.type === 'product' &&
                                    `Select Products (${createForm.data.product_ids.length} selected)`}
                                {createForm.data.type === 'brand' &&
                                    `Select Brands (${createForm.data.brand_ids.length} selected)`}
                                {createForm.data.type === 'category' &&
                                    `Select Categories (${createForm.data.category_ids.length} selected)`}
                            </span>
                        </div>

                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
                                placeholder={`Filter ${createForm.data.type}s...`}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        {/* If Products */}
                        {createForm.data.type === 'product' && (
                            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/40">
                                {getFilteredItems('product').map((item: any) => {
                                    const isChecked = createForm.data.product_ids.includes(item.id);
                                    return (
                                        <label
                                            key={item.id}
                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                                                isChecked
                                                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const newIds = e.target.checked
                                                            ? [...createForm.data.product_ids, item.id]
                                                            : createForm.data.product_ids.filter((id) => id !== item.id);
                                                        createForm.setData('product_ids', newIds);
                                                    }}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
                                                />
                                                <span className="font-medium truncate">{item.name}</span>
                                                {item.sku && (
                                                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                                        ({item.sku})
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-semibold text-slate-500 shrink-0 ml-2">
                                                ${parseFloat(String(item.sale_price || item.retail_price)).toFixed(2)}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* If Brands */}
                        {createForm.data.type === 'brand' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
                                {getFilteredItems('brand').map((item: any) => {
                                    const isChecked = createForm.data.brand_ids.includes(item.id);
                                    return (
                                        <label
                                            key={item.id}
                                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                                                isChecked
                                                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    const newIds = e.target.checked
                                                        ? [...createForm.data.brand_ids, item.id]
                                                        : createForm.data.brand_ids.filter((id) => id !== item.id);
                                                    createForm.setData('brand_ids', newIds);
                                                }}
                                                className="rounded text-amber-600 focus:ring-amber-500"
                                            />
                                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                            <span className="truncate">{item.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* If Categories */}
                        {createForm.data.type === 'category' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
                                {getFilteredItems('category').map((item: any) => {
                                    const isChecked = createForm.data.category_ids.includes(item.id);
                                    return (
                                        <label
                                            key={item.id}
                                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                                                isChecked
                                                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 font-bold'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    const newIds = e.target.checked
                                                        ? [...createForm.data.category_ids, item.id]
                                                        : createForm.data.category_ids.filter((id) => id !== item.id);
                                                    createForm.setData('category_ids', newIds);
                                                }}
                                                className="rounded text-purple-600 focus:ring-purple-500"
                                            />
                                            <FolderTree className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                            <span className="truncate">{item.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={createForm.processing}>
                            {createForm.processing ? 'Saving...' : 'Create Collection'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* EDIT MODAL */}
            {editingCollection && (
                <Modal
                    isOpen={true}
                    onClose={() => setEditingCollection(null)}
                    title={`Edit Collection: ${editingCollection.name}`}
                    size="2xl"
                >
                    <form onSubmit={handleUpdate} className="space-y-5">
                        {/* Choose Type */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                1. Collection Type
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    {
                                        type: 'product',
                                        label: 'Product Collection',
                                        desc: 'Group specific items',
                                        icon: ShoppingBag,
                                    },
                                    {
                                        type: 'brand',
                                        label: 'Brand Showcase',
                                        desc: 'Group top brands',
                                        icon: Sparkles,
                                    },
                                    {
                                        type: 'category',
                                        label: 'Category Group',
                                        desc: 'Group categories',
                                        icon: FolderTree,
                                    },
                                ].map((opt) => {
                                    const Icon = opt.icon;
                                    const isSelected = editForm.data.type === opt.type;
                                    return (
                                        <button
                                            key={opt.type}
                                            type="button"
                                            onClick={() => {
                                                editForm.setData('type', opt.type as CollectionType);
                                                setItemSearch('');
                                            }}
                                            className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                                                isSelected
                                                    ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon
                                                    className={`w-4 h-4 ${
                                                        isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                                                    }`}
                                                />
                                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {opt.label}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-slate-400 line-clamp-1">{opt.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Collection Name <span className="text-rose-500">*</span>
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

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    URL Slug
                                </label>
                                <input
                                    type="text"
                                    value={editForm.data.slug}
                                    onChange={(e) => editForm.setData('slug', e.target.value)}
                                    className="w-full px-3 py-2 font-mono text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    required
                                />
                                {editForm.errors.slug && (
                                    <p className="text-xs text-rose-500 mt-1">{editForm.errors.slug}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Description
                            </label>
                            <textarea
                                value={editForm.data.description}
                                onChange={(e) => editForm.setData('description', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Collection Cover Image
                            </label>
                            <ImagePicker
                                value={editForm.data.image_url}
                                mediaId={editForm.data.image_id}
                                collection="collections"
                                onChange={({ id, url }) => {
                                    editForm.setData('image_id', id);
                                    editForm.setData('image_url', url);
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Sort Order
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editForm.data.sort_order}
                                    onChange={(e) => editForm.setData('sort_order', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                <div>
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                                        Active Status
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        Enable on storefront
                                    </span>
                                </div>
                                <Toggle
                                    checked={editForm.data.is_active}
                                    onChange={(val) => editForm.setData('is_active', val)}
                                />
                            </div>
                        </div>

                        {/* Dynamic Items Picker according to selected type */}
                        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    {editForm.data.type === 'product' &&
                                        `Select Products (${editForm.data.product_ids.length} selected)`}
                                    {editForm.data.type === 'brand' &&
                                        `Select Brands (${editForm.data.brand_ids.length} selected)`}
                                    {editForm.data.type === 'category' &&
                                        `Select Categories (${editForm.data.category_ids.length} selected)`}
                                </span>
                            </div>

                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={itemSearch}
                                    onChange={(e) => setItemSearch(e.target.value)}
                                    placeholder={`Filter ${editForm.data.type}s...`}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>

                            {/* If Products */}
                            {editForm.data.type === 'product' && (
                                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/40">
                                    {getFilteredItems('product').map((item: any) => {
                                        const isChecked = editForm.data.product_ids.includes(item.id);
                                        return (
                                            <label
                                                key={item.id}
                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                                                    isChecked
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200'
                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const newIds = e.target.checked
                                                                ? [...editForm.data.product_ids, item.id]
                                                                : editForm.data.product_ids.filter((id) => id !== item.id);
                                                            editForm.setData('product_ids', newIds);
                                                        }}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
                                                    />
                                                    <span className="font-medium truncate">{item.name}</span>
                                                    {item.sku && (
                                                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                                            ({item.sku})
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-semibold text-slate-500 shrink-0 ml-2">
                                                    ${parseFloat(String(item.sale_price || item.retail_price)).toFixed(2)}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {/* If Brands */}
                            {editForm.data.type === 'brand' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
                                    {getFilteredItems('brand').map((item: any) => {
                                        const isChecked = editForm.data.brand_ids.includes(item.id);
                                        return (
                                            <label
                                                key={item.id}
                                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                                                    isChecked
                                                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const newIds = e.target.checked
                                                            ? [...editForm.data.brand_ids, item.id]
                                                            : editForm.data.brand_ids.filter((id) => id !== item.id);
                                                        editForm.setData('brand_ids', newIds);
                                                    }}
                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                <span className="truncate">{item.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {/* If Categories */}
                            {editForm.data.type === 'category' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/40">
                                    {getFilteredItems('category').map((item: any) => {
                                        const isChecked = editForm.data.category_ids.includes(item.id);
                                        return (
                                            <label
                                                key={item.id}
                                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                                                    isChecked
                                                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 font-bold'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const newIds = e.target.checked
                                                            ? [...editForm.data.category_ids, item.id]
                                                            : editForm.data.category_ids.filter((id) => id !== item.id);
                                                        editForm.setData('category_ids', newIds);
                                                    }}
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                />
                                                <FolderTree className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                                <span className="truncate">{item.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button type="button" variant="secondary" onClick={() => setEditingCollection(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" disabled={editForm.processing}>
                                {editForm.processing ? 'Saving...' : 'Update Collection'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* DELETE MODAL */}
            {deletingCollection && (
                <Modal
                    isOpen={true}
                    onClose={() => setDeletingCollection(null)}
                    title="Confirm Delete Collection"
                    size="md"
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200">
                            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                            <p className="text-xs">
                                Are you sure you want to delete collection{' '}
                                <strong className="font-bold">{deletingCollection.name}</strong>? The linked products,
                                brands, or categories will not be deleted, only unlinked from this collection.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3">
                            <Button variant="secondary" onClick={() => setDeletingCollection(null)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={handleDelete}>
                                Delete Permanently
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* INSPECT ITEMS MODAL */}
            {inspectingCollection && (
                <Modal
                    isOpen={true}
                    onClose={() => setInspectingCollection(null)}
                    title={`Collection: ${inspectingCollection.name}`}
                    size="xl"
                >
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200">
                                        {inspectingCollection.name}
                                    </span>
                                    {renderTypeBadge(inspectingCollection.type || 'product')}
                                </div>
                                <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 font-mono mt-0.5">
                                    Slug: {inspectingCollection.slug}
                                </p>
                            </div>
                            <Badge variant={inspectingCollection.is_active ? 'emerald' : 'default'} size="sm" dot>
                                {inspectingCollection.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>

                        {/* List items based on type */}
                        <div className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {inspectingCollection.type === 'product' &&
                                    `Linked Products (${inspectingCollection.products?.length || 0})`}
                                {inspectingCollection.type === 'brand' &&
                                    `Linked Brands (${inspectingCollection.brands?.length || 0})`}
                                {inspectingCollection.type === 'category' &&
                                    `Linked Categories (${inspectingCollection.categories?.length || 0})`}
                            </span>

                            {/* Products view */}
                            {inspectingCollection.type === 'product' && (
                                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                                    {inspectingCollection.products && inspectingCollection.products.length > 0 ? (
                                        inspectingCollection.products.map((p) => (
                                            <div
                                                key={p.id}
                                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                        <ShoppingBag className="w-4 h-4 text-slate-500" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                            {p.name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            SKU: {p.sku || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0 ml-2">
                                                    ${parseFloat(String(p.sale_price || p.retail_price)).toFixed(2)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 text-center py-4">No products linked.</p>
                                    )}
                                </div>
                            )}

                            {/* Brands view */}
                            {inspectingCollection.type === 'brand' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                    {inspectingCollection.brands && inspectingCollection.brands.length > 0 ? (
                                        inspectingCollection.brands.map((b) => (
                                            <div
                                                key={b.id}
                                                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                                            >
                                                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                                                <span className="truncate">{b.name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 text-center py-4 col-span-3">No brands linked.</p>
                                    )}
                                </div>
                            )}

                            {/* Categories view */}
                            {inspectingCollection.type === 'category' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                    {inspectingCollection.categories && inspectingCollection.categories.length > 0 ? (
                                        inspectingCollection.categories.map((c) => (
                                            <div
                                                key={c.id}
                                                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                                            >
                                                <FolderTree className="w-4 h-4 text-purple-500 shrink-0" />
                                                <span className="truncate">{c.name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 text-center py-4 col-span-3">No categories linked.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                            {canEdit && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        const c = inspectingCollection;
                                        setInspectingCollection(null);
                                        startEdit(c);
                                    }}
                                    className="gap-1.5"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    <span>Manage Collection Items</span>
                                </Button>
                            )}

                            <Button variant="secondary" size="sm" onClick={() => setInspectingCollection(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </AdminLayout>
    );
}

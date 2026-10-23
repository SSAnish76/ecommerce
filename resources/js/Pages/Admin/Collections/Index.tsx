import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { Collection, CollectionType } from '../../../types';
import { usePermission } from '../../../hooks/usePermission';
import {
    Button,
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
} from '../../../Components/UI';
import {
    Layers,
    Plus,
    Search,
    RotateCcw,
    Pencil,
    Trash2,
    AlertCircle,
    ShoppingBag,
    Sparkles,
    FolderTree,
    Globe,
} from 'lucide-react';

interface CollectionRow extends Collection {
    products_count?: number;
    brands_count?: number;
    categories_count?: number;
}

interface PaginatedCollections {
    data: CollectionRow[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface CollectionsIndexProps {
    collections: PaginatedCollections;
    filters: { search?: string; status?: string; type?: string };
}

export default function CollectionsIndex({ collections, filters }: CollectionsIndexProps) {
    const { can } = usePermission();
    const canCreate = can('collections', 'create');
    const canEdit = can('collections', 'edit');
    const canDelete = can('collections', 'delete');

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [deletingCollection, setDeletingCollection] = useState<CollectionRow | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/collections',
            {
                search: search || undefined,
                status: statusFilter || undefined,
                type: typeFilter || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setStatusFilter('');
        setTypeFilter('');
        router.get('/admin/collections');
    };

    const handleDelete = () => {
        if (!deletingCollection) return;
        router.delete(`/admin/collections/${deletingCollection.id}`, {
            onSuccess: () => setDeletingCollection(null),
        });
    };

    const handleToggle = (col: CollectionRow) => {
        router.patch(`/admin/collections/${col.id}/toggle-status`, {}, { preserveScroll: true });
    };

    const renderTypeBadge = (type: CollectionType) => {
        if (type === 'product') {
            return (
                <Badge variant="indigo" size="sm" icon={<ShoppingBag className="w-3 h-3" />}>
                    Products
                </Badge>
            );
        }
        if (type === 'brand') {
            return (
                <Badge variant="amber" size="sm" icon={<Sparkles className="w-3 h-3" />}>
                    Brands
                </Badge>
            );
        }
        if (type === 'category') {
            return (
                <Badge variant="purple" size="sm" icon={<FolderTree className="w-3 h-3" />}>
                    Categories
                </Badge>
            );
        }
        return (
            <Badge variant="sky" size="sm" icon={<Globe className="w-3 h-3" />}>
                Other
            </Badge>
        );
    };

    const getItemsSummary = (col: CollectionRow) => {
        const type = (col.type || 'product') as CollectionType;
        if (type === 'product') {
            const count = col.products_count ?? col.products?.length ?? 0;
            return `${count} Products`;
        }
        if (type === 'brand') {
            const count = col.brands_count ?? col.brands?.length ?? 0;
            return `${count} Brands`;
        }
        if (type === 'category') {
            const count = col.categories_count ?? col.categories?.length ?? 0;
            return `${count} Categories`;
        }
        const count = col.custom_items?.length ?? 0;
        return `${count} Items`;
    };

    const hasFilters = Boolean(search || statusFilter || typeFilter);

    return (
        <AdminLayout title="Collections">
            <Head title="Collections" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Layers className="w-5 h-5 text-indigo-600" />
                        Collections
                    </h1>

                    {canCreate && (
                        <Link href="/admin/collections/create">
                            <Button
                                type="button"
                                variant="primary"
                                size="md"
                                leftIcon={<Plus className="w-4 h-4" />}
                            >
                                New Collection
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Filter Bar */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search collections by name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="min-w-[140px]">
                                <Select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Types' },
                                        { value: 'product', label: 'Products' },
                                        { value: 'brand', label: 'Brands' },
                                        { value: 'category', label: 'Categories' },
                                        { value: 'other', label: 'Other' },
                                    ]}
                                />
                            </div>

                            <div className="min-w-[130px]">
                                <Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Statuses' },
                                        { value: 'active', label: 'Active' },
                                        { value: 'inactive', label: 'Inactive' },
                                    ]}
                                />
                            </div>

                            <Button type="submit" variant="secondary" size="md">
                                Search
                            </Button>

                            {hasFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="md"
                                    onClick={handleReset}
                                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                                >
                                    Reset
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Table */}
                {collections.data.length === 0 ? (
                    <EmptyState
                        title="No Collections Found"
                        description={hasFilters ? 'No collections match your filter criteria.' : 'Create your first collection.'}
                        action={
                            canCreate ? (
                                <Link href="/admin/collections/create">
                                    <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                                        New Collection
                                    </Button>
                                </Link>
                            ) : undefined
                        }
                    />
                ) : (
                    <TableContainer>
                        <table className="w-full text-left text-sm">
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell>Collection</TableHeaderCell>
                                    <TableHeaderCell>Type</TableHeaderCell>
                                    <TableHeaderCell>Items</TableHeaderCell>
                                    <TableHeaderCell>Status</TableHeaderCell>
                                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {collections.data.map((col) => (
                                    <TableRow key={col.id}>
                                        {/* Cover + Name & Slug */}
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {col.image_url ? (
                                                        <img
                                                            src={col.image_url}
                                                            alt={col.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Layers className="w-5 h-5 text-indigo-500" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-slate-900 dark:text-white truncate">
                                                        {col.name}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
                                                        <span>/{col.slug}</span>
                                                        <CopyButton text={col.slug} />
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Type */}
                                        <TableCell>
                                            {renderTypeBadge((col.type || 'product') as CollectionType)}
                                        </TableCell>

                                        {/* Items */}
                                        <TableCell>
                                            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                {getItemsSummary(col)}
                                            </span>
                                        </TableCell>

                                        {/* Status & Toggle */}
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                <Badge
                                                    variant={col.is_active ? 'emerald' : 'default'}
                                                    size="sm"
                                                    dot
                                                >
                                                    {col.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                                {canEdit && (
                                                    <Toggle
                                                        checked={col.is_active}
                                                        onChange={() => handleToggle(col)}
                                                        size="sm"
                                                    />
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {canEdit && (
                                                    <Link href={`/admin/collections/${col.id}/edit`}>
                                                        <button
                                                            type="button"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="Edit Collection"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    </Link>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeletingCollection(col)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                        title="Delete Collection"
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
                )}

                {/* Pagination */}
                {collections.last_page > 1 && (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl">
                        <span className="text-xs text-slate-500">
                            Page {collections.current_page} of {collections.last_page} ({collections.total} total)
                        </span>
                        <div className="flex items-center gap-1.5">
                            {collections.links.map((link, idx) =>
                                !link.url && !link.active ? (
                                    <span
                                        key={idx}
                                        className="px-3 py-1.5 text-xs text-slate-300 dark:text-slate-700 select-none"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                            link.active
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            {deletingCollection && (
                <Modal isOpen={true} onClose={() => setDeletingCollection(null)} title="Delete Collection" size="md">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200">
                            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                            <p className="text-xs">
                                Are you sure you want to delete collection <strong>{deletingCollection.name}</strong>?
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
        </AdminLayout>
    );
}

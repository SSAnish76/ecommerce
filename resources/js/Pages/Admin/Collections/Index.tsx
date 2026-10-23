import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { Collection, Product, Brand, Category } from '../../../types';
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
    Card,
} from '../../../Components/UI';
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
    Filter,
} from 'lucide-react';

type CollectionType = 'product' | 'brand' | 'category';

interface CollectionRow extends Collection {
    products?: Product[];
    brands?: Brand[];
    categories?: Category[];
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
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [deletingCollection, setDeletingCollection] = useState<CollectionRow | null>(null);
    const [inspectingCollection, setInspectingCollection] = useState<CollectionRow | null>(null);

    const applyFilters = () => {
        router.get('/admin/collections', { search: search || undefined, status: statusFilter || undefined, type: typeFilter || undefined }, { preserveState: true, preserveScroll: true });
    };

    const resetFilters = () => {
        setSearch(''); setStatusFilter(''); setTypeFilter('');
        router.get('/admin/collections');
    };

    const handleDelete = () => {
        if (!deletingCollection) return;
        router.delete(`/admin/collections/${deletingCollection.id}`, { onSuccess: () => setDeletingCollection(null) });
    };

    const handleToggle = (col: CollectionRow) => {
        router.patch(`/admin/collections/${col.id}/toggle-status`, {}, { preserveScroll: true });
    };

    const renderTypeBadge = (type: CollectionType) => {
        if (type === 'product') return <Badge variant="indigo" size="sm" icon={<ShoppingBag className="w-3 h-3" />}>Products</Badge>;
        if (type === 'brand') return <Badge variant="amber" size="sm" icon={<Sparkles className="w-3 h-3" />}>Brands</Badge>;
        return <Badge variant="purple" size="sm" icon={<FolderTree className="w-3 h-3" />}>Categories</Badge>;
    };

    const getItemsInfo = (col: CollectionRow) => {
        const type = (col.type || 'product') as CollectionType;
        if (type === 'product') return { count: col.products_count ?? col.products?.length ?? 0, label: 'Products', icon: ShoppingBag };
        if (type === 'brand') return { count: col.brands_count ?? col.brands?.length ?? 0, label: 'Brands', icon: Sparkles };
        return { count: col.categories_count ?? col.categories?.length ?? 0, label: 'Categories', icon: FolderTree };
    };

    const hasFilters = !!(search || statusFilter || typeFilter);

    return (
        <AdminLayout title="Collections Management" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Catalog', href: '/admin/products' }, { label: 'Collections' }]}>
            <Head title="Collections Management" />
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Layers className="w-5 h-5 text-indigo-600" /> Collections Management
                    </h1>
                    {canCreate && (
                        <Link href="/admin/collections/create">
                            <Button type="button" variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>New Collection</Button>
                        </Link>
                    )}
                </div>

                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Search collections..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyFilters()} className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors" />
                        </div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="min-w-[140px]">
                                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={[{ value: '', label: 'All Types' }, { value: 'product', label: 'Product Collections' }, { value: 'brand', label: 'Brand Showcases' }, { value: 'category', label: 'Category Groups' }]} />
                            </div>
                            <div className="min-w-[130px]">
                                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'All Statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                            </div>
                            <Button type="button" variant="secondary" size="md" onClick={applyFilters}><Filter className="w-3.5 h-3.5 mr-1.5" />Filter</Button>
                            {hasFilters && <Button type="button" variant="ghost" size="md" onClick={resetFilters} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>Reset</Button>}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl ml-auto">
                                <button type="button" onClick={() => setViewMode('table')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`} title="Table"><TableIcon className="w-4 h-4" /></button>
                                <button type="button" onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`} title="Grid"><LayoutGrid className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>

                {collections.data.length === 0 ? (
                    <EmptyState title="No Collections Found" description={hasFilters ? 'No collections matched your filter.' : 'Start by creating your first collection.'} action={canCreate ? <Link href="/admin/collections/create"><Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>New Collection</Button></Link> : undefined} />
                ) : viewMode === 'table' ? (
                    <TableContainer>
                        <table className="w-full text-left text-xs sm:text-sm">
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell>Collection</TableHeaderCell>
                                    <TableHeaderCell>Type</TableHeaderCell>
                                    <TableHeaderCell>Slug</TableHeaderCell>
                                    <TableHeaderCell>Items</TableHeaderCell>
                                    <TableHeaderCell>Status</TableHeaderCell>
                                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {collections.data.map((col) => {
                                    const info = getItemsInfo(col);
                                    const InfoIcon = info.icon;
                                    return (
                                        <TableRow key={col.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {col.image_url ? <img src={col.image_url} alt={col.name} className="w-full h-full object-cover" /> : <Layers className="w-5 h-5 text-indigo-500" />}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-slate-900 dark:text-white truncate">{col.name}</span>
                                                        {col.description && <span className="text-[11px] text-slate-400 line-clamp-1">{col.description}</span>}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{renderTypeBadge((col.type || 'product') as CollectionType)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">{col.slug}</span>
                                                    <CopyButton text={col.slug} />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <button type="button" onClick={() => setInspectingCollection(col)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-semibold text-xs transition-colors">
                                                    <InfoIcon className="w-3.5 h-3.5 text-slate-400" />{info.count} {info.label}
                                                </button>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={col.is_active ? 'emerald' : 'default'} size="sm" dot>{col.is_active ? 'Active' : 'Inactive'}</Badge>
                                                    {canEdit && <Toggle checked={col.is_active} onChange={() => handleToggle(col)} size="sm" />}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {canEdit && (
                                                        <Link href={`/admin/collections/${col.id}/edit`}>
                                                            <button type="button" className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                                                        </Link>
                                                    )}
                                                    {canDelete && (
                                                        <button type="button" onClick={() => setDeletingCollection(col)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {collections.data.map((col) => {
                            const info = getItemsInfo(col);
                            const InfoIcon = info.icon;
                            return (
                                <Card key={col.id} className="relative overflow-hidden">
                                    <div className="p-5 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center shrink-0 overflow-hidden">
                                                {col.image_url ? <img src={col.image_url} alt={col.name} className="w-full h-full object-cover" /> : <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{col.name}</h3>
                                                    {renderTypeBadge((col.type || 'product') as CollectionType)}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px] text-slate-400">
                                                    <span>{col.slug}</span><CopyButton text={col.slug} />
                                                </div>
                                            </div>
                                        </div>
                                        {col.description && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{col.description}</p>}
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                            <button type="button" onClick={() => setInspectingCollection(col)} className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5 hover:underline">
                                                <InfoIcon className="w-3.5 h-3.5" />{info.count} {info.label}
                                            </button>
                                            <Badge variant={col.is_active ? 'emerald' : 'default'} size="sm" dot>{col.is_active ? 'Active' : 'Inactive'}</Badge>
                                        </div>
                                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {canEdit && <Toggle checked={col.is_active} onChange={() => handleToggle(col)} size="sm" />}
                                                <span className="text-xs text-slate-500 font-medium">{col.is_active ? 'Enabled' : 'Disabled'}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {canEdit && (
                                                    <Link href={`/admin/collections/${col.id}/edit`}>
                                                        <button type="button" className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                                                    </Link>
                                                )}
                                                {canDelete && (
                                                    <button type="button" onClick={() => setDeletingCollection(col)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {collections.last_page > 1 && (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl">
                        <span className="text-xs text-slate-500">Page {collections.current_page} of {collections.last_page} ({collections.total} total)</span>
                        <div className="flex items-center gap-1.5">
                            {collections.links.map((link, idx) => !link.url && !link.active ? (
                                <span key={idx} className="px-3 py-1.5 text-xs text-slate-300 dark:text-slate-700 select-none" dangerouslySetInnerHTML={{ __html: link.label }} />
                            ) : (
                                <button key={idx} type="button" onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${link.active ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`} dangerouslySetInnerHTML={{ __html: link.label }} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {deletingCollection && (
                <Modal isOpen={true} onClose={() => setDeletingCollection(null)} title="Delete Collection" size="md">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200">
                            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                            <p className="text-xs">Are you sure you want to delete <strong>{deletingCollection.name}</strong>?</p>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-3">
                            <Button variant="secondary" onClick={() => setDeletingCollection(null)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete}>Delete Permanently</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {inspectingCollection && (
                <Modal isOpen={true} onClose={() => setInspectingCollection(null)} title={`Collection: ${inspectingCollection.name}`} size="xl">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200">{inspectingCollection.name}</span>
                                    {renderTypeBadge((inspectingCollection.type || 'product') as CollectionType)}
                                </div>
                                <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 font-mono mt-0.5">Slug: {inspectingCollection.slug}</p>
                            </div>
                            <Badge variant={inspectingCollection.is_active ? 'emerald' : 'default'} size="sm" dot>{inspectingCollection.is_active ? 'Active' : 'Inactive'}</Badge>
                        </div>
                        <div className="space-y-2">
                            {inspectingCollection.type === 'product' && (
                                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                                    {inspectingCollection.products?.length ? inspectingCollection.products.map((p) => (
                                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <ShoppingBag className="w-4 h-4 text-slate-400 shrink-0" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0 ml-2">${parseFloat(String(p.sale_price || p.retail_price)).toFixed(2)}</span>
                                        </div>
                                    )) : <p className="text-xs text-slate-400 text-center py-4">No products linked.</p>}
                                </div>
                            )}
                            {inspectingCollection.type === 'brand' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                    {inspectingCollection.brands?.length ? inspectingCollection.brands.map((b) => (
                                        <div key={b.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" /><span className="truncate">{b.name}</span>
                                        </div>
                                    )) : <p className="text-xs text-slate-400 text-center py-4 col-span-3">No brands linked.</p>}
                                </div>
                            )}
                            {inspectingCollection.type === 'category' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                    {inspectingCollection.categories?.length ? inspectingCollection.categories.map((c) => (
                                        <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                            <FolderTree className="w-4 h-4 text-purple-500 shrink-0" /><span className="truncate">{c.name}</span>
                                        </div>
                                    )) : <p className="text-xs text-slate-400 text-center py-4 col-span-3">No categories linked.</p>}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                            {canEdit && (
                                <Link href={`/admin/collections/${inspectingCollection.id}/edit`}>
                                    <Button variant="primary" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />}>Edit Collection</Button>
                                </Link>
                            )}
                            <Button variant="secondary" size="sm" onClick={() => setInspectingCollection(null)}>Close</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </AdminLayout>
    );
}

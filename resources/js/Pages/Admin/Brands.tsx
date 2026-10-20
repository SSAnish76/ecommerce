import React, { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { Brand, PageProps } from '../../types';
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
    SlugInput,
    ImagePicker,
    CopyButton,
} from '../../Components/UI';
import {
    Search,
    Plus,
    Layers,
    Pencil,
    Trash2,
    RotateCcw,
    LayoutGrid,
    Table as TableIcon,
    Copy,
    Check,
} from 'lucide-react';

interface PaginatedBrands {
    data: Brand[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface BrandsProps {
    brands: PaginatedBrands;
    filters: {
        search: string;
        status?: string;
    };
}

export default function BrandsPage({ brands, filters }: BrandsProps) {
    const { auth } = usePage<PageProps>().props;
    const canCreate = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('brands.create');
    const canEdit = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('brands.edit');
    const canDelete = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('brands.delete');

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

    // Create Form
    const createForm = useForm<{
        name: string;
        slug: string;
        description: string;
        logo_id: string | null;
        logo_url: string;
        is_active: boolean;
    }>({
        name: '',
        slug: '',
        description: '',
        logo_id: null,
        logo_url: '',
        is_active: true,
    });

    // Edit Form
    const editForm = useForm<{
        name: string;
        slug: string;
        description: string;
        logo_id: string | null;
        logo_url: string;
        is_active: boolean;
    }>({
        name: '',
        slug: '',
        description: '',
        logo_id: null,
        logo_url: '',
        is_active: true,
    });


    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/brands',
            { search, status: statusFilter },
            { preserveState: true, replace: true }
        );
    };

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
        router.get(
            '/admin/brands',
            { search, status },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setStatusFilter('');
        router.get('/admin/brands', {}, { preserveState: true, replace: true });
    };


    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/brands', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const openEdit = (brand: Brand) => {
        setEditingBrand(brand);
        editForm.setData({
            name: brand.name,
            slug: brand.slug,
            description: brand.description || '',
            logo_id: brand.logo_id || null,
            logo_url: brand.logo_url || '',
            is_active: brand.is_active,
        });
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBrand) return;
        editForm.put(`/admin/brands/${editingBrand.id}`, {
            onSuccess: () => {
                setEditingBrand(null);
                editForm.reset();
            },
        });
    };

    const confirmDelete = () => {
        if (!deletingBrand) return;
        router.delete(`/admin/brands/${deletingBrand.id}`, {
            onSuccess: () => setDeletingBrand(null),
        });
    };

    const toggleStatus = (brand: Brand) => {
        router.patch(`/admin/brands/${brand.id}/toggle-status`, {}, { preserveScroll: true });
    };


    return (
        <AdminLayout
            title="Brands"
            breadcrumbs={[{ label: 'Catalog' }, { label: 'Brands' }]}
        >
            <Head title="Brand Directory - Catalog Admin" />

            <div className="space-y-6">
                {/* Clean Header with Simple Brand Count */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Brands
                            </h1>
                            <Badge variant="indigo" size="sm" className="font-semibold">
                                {brands.total} {brands.total === 1 ? 'Brand' : 'Brands'}
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Curate manufacturers, storefront logos, and merchant profiles for customer discovery.
                        </p>
                    </div>

                    {canCreate && (
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <Button
                                onClick={() => setIsCreateOpen(true)}
                                variant="primary"
                                size="sm"
                                leftIcon={<Plus className="w-4 h-4" />}
                                className="shadow-xs font-semibold rounded-xl whitespace-nowrap"
                            >
                                Add
                            </Button>
                        </div>
                    )}
                </div>

                {/* Filter & View Toolbar */}
                <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2.5 flex-1 w-full">
                        <div className="relative flex-1 w-full">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by brand name or description..."
                                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                                rightIcon={
                                    search ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch('');
                                                router.get('/admin/brands', { status: statusFilter }, { preserveState: true });
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

                        {/* Status Filter Tabs */}
                        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-full sm:w-auto shrink-0">
                            <button
                                type="button"
                                onClick={() => handleStatusFilter('')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    statusFilter === ''
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusFilter('active')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    statusFilter === 'active'
                                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Active
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusFilter('inactive')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    statusFilter === 'inactive'
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Inactive
                            </button>
                        </div>

                        <Button type="submit" variant="secondary" size="sm" className="w-full sm:w-auto">
                            Apply
                        </Button>

                        {(search || statusFilter) && (
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
                    </form>

                    {/* View Switcher (Grid vs Table) */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end sm:self-auto shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Grid Card View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                                viewMode === 'table'
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Data Table View"
                        >
                            <TableIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Brands Content: Grid or Table */}
                {brands.data.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 text-center shadow-2xs">
                        <EmptyState
                            icon={Layers}
                            title="No brands found"
                            description={
                                search || statusFilter
                                    ? 'No brands matched your filter criteria. Try resetting search filters.'
                                    : 'No brands currently exist. Add your first brand to start building your catalog.'
                            }
                            action={
                                search || statusFilter ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleReset}
                                        className="shadow-2xs font-semibold rounded-xl whitespace-nowrap"
                                    >
                                        Clear Filters
                                    </Button>
                                ) : canCreate ? (
                                    <Button
                                        onClick={() => setIsCreateOpen(true)}
                                        variant="primary"
                                        size="sm"
                                        leftIcon={<Plus className="w-4 h-4" />}
                                        className="shadow-xs font-semibold rounded-xl whitespace-nowrap"
                                    >
                                        Add
                                    </Button>
                                ) : undefined
                            }
                        />
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Modern Grid View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {brands.data.map((brand) => (
                            <div
                                key={brand.id}
                                className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all duration-200 hover:shadow-md flex flex-col justify-between"
                            >
                                <div>
                                    {/* Top Bar: Status switch */}
                                    <div className="flex items-center justify-between mb-4">
                                        <button
                                            type="button"
                                            onClick={() => canEdit && toggleStatus(brand)}
                                            disabled={!canEdit}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                                brand.is_active
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                            }`}
                                            title="Click to toggle status"
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-full ${
                                                    brand.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                                }`}
                                            />
                                            <span>{brand.is_active ? 'Active' : 'Inactive'}</span>
                                        </button>
                                    </div>

                                    {/* Brand Logo & Name */}
                                    <div className="flex items-center gap-3.5 mb-3">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform overflow-hidden">
                                            {brand.logo_url ? (
                                                <img
                                                    src={brand.logo_url}
                                                    alt={brand.name}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm tracking-wider">
                                                    {brand.name.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                                                {brand.name}
                                            </h3>
                                            <div className="flex items-center gap-1 text-xs text-slate-500 font-mono mt-0.5">
                                                <span className="truncate">/{brand.slug}</span>
                                                <CopyButton text={brand.slug} title="Copy slug" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {brand.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                                            {brand.description}
                                        </p>
                                    )}
                                </div>

                                {/* Footer: Actions */}
                                <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                                    <span className="text-[11px] text-slate-400 font-mono">
                                        ID #{brand.id}
                                    </span>

                                    <div className="flex items-center gap-1">
                                        {canEdit && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openEdit(brand)}
                                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                                                title="Edit Brand"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setDeletingBrand(brand)}
                                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                                title="Delete Brand"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Detailed Table View */
                    <TableContainer>
                        <TableHead>
                            <TableRow>
                                <TableHeaderCell className="w-16">Logo</TableHeaderCell>
                                <TableHeaderCell>Brand</TableHeaderCell>
                                <TableHeaderCell>Description</TableHeaderCell>
                                <TableHeaderCell>Status</TableHeaderCell>
                                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {brands.data.map((brand) => (
                                <TableRow key={brand.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                    <TableCell className="w-16">
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                            {brand.logo_url ? (
                                                <img
                                                    src={brand.logo_url}
                                                    alt={brand.name}
                                                    className="w-full h-full object-contain rounded-lg"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                                                    {brand.name.substring(0, 2)}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-semibold text-slate-900 dark:text-white text-sm">
                                                {brand.name}
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                                <span>/{brand.slug}</span>
                                                <CopyButton text={brand.slug} title="Copy slug" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 max-w-md">
                                            {brand.description || <span className="italic text-slate-400">No description</span>}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <button
                                            type="button"
                                            onClick={() => canEdit && toggleStatus(brand)}
                                            disabled={!canEdit}
                                            className="cursor-pointer"
                                            title="Click to toggle status"
                                        >
                                            <Badge variant={brand.is_active ? 'success' : 'neutral'}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${brand.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                {brand.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </button>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {canEdit && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openEdit(brand)}
                                                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                                                    title="Edit Brand"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setDeletingBrand(brand)}
                                                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600"
                                                    title="Delete Brand"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </TableContainer>
                )}

                {/* Pagination */}
                {brands.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-3 gap-3">
                        <span>
                            Showing {brands.data.length} of {brands.total} brands in catalog
                        </span>
                        <div className="flex gap-1.5 flex-wrap justify-center">
                            {brands.links.map((link, idx) => (
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

            {/* Create Brand Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create New Brand"
                description="Add a new brand or manufacturer to your storefront catalog"
            >
                <form onSubmit={submitCreate} className="space-y-4 pt-2">
                    <Input
                        label="Brand Name"
                        required
                        value={createForm.data.name}
                        onChange={(e) => createForm.setData('name', e.target.value)}
                        error={createForm.errors.name}
                        placeholder="e.g. Sony, Nike, Apple"
                    />

                    <SlugInput
                        value={createForm.data.slug}
                        onChange={(slug) => createForm.setData('slug', slug)}
                        sourceValue={createForm.data.name}
                        autoSync
                        error={createForm.errors.slug}
                        placeholder="auto-generated from brand name"
                    />

                    <ImagePicker
                        label="Brand Logo"
                        helperText="Upload high-res SVG, PNG, JPG, or WEBP logo"
                        value={createForm.data.logo_url}
                        collection="brands"
                        error={createForm.errors.logo_url}
                        onChange={({ id, url }) => {
                            createForm.setData((data) => ({
                                ...data,
                                logo_id: id,
                                logo_url: url,
                            }));
                        }}
                    />

                    <div className="pt-1">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={createForm.data.is_active}
                                onChange={(e) => createForm.setData('is_active', e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <div>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                                    Active in Storefront
                                </span>
                                <span className="text-[11px] text-slate-500">
                                    Visible on catalog filters & search
                                </span>
                            </div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Brand Overview & Description
                        </label>
                        <textarea
                            value={createForm.data.description}
                            onChange={(e) => createForm.setData('description', e.target.value)}
                            rows={3}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Brief description about the manufacturer, warranty support, or origin..."
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsCreateOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={createForm.processing}
                        >
                            Create Brand
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Brand Modal */}
            <Modal
                isOpen={!!editingBrand}
                onClose={() => setEditingBrand(null)}
                title={`Edit Brand: ${editingBrand?.name}`}
                description="Update brand details, logo or active status"
            >
                <form onSubmit={submitEdit} className="space-y-4 pt-2">
                    <Input
                        label="Brand Name"
                        required
                        value={editForm.data.name}
                        onChange={(e) => editForm.setData('name', e.target.value)}
                        error={editForm.errors.name}
                    />

                    <SlugInput
                        value={editForm.data.slug}
                        onChange={(slug) => editForm.setData('slug', slug)}
                        sourceValue={editForm.data.name}
                        error={editForm.errors.slug}
                        required
                    />

                    <ImagePicker
                        label="Brand Logo"
                        helperText="Upload brand logo (SVG, PNG, JPG, or WEBP)"
                        value={editForm.data.logo_url}
                        collection="brands"
                        error={editForm.errors.logo_url}
                        onChange={({ id, url }) => {
                            editForm.setData((data) => ({
                                ...data,
                                logo_id: id,
                                logo_url: url,
                            }));
                        }}
                    />

                    <div className="pt-1">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={editForm.data.is_active}
                                onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <div>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                                    Active in Storefront
                                </span>
                                <span className="text-[11px] text-slate-500">
                                    Visible on catalog filters & search
                                </span>
                            </div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Brand Overview & Description
                        </label>
                        <textarea
                            value={editForm.data.description}
                            onChange={(e) => editForm.setData('description', e.target.value)}
                            rows={3}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setEditingBrand(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={editForm.processing}
                        >
                            Update Brand
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deletingBrand}
                onClose={() => setDeletingBrand(null)}
                title="Delete Brand"
                description={`Are you sure you want to delete '${deletingBrand?.name}'? This action cannot be undone.`}
            >
                <div className="space-y-4 pt-2">
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-3">
                        <Trash2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold block">Warning on associated products</span>
                            <span>
                                Any products linked to this brand will lose their brand association or may prevent deletion.
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setDeletingBrand(null)}
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

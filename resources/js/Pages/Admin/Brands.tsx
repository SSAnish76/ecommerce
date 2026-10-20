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
    PageHeader,
} from '../../Components/UI';
import {
    Sparkles,
    Search,
    Plus,
    Pencil,
    Trash2,
    Globe,
    ToggleLeft,
    ToggleRight,
    RotateCcw,
    ExternalLink,
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
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

    // Create Form
    const createForm = useForm({
        name: '',
        slug: '',
        website: '',
        description: '',
        logo_path: '',
        sort_order: 0,
        is_active: true,
    });

    // Edit Form
    const editForm = useForm({
        name: '',
        slug: '',
        website: '',
        description: '',
        logo_path: '',
        sort_order: 0,
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
            website: brand.website || '',
            description: brand.description || '',
            logo_path: brand.logo_path || '',
            sort_order: brand.sort_order || 0,
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
            <Head title="Brand Management - Admin" />

            <div className="space-y-6">
                <PageHeader
                    title="Brand Directory"
                    description="Organize manufacturers, storefront brands, and supplier profiles"
                    badge="Catalog"
                    actions={
                        canCreate && (
                            <Button
                                onClick={() => setIsCreateOpen(true)}
                                variant="primary"
                                className="flex items-center gap-2 shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Brand
                            </Button>
                        )
                    }
                />

                {/* Filter Controls */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by brand name or description..."
                                className="pl-9 w-full"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'All Statuses' },
                                    { value: 'active', label: 'Active Only' },
                                    { value: 'inactive', label: 'Inactive Only' },
                                ]}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button type="submit" variant="secondary" className="w-full sm:w-auto">
                                Filter
                            </Button>
                            {(search || statusFilter) && (
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

                {/* Brands Table */}
                <TableContainer>
                    <TableHead>
                        <TableRow>
                            <TableHeaderCell>Brand</TableHeaderCell>
                            <TableHeaderCell>Website</TableHeaderCell>
                            <TableHeaderCell>Products</TableHeaderCell>
                            <TableHeaderCell>Sort Order</TableHeaderCell>
                            <TableHeaderCell>Status</TableHeaderCell>
                            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {brands.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6}>
                                    <EmptyState
                                        title="No brands found"
                                        description="Try adjusting your search criteria or add your first brand."
                                        action={
                                            canCreate ? (
                                                <Button
                                                    onClick={() => setIsCreateOpen(true)}
                                                    variant="primary"
                                                    size="sm"
                                                >
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Add First Brand
                                                </Button>
                                            ) : undefined
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            brands.data.map((brand) => (
                                <TableRow key={brand.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 overflow-hidden shrink-0">
                                                {brand.logo_path ? (
                                                    <img
                                                        src={brand.logo_path}
                                                        alt={brand.name}
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    brand.name.substring(0, 2).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {brand.name}
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono">
                                                    /{brand.slug}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {brand.website ? (
                                            <a
                                                href={brand.website}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                            >
                                                <Globe className="w-3.5 h-3.5" />
                                                <span>Visit</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="neutral">
                                            {brand.products_count ?? 0} Products
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                            {brand.sort_order}
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
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </TableContainer>

                {/* Pagination */}
                {brands.last_page > 1 && (
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                        <span>
                            Showing {brands.data.length} of {brands.total} brands
                        </span>
                        <div className="flex gap-1">
                            {brands.links.map((link, idx) => (
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

            {/* Create Brand Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create New Brand"
                description="Add a new brand or manufacturer to your storefront catalog"
            >
                <form onSubmit={submitCreate} className="space-y-4">
                    <Input
                        label="Brand Name"
                        required
                        value={createForm.data.name}
                        onChange={(e) => createForm.setData('name', e.target.value)}
                        error={createForm.errors.name}
                        placeholder="e.g. Sony, Nike, Apple"
                    />

                    <Input
                        label="Custom Slug (Optional)"
                        value={createForm.data.slug}
                        onChange={(e) => createForm.setData('slug', e.target.value)}
                        error={createForm.errors.slug}
                        placeholder="auto-generated from brand name if left empty"
                    />

                    <Input
                        label="Website URL"
                        type="url"
                        value={createForm.data.website}
                        onChange={(e) => createForm.setData('website', e.target.value)}
                        error={createForm.errors.website}
                        placeholder="https://example.com"
                    />

                    <Input
                        label="Logo Image URL"
                        value={createForm.data.logo_path}
                        onChange={(e) => createForm.setData('logo_path', e.target.value)}
                        error={createForm.errors.logo_path}
                        placeholder="https://cdn.example.com/logo.png"
                    />

                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={createForm.data.description}
                            onChange={(e) => createForm.setData('description', e.target.value)}
                            rows={3}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Brief description about the brand..."
                        />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Active Status
                        </label>
                        <input
                            type="checkbox"
                            checked={createForm.data.is_active}
                            onChange={(e) => createForm.setData('is_active', e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
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
                            Save Brand
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Brand Modal */}
            <Modal
                isOpen={!!editingBrand}
                onClose={() => setEditingBrand(null)}
                title={`Edit Brand: ${editingBrand?.name}`}
                description="Update brand details, website, or active status"
            >
                <form onSubmit={submitEdit} className="space-y-4">
                    <Input
                        label="Brand Name"
                        required
                        value={editForm.data.name}
                        onChange={(e) => editForm.setData('name', e.target.value)}
                        error={editForm.errors.name}
                    />

                    <Input
                        label="Slug"
                        required
                        value={editForm.data.slug}
                        onChange={(e) => editForm.setData('slug', e.target.value)}
                        error={editForm.errors.slug}
                    />

                    <Input
                        label="Website URL"
                        type="url"
                        value={editForm.data.website}
                        onChange={(e) => editForm.setData('website', e.target.value)}
                        error={editForm.errors.website}
                    />

                    <Input
                        label="Logo Image URL"
                        value={editForm.data.logo_path}
                        onChange={(e) => editForm.setData('logo_path', e.target.value)}
                        error={editForm.errors.logo_path}
                    />

                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={editForm.data.description}
                            onChange={(e) => editForm.setData('description', e.target.value)}
                            rows={3}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Active Status
                        </label>
                        <input
                            type="checkbox"
                            checked={editForm.data.is_active}
                            onChange={(e) => editForm.setData('is_active', e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
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
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
                        Delete Brand
                    </Button>
                </div>
            </Modal>
        </AdminLayout>
    );
}

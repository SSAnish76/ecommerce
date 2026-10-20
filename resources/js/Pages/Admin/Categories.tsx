import React, { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { Category, PageProps } from '../../types';
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
    FolderTree,
    Search,
    Plus,
    Pencil,
    Trash2,
    RotateCcw,
    Layers,
    CornerDownRight,
} from 'lucide-react';

interface PaginatedCategories {
    data: Category[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface CategoriesProps {
    categories: PaginatedCategories;
    parentOptions: { id: number; name: string }[];
    filters: {
        search: string;
        status?: string;
        parent_id?: string;
    };
}

export default function CategoriesPage({
    categories,
    parentOptions,
    filters,
}: CategoriesProps) {
    const { auth } = usePage<PageProps>().props;
    const canCreate = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('categories.create');
    const canEdit = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('categories.edit');
    const canDelete = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('categories.delete');

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [parentFilter, setParentFilter] = useState(filters.parent_id || '');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

    // Create Form
    const createForm = useForm<{
        parent_id: string | number;
        name: string;
        slug: string;
        description: string;
        image_path: string;
        sort_order: number;
        is_active: boolean;
    }>({
        parent_id: '',
        name: '',
        slug: '',
        description: '',
        image_path: '',
        sort_order: 0,
        is_active: true,
    });

    // Edit Form
    const editForm = useForm<{
        parent_id: string | number;
        name: string;
        slug: string;
        description: string;
        image_path: string;
        sort_order: number;
        is_active: boolean;
    }>({
        parent_id: '',
        name: '',
        slug: '',
        description: '',
        image_path: '',
        sort_order: 0,
        is_active: true,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/categories',
            { search, status: statusFilter, parent_id: parentFilter },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setStatusFilter('');
        setParentFilter('');
        router.get('/admin/categories', {}, { preserveState: true, replace: true });
    };

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/categories', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const openEdit = (cat: Category) => {
        setEditingCategory(cat);
        editForm.setData({
            parent_id: cat.parent_id || '',
            name: cat.name,
            slug: cat.slug,
            description: cat.description || '',
            image_path: cat.image_path || '',
            sort_order: cat.sort_order || 0,
            is_active: cat.is_active,
        });
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;
        editForm.put(`/admin/categories/${editingCategory.id}`, {
            onSuccess: () => {
                setEditingCategory(null);
                editForm.reset();
            },
        });
    };

    const confirmDelete = () => {
        if (!deletingCategory) return;
        router.delete(`/admin/categories/${deletingCategory.id}`, {
            onSuccess: () => setDeletingCategory(null),
        });
    };

    const toggleStatus = (cat: Category) => {
        router.patch(`/admin/categories/${cat.id}/toggle-status`, {}, { preserveScroll: true });
    };

    return (
        <AdminLayout
            title="Categories"
            breadcrumbs={[{ label: 'Catalog' }, { label: 'Categories' }]}
        >
            <Head title="Category Management - Admin" />

            <div className="space-y-6">
                <PageHeader
                    title="Category & Subcategory Hierarchy"
                    description="Organize taxonomy trees, parent collections, and product categorization"
                    badge="Taxonomy"
                    actions={
                        canCreate && (
                            <Button
                                onClick={() => setIsCreateOpen(true)}
                                variant="primary"
                                className="flex items-center gap-2 shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Category
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
                                placeholder="Search by category name or slug..."
                                className="pl-9 w-full"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <Select
                                value={parentFilter}
                                onChange={(e) => setParentFilter(e.target.value)}
                                options={[
                                    { value: '', label: 'All Levels' },
                                    { value: 'root', label: 'Root Categories Only' },
                                    ...parentOptions.map((p) => ({
                                        value: String(p.id),
                                        label: `Sub: ${p.name}`,
                                    })),
                                ]}
                            />
                        </div>
                        <div className="w-full sm:w-40">
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
                            {(search || statusFilter || parentFilter) && (
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
                            <TableHeaderCell>Category Name</TableHeaderCell>
                            <TableHeaderCell>Hierarchy</TableHeaderCell>
                            <TableHeaderCell>Products</TableHeaderCell>
                            <TableHeaderCell>Subcategories</TableHeaderCell>
                            <TableHeaderCell>Sort Order</TableHeaderCell>
                            <TableHeaderCell>Status</TableHeaderCell>
                            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {categories.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <EmptyState
                                        title="No categories found"
                                        description="Create your first parent category or adjust filter criteria."
                                        action={
                                            canCreate ? (
                                                <Button
                                                    onClick={() => setIsCreateOpen(true)}
                                                    variant="primary"
                                                    size="sm"
                                                >
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Add First Category
                                                </Button>
                                            ) : undefined
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            categories.data.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {cat.parent_id && (
                                                <CornerDownRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                                            )}
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                                {cat.image_path ? (
                                                    <img
                                                        src={cat.image_path}
                                                        alt={cat.name}
                                                        className="w-full h-full object-cover rounded-xl"
                                                    />
                                                ) : (
                                                    <FolderTree className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {cat.name}
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono">
                                                    /{cat.slug}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {cat.parent ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                                <Layers className="w-3.5 h-3.5 text-slate-400" />
                                                {cat.parent.name}
                                            </span>
                                        ) : (
                                            <Badge variant="primary">Root Category</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="neutral">
                                            {cat.products_count ?? 0} Products
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                            {cat.children_count ?? 0}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                            {cat.sort_order}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <button
                                            type="button"
                                            onClick={() => canEdit && toggleStatus(cat)}
                                            disabled={!canEdit}
                                            className="cursor-pointer"
                                            title="Click to toggle status"
                                        >
                                            <Badge variant={cat.is_active ? 'success' : 'neutral'}>
                                                {cat.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </button>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {canEdit && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openEdit(cat)}
                                                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setDeletingCategory(cat)}
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
                {categories.last_page > 1 && (
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                        <span>
                            Showing {categories.data.length} of {categories.total} categories
                        </span>
                        <div className="flex gap-1">
                            {categories.links.map((link, idx) => (
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

            {/* Create Category Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create New Category"
                description="Create a root category or a nested subcategory"
            >
                <form onSubmit={submitCreate} className="space-y-4">
                    <Select
                        label="Parent Category (Optional)"
                        value={String(createForm.data.parent_id)}
                        onChange={(e) => createForm.setData('parent_id', e.target.value)}
                        error={createForm.errors.parent_id}
                        options={[
                            { value: '', label: 'None (Set as Root Category)' },
                            ...parentOptions.map((p) => ({
                                value: String(p.id),
                                label: p.name,
                            })),
                        ]}
                    />

                    <Input
                        label="Category Name"
                        required
                        value={createForm.data.name}
                        onChange={(e) => createForm.setData('name', e.target.value)}
                        error={createForm.errors.name}
                        placeholder="e.g. Footwear & Sneakers"
                    />

                    <Input
                        label="Slug (Optional)"
                        value={createForm.data.slug}
                        onChange={(e) => createForm.setData('slug', e.target.value)}
                        error={createForm.errors.slug}
                        placeholder="auto-generated from name if empty"
                    />

                    <Input
                        label="Banner / Image URL"
                        value={createForm.data.image_path}
                        onChange={(e) => createForm.setData('image_path', e.target.value)}
                        error={createForm.errors.image_path}
                        placeholder="https://cdn.example.com/category.jpg"
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
                            placeholder="Brief description for SEO and category page..."
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
                            Save Category
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Category Modal */}
            <Modal
                isOpen={!!editingCategory}
                onClose={() => setEditingCategory(null)}
                title={`Edit Category: ${editingCategory?.name}`}
                description="Update category name, parent nesting, or status"
            >
                <form onSubmit={submitEdit} className="space-y-4">
                    <Select
                        label="Parent Category"
                        value={String(editForm.data.parent_id)}
                        onChange={(e) => editForm.setData('parent_id', e.target.value)}
                        error={editForm.errors.parent_id}
                        options={[
                            { value: '', label: 'None (Root Category)' },
                            ...parentOptions
                                .filter((p) => p.id !== editingCategory?.id)
                                .map((p) => ({
                                    value: String(p.id),
                                    label: p.name,
                                })),
                        ]}
                    />

                    <Input
                        label="Category Name"
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
                        label="Banner / Image URL"
                        value={editForm.data.image_path}
                        onChange={(e) => editForm.setData('image_path', e.target.value)}
                        error={editForm.errors.image_path}
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
                            onClick={() => setEditingCategory(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={editForm.processing}
                        >
                            Update Category
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={!!deletingCategory}
                onClose={() => setDeletingCategory(null)}
                title="Delete Category"
                description={`Are you sure you want to delete '${deletingCategory?.name}'? Note that categories with active subcategories or assigned products cannot be removed.`}
            >
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setDeletingCategory(null)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        onClick={confirmDelete}
                    >
                        Delete Category
                    </Button>
                </div>
            </Modal>
        </AdminLayout>
    );
}

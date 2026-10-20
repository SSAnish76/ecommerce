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
    SlugInput,
    ImagePicker,
    CopyButton,
    Toggle,
} from '../../Components/UI';
import {
    FolderTree,
    Search,
    Plus,
    Pencil,
    Trash2,
    RotateCcw,
    LayoutGrid,
    Table as TableIcon,
    CornerDownRight,
    Folder,
    FolderOpen,
    Check,
    Copy,
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
    parentOptions: { id: string; name: string }[];
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
    const [viewMode, setViewMode] = useState<'hierarchy' | 'table'>('hierarchy');

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

    // Create Form
    const createForm = useForm<{
        parent_id: string;
        name: string;
        slug: string;
        description: string;
        image_id: string | null;
        image_url: string;
        sort_order: number;
        is_active: boolean;
    }>({
        parent_id: '',
        name: '',
        slug: '',
        description: '',
        image_id: null,
        image_url: '',
        sort_order: 0,
        is_active: true,
    });

    // Edit Form
    const editForm = useForm<{
        parent_id: string;
        name: string;
        slug: string;
        description: string;
        image_id: string | null;
        image_url: string;
        sort_order: number;
        is_active: boolean;
    }>({
        parent_id: '',
        name: '',
        slug: '',
        description: '',
        image_id: null,
        image_url: '',
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

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
        router.get(
            '/admin/categories',
            { search, status, parent_id: parentFilter },
            { preserveState: true, replace: true }
        );
    };

    const handleParentFilterChange = (parentId: string) => {
        setParentFilter(parentId);
        router.get(
            '/admin/categories',
            { search, status: statusFilter, parent_id: parentId },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setStatusFilter('');
        setParentFilter('');
        router.get('/admin/categories', {}, { preserveState: true, replace: true });
    };


    const openCreateWithParent = (parentId?: string) => {
        createForm.reset();
        if (parentId) {
            createForm.setData('parent_id', parentId);
        }
        setIsCreateOpen(true);
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
            image_id: cat.image_id || null,
            image_url: cat.image_url || '',
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


    // Group categories for hierarchy card view
    const rootCategories = categories.data.filter((c) => !c.parent_id);
    const subCategories = categories.data.filter((c) => !!c.parent_id);

    return (
        <AdminLayout
            title="Categories"
            breadcrumbs={[{ label: 'Catalog' }, { label: 'Categories' }]}
        >
            <Head title="Category Taxonomy - Catalog Admin" />

            <div className="space-y-6">
                {/* Clean Header with Simple Category Count */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Categories
                            </h1>
                            <Badge variant="emerald" size="sm" className="font-semibold">
                                {categories.total} {categories.total === 1 ? 'Category' : 'Categories'}
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Organize your storefront navigation, nested taxonomy, product grouping, and mega-menu categories.
                        </p>
                    </div>

                    {canCreate && (
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <Button
                                onClick={() => openCreateWithParent()}
                                variant="primary"
                                size="sm"
                                pill
                                leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                                className="shadow-md shadow-indigo-600/20 font-medium px-4.5 py-1.5 rounded-full whitespace-nowrap"
                            >
                                Add
                            </Button>
                        </div>
                    )}
                </div>

                {/* Filter & View Toolbar */}
                <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                    <form onSubmit={handleSearch} className="flex flex-col lg:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by category name or description..."
                                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                                rightIcon={
                                    search ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch('');
                                                router.get(
                                                    '/admin/categories',
                                                    { status: statusFilter, parent_id: parentFilter },
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

                        {/* Parent Category Filter Dropdown */}
                        <div className="w-full lg:w-56 shrink-0">
                            <Select
                                value={parentFilter}
                                onChange={(e) => handleParentFilterChange(e.target.value)}
                                options={[
                                    { value: '', label: 'All Levels (Root & Sub)' },
                                    { value: 'root', label: 'Root Categories Only' },
                                    ...parentOptions.map((p) => ({
                                        value: String(p.id),
                                        label: `Sub of: ${p.name}`,
                                    })),
                                ]}
                            />
                        </div>

                        {/* Status Filter Tabs */}
                        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-full lg:w-auto shrink-0">
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

                        <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
                            <Button type="submit" variant="secondary" size="sm" className="flex-1 lg:flex-none">
                                Apply
                            </Button>

                            {(search || statusFilter || parentFilter) && (
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

                            {/* View Switcher (Hierarchy Cards vs Table) */}
                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('hierarchy')}
                                    className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        viewMode === 'hierarchy'
                                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                    title="Hierarchy Tree View"
                                >
                                    <FolderTree className="w-4 h-4" />
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
                    </form>
                </div>

                {/* Categories Content: Hierarchy View or Detailed Table */}
                {categories.data.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 text-center shadow-2xs">
                        <EmptyState
                            icon={FolderTree}
                            title="No categories found"
                            description={
                                search || statusFilter || parentFilter
                                    ? 'No categories match the active filter criteria. Try resetting filters.'
                                    : 'No categories created yet. Create your first root category to start organizing products.'
                            }
                            action={
                                search || statusFilter || parentFilter ? (
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
                                        onClick={() => openCreateWithParent()}
                                        variant="primary"
                                        size="sm"
                                        pill
                                        leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                                        className="shadow-md shadow-indigo-600/20 font-medium px-4.5 py-1.5 rounded-full whitespace-nowrap"
                                    >
                                        Add
                                    </Button>
                                ) : undefined
                            }
                        />
                    </div>
                ) : viewMode === 'hierarchy' ? (
                    /* Modern Hierarchy Cards View */
                    <div className="space-y-4">
                        {rootCategories.map((root) => {
                            // Find subcategories in current page that belong to this root
                            const childSubCategories = subCategories.filter((s) => s.parent_id === root.id);

                            return (
                                <div
                                    key={root.id}
                                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700/80 transition-all duration-200"
                                >
                                    {/* Root Category Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 p-1.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                                                {root.image_url ? (
                                                    <img
                                                        src={root.image_url}
                                                        alt={root.name}
                                                        className="w-full h-full object-cover rounded-lg"
                                                    />
                                                ) : (
                                                    <Folder className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                                        {root.name}
                                                    </h3>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800">
                                                        Root Level
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                                                    <span>/{root.slug}</span>
                                                    <CopyButton text={root.slug} title="Copy slug" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                                            {/* Status Badge */}
                                            <button
                                                type="button"
                                                onClick={() => canEdit && toggleStatus(root)}
                                                disabled={!canEdit}
                                                className="cursor-pointer"
                                                title="Toggle active status"
                                            >
                                                <Badge variant={root.is_active ? 'success' : 'neutral'} size="sm">
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                            root.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                                                        }`}
                                                    />
                                                    {root.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </button>

                                            {canCreate && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => openCreateWithParent(root.id)}
                                                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                    className="border border-slate-200/80 dark:border-slate-700/80 font-semibold rounded-xl shadow-2xs whitespace-nowrap text-xs"
                                                    title="Add Subcategory under this root"
                                                >
                                                    Subcategory
                                                </Button>
                                            )}

                                            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2 ml-0.5">
                                                {canEdit && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEdit(root)}
                                                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg"
                                                        title="Edit Root Category"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                )}

                                                {canDelete && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setDeletingCategory(root)}
                                                        className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg"
                                                        title="Delete Root Category"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description if present */}
                                    {root.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-3">
                                            {root.description}
                                        </p>
                                    )}

                                    {/* Nested Child Subcategories Section */}
                                    <div className="mt-3.5 pt-2">
                                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                                            <span className="flex items-center gap-1.5">
                                                <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                                                <span>Subcategories ({childSubCategories.length})</span>
                                            </span>
                                            {childSubCategories.length === 0 && (
                                                <span className="text-[11px] text-slate-400 italic">
                                                    No direct subcategories on this page
                                                </span>
                                            )}
                                        </div>

                                        {childSubCategories.length > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pl-4 sm:pl-6 border-l-2 border-emerald-200 dark:border-emerald-800/60">
                                                {childSubCategories.map((child) => (
                                                    <div
                                                        key={child.id}
                                                        className="group bg-slate-50/80 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors flex items-center justify-between gap-2"
                                                    >
                                                        <div className="min-w-0 flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0">
                                                                {child.image_url ? (
                                                                    <img
                                                                        src={child.image_url}
                                                                        alt={child.name}
                                                                        className="w-full h-full object-cover rounded"
                                                                    />
                                                                ) : (
                                                                    <FolderOpen className="w-4 h-4 text-slate-400" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                                                                    {child.name}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                                                    /{child.slug}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => canEdit && toggleStatus(child)}
                                                                disabled={!canEdit}
                                                                className={`w-2 h-2 rounded-full cursor-pointer mr-1 ${
                                                                    child.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                                                                }`}
                                                                title={`Status: ${child.is_active ? 'Active' : 'Inactive'}`}
                                                            />
                                                            {canEdit && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => openEdit(child)}
                                                                    className="p-1 text-slate-400 hover:text-indigo-600"
                                                                    title="Edit Subcategory"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                            {canDelete && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => setDeletingCategory(child)}
                                                                    className="p-1 text-slate-400 hover:text-rose-600"
                                                                    title="Delete Subcategory"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* If filtered to subcategories without parent root cards shown */}
                        {rootCategories.length === 0 && subCategories.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {subCategories.map((sub) => (
                                    <div
                                        key={sub.id}
                                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:border-indigo-400 transition-colors flex flex-col justify-between"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                                                Parent: {sub.parent?.name || 'Top-Level'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => canEdit && toggleStatus(sub)}
                                                disabled={!canEdit}
                                            >
                                                <Badge variant={sub.is_active ? 'success' : 'neutral'}>
                                                    {sub.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                <FolderOpen className="w-5 h-5 text-indigo-500" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                                    {sub.name}
                                                </h4>
                                                <span className="text-xs text-slate-500 font-mono">/{sub.slug}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                                            <span className="text-slate-400 font-mono text-[11px]">ID #{sub.id}</span>
                                            <div className="flex items-center gap-1">
                                                {canEdit && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEdit(sub)}
                                                        className="p-1 text-slate-400 hover:text-indigo-600"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setDeletingCategory(sub)}
                                                        className="p-1 text-slate-400 hover:text-rose-600"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Detailed Data Table View */
                    <TableContainer>
                        <TableHead>
                            <TableRow>
                                <TableHeaderCell className="w-16">Image</TableHeaderCell>
                                <TableHeaderCell>Category</TableHeaderCell>
                                <TableHeaderCell>Level Type</TableHeaderCell>
                                <TableHeaderCell>Parent Category</TableHeaderCell>
                                <TableHeaderCell>Sort Order</TableHeaderCell>
                                <TableHeaderCell>Status</TableHeaderCell>
                                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {categories.data.map((cat) => {
                                const isSub = Boolean(cat.parent_id);

                                return (
                                    <TableRow
                                        key={cat.id}
                                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                                    >
                                        <TableCell className="w-16">
                                            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                                {cat.image_url ? (
                                                    <img
                                                        src={cat.image_url}
                                                        alt={cat.name}
                                                        className="w-full h-full object-cover rounded-lg"
                                                        loading="lazy"
                                                    />
                                                ) : isSub ? (
                                                    <FolderOpen className="w-5 h-5 text-indigo-400" />
                                                ) : (
                                                    <Folder className="w-5 h-5 text-emerald-500" />
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {isSub && (
                                                    <span className="text-slate-300 dark:text-slate-600 font-mono text-sm">
                                                        ↳
                                                    </span>
                                                )}
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white text-sm">
                                                        {cat.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                                        <span>/{cat.slug}</span>
                                                        <CopyButton text={cat.slug} title="Copy slug" />
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            {isSub ? (
                                                <Badge variant="secondary">
                                                    <CornerDownRight className="w-3 h-3 mr-1" />
                                                    Subcategory
                                                </Badge>
                                            ) : (
                                                <Badge variant="success">
                                                    <Folder className="w-3 h-3 mr-1" />
                                                    Root Level
                                                </Badge>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            {cat.parent ? (
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                                    {cat.parent.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">— None (Root)</span>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
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
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                            cat.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                                                        }`}
                                                    />
                                                    {cat.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </button>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {!isSub && canCreate && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openCreateWithParent(cat.id)}
                                                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600"
                                                        title="Add Child Subcategory"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {canEdit && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEdit(cat)}
                                                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                                                        title="Edit Category"
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
                                                        title="Delete Category"
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
                {categories.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-3 gap-3">
                        <span>
                            Showing {categories.data.length} of {categories.total} categories in hierarchy
                        </span>
                        <div className="flex gap-1.5 flex-wrap justify-center">
                            {categories.links.map((link, idx) => (
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

            {/* Create Category Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create Catalog Category"
                description="Configure a new taxonomy category or nested subcategory"
            >
                <form onSubmit={submitCreate} className="space-y-4 pt-2">
                    <Select
                        label="Parent Category (Optional)"
                        value={String(createForm.data.parent_id)}
                        onChange={(e) => createForm.setData('parent_id', e.target.value)}
                        options={[
                            { value: '', label: 'None (Top-Level Category)' },
                            ...parentOptions.map((p) => ({
                                value: String(p.id),
                                label: p.name,
                            })),
                        ]}
                        error={createForm.errors.parent_id}
                    />

                    <Input
                        label="Category Name"
                        required
                        value={createForm.data.name}
                        onChange={(e) => createForm.setData('name', e.target.value)}
                        error={createForm.errors.name}
                        placeholder="e.g. Consumer Electronics, Laptops, Keyboards"
                    />

                    <SlugInput
                        value={createForm.data.slug}
                        onChange={(slug) => createForm.setData('slug', slug)}
                        sourceValue={createForm.data.name}
                        autoSync
                        error={createForm.errors.slug}
                        placeholder="auto-generated from category name"
                    />

                    <ImagePicker
                        label="Category Icon / Thumbnail Image"
                        helperText="Upload banner or icon (SVG, PNG, JPG, or WEBP)"
                        value={createForm.data.image_url}
                        collection="categories"
                        error={createForm.errors.image_url}
                        onChange={({ id, url }) => {
                            createForm.setData((data) => ({
                                ...data,
                                image_id: id,
                                image_url: url,
                            }));
                        }}
                    />

                    <Input
                        label="Sort Order Priority"
                        type="number"
                        value={String(createForm.data.sort_order)}
                        onChange={(e) => createForm.setData('sort_order', Number(e.target.value))}
                        error={createForm.errors.sort_order}
                        placeholder="0"
                    />

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                        <Toggle
                            id="category-create-is-active"
                            label="Active in Storefront"
                            description="Visible on navigation & category filters"
                            checked={createForm.data.is_active}
                            onChange={(checked) => createForm.setData('is_active', checked)}
                            className="py-0.5"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Description &amp; SEO Summary
                        </label>
                        <textarea
                            value={createForm.data.description}
                            onChange={(e) => createForm.setData('description', e.target.value)}
                            rows={3}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Category description shown on storefront category pages..."
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
                            Create Category
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Category Modal */}
            <Modal
                isOpen={!!editingCategory}
                onClose={() => setEditingCategory(null)}
                title={`Edit Category: ${editingCategory?.name}`}
                description="Update taxonomy assignment, icon thumbnail, or active status"
            >
                <form onSubmit={submitEdit} className="space-y-4 pt-2">
                    <Select
                        label="Parent Category"
                        value={String(editForm.data.parent_id)}
                        onChange={(e) => editForm.setData('parent_id', e.target.value)}
                        options={[
                            { value: '', label: 'None (Top-Level Category)' },
                            ...parentOptions
                                .filter((p) => p.id !== editingCategory?.id)
                                .map((p) => ({
                                    value: String(p.id),
                                    label: p.name,
                                })),
                        ]}
                        error={editForm.errors.parent_id}
                    />

                    <Input
                        label="Category Name"
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
                        label="Category Icon / Thumbnail Image"
                        helperText="Upload banner or icon (SVG, PNG, JPG, or WEBP)"
                        value={editForm.data.image_url}
                        collection="categories"
                        error={editForm.errors.image_url}
                        onChange={({ id, url }) => {
                            editForm.setData((data) => ({
                                ...data,
                                image_id: id,
                                image_url: url,
                            }));
                        }}
                    />

                    <Input
                        label="Sort Order Priority"
                        type="number"
                        value={String(editForm.data.sort_order)}
                        onChange={(e) => editForm.setData('sort_order', Number(e.target.value))}
                        error={editForm.errors.sort_order}
                    />

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                        <Toggle
                            id="category-edit-is-active"
                            label="Active in Storefront"
                            description="Visible on navigation & category filters"
                            checked={editForm.data.is_active}
                            onChange={(checked) => editForm.setData('is_active', checked)}
                            className="py-0.5"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Description &amp; SEO Summary
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

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deletingCategory}
                onClose={() => setDeletingCategory(null)}
                title="Delete Category"
                description={`Are you sure you want to delete '${deletingCategory?.name}'?`}
            >
                <div className="space-y-4 pt-2">
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-3">
                        <Trash2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold block">Hierarchy Impact Warning</span>
                            <span>
                                Any products in this category and any nested subcategories will be unlinked or may prevent deletion.
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
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
                            Confirm Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}

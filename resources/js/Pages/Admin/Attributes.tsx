import React, { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { Attribute, AttributeValue, PageProps } from '../../types';
import {
    Button,
    Input,
    Select,
    Badge,
    Modal,
    PageHeader,
    EmptyState,
} from '../../Components/UI';
import {
    Search,
    Plus,
    Sliders,
    Pencil,
    Trash2,
    Palette,
    Tag,
    List,
    Layers,
    Check,
    X,
    Sparkles,
    Hash,
    HelpCircle,
} from 'lucide-react';

interface PaginatedAttributes {
    data: Attribute[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface AttributesProps {
    attributes: PaginatedAttributes;
    filters: {
        search: string;
        type: string;
    };
    attributeTypes: { value: string; label: string }[];
}

export default function AttributesPage({
    attributes,
    filters,
    attributeTypes,
}: AttributesProps) {
    const { auth } = usePage<PageProps>().props;
    const canCreate = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('attributes.create') || true;
    const canEdit = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('attributes.edit') || true;
    const canDelete = auth?.user?.is_super_admin || auth?.user?.permissions?.includes('attributes.delete') || true;

    const [search, setSearch] = useState(filters.search || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');

    // Modals state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
    const [managingAttribute, setManagingAttribute] = useState<Attribute | null>(null);
    const [deletingAttribute, setDeletingAttribute] = useState<Attribute | null>(null);

    // Create Attribute Form
    const createForm = useForm({
        name: '',
        code: '',
        type: 'button',
        description: '',
        sort_order: 0,
        is_active: true,
        values: [{ value: '', label: '', color_code: '#3b82f6' }],
    });

    // Edit Attribute Form
    const editForm = useForm({
        name: '',
        code: '',
        type: 'button',
        description: '',
        sort_order: 0,
        is_active: true,
    });

    // Add Value Form (in Manage Values modal)
    const addValueForm = useForm({
        value: '',
        label: '',
        color_code: '#3b82f6',
        sort_order: 0,
    });

    // Quick edit single value state
    const [editingValueId, setEditingValueId] = useState<string | null>(null);
    const [editValueText, setEditValueText] = useState('');
    const [editValueLabel, setEditValueLabel] = useState('');
    const [editValueColor, setEditValueColor] = useState('');

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/attributes',
            { search, type: typeFilter },
            { preserveState: true }
        );
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/attributes', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAttribute) return;
        editForm.put(`/admin/attributes/${editingAttribute.id}`, {
            onSuccess: () => {
                setEditingAttribute(null);
            },
        });
    };

    const handleDeleteAttribute = () => {
        if (!deletingAttribute) return;
        router.delete(`/admin/attributes/${deletingAttribute.id}`, {
            onSuccess: () => setDeletingAttribute(null),
        });
    };

    const handleAddValue = (e: React.FormEvent) => {
        e.preventDefault();
        if (!managingAttribute) return;

        addValueForm.post(`/admin/attributes/${managingAttribute.id}/values`, {
            preserveScroll: true,
            onSuccess: () => {
                addValueForm.reset();
            },
        });
    };

    const handleUpdateValue = (valId: string) => {
        if (!managingAttribute) return;
        router.put(
            `/admin/attributes/${managingAttribute.id}/values/${valId}`,
            {
                value: editValueText,
                label: editValueLabel,
                color_code: editValueColor,
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditingValueId(null),
            }
        );
    };

    const handleDeleteValue = (valId: string) => {
        if (!managingAttribute) return;
        router.delete(
            `/admin/attributes/${managingAttribute.id}/values/${valId}`,
            { preserveScroll: true }
        );
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'color':
                return <Palette className="w-3.5 h-3.5 text-pink-500" />;
            case 'button':
                return <Tag className="w-3.5 h-3.5 text-indigo-500" />;
            case 'radio':
                return <List className="w-3.5 h-3.5 text-amber-500" />;
            default:
                return <Sliders className="w-3.5 h-3.5 text-emerald-500" />;
        }
    };

    const getTypeLabel = (type: string) => {
        const found = attributeTypes.find((t) => t.value === type);
        return found ? found.label : type;
    };

    return (
        <AdminLayout>
            <Head title="Product Attributes - Catalog Admin" />

            <div className="space-y-6">
                {/* Header */}
                <PageHeader
                    title="Product Attributes"
                    description="Configure reusable attributes such as Color, Size, RAM, and Storage for dynamic variant combinations."
                    breadcrumbs={[
                        { label: 'Admin', href: '/admin/dashboard' },
                        { label: 'Catalog', href: '/admin/products' },
                        { label: 'Attributes' },
                    ]}
                    action={
                        canCreate && (
                            <Button
                                variant="primary"
                                leftIcon={<Plus className="w-4 h-4" />}
                                onClick={() => setIsCreateOpen(true)}
                                className="shadow-lg shadow-indigo-600/20 font-medium px-4 py-2 text-xs"
                            >
                                New Attribute
                            </Button>
                        )
                    }
                />

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-3 w-full">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search attributes by name or code..."
                                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>

                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                router.get(
                                    '/admin/attributes',
                                    { search, type: e.target.value },
                                    { preserveState: true }
                                );
                            }}
                            className="text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Display Types</option>
                            {attributeTypes.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>

                        <Button type="submit" variant="secondary" size="sm" className="hidden sm:inline-flex">
                            Filter
                        </Button>
                    </form>

                    <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                        Total: <span className="font-bold text-slate-900 dark:text-white">{attributes.total}</span> attributes
                    </div>
                </div>

                {/* Attributes Grid */}
                {attributes.data.length === 0 ? (
                    <EmptyState
                        icon={<Sliders className="w-10 h-10 text-slate-400" />}
                        title="No Attributes Configured"
                        description="Create global attributes like Color, Size, RAM, or Storage to enable product variants."
                        action={
                            canCreate && (
                                <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
                                    Create First Attribute
                                </Button>
                            )
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {attributes.data.map((attr) => (
                            <div
                                key={attr.id}
                                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                {getTypeIcon(attr.type)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                                    {attr.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="font-mono text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                        {attr.code}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {getTypeLabel(attr.type)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <Badge variant={attr.is_active ? 'success' : 'default'} size="sm">
                                            {attr.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>

                                    {attr.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                                            {attr.description}
                                        </p>
                                    )}

                                    {/* Attribute Values Preview */}
                                    <div className="space-y-1.5 mb-4">
                                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                                            <span>Configured Values ({attr.values?.length || 0})</span>
                                            <button
                                                type="button"
                                                onClick={() => setManagingAttribute(attr)}
                                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                                            >
                                                Manage All
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                                            {attr.values && attr.values.length > 0 ? (
                                                attr.values.slice(0, 8).map((val) => (
                                                    <div
                                                        key={val.id}
                                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-3xs text-slate-800 dark:text-slate-200"
                                                    >
                                                        {attr.type === 'color' && val.color_code && (
                                                            <span
                                                                className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0"
                                                                style={{ backgroundColor: val.color_code }}
                                                            />
                                                        )}
                                                        <span>{val.value}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-[11px] text-slate-400 italic">No values added yet</span>
                                            )}
                                            {attr.values && attr.values.length > 8 && (
                                                <span className="text-[10px] text-slate-400 self-center font-bold">
                                                    +{attr.values.length - 8} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setManagingAttribute(attr)}
                                        leftIcon={<Layers className="w-3.5 h-3.5 text-indigo-500" />}
                                        className="text-xs py-1.5 px-3 rounded-xl"
                                    >
                                        Manage Values
                                    </Button>

                                    <div className="flex items-center gap-1">
                                        {canEdit && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingAttribute(attr);
                                                    editForm.setData({
                                                        name: attr.name,
                                                        code: attr.code,
                                                        type: attr.type,
                                                        description: attr.description || '',
                                                        sort_order: attr.sort_order || 0,
                                                        is_active: attr.is_active,
                                                    });
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg"
                                                title="Edit Attribute"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                        )}

                                        {canDelete && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeletingAttribute(attr)}
                                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                                title="Delete Attribute"
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

            {/* Modal: Create Attribute */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create New Attribute"
                size="lg"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <Input
                        label="Attribute Name"
                        required
                        value={createForm.data.name}
                        onChange={(e) => {
                            createForm.setData((prev) => ({
                                ...prev,
                                name: e.target.value,
                                code: prev.code || e.target.value.toLowerCase().replace(/\s+/g, '-'),
                            }));
                        }}
                        error={createForm.errors.name}
                        placeholder="e.g. Color, Size, RAM, Storage, Material"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Attribute Code / Slug"
                            value={createForm.data.code}
                            onChange={(e) => createForm.setData('code', e.target.value)}
                            error={createForm.errors.code}
                            placeholder="e.g. color, shoe-size, ram"
                            helperText="Machine-readable unique key used in variants"
                        />

                        <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Display UI Type
                            </label>
                            <select
                                value={createForm.data.type}
                                onChange={(e) => createForm.setData('type', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                {attributeTypes.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={createForm.data.description}
                            onChange={(e) => createForm.setData('description', e.target.value)}
                            rows={2}
                            placeholder="Optional merchandising guidance..."
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* Initial Values Builder */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Initial Values (Optional)
                            </label>
                            <button
                                type="button"
                                onClick={() =>
                                    createForm.setData('values', [
                                        ...createForm.data.values,
                                        { value: '', label: '', color_code: '#3b82f6' },
                                    ])
                                }
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Value
                            </button>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {createForm.data.values.map((val, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={val.value}
                                        onChange={(e) => {
                                            const updated = [...createForm.data.values];
                                            updated[idx].value = e.target.value;
                                            createForm.setData('values', updated);
                                        }}
                                        placeholder="Value (e.g. Midnight Black)"
                                        className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                                    />

                                    {createForm.data.type === 'color' && (
                                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <input
                                                type="color"
                                                value={val.color_code || '#000000'}
                                                onChange={(e) => {
                                                    const updated = [...createForm.data.values];
                                                    updated[idx].color_code = e.target.value;
                                                    createForm.setData('values', updated);
                                                }}
                                                className="w-6 h-6 rounded-lg cursor-pointer border-0 bg-transparent"
                                                title="Select color swatch"
                                            />
                                            <span className="text-[10px] font-mono text-slate-500 pr-1">
                                                {val.color_code || '#000000'}
                                            </span>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updated = createForm.data.values.filter((_, i) => i !== idx);
                                            createForm.setData('values', updated);
                                        }}
                                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={createForm.processing}>
                            Save Attribute
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Attribute */}
            <Modal
                isOpen={Boolean(editingAttribute)}
                onClose={() => setEditingAttribute(null)}
                title={`Edit Attribute: ${editingAttribute?.name || ''}`}
            >
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    <Input
                        label="Attribute Name"
                        required
                        value={editForm.data.name}
                        onChange={(e) => editForm.setData('name', e.target.value)}
                        error={editForm.errors.name}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Attribute Code"
                            required
                            value={editForm.data.code}
                            onChange={(e) => editForm.setData('code', e.target.value)}
                            error={editForm.errors.code}
                        />

                        <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Display UI Type
                            </label>
                            <select
                                value={editForm.data.type}
                                onChange={(e) => editForm.setData('type', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white"
                            >
                                {attributeTypes.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={editForm.data.description}
                            onChange={(e) => editForm.setData('description', e.target.value)}
                            rows={2}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="edit-is-active"
                            checked={editForm.data.is_active}
                            onChange={(e) => editForm.setData('is_active', e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="edit-is-active" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Attribute Active in Product Editor
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="secondary" onClick={() => setEditingAttribute(null)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={editForm.processing}>
                            Update Attribute
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Manage Attribute Values */}
            <Modal
                isOpen={Boolean(managingAttribute)}
                onClose={() => setManagingAttribute(null)}
                title={`Manage Values: ${managingAttribute?.name || ''}`}
                size="lg"
            >
                <div className="space-y-5">
                    {/* Add New Value Form */}
                    <form onSubmit={handleAddValue} className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                        <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                            Add New {managingAttribute?.name} Value
                        </span>

                        <div className="flex flex-col sm:flex-row items-center gap-2.5">
                            <input
                                type="text"
                                required
                                value={addValueForm.data.value}
                                onChange={(e) => addValueForm.setData('value', e.target.value)}
                                placeholder="Value text (e.g. 512GB, Navy Blue)"
                                className="flex-1 w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-white"
                            />

                            {managingAttribute?.type === 'color' && (
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                                    <input
                                        type="color"
                                        value={addValueForm.data.color_code || '#3b82f6'}
                                        onChange={(e) => addValueForm.setData('color_code', e.target.value)}
                                        className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                                        title="Pick Hex Color"
                                    />
                                    <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                                        {addValueForm.data.color_code}
                                    </span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                disabled={addValueForm.processing}
                                className="w-full sm:w-auto text-xs py-2.5 px-4 rounded-xl shrink-0"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Value
                            </Button>
                        </div>
                    </form>

                    {/* Current Values List */}
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Existing Attribute Values ({managingAttribute?.values?.length || 0})
                        </span>

                        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                            {managingAttribute?.values && managingAttribute.values.length > 0 ? (
                                managingAttribute.values.map((v) => {
                                    const isEditing = editingValueId === v.id;

                                    return (
                                        <div
                                            key={v.id}
                                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
                                        >
                                            {isEditing ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editValueText}
                                                        onChange={(e) => setEditValueText(e.target.value)}
                                                        className="flex-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5"
                                                    />
                                                    {managingAttribute.type === 'color' && (
                                                        <input
                                                            type="color"
                                                            value={editValueColor || '#000000'}
                                                            onChange={(e) => setEditValueColor(e.target.value)}
                                                            className="w-6 h-6 rounded cursor-pointer"
                                                        />
                                                    )}
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={() => handleUpdateValue(v.id)}
                                                        className="p-1 px-2 text-xs"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => setEditingValueId(null)}
                                                        className="p-1 px-2 text-xs"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2.5">
                                                        {managingAttribute.type === 'color' && v.color_code && (
                                                            <span
                                                                className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-2xs"
                                                                style={{ backgroundColor: v.color_code }}
                                                            />
                                                        )}
                                                        <div>
                                                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                                {v.value}
                                                            </span>
                                                            {v.color_code && (
                                                                <span className="text-[10px] font-mono text-slate-400 ml-2">
                                                                    {v.color_code}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingValueId(v.id);
                                                                setEditValueText(v.value);
                                                                setEditValueLabel(v.label || v.value);
                                                                setEditValueColor(v.color_code || '#000000');
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteValue(v.id)}
                                                            className="p-1 text-rose-400 hover:text-rose-600 rounded"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-6 text-xs text-slate-400">
                                    No values yet. Add your first value above!
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="secondary" onClick={() => setManagingAttribute(null)}>
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Confirm Delete Attribute */}
            <Modal
                isOpen={Boolean(deletingAttribute)}
                onClose={() => setDeletingAttribute(null)}
                title="Delete Attribute"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                        Are you sure you want to delete attribute{' '}
                        <strong className="text-slate-900 dark:text-white">
                            {deletingAttribute?.name}
                        </strong>
                        ? This will remove all associated values.
                    </p>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setDeletingAttribute(null)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="danger" onClick={handleDeleteAttribute}>
                            Delete Attribute
                        </Button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}

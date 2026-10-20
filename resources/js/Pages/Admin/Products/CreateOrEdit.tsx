import React, { useRef, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { Product, ProductVariant, PageProps } from '../../../types';
import {
    Button,
    Input,
    Select,
    Badge,
    Card,
    PageHeader,
} from '../../../Components/UI';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Layers,
    Image as ImageIcon,
    Tag,
    DollarSign,
    Boxes,
    FileText,
    MapPin,
    ShieldAlert,
    Check,
    Upload,
    Loader2,
    Star,
    RefreshCw,
    Eye,
    AlertCircle,
} from 'lucide-react';

const getCsrfToken = (): string => {
    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
    if (metaTag && metaTag.content) {
        return metaTag.content;
    }

    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (match) {
        return decodeURIComponent(match[1]);
    }

    return '';
};

interface CreateOrEditProps {
    product: (Product & { images?: any[]; variants?: ProductVariant[] }) | null;
    brands: { id: number; name: string }[];
    categories: { id: number; name: string; parent_id?: number | null }[];
    statuses: { value: string; label: string }[];
    stockVisibilities: { value: string; label: string }[];
    locationTypes: { value: string; label: string }[];
}

export default function CreateOrEditProductPage({
    product,
    brands,
    categories,
    statuses,
    stockVisibilities,
    locationTypes,
}: CreateOrEditProps) {
    const isEdit = Boolean(product);
    const { store } = usePage<PageProps>().props;
    const currency = store?.currency || '$';

    // Form state
    const form = useForm({
        name: product?.name || '',
        slug: product?.slug || '',
        sku: product?.sku || '',
        short_description: product?.short_description || '',
        description: product?.description || '',
        specifications: product?.specifications || [{ key: '', value: '' }],
        brand_id: product?.brand_id ? String(product.brand_id) : '',
        category_id: product?.category_id ? String(product.category_id) : '',
        mrp: product?.mrp ?? 0,
        retail_price: product?.retail_price ?? 0,
        sale_price: product?.sale_price ?? '',
        discount_percentage: product?.discount_percentage ?? '',
        stock_quantity: product?.stock_quantity ?? 0,
        low_stock_threshold: product?.low_stock_threshold ?? 5,
        stock_visibility: product?.stock_visibility || 'badge',
        has_variants: Boolean(product?.has_variants),
        status: product?.status || 'active',
        is_featured: Boolean(product?.is_featured),
        location_availability_type: product?.location_availability_type || 'all',
        delivery_radius_km: product?.delivery_radius_km ?? '',
        return_policy: product?.return_policy || '10-day replacement warranty for manufacturing defects.',
        refund_policy: product?.refund_policy || '100% money back upon inspection of returned unit.',
        // Dynamic images array
        images: product?.images?.length
            ? product.images.map((img: any) => ({
                  media_id: img.media_id || img.media?.id || null,
                  url: img.url || '',
                  alt_text: img.alt_text || '',
                  is_primary: Boolean(img.is_primary),
              }))
            : [],
        // Dynamic variants array
        variants: product?.variants?.length
            ? product.variants.map((v) => ({
                  sku: v.sku,
                  name: v.name,
                  price: v.price,
                  mrp: v.mrp || '',
                  sale_price: v.sale_price || '',
                  stock_quantity: v.stock_quantity,
                  low_stock_threshold: v.low_stock_threshold || 5,
                  is_active: v.is_active,
              }))
            : [],
    });

    // Specifications helpers
    const specEntries: { key: string; value: string }[] = Array.isArray(form.data.specifications)
        ? form.data.specifications
        : Object.entries(form.data.specifications || {}).map(([k, v]) => ({ key: k, value: String(v) }));

    const updateSpec = (idx: number, field: 'key' | 'value', val: string) => {
        const updated = [...specEntries];
        updated[idx][field] = val;
        form.setData('specifications', updated);
    };

    const addSpec = () => {
        form.setData('specifications', [...specEntries, { key: '', value: '' }]);
    };

    const removeSpec = (idx: number) => {
        const updated = specEntries.filter((_, i) => i !== idx);
        form.setData('specifications', updated);
    };

    // Image upload states & refs
    const [uploadingCount, setUploadingCount] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const replaceInputRef = useRef<HTMLInputElement>(null);

    const removeImage = (idx: number) => {
        const updated = form.data.images.filter((_, i) => i !== idx);
        if (updated.length > 0 && !updated.some((img) => img.is_primary)) {
            updated[0].is_primary = true;
        }
        form.setData('images', updated);
    };

    const setPrimaryImage = (idx: number) => {
        const updated = form.data.images.map((img, i) => ({
            ...img,
            is_primary: i === idx,
        }));
        form.setData('images', updated);
    };

    const handleFilesUpload = async (files: FileList | File[]) => {
        const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (fileList.length === 0) return;

        setUploadError(null);
        setUploadingCount((prev) => prev + fileList.length);
        const token = getCsrfToken();

        for (const file of fileList) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('collection', 'products');

            try {
                const response = await fetch('/admin/media/upload', {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                        ...(token ? { 'X-CSRF-TOKEN': token } : {}),
                    },
                    body: formData,
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => null);
                    throw new Error(errData?.message || `Failed to upload ${file.name}`);
                }

                const json = await response.json();
                const media = json.data;

                if (media?.url) {
                    form.setData((prev) => {
                        const existing = prev.images.filter((img) => (img.url || '').trim() !== '');
                        const isPrimary = existing.length === 0;
                        return {
                            ...prev,
                            images: [
                                ...existing,
                                {
                                    media_id: media.id,
                                    url: media.url,
                                    alt_text: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                                    is_primary: isPrimary,
                                },
                            ],
                        };
                    });
                }
            } catch (err: any) {
                setUploadError(err.message || 'Error uploading one or more images.');
            } finally {
                setUploadingCount((prev) => Math.max(0, prev - 1));
            }
        }
    };

    const handleReplaceFile = async (file: File, index: number) => {
        if (!file) return;
        setUploadError(null);
        setUploadingCount((prev) => prev + 1);

        const token = getCsrfToken();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('collection', 'products');

        try {
            const response = await fetch('/admin/media/upload', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    ...(token ? { 'X-CSRF-TOKEN': token } : {}),
                },
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.message || `Failed to upload ${file.name}`);
            }

            const json = await response.json();
            const media = json.data;

            if (media?.url) {
                form.setData((prev) => {
                    const updated = [...prev.images];
                    if (updated[index]) {
                        updated[index] = {
                            ...updated[index],
                            media_id: media.id,
                            url: media.url,
                        };
                    }
                    return { ...prev, images: updated };
                });
            }
        } catch (err: any) {
            setUploadError(err.message || 'Error replacing image.');
        } finally {
            setUploadingCount((prev) => Math.max(0, prev - 1));
            setReplacingIndex(null);
        }
    };

    // Variants helpers
    const addVariant = () => {
        const skuPrefix = form.data.sku ? `${form.data.sku}-VAR${form.data.variants.length + 1}` : '';
        form.setData('variants', [
            ...form.data.variants,
            {
                sku: skuPrefix,
                name: `Variant #${form.data.variants.length + 1}`,
                price: form.data.retail_price || 0,
                mrp: form.data.mrp || '',
                sale_price: form.data.sale_price || '',
                stock_quantity: 10,
                low_stock_threshold: 5,
                is_active: true,
            },
        ]);
    };

    const removeVariant = (idx: number) => {
        form.setData('variants', form.data.variants.filter((_, i) => i !== idx));
    };

    // Price change auto-discount calculation
    const handleRetailPriceChange = (val: number) => {
        form.setData((prev) => {
            const mrp = Number(prev.mrp);
            let discount = prev.discount_percentage;
            if (mrp > 0 && val > 0 && mrp > val) {
                discount = Number((((mrp - val) / mrp) * 100).toFixed(2));
            }
            return { ...prev, retail_price: val, discount_percentage: discount };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Convert spec array back to key-value object
        const cleanSpecs: Record<string, string> = {};
        for (const item of specEntries) {
            if (item.key.trim()) {
                cleanSpecs[item.key.trim()] = item.value;
            }
        }

        const payload = {
            ...form.data,
            specifications: cleanSpecs,
            images: form.data.images.filter((img) => (img.url || '').trim() !== ''),
        };

        form.transform(() => payload);

        if (isEdit && product) {
            form.put(`/admin/products/${product.id}`);
        } else {
            form.post('/admin/products');
        }
    };

    return (
        <AdminLayout
            title={isEdit ? `Edit Product: ${product?.name}` : 'Create New Product'}
            breadcrumbs={[
                { label: 'Catalog', href: '/admin/products' },
                { label: 'Products', href: '/admin/products' },
                { label: isEdit ? 'Edit' : 'Create' },
            ]}
        >
            <Head title={isEdit ? `Edit ${product?.name}` : 'Create Product - Admin'} />

            <form onSubmit={handleSubmit} className="space-y-8 max-w-6xl pb-16">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/products">
                            <Button variant="ghost" size="sm" type="button" className="p-2">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {isEdit ? `Edit Product` : 'Create New Product'}
                            </h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Configure specifications, variants, multi-image galleries, and inventory parameters
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/admin/products">
                            <Button variant="secondary" type="button">
                                Cancel
                            </Button>
                        </Link>
                        <Button variant="primary" type="submit" isLoading={form.processing}>
                            {isEdit ? 'Update Product' : 'Publish Product'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main 2-column Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 1. Basic Product Info */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                                <Tag className="w-4 h-4 text-indigo-500" />
                                <span>General Information</span>
                            </div>

                            <Input
                                label="Product Name / Title"
                                required
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                error={form.errors.name}
                                placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="SKU (Stock Keeping Unit)"
                                    required
                                    value={form.data.sku}
                                    onChange={(e) => form.setData('sku', e.target.value.toUpperCase())}
                                    error={form.errors.sku}
                                    placeholder="e.g. SNY-WH1000-BLK"
                                />

                                <Input
                                    label="Custom Slug (Optional)"
                                    value={form.data.slug}
                                    onChange={(e) => form.setData('slug', e.target.value)}
                                    error={form.errors.slug}
                                    placeholder="auto-generated from product title"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Short Summary Description
                                </label>
                                <textarea
                                    value={form.data.short_description}
                                    onChange={(e) => form.setData('short_description', e.target.value)}
                                    rows={2}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Brief punchy summary displayed in product cards..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Full Product Description
                                </label>
                                <textarea
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                    rows={5}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Detailed marketing copy, feature breakdown, and what's in the box..."
                                />
                            </div>
                        </div>

                        {/* 2. Pricing & Economics */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                <span>Pricing & Commercials</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Input
                                    label={`MRP (${currency})`}
                                    required
                                    type="number"
                                    step="0.01"
                                    value={String(form.data.mrp)}
                                    onChange={(e) => form.setData('mrp', Number(e.target.value))}
                                    error={form.errors.mrp}
                                    placeholder="0.00"
                                />

                                <Input
                                    label={`Retail Price (${currency})`}
                                    required
                                    type="number"
                                    step="0.01"
                                    value={String(form.data.retail_price)}
                                    onChange={(e) => handleRetailPriceChange(Number(e.target.value))}
                                    error={form.errors.retail_price}
                                    placeholder="0.00"
                                />

                                <Input
                                    label={`Sale Price (${currency})`}
                                    type="number"
                                    step="0.01"
                                    value={String(form.data.sale_price)}
                                    onChange={(e) => form.setData('sale_price', e.target.value ? Number(e.target.value) : '')}
                                    error={form.errors.sale_price}
                                    placeholder="Optional promo price"
                                />

                                <Input
                                    label="Discount %"
                                    type="number"
                                    step="0.1"
                                    value={String(form.data.discount_percentage)}
                                    onChange={(e) => form.setData('discount_percentage', e.target.value ? Number(e.target.value) : '')}
                                    error={form.errors.discount_percentage}
                                    placeholder="e.g. 15%"
                                />
                            </div>
                        </div>

                        {/* 3. Product Gallery Images */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                        <ImageIcon className="w-4 h-4 text-blue-500" />
                                        <span>Product Gallery Images</span>
                                        {uploadingCount > 0 && (
                                            <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Uploading {uploadingCount} file{uploadingCount > 1 ? 's' : ''}...
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Upload product images. The primary image is used as the cover across catalog pages and search results.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                handleFilesUpload(e.target.files);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <input
                                        ref={replaceInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0 && replacingIndex !== null) {
                                                handleReplaceFile(e.target.files[0], replacingIndex);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 text-xs"
                                        disabled={uploadingCount > 0}
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        Upload Photos
                                    </Button>
                                </div>
                            </div>

                            {uploadError && (
                                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{uploadError}</span>
                                </div>
                            )}

                            {/* Multi-file Drag & Drop Dropzone */}
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                        handleFilesUpload(e.dataTransfer.files);
                                    }
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                                    isDragging
                                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-4 ring-indigo-500/10'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                                }`}
                            >
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                            Drop product photos here, or{' '}
                                            <span className="text-indigo-600 dark:text-indigo-400 underline font-bold">browse files</span>
                                        </span>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Select single or multiple files (JPG, PNG, WEBP, GIF up to 25MB each)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Images List */}
                            {form.data.images.length > 0 && (
                                <div className="space-y-3 pt-2">
                                    {form.data.images.map((img, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-3.5 rounded-2xl border transition-all ${
                                                img.is_primary
                                                    ? 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/30 dark:bg-emerald-950/20'
                                                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                {/* Thumbnail preview */}
                                                <div className="relative group/thumb w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-xs">
                                                    {img.url ? (
                                                        <>
                                                            <img
                                                                src={img.url}
                                                                alt={img.alt_text || 'Preview'}
                                                                className="w-full h-full object-contain p-1"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.opacity = '0.3';
                                                                }}
                                                            />
                                                            <a
                                                                href={img.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                title="View full image in new tab"
                                                                className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </a>
                                                        </>
                                                    ) : (
                                                        <ImageIcon className="w-6 h-6 text-slate-400" />
                                                    )}
                                                </div>

                                                {/* Details & Inputs */}
                                                <div className="flex-1 w-full space-y-1">
                                                    <input
                                                        type="text"
                                                        value={img.alt_text}
                                                        onChange={(e) => {
                                                            const updated = [...form.data.images];
                                                            updated[idx].alt_text = e.target.value;
                                                            form.setData('images', updated);
                                                        }}
                                                        placeholder="Alt text / description (e.g. Front view with lighting)"
                                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                    />
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => {
                                                            setReplacingIndex(idx);
                                                            replaceInputRef.current?.click();
                                                        }}
                                                        className="text-xs flex items-center gap-1.5 px-2.5 py-1.5"
                                                        title="Upload a new file to replace this image"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                        <span>Replace</span>
                                                    </Button>

                                                    {img.is_primary ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-white shadow-2xs">
                                                            <Star className="w-3.5 h-3.5 fill-white" />
                                                            <span>Primary Cover</span>
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPrimaryImage(idx)}
                                                            className="px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                                                        >
                                                            <Star className="w-3 h-3 text-slate-400" />
                                                            <span>Make Primary</span>
                                                        </button>
                                                    )}

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeImage(idx)}
                                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl"
                                                        title="Remove this image"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 4. Specifications (Key - Value Pairs) */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                    <FileText className="w-4 h-4 text-purple-500" />
                                    <span>Technical Specifications</span>
                                </div>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={addSpec}
                                    className="flex items-center gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Specification
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {specEntries.map((spec, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={spec.key}
                                            onChange={(e) => updateSpec(idx, 'key', e.target.value)}
                                            placeholder="Spec label (e.g. Battery Life)"
                                            className="w-1/3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                        <input
                                            type="text"
                                            value={spec.value}
                                            onChange={(e) => updateSpec(idx, 'value', e.target.value)}
                                            placeholder="Value (e.g. 30 Hours)"
                                            className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSpec(idx)}
                                            className="p-1.5 text-rose-500 hover:text-rose-700 shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 5. Dynamic Product Variants */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                        <Layers className="w-4 h-4 text-orange-500" />
                                        <span>Product Variants</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Enable for items with options like Size, Color, Capacity
                                    </p>
                                </div>
                                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.data.has_variants}
                                        onChange={(e) => form.setData('has_variants', e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                    />
                                    <span>Has Variants</span>
                                </label>
                            </div>

                            {form.data.has_variants && (
                                <div className="space-y-4 pt-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={addVariant}
                                        className="flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Variant Option
                                    </Button>

                                    <div className="space-y-3">
                                        {form.data.variants.map((v, idx) => (
                                            <div
                                                key={idx}
                                                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        Variant #{idx + 1}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeVariant(idx)}
                                                        className="p-1 text-rose-500 hover:text-rose-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                    <Input
                                                        label="Variant Name"
                                                        required
                                                        value={v.name}
                                                        onChange={(e) => {
                                                            const updated = [...form.data.variants];
                                                            updated[idx].name = e.target.value;
                                                            form.setData('variants', updated);
                                                        }}
                                                        placeholder="e.g. Size: Large / Color: Blue"
                                                    />

                                                    <Input
                                                        label="Variant SKU"
                                                        required
                                                        value={v.sku}
                                                        onChange={(e) => {
                                                            const updated = [...form.data.variants];
                                                            updated[idx].sku = e.target.value.toUpperCase();
                                                            form.setData('variants', updated);
                                                        }}
                                                        placeholder="SKU"
                                                    />

                                                    <Input
                                                        label={`Price (${currency})`}
                                                        required
                                                        type="number"
                                                        step="0.01"
                                                        value={String(v.price)}
                                                        onChange={(e) => {
                                                            const updated = [...form.data.variants];
                                                            updated[idx].price = Number(e.target.value);
                                                            form.setData('variants', updated);
                                                        }}
                                                    />

                                                    <Input
                                                        label="Stock Quantity"
                                                        required
                                                        type="number"
                                                        value={String(v.stock_quantity)}
                                                        onChange={(e) => {
                                                            const updated = [...form.data.variants];
                                                            updated[idx].stock_quantity = Number(e.target.value);
                                                            form.setData('variants', updated);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 6. Return & Refund Policies */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                                <ShieldAlert className="w-4 h-4 text-teal-500" />
                                <span>Return & Refund Policies</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Return Policy Details
                                    </label>
                                    <textarea
                                        value={form.data.return_policy}
                                        onChange={(e) => form.setData('return_policy', e.target.value)}
                                        rows={3}
                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Refund Policy Details
                                    </label>
                                    <textarea
                                        value={form.data.refund_policy}
                                        onChange={(e) => form.setData('refund_policy', e.target.value)}
                                        rows={3}
                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Taxonomy, Status & Availability */}
                    <div className="space-y-6">
                        {/* Status & Featured */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                                Publishing Status
                            </h3>

                            <Select
                                label="Product Status"
                                value={form.data.status}
                                onChange={(e) => form.setData('status', e.target.value)}
                                options={statuses}
                                error={form.errors.status}
                            />

                            <div className="flex items-center justify-between pt-2">
                                <div>
                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        Featured Product
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        Highlight on homepage showcase
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={form.data.is_featured}
                                    onChange={(e) => form.setData('is_featured', e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                            </div>
                        </div>

                        {/* Taxonomy: Brand & Category */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                                Organization & Classification
                            </h3>

                            <Select
                                label="Category"
                                value={form.data.category_id}
                                onChange={(e) => form.setData('category_id', e.target.value)}
                                options={[
                                    { value: '', label: 'Select Category' },
                                    ...categories.map((c) => ({
                                        value: String(c.id),
                                        label: c.parent_id ? `— ${c.name}` : c.name,
                                    })),
                                ]}
                                error={form.errors.category_id}
                            />

                            <Select
                                label="Brand"
                                value={form.data.brand_id}
                                onChange={(e) => form.setData('brand_id', e.target.value)}
                                options={[
                                    { value: '', label: 'Select Brand' },
                                    ...brands.map((b) => ({
                                        value: String(b.id),
                                        label: b.name,
                                    })),
                                ]}
                                error={form.errors.brand_id}
                            />
                        </div>

                        {/* Inventory & Thresholds */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                                <Boxes className="w-4 h-4 text-amber-500" />
                                <span>Inventory & Stock</span>
                            </div>

                            <Input
                                label="Stock Quantity (Total Units)"
                                required
                                type="number"
                                value={String(form.data.stock_quantity)}
                                onChange={(e) => form.setData('stock_quantity', Number(e.target.value))}
                                error={form.errors.stock_quantity}
                            />

                            <Input
                                label="Low Stock Alert Threshold"
                                required
                                type="number"
                                value={String(form.data.low_stock_threshold)}
                                onChange={(e) => form.setData('low_stock_threshold', Number(e.target.value))}
                                error={form.errors.low_stock_threshold}
                            />

                            <Select
                                label="Out-of-Stock Display Behavior"
                                value={form.data.stock_visibility}
                                onChange={(e) => form.setData('stock_visibility', e.target.value)}
                                options={stockVisibilities}
                                error={form.errors.stock_visibility}
                            />
                        </div>

                        {/* Location / Radius Availability */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                                <MapPin className="w-4 h-4 text-rose-500" />
                                <span>Geographic Availability</span>
                            </div>

                            <Select
                                label="Availability Scope"
                                value={form.data.location_availability_type}
                                onChange={(e) => form.setData('location_availability_type', e.target.value)}
                                options={locationTypes}
                                error={form.errors.location_availability_type}
                            />

                            {form.data.location_availability_type === 'radius' && (
                                <Input
                                    label="Max Delivery Radius (in Kilometers)"
                                    type="number"
                                    step="0.5"
                                    value={String(form.data.delivery_radius_km)}
                                    onChange={(e) => form.setData('delivery_radius_km', Number(e.target.value))}
                                    error={form.errors.delivery_radius_km}
                                    placeholder="e.g. 25 km from store address"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}

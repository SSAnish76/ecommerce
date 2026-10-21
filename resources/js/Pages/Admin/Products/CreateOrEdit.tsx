import React, { useRef, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import {
    Product,
    ProductVariant,
    ProductImage,
    Category,
    PageProps,
    Attribute,
    AttributeValue,
} from '../../../types';
import {
    Button,
    Input,
    Select,
    Badge,
    Card,
    PageHeader,
    SlugInput,
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
    Sparkles,
    TrendingDown,
    Save,
    CheckCircle2,
    Copy,
    Zap,
    Sliders,
    Palette,
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

export interface ProductImageFormItem {
    media_id: string | null;
    url: string;
    alt_text: string;
    is_primary: boolean;
}

export interface ProductVariantFormItem {
    id?: string;
    sku: string;
    name: string;
    price: string | number;
    mrp: string | number;
    sale_price: string | number;
    stock_quantity: number;
    low_stock_threshold: number;
    is_active: boolean;
    media_id?: string | null;
    image_path?: string | null;
    image_url?: string | null;
    attributes?: Record<string, string> | null;
    attribute_value_ids?: string[];
}

interface CreateOrEditProps {
    product: (Product & {
        images?: (ProductImage & { media?: { id: string } })[];
        variants?: (ProductVariant & {
            media?: { id: string; url?: string };
            attribute_values?: AttributeValue[];
        })[];
        attributes?: Attribute[];
        attribute_values?: AttributeValue[];
    }) | null;
    brands: { id: string; name: string }[];
    categories: (Category | { id: string; name: string; parent_id?: string | null; parent?: { id: string; name: string } | null })[];
    attributes?: Attribute[];
    statuses: { value: string; label: string }[];
    stockVisibilities: { value: string; label: string }[];
    locationTypes: { value: string; label: string }[];
}

export default function CreateOrEditProductPage({
    product,
    brands,
    categories,
    attributes = [],
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
        location_availability_type: product?.location_availability_type || 'all',
        delivery_radius_km: product?.delivery_radius_km ?? '',
        return_policy: product?.return_policy || '',
        refund_policy: product?.refund_policy || '',
        // Dynamic images array
        images: (product?.images?.length
            ? product.images.map((img) => ({
                  media_id: img.media_id || img.media?.id || null,
                  url: img.url || '',
                  alt_text: img.alt_text || '',
                  is_primary: Boolean(img.is_primary),
              }))
            : []) as ProductImageFormItem[],
        // Dynamic attributes selection
        attribute_ids: (product?.attributes?.map((a) => a.id) || []) as string[],
        attribute_value_ids: (product?.attribute_values?.map((v) => v.id) || []) as string[],
        // Dynamic variants array
        variants: (product?.variants?.length
            ? product.variants.map((v) => ({
                  id: v.id,
                  sku: v.sku,
                  name: v.name,
                  price: v.price,
                  mrp: v.mrp || '',
                  sale_price: v.sale_price || '',
                  stock_quantity: v.stock_quantity,
                  low_stock_threshold: v.low_stock_threshold || 5,
                  is_active: v.is_active,
                  media_id: v.media_id || v.media?.id || null,
                  image_path: v.image_path || '',
                  image_url: v.image_url || v.media?.url || '',
                  attributes: v.attributes || null,
                  attribute_value_ids: v.attribute_values?.map((av) => av.id) || [],
              }))
            : []) as ProductVariantFormItem[],
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
            } catch (err: unknown) {
                const errorMsg = err instanceof Error ? err.message : 'Error uploading one or more images.';
                setUploadError(errorMsg);
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
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Error replacing image.';
            setUploadError(errorMsg);
        } finally {
            setUploadingCount((prev) => Math.max(0, prev - 1));
            setReplacingIndex(null);
        }
    };

    // Attributes & Dynamic Variants Generator State
    const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>(attributes);
    const [variantNotice, setVariantNotice] = useState<string | null>(null);
    const [quickValueModalAttr, setQuickValueModalAttr] = useState<Attribute | null>(null);
    const [quickValueText, setQuickValueText] = useState('');
    const [quickValueColor, setQuickValueColor] = useState('#3b82f6');
    const [quickValueLoading, setQuickValueLoading] = useState(false);
    const [pickingImageVariantIndex, setPickingImageVariantIndex] = useState<number | null>(null);
    const [variantUploading, setVariantUploading] = useState(false);

    const handleVariantDirectUpload = async (file: File) => {
        if (!file || pickingImageVariantIndex === null) return;
        setVariantUploading(true);
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
            if (response.ok) {
                const json = await response.json();
                const media = json.data;
                if (media?.url) {
                    const updated = [...form.data.variants];
                    updated[pickingImageVariantIndex] = {
                        ...updated[pickingImageVariantIndex],
                        media_id: media.id,
                        image_url: media.url,
                    };
                    form.setData('variants', updated);
                    setPickingImageVariantIndex(null);
                }
            }
        } catch (e) {
            console.error('Variant direct upload failed:', e);
        } finally {
            setVariantUploading(false);
        }
    };

    const toggleAttribute = (attrId: string) => {
        const isSelected = form.data.attribute_ids.includes(attrId);
        const nextAttrIds = isSelected
            ? form.data.attribute_ids.filter((id) => id !== attrId)
            : [...form.data.attribute_ids, attrId];

        // If deselecting attribute, remove its values from selectedAttributeValueIds
        const attr = availableAttributes.find((a) => a.id === attrId);
        const attrValIds = attr?.values?.map((v) => v.id) || [];
        const nextValIds = isSelected
            ? form.data.attribute_value_ids.filter((vid) => !attrValIds.includes(vid))
            : form.data.attribute_value_ids;

        form.setData((prev) => ({
            ...prev,
            attribute_ids: nextAttrIds,
            attribute_value_ids: nextValIds,
        }));
    };

    const toggleAttributeValue = (valId: string) => {
        const isSelected = form.data.attribute_value_ids.includes(valId);
        const nextValIds = isSelected
            ? form.data.attribute_value_ids.filter((id) => id !== valId)
            : [...form.data.attribute_value_ids, valId];

        form.setData('attribute_value_ids', nextValIds);
    };

    const selectAllValuesForAttribute = (attr: Attribute) => {
        const valIds = attr.values?.map((v) => v.id) || [];
        const nextValIds = Array.from(new Set([...form.data.attribute_value_ids, ...valIds]));
        form.setData('attribute_value_ids', nextValIds);
    };

    const clearValuesForAttribute = (attr: Attribute) => {
        const valIds = attr.values?.map((v) => v.id) || [];
        const nextValIds = form.data.attribute_value_ids.filter((id) => !valIds.includes(id));
        form.setData('attribute_value_ids', nextValIds);
    };

    const handleQuickAddValueSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickValueModalAttr || !quickValueText.trim()) return;
        setQuickValueLoading(true);
        const token = getCsrfToken();

        try {
            const res = await fetch(`/admin/attributes/${quickValueModalAttr.id}/quick-value`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(token ? { 'X-CSRF-TOKEN': token } : {}),
                },
                body: JSON.stringify({
                    value: quickValueText.trim(),
                    color_code: quickValueModalAttr.type === 'color' ? quickValueColor : null,
                }),
            });

            const json = await res.json();
            if (res.ok && json.success && json.value) {
                const createdVal: AttributeValue = json.value;
                setAvailableAttributes((prev) =>
                    prev.map((a) =>
                        a.id === quickValueModalAttr.id
                            ? { ...a, values: [...(a.values || []), createdVal] }
                            : a
                    )
                );
                // Auto-select newly created value and its attribute
                form.setData((prev) => ({
                    ...prev,
                    attribute_ids: Array.from(new Set([...prev.attribute_ids, quickValueModalAttr.id])),
                    attribute_value_ids: [...prev.attribute_value_ids, createdVal.id],
                }));
                setQuickValueText('');
                setQuickValueModalAttr(null);
            } else {
                alert(json.message || 'Error adding value.');
            }
        } catch {
            alert('Failed to connect to server.');
        } finally {
            setQuickValueLoading(false);
        }
    };

    // Dynamic Variant Combination Generator (Cartesian Product)
    const generateVariantCombinations = () => {
        const activeConfigs = availableAttributes
            .filter((attr) => form.data.attribute_ids.includes(attr.id))
            .map((attr) => {
                const values = (attr.values || []).filter((val) =>
                    form.data.attribute_value_ids.includes(val.id)
                );
                return { attribute: attr, values };
            })
            .filter((cfg) => cfg.values.length > 0);

        if (activeConfigs.length === 0) {
            setVariantNotice('Please select at least one attribute and choose at least one value to generate combinations.');
            return;
        }

        // Cartesian product
        const cartesian = (arrays: { attribute: Attribute; value: AttributeValue }[][]): { attribute: Attribute; value: AttributeValue }[][] => {
            return arrays.reduce<{ attribute: Attribute; value: AttributeValue }[][]>(
                (acc, curr) => acc.flatMap((c) => curr.map((n) => [...c, n])),
                [[]]
            );
        };

        const combinationsMatrix = activeConfigs.map((cfg) =>
            cfg.values.map((val) => ({ attribute: cfg.attribute, value: val }))
        );

        const combinations = cartesian(combinationsMatrix);
        const existingVariants = form.data.variants;
        const newVariants: ProductVariantFormItem[] = [];

        combinations.forEach((combo) => {
            const attrMap: Record<string, string> = {};
            const valIds: string[] = [];
            const valLabels: string[] = [];

            combo.forEach((item) => {
                attrMap[item.attribute.name] = item.value.value;
                valIds.push(item.value.id);
                valLabels.push(item.value.value);
            });

            // Check if existing variant matches
            const matchedExisting = existingVariants.find((ev) => {
                if (ev.attribute_value_ids && ev.attribute_value_ids.length === valIds.length) {
                    return valIds.every((id) => ev.attribute_value_ids!.includes(id));
                }
                if (ev.attributes) {
                    return Object.entries(attrMap).every(([k, v]) => ev.attributes![k] === v);
                }
                return false;
            });

            if (matchedExisting) {
                newVariants.push({
                    ...matchedExisting,
                    attribute_value_ids: valIds,
                    attributes: attrMap,
                });
            } else {
                const slugPart = valLabels
                    .map((l) => l.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase())
                    .join('-');
                const sku = form.data.sku ? `${form.data.sku}-${slugPart}` : `VAR-${slugPart}`;
                const name = `${form.data.name || 'Variant'} - ${valLabels.join(' / ')}`;

                newVariants.push({
                    sku,
                    name,
                    price: form.data.retail_price || 0,
                    mrp: form.data.mrp || '',
                    sale_price: form.data.sale_price || '',
                    stock_quantity: 10,
                    low_stock_threshold: 5,
                    is_active: true,
                    media_id: null,
                    image_path: '',
                    image_url: '',
                    attributes: attrMap,
                    attribute_value_ids: valIds,
                });
            }
        });

        form.setData('variants', newVariants);
        setVariantNotice(`Successfully generated ${newVariants.length} variant combinations.`);
    };

    const addVariant = () => {
        const skuPrefix = form.data.sku ? `${form.data.sku}-VAR${form.data.variants.length + 1}` : `VAR-${Date.now().toString().slice(-4)}`;
        form.setData('variants', [
            ...form.data.variants,
            {
                sku: skuPrefix,
                name: `Custom Variant #${form.data.variants.length + 1}`,
                price: form.data.retail_price || 0,
                mrp: form.data.mrp || '',
                sale_price: form.data.sale_price || '',
                stock_quantity: 10,
                low_stock_threshold: 5,
                is_active: true,
                media_id: null,
                image_path: '',
                image_url: '',
                attributes: {},
                attribute_value_ids: [],
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

    const handleMrpChange = (val: number) => {
        form.setData((prev) => {
            const retail = Number(prev.retail_price);
            let discount = prev.discount_percentage;
            if (val > 0 && retail > 0 && val > retail) {
                discount = Number((((val - retail) / val) * 100).toFixed(2));
            }
            return { ...prev, mrp: val, discount_percentage: discount };
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

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Calculated financial metrics
    const savingsAmount =
        Number(form.data.mrp) > Number(form.data.retail_price)
            ? Number(form.data.mrp) - Number(form.data.retail_price)
            : 0;

    return (
        <AdminLayout
            title={isEdit ? `Edit Product: ${product?.name}` : 'Create New Product'}
            breadcrumbs={[
                { label: 'Catalog', href: '/admin/products' },
                { label: 'Products', href: '/admin/products' },
                { label: isEdit ? 'Edit' : 'Create' },
            ]}
        >
            <Head title={isEdit ? `Edit ${product?.name}` : 'Create Product - Catalog Admin'} />

            <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl pb-20">
                {/* Sticky Action Navigation Header */}
                <div className="sticky top-16 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/products">
                            <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                title="Back to products list"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white line-clamp-1">
                                    {isEdit ? product?.name : 'Create New Product'}
                                </h1>
                                <Badge variant={form.data.status === 'active' ? 'success' : 'neutral'}>
                                    {form.data.status}
                                </Badge>
                            </div>
                            <span className="text-[11px] text-slate-500">
                                {isEdit ? `SKU: ${form.data.sku}` : 'Fill product details and upload gallery'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                        <Link href="/admin/products">
                            <Button variant="secondary" size="sm" pill type="button" className="rounded-full px-4 py-1.5 font-medium">
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            variant="primary"
                            size="sm"
                            pill
                            type="submit"
                            isLoading={form.processing}
                            leftIcon={<Save className="w-4 h-4" />}
                            className="shadow-md shadow-indigo-600/20 font-medium px-5 py-2 rounded-full whitespace-nowrap"
                        >
                            <span>{isEdit ? 'Save Changes' : 'Publish Product'}</span>
                        </Button>
                    </div>
                </div>

                {/* Quick Section Jump Navigator */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                    <button
                        type="button"
                        onClick={() => scrollToSection('sec-general')}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-400 transition-colors shrink-0"
                    >
                        General Info
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollToSection('sec-pricing')}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-400 transition-colors shrink-0"
                    >
                        Pricing &amp; Economics
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollToSection('sec-gallery')}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-400 transition-colors shrink-0"
                    >
                        Image Gallery ({form.data.images.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollToSection('sec-specs')}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-400 transition-colors shrink-0"
                    >
                        Technical Specs
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollToSection('sec-variants')}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-400 transition-colors shrink-0"
                    >
                        Variants ({form.data.variants.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollToSection('sec-policies')}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-400 transition-colors shrink-0"
                    >
                        Policies
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Left 2-Columns */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 1. General Product Information */}
                        <div
                            id="sec-general"
                            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
                        >
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Tag className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                        General Information
                                    </h3>
                                    <span className="text-[11px] text-slate-400">
                                        Core title, custom slug, and storefront descriptions
                                    </span>
                                </div>
                            </div>

                            <Input
                                label="Product Title / Merchandising Name"
                                required
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                error={form.errors.name}
                                placeholder="e.g. Sony WH-1000XM5 Wireless Noise-Cancelling Headphones"
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

                                <SlugInput
                                    label="Custom Slug (URL)"
                                    value={form.data.slug}
                                    onChange={(slug) => form.setData('slug', slug)}
                                    sourceValue={form.data.name}
                                    autoSync={!isEdit}
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
                                    className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Brief punchy summary displayed in storefront product cards..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Full Product Overview
                                </label>
                                <textarea
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                    rows={5}
                                    className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Detailed marketing copy, feature breakdown, and what's in the box..."
                                />
                            </div>
                        </div>

                        {/* 2. Pricing & Commercials */}
                        <div
                            id="sec-pricing"
                            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <DollarSign className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                            Pricing &amp; Economics
                                        </h3>
                                        <span className="text-[11px] text-slate-400">
                                            Storefront retail price, wholesale MRP, and automated discount %
                                        </span>
                                    </div>
                                </div>

                                {savingsAmount > 0 && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>
                                            Customer Saves {currency}
                                            {savingsAmount.toFixed(2)} ({form.data.discount_percentage}%)
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Input
                                    label={`MRP (${currency})`}
                                    required
                                    type="number"
                                    step="0.01"
                                    value={String(form.data.mrp)}
                                    onChange={(e) => handleMrpChange(Number(e.target.value))}
                                    error={form.errors.mrp}
                                    placeholder="0.00"
                                    helperText="Original list price / MRP"
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
                                    helperText="Active selling price"
                                />

                                <Input
                                    label={`Sale Price (${currency})`}
                                    type="number"
                                    step="0.01"
                                    value={String(form.data.sale_price)}
                                    onChange={(e) => form.setData('sale_price', e.target.value ? Number(e.target.value) : '')}
                                    error={form.errors.sale_price}
                                    placeholder="Optional promo price"
                                    helperText="Flash promo or special rate"
                                />

                                <Input
                                    label="Discount %"
                                    type="number"
                                    step="0.1"
                                    value={String(form.data.discount_percentage)}
                                    onChange={(e) => form.setData('discount_percentage', e.target.value ? Number(e.target.value) : '')}
                                    error={form.errors.discount_percentage}
                                    placeholder="Auto-calculated"
                                    helperText="Badge shown on card"
                                />
                            </div>
                        </div>

                        {/* 3. Product Gallery Images */}
                        <div
                            id="sec-gallery"
                            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <ImageIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                                Product Gallery Images
                                            </h3>
                                            {uploadingCount > 0 && (
                                                <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    Uploading {uploadingCount}...
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-slate-400">
                                            Primary image is used as catalog cover; secondary photos appear in product detail slider.
                                        </span>
                                    </div>
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
                                        pill
                                        leftIcon={<Upload className="w-3.5 h-3.5" />}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="shadow-md shadow-indigo-600/20 font-medium px-4 py-1.5 rounded-full whitespace-nowrap text-xs"
                                        disabled={uploadingCount > 0}
                                    >
                                        Upload Photos
                                    </Button>
                                </div>
                            </div>

                            {uploadError && (
                                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
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
                                className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
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
                                            <span className="text-indigo-600 dark:text-indigo-400 underline font-bold">
                                                browse files
                                            </span>
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
                                                        className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
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

                        {/* 4. Specifications */}
                        <div
                            id="sec-specs"
                            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                            Technical Specifications
                                        </h3>
                                        <span className="text-[11px] text-slate-400">
                                            Granular parameters like Battery Life, Material, Connectivity, Dimensions
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    pill
                                    leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                                    onClick={addSpec}
                                    className="shadow-md shadow-indigo-600/20 font-medium px-4.5 py-1.5 rounded-full whitespace-nowrap text-xs"
                                >
                                    Add Spec
                                </Button>
                            </div>

                            <div className="space-y-2.5">
                                {specEntries.map((spec, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={spec.key}
                                            onChange={(e) => updateSpec(idx, 'key', e.target.value)}
                                            placeholder="Spec Label (e.g. Battery Life)"
                                            className="w-1/3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                        <input
                                            type="text"
                                            value={spec.value}
                                            onChange={(e) => updateSpec(idx, 'value', e.target.value)}
                                            placeholder="Specification Value (e.g. Up to 30 Hours with ANC)"
                                            className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSpec(idx)}
                                            className="p-1.5 text-rose-500 hover:text-rose-700 shrink-0 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 5. Product Variants */}
                        <div
                            id="sec-variants"
                            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-100 dark:border-orange-800 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                        <Layers className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                            Product Variants &amp; Attributes
                                        </h3>
                                        <span className="text-[11px] text-slate-400">
                                            Create dynamic variant combinations with custom SKU, price, stock, and photos
                                        </span>
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={form.data.has_variants}
                                        onChange={(e) => form.setData('has_variants', e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                    />
                                    <span>Enable Variants</span>
                                </label>
                            </div>

                            {form.data.has_variants && (
                                <div className="space-y-6">
                                    {/* 5.1 Reusable Global & Custom Attributes Selection */}
                                    <div className="p-4 sm:p-5 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                                                    Step 1: Choose Product Attributes
                                                </h4>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    Select the dimensions that define this product's variations (e.g. Color, Size, Storage)
                                                </p>
                                            </div>
                                            <Link
                                                href="/admin/attributes"
                                                target="_blank"
                                                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
                                            >
                                                Manage Attributes &rarr;
                                            </Link>
                                        </div>

                                        {availableAttributes.length === 0 ? (
                                            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                                                No global attributes defined yet.{' '}
                                                <Link href="/admin/attributes" className="text-indigo-600 dark:text-indigo-400 underline font-medium">
                                                    Create your first attribute here
                                                </Link>
                                                .
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {availableAttributes.map((attr) => {
                                                    const isSelected = form.data.attribute_ids.includes(attr.id);
                                                    return (
                                                        <button
                                                            key={attr.id}
                                                            type="button"
                                                            onClick={() => toggleAttribute(attr.id)}
                                                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                                                                isSelected
                                                                    ? 'bg-indigo-600 text-white shadow-indigo-500/25 ring-2 ring-indigo-600'
                                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                                            }`}
                                                        >
                                                            {isSelected ? (
                                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                            ) : (
                                                                <Plus className="w-3.5 h-3.5 text-slate-400" />
                                                            )}
                                                            <span>{attr.name}</span>
                                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                                                isSelected
                                                                    ? 'bg-indigo-700/80 text-indigo-100'
                                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                                            }`}>
                                                                {attr.values?.length || 0}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* 5.2 Attribute Values Selection per chosen attribute */}
                                    {form.data.attribute_ids.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                                                Step 2: Choose Values for Each Attribute
                                            </div>

                                            {form.data.attribute_ids.map((attrId) => {
                                                const attr = availableAttributes.find((a) => a.id === attrId);
                                                if (!attr) return null;
                                                const selectedValues = (attr.values || []).filter((v) =>
                                                    form.data.attribute_value_ids.includes(v.id)
                                                );

                                                return (
                                                    <div
                                                        key={attr.id}
                                                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3"
                                                    >
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                                    {attr.name}
                                                                </span>
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                                                                    {attr.type}
                                                                </span>
                                                                <span className="text-[11px] text-slate-400">
                                                                    ({selectedValues.length} selected)
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => selectAllValuesForAttribute(attr)}
                                                                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                                                >
                                                                    Select All
                                                                </button>
                                                                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => clearValuesForAttribute(attr)}
                                                                    className="text-[11px] font-medium text-slate-500 hover:underline"
                                                                >
                                                                    Clear
                                                                </button>
                                                                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setQuickValueModalAttr(attr);
                                                                        setQuickValueText('');
                                                                    }}
                                                                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                    Add Value
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Values Pills */}
                                                        <div className="flex flex-wrap gap-2 pt-1">
                                                            {(attr.values || []).map((val) => {
                                                                const isValSelected = form.data.attribute_value_ids.includes(val.id);
                                                                return (
                                                                    <button
                                                                        key={val.id}
                                                                        type="button"
                                                                        onClick={() => toggleAttributeValue(val.id)}
                                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                                                            isValSelected
                                                                                ? 'bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-500'
                                                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                                        }`}
                                                                    >
                                                                        {attr.type === 'color' && (
                                                                            <span
                                                                                className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-2xs"
                                                                                style={{ backgroundColor: val.color_code || '#cbd5e1' }}
                                                                            />
                                                                        )}
                                                                        <span>{val.value}</span>
                                                                        {isValSelected && (
                                                                            <Check className="w-3 h-3 stroke-[3]" />
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* 5.3 Generate Combinations Action Bar */}
                                    <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-pink-50/80 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="space-y-0.5">
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                                Generate Variant Combinations
                                            </h4>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                Automatically creates Cartesian combinations of all selected attribute values with SKUs and default pricing.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                pill
                                                leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                onClick={addVariant}
                                                className="text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap"
                                            >
                                                Add Custom
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="primary"
                                                size="sm"
                                                pill
                                                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                                                onClick={generateVariantCombinations}
                                                className="shadow-md shadow-indigo-600/25 font-semibold px-4.5 py-1.5 rounded-full whitespace-nowrap text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                            >
                                                ⚡ Generate Combinations
                                            </Button>
                                        </div>
                                    </div>

                                    {variantNotice && (
                                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                <span>{variantNotice}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setVariantNotice(null)}
                                                className="text-amber-700 dark:text-amber-400 hover:opacity-80 text-xs font-bold"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    )}

                                    {/* 5.4 Variants Matrix List */}
                                    {form.data.variants.length > 0 && (
                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-center justify-between pb-1">
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    Configured Variants ({form.data.variants.length})
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    Total Variant Stock:{' '}
                                                    <strong className="text-slate-900 dark:text-white">
                                                        {form.data.variants.reduce((acc, v) => acc + (Number(v.stock_quantity) || 0), 0)} units
                                                    </strong>
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                {form.data.variants.map((v, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-4 rounded-2xl border transition-all ${
                                                            v.is_active
                                                                ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                                                                : 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 opacity-70'
                                                        }`}
                                                    >
                                                        {/* Top Row: Variant Header & Actions */}
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                    #{idx + 1}
                                                                </span>

                                                                {/* Attribute Badges */}
                                                                {v.attributes && Object.keys(v.attributes).length > 0 ? (
                                                                    Object.entries(v.attributes).map(([attrName, attrVal]) => (
                                                                        <span
                                                                            key={attrName}
                                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                                                                        >
                                                                            <span>{attrName}:</span>
                                                                            <strong>{attrVal}</strong>
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-400 italic">
                                                                        (Custom variant)
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                {/* Status toggle */}
                                                                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={v.is_active}
                                                                        onChange={(e) => {
                                                                            const updated = [...form.data.variants];
                                                                            updated[idx].is_active = e.target.checked;
                                                                            form.setData('variants', updated);
                                                                        }}
                                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                                                    />
                                                                    <span className="text-[11px] font-medium">
                                                                        {v.is_active ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                </label>

                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeVariant(idx)}
                                                                    className="p-1 text-rose-500 hover:text-rose-700 rounded-lg"
                                                                    title="Remove Variant"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Main Inputs Row with Variant Image */}
                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 items-center">
                                                            {/* Variant Image Selector (2 cols) */}
                                                            <div className="md:col-span-2 flex flex-col items-center justify-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPickingImageVariantIndex(idx)}
                                                                    className="group relative w-16 h-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden flex flex-col items-center justify-center hover:border-indigo-500 transition-all shadow-2xs"
                                                                    title="Click to choose or upload a variant-specific photo"
                                                                >
                                                                    {v.image_url ? (
                                                                        <>
                                                                            <img
                                                                                src={v.image_url}
                                                                                alt={v.name}
                                                                                className="w-full h-full object-contain p-1"
                                                                            />
                                                                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-medium transition-opacity">
                                                                                Change
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                                            <span className="text-[9px] text-slate-400 mt-0.5">
                                                                                + Photo
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                                <span className="text-[10px] text-slate-400 mt-1">
                                                                    {v.image_url ? 'Photo set' : 'Default photo'}
                                                                </span>
                                                            </div>

                                                            {/* Name & SKU (5 cols) */}
                                                            <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                <Input
                                                                    label="Variant Title"
                                                                    required
                                                                    value={v.name}
                                                                    onChange={(e) => {
                                                                        const updated = [...form.data.variants];
                                                                        updated[idx].name = e.target.value;
                                                                        form.setData('variants', updated);
                                                                    }}
                                                                    placeholder="Variant title"
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
                                                            </div>

                                                            {/* Price & Stock Fields (5 cols) */}
                                                            <div className="md:col-span-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                                                                    label={`MRP (${currency})`}
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={String(v.mrp || '')}
                                                                    onChange={(e) => {
                                                                        const updated = [...form.data.variants];
                                                                        updated[idx].mrp = e.target.value ? Number(e.target.value) : '';
                                                                        form.setData('variants', updated);
                                                                    }}
                                                                />
                                                                <Input
                                                                    label="Stock"
                                                                    required
                                                                    type="number"
                                                                    value={String(v.stock_quantity)}
                                                                    onChange={(e) => {
                                                                        const updated = [...form.data.variants];
                                                                        updated[idx].stock_quantity = Number(e.target.value);
                                                                        form.setData('variants', updated);
                                                                    }}
                                                                />
                                                                <Input
                                                                    label="Min Stock"
                                                                    type="number"
                                                                    value={String(v.low_stock_threshold || 5)}
                                                                    onChange={(e) => {
                                                                        const updated = [...form.data.variants];
                                                                        updated[idx].low_stock_threshold = Number(e.target.value);
                                                                        form.setData('variants', updated);
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 6. Return & Refund Policies */}
                        <div
                            id="sec-policies"
                            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
                        >
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
                                    <ShieldAlert className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                        Return &amp; Refund Policies
                                    </h3>
                                    <span className="text-[11px] text-slate-400">
                                        Storefront customer assurance notices and replacement guidelines
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Return Policy Terms
                                    </label>
                                    <textarea
                                        value={form.data.return_policy}
                                        onChange={(e) => form.setData('return_policy', e.target.value)}
                                        rows={3}
                                        className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Refund Policy Terms
                                    </label>
                                    <textarea
                                        value={form.data.refund_policy}
                                        onChange={(e) => form.setData('refund_policy', e.target.value)}
                                        rows={3}
                                        className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sidebar Panels */}
                    <div className="space-y-6">
                        {/* Status & Visibility Card */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                                Publishing &amp; Visibility
                            </h3>

                            <Select
                                label="Storefront Status"
                                value={form.data.status}
                                onChange={(e) => form.setData('status', e.target.value)}
                                options={statuses}
                                error={form.errors.status}
                            />
                        </div>

                        {/* Taxonomy: Brand & Category */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                                Taxonomy &amp; Grouping
                            </h3>

                            <Select
                                label="Product Category"
                                value={form.data.category_id}
                                onChange={(e) => form.setData('category_id', e.target.value)}
                                options={[
                                    { value: '', label: 'Select Category' },
                                    ...categories.map((c) => ({
                                        value: String(c.id),
                                        label: c.parent ? `${c.parent.name} › ${c.name}` : (c.parent_id ? `— ${c.name}` : c.name),
                                    })),
                                ]}
                                error={form.errors.category_id}
                                clearable
                                searchable={categories.length > 5}
                            />

                            <Select
                                label="Brand / Manufacturer"
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
                                clearable
                                searchable={brands.length > 5}
                            />
                        </div>

                        {/* Inventory & Thresholds */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                                <Boxes className="w-4 h-4 text-amber-500" />
                                <span>Stock &amp; Availability</span>
                            </div>

                            <Input
                                label="Total Stock Quantity (Units)"
                                required
                                type="number"
                                min="0"
                                value={String(form.data.stock_quantity)}
                                onChange={(e) => form.setData('stock_quantity', Number(e.target.value))}
                                error={form.errors.stock_quantity}
                            />

                            <Input
                                label="Low Stock Warning Threshold"
                                required
                                type="number"
                                min="1"
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

                        {/* Geolocation Availability */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                                <MapPin className="w-4 h-4 text-rose-500" />
                                <span>Geographic Availability</span>
                            </div>

                            <Select
                                label="Delivery Scope"
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
                                    placeholder="e.g. 25 km from store location"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </form>

            {/* Quick Add Value Modal */}
            {quickValueModalAttr && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Tag className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                    Add Value to &ldquo;{quickValueModalAttr.name}&rdquo;
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQuickValueModalAttr(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleQuickAddValueSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Value Label / Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={quickValueText}
                                    onChange={(e) => setQuickValueText(e.target.value)}
                                    placeholder={quickValueModalAttr.type === 'color' ? 'e.g. Midnight Blue' : 'e.g. 512GB or XXL'}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>

                            {quickValueModalAttr.type === 'color' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Color Hex Code
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={quickValueColor}
                                            onChange={(e) => setQuickValueColor(e.target.value)}
                                            className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={quickValueColor}
                                            onChange={(e) => setQuickValueColor(e.target.value)}
                                            className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white font-mono"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setQuickValueModalAttr(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    disabled={quickValueLoading || !quickValueText.trim()}
                                    className="shadow-md shadow-indigo-600/20 font-medium px-4 py-2"
                                >
                                    {quickValueLoading ? 'Saving...' : 'Add & Select'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Variant Image Picker Modal */}
            {pickingImageVariantIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-100 dark:border-orange-800 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                    <ImageIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                        Choose Variant Image
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        {form.data.variants[pickingImageVariantIndex]?.name || 'Variant'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPickingImageVariantIndex(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Pick from existing gallery photos */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Select from Product Gallery
                            </label>
                            {form.data.images.filter((img) => img.url).length === 0 ? (
                                <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
                                    No product gallery photos uploaded yet. Upload one below.
                                </p>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-48 overflow-y-auto p-1">
                                    {form.data.images
                                        .filter((img) => img.url)
                                        .map((img, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => {
                                                    const updated = [...form.data.variants];
                                                    updated[pickingImageVariantIndex] = {
                                                        ...updated[pickingImageVariantIndex],
                                                        media_id: img.media_id,
                                                        image_url: img.url,
                                                    };
                                                    form.setData('variants', updated);
                                                    setPickingImageVariantIndex(null);
                                                }}
                                                className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all p-1 bg-white dark:bg-slate-800 flex items-center justify-center ${
                                                    form.data.variants[pickingImageVariantIndex]?.image_url === img.url
                                                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                                }`}
                                            >
                                                <img
                                                    src={img.url}
                                                    alt={img.alt_text || 'Option'}
                                                    className="w-full h-full object-contain"
                                                />
                                                {form.data.variants[pickingImageVariantIndex]?.image_url === img.url && (
                                                    <div className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-xs">
                                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* Direct upload for this variant */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Or Upload Variant-Specific Photo
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                disabled={variantUploading}
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleVariantDirectUpload(e.target.files[0]);
                                    }
                                }}
                                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950/60 dark:file:text-indigo-400 hover:file:bg-indigo-100 cursor-pointer"
                            />
                            {variantUploading && (
                                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading image...
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                            {form.data.variants[pickingImageVariantIndex]?.image_url ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const updated = [...form.data.variants];
                                        updated[pickingImageVariantIndex] = {
                                            ...updated[pickingImageVariantIndex],
                                            media_id: null,
                                            image_url: null,
                                        };
                                        form.setData('variants', updated);
                                        setPickingImageVariantIndex(null);
                                    }}
                                    className="text-xs text-rose-600 hover:underline font-medium"
                                >
                                    Reset to Default Photo
                                </button>
                            ) : <span />}

                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setPickingImageVariantIndex(null)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

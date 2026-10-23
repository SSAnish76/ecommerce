import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { Collection, Product, Brand, Category } from '../../../types';
import {
    Button,
    Input,
    Select,
    Toggle,
    ImagePicker,
    SlugInput,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
    MultiSelect,
} from '../../../Components/UI';
import { ArrowLeft } from 'lucide-react';

type CollectionType = 'product' | 'brand' | 'category';

interface Options {
    products: (Product & { sale_price?: string | number; retail_price?: string | number })[];
    brands: (Brand & { logo_id?: string })[];
    categories: Category[];
    types: { value: string; label: string }[];
}

interface CreateOrEditProps {
    collection: (Collection & {
        products?: Product[];
        brands?: Brand[];
        categories?: Category[];
    }) | null;
    options: Options;
}

export default function CollectionCreateOrEdit({ collection, options }: CreateOrEditProps) {
    const isEdit = Boolean(collection?.id);

    const { data, setData, post, put, processing, errors } = useForm<{
        name: string;
        slug: string;
        type: CollectionType;
        description: string;
        image_id: string | null;
        image_url: string;
        is_active: boolean;
        product_ids: string[];
        brand_ids: string[];
        category_ids: string[];
    }>({
        name: collection?.name || '',
        slug: collection?.slug || '',
        type: (collection?.type as CollectionType) || 'product',
        description: collection?.description || '',
        image_id: collection?.image_id || null,
        image_url: collection?.image_url || '',
        is_active: collection?.is_active ?? true,
        product_ids: collection?.products ? collection.products.map((p) => p.id) : [],
        brand_ids: collection?.brands ? collection.brands.map((b) => b.id) : [],
        category_ids: collection?.categories ? collection.categories.map((c) => c.id) : [],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && collection) {
            put(`/admin/collections/${collection.id}`);
        } else {
            post('/admin/collections');
        }
    };

    const pageTitle = isEdit ? `Edit Collection: ${collection?.name}` : 'Create Collection';

    const productOptions = options.products.map((p) => ({
        value: p.id,
        label: p.name,
        description: `${p.sku ? `[${p.sku}] ` : ''}$${parseFloat(String(p.sale_price || p.retail_price || 0)).toFixed(2)}`,
    }));

    const brandOptions = options.brands.map((b) => ({
        value: b.id,
        label: b.name,
    }));

    const categoryOptions = options.categories.map((c) => ({
        value: c.id,
        label: c.name,
    }));

    return (
        <AdminLayout title={pageTitle}>
            <Head title={pageTitle} />

            <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/collections"
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                            aria-label="Back to collections"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {pageTitle}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link href="/admin/collections">
                            <Button type="button" variant="secondary" size="md">
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            isLoading={processing}
                        >
                            {isEdit ? 'Update Collection' : 'Save Collection'}
                        </Button>
                    </div>
                </div>

                {/* Collection Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Collection Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Collection Name"
                                required
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                placeholder="e.g. Summer Essentials"
                            />
                            <SlugInput
                                label="URL Slug"
                                value={data.slug}
                                onChange={(slug) => setData('slug', slug)}
                                sourceValue={data.name}
                                autoSync={!isEdit}
                                error={errors.slug}
                                placeholder="auto-generated"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Description
                            </label>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Optional description..."
                                rows={2}
                                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Cover Image
                                </label>
                                <ImagePicker
                                    value={data.image_url}
                                    mediaId={data.image_id}
                                    collection="collections"
                                    onChange={({ id, url }) => {
                                        setData('image_id', id);
                                        setData('image_url', url);
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    Active Status
                                </span>
                                <Toggle
                                    checked={data.is_active}
                                    onChange={(val) => setData('is_active', val)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Items & Type Selection Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Collection Items</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select
                            label="Collection Type"
                            required
                            value={data.type}
                            onChange={(e) => setData('type', e.target.value as CollectionType)}
                            options={[
                                { value: 'product', label: 'Product Collection' },
                                { value: 'brand', label: 'Brand Showcase' },
                                { value: 'category', label: 'Category Group' },
                            ]}
                        />

                        {data.type === 'product' && (
                            <MultiSelect
                                label="Select Products"
                                placeholder="Choose products..."
                                searchPlaceholder="Search products by name or SKU..."
                                options={productOptions}
                                value={data.product_ids}
                                onChange={(vals) => setData('product_ids', vals)}
                            />
                        )}

                        {data.type === 'brand' && (
                            <MultiSelect
                                label="Select Brands"
                                placeholder="Choose brands..."
                                searchPlaceholder="Search brands..."
                                options={brandOptions}
                                value={data.brand_ids}
                                onChange={(vals) => setData('brand_ids', vals)}
                            />
                        )}

                        {data.type === 'category' && (
                            <MultiSelect
                                label="Select Categories"
                                placeholder="Choose categories..."
                                searchPlaceholder="Search categories..."
                                options={categoryOptions}
                                value={data.category_ids}
                                onChange={(vals) => setData('category_ids', vals)}
                            />
                        )}
                    </CardContent>

                    <CardFooter className="flex justify-end gap-2.5">
                        <Link href="/admin/collections">
                            <Button type="button" variant="secondary" size="md">
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            isLoading={processing}
                        >
                            {isEdit ? 'Update Collection' : 'Save Collection'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </AdminLayout>
    );
}

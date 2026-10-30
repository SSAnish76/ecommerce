import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import ShopLayout, { useShop } from '../../Layouts/ShopLayout';
import { PageProps } from '../../types';
import {
    ShoppingBag,
    ShoppingCart,
    Heart,
    Search,
    Star,
    Sparkles,
    ArrowUpDown,
    Check,
    Eye,
    ChevronLeft,
    ChevronRight,
    Package,
    Tag,
    X,
    Plus,
    Minus,
} from 'lucide-react';

interface CategoryItem {
    id: string;
    name: string;
    slug: string;
    products_count?: number;
    children?: CategoryItem[];
}

interface BrandItem {
    id: string;
    name: string;
    slug: string;
    products_count?: number;
}

interface ProductItem {
    id: string;
    name: string;
    slug: string;
    sku: string;
    short_description?: string | null;
    description?: string | null;
    specifications?: Record<string, string> | null;
    mrp?: number | string | null;
    retail_price?: number | string | null;
    sale_price?: number | string | null;
    discount_label?: string | null;
    stock_quantity?: number | null;
    has_variants?: boolean;
    primary_image?: {
        media?: {
            url?: string;
        };
        url?: string;
    } | null;
    images?: Array<{
        media?: {
            url?: string;
        };
        url?: string;
    }>;
    brand?: BrandItem | null;
    category?: CategoryItem | null;
    variants?: Array<{
        id: string;
        name: string;
        sku: string;
        price: number;
        sale_price?: number | null;
        stock_quantity: number;
        is_active: boolean;
        attributes?: Record<string, string> | null;
    }>;
}

interface PaginatedProducts {
    data?: ProductItem[];
    current_page?: number;
    last_page?: number;
    total?: number;
    per_page?: number;
    prev_page_url?: string | null;
    next_page_url?: string | null;
    links?: Array<{
        url?: string | null;
        label: string;
        active: boolean;
    }>;
}

interface ShopIndexProps {
    products?: PaginatedProducts | ProductItem[];
    categories?: CategoryItem[];
    brands?: BrandItem[];
    featuredProducts?: ProductItem[];
    filters?: Record<string, string> | any[];
}

export default function ShopIndex(props: ShopIndexProps) {
    return (
        <ShopLayout>
            <ShopCatalogContent {...props} />
        </ShopLayout>
    );
}

function ShopCatalogContent({
    products: initialProducts,
    categories: initialCategories = [],
    brands: initialBrands = [],
    filters = {},
}: ShopIndexProps) {
    const { store } = usePage<PageProps>().props;
    const currency = store?.currency || '$';
    const { addToCart, toggleWishlist, isInWishlist } = useShop();

    // Safely normalize filters
    const safeFilters: Record<string, string> =
        filters && typeof filters === 'object' && !Array.isArray(filters) ? filters : {};

    // Dynamic state powered by User APIs
    const [productList, setProductList] = useState<ProductItem[]>(() => {
        return Array.isArray(initialProducts)
            ? initialProducts
            : Array.isArray(initialProducts?.data)
            ? initialProducts.data
            : [];
    });
    const [categories, setCategories] = useState<CategoryItem[]>(initialCategories || []);
    const [brands, setBrands] = useState<BrandItem[]>(initialBrands || []);
    const [pagination, setPagination] = useState({
        total: !Array.isArray(initialProducts) && typeof initialProducts?.total === 'number' ? initialProducts.total : 0,
        current_page: !Array.isArray(initialProducts) && typeof initialProducts?.current_page === 'number' ? initialProducts.current_page : 1,
        last_page: !Array.isArray(initialProducts) && typeof initialProducts?.last_page === 'number' ? initialProducts.last_page : 1,
        per_page: !Array.isArray(initialProducts) && typeof initialProducts?.per_page === 'number' ? initialProducts.per_page : 12,
    });

    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(safeFilters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(safeFilters.category || '');
    const [selectedBrand, setSelectedBrand] = useState(safeFilters.brand || '');
    const [selectedSort, setSelectedSort] = useState(safeFilters.sort || 'latest');

    // Quick View state
    const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);
    const [quickViewQty, setQuickViewQty] = useState(1);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const [loadingQuickView, setLoadingQuickView] = useState(false);

    // Fetch categories from User API on mount if not provided
    useEffect(() => {
        if (categories.length === 0) {
            fetch('/api/user/categories', { headers: { Accept: 'application/json' } })
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                    if (data?.data) {
                        setCategories(data.data);
                    }
                })
                .catch(console.error);
        }
    }, []);

    // Core function: fetch products dynamically from User Product API (/api/user/products)
    const fetchUserProducts = async (params: {
        search?: string;
        category?: string;
        brand?: string;
        sort?: string;
        page?: number;
    }) => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            const s = params.search !== undefined ? params.search : searchTerm;
            const c = params.category !== undefined ? params.category : selectedCategory;
            const b = params.brand !== undefined ? params.brand : selectedBrand;
            const so = params.sort !== undefined ? params.sort : selectedSort;
            const p = params.page || 1;

            if (s.trim()) query.set('q', s.trim());
            if (c) query.set('category', c);
            if (b) query.set('brand', b);
            if (so && so !== 'latest') query.set('sort', so);
            if (p > 1) query.set('page', String(p));
            query.set('per_page', '12');

            const token = typeof window !== 'undefined' ? localStorage.getItem('customer_token') : null;
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`/api/user/products?${query.toString()}`, { headers });
            if (res.ok) {
                const json = await res.json();
                setProductList(json.data || []);
                if (json.pagination) {
                    setPagination({
                        total: json.pagination.total ?? 0,
                        current_page: json.pagination.current_page ?? 1,
                        last_page: json.pagination.last_page ?? 1,
                        per_page: json.pagination.per_page ?? 12,
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching products from User API:', err);
        } finally {
            setLoading(false);
        }
    };

    // Initial load from User API if no productList populated
    useEffect(() => {
        if (productList.length === 0) {
            fetchUserProducts({ page: 1 });
        }
    }, []);

    const handleCategorySelect = (catSlug: string) => {
        const next = selectedCategory === catSlug ? '' : catSlug;
        setSelectedCategory(next);
        fetchUserProducts({ category: next, page: 1 });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchUserProducts({ search: searchTerm, page: 1 });
    };

    const handleSortChange = (newSort: string) => {
        setSelectedSort(newSort);
        fetchUserProducts({ sort: newSort, page: 1 });
    };

    const handleBrandChange = (newBrand: string) => {
        setSelectedBrand(newBrand);
        fetchUserProducts({ brand: newBrand, page: 1 });
    };

    const handlePageChange = (newPage: number) => {
        fetchUserProducts({ page: newPage });
        const catalogEl = document.getElementById('catalog');
        if (catalogEl) {
            catalogEl.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
        setSelectedBrand('');
        setSelectedSort('latest');
        fetchUserProducts({ search: '', category: '', brand: '', sort: 'latest', page: 1 });
    };

    const hasActiveFilters = Boolean(
        searchTerm || selectedCategory || selectedBrand || (selectedSort && selectedSort !== 'latest')
    );

    // Fetch full product detail from User API: /api/user/products/{slugOrId}
    const openQuickView = async (product: ProductItem) => {
        setQuickViewProduct(product);
        setQuickViewQty(1);
        if (product.has_variants && product.variants && product.variants.length > 0) {
            setSelectedVariantId(product.variants[0].id);
        } else {
            setSelectedVariantId(null);
        }

        setLoadingQuickView(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('customer_token') : null;
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`/api/user/products/${product.slug || product.id}`, { headers });
            if (res.ok) {
                const json = await res.json();
                if (json.data) {
                    setQuickViewProduct(json.data);
                    if (json.data.has_variants && json.data.variants && json.data.variants.length > 0) {
                        setSelectedVariantId(json.data.variants[0].id);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching quick view from User API:', err);
        } finally {
            setLoadingQuickView(false);
        }
    };

    return (
        <>
            <Head title="Storefront Catalog | Products & Deals" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
                {/* HERO PROMOTIONAL BANNER */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 text-white shadow-xl">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
                    <div className="relative p-8 sm:p-12 lg:p-16 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-semibold uppercase tracking-wider mb-4">
                            <Sparkles className="w-3.5 h-3.5" />
                            Premium Storefront Catalog
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                            Quality essentials for your lifestyle.
                        </h1>
                        <p className="mt-4 text-sm sm:text-base text-indigo-100 max-w-lg leading-relaxed">
                            Discover our curated collection of smartphones, computers, audio equipment, and daily essentials with fast doorstep delivery.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <a
                                href="#catalog"
                                className="px-6 py-3.5 rounded-2xl bg-white text-indigo-950 font-bold text-xs sm:text-sm hover:bg-indigo-50 transition-all shadow-lg shadow-black/10 flex items-center gap-2"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                <span>Browse Catalog</span>
                            </a>
                            <div className="text-xs text-indigo-200 font-medium">
                                Showing <strong>{pagination.total || productList.length}</strong> products available
                            </div>
                        </div>
                    </div>
                </div>

                {/* CATEGORIES HORIZONTAL PILLS */}
                {Array.isArray(categories) && categories.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Tag className="w-4 h-4 text-indigo-600" />
                                <span>Shop by Category</span>
                            </h2>
                            {selectedCategory && (
                                <button
                                    type="button"
                                    onClick={() => handleCategorySelect('')}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                                >
                                    Reset Category
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                            <button
                                type="button"
                                onClick={() => handleCategorySelect('')}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                                    !selectedCategory
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                                }`}
                            >
                                All Products ({pagination.total || productList.length})
                            </button>
                            {categories.map((cat) => {
                                const isSelected = selectedCategory === cat.slug;
                                return (
                                    <button
                                        type="button"
                                        key={cat.id}
                                        onClick={() => handleCategorySelect(cat.slug)}
                                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                                        }`}
                                    >
                                        <span>{cat.name}</span>
                                        {typeof cat.products_count === 'number' && (
                                            <span
                                                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                                    isSelected
                                                        ? 'bg-indigo-700 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                }`}
                                            >
                                                {cat.products_count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* FILTER & SEARCH TOOLBAR */}
                <div id="catalog" className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        {/* Search in Catalog via User Search API */}
                        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by title, sku, or specs..."
                                className="w-full pl-10 pr-20 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            <button
                                type="submit"
                                className="absolute right-1.5 top-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
                            >
                                Search
                            </button>
                        </form>

                        {/* Filter Controls (Brand, Sort, Clear) */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Brand Selector */}
                            {Array.isArray(brands) && brands.length > 0 && (
                                <select
                                    value={selectedBrand}
                                    onChange={(e) => handleBrandChange(e.target.value)}
                                    className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium cursor-pointer"
                                >
                                    <option value="">All Brands</option>
                                    {brands.map((b) => (
                                        <option key={b.id} value={b.slug}>
                                            {b.name} ({b.products_count ?? 0})
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Sort Selector */}
                            <div className="flex items-center gap-1.5">
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                                <select
                                    value={selectedSort}
                                    onChange={(e) => handleSortChange(e.target.value)}
                                    className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium cursor-pointer"
                                >
                                    <option value="latest">Latest Arrivals</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                    <option value="name_asc">Name (A-Z)</option>
                                    <option value="popular">Most Popular</option>
                                    <option value="rating">Top Rated</option>
                                </select>
                            </div>

                            {/* Reset Filters */}
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearAllFilters}
                                    className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Clear Filters</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* PRODUCTS CATALOG GRID */}
                {productList.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-4">
                            <Package className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">No products found</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            We couldn't find any products matching your selected criteria. Try resetting filters or searching with another keyword.
                        </p>
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="mt-6 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
                        >
                            Reset All Filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {productList.map((product) => {
                            const isSaved = isInWishlist(product.id);
                            const imgUrl =
                                product.primary_image?.url ||
                                product.primary_image?.media?.url ||
                                product.images?.[0]?.url ||
                                product.images?.[0]?.media?.url;
                            const effectivePrice = Number(product.sale_price ?? product.retail_price ?? 0);
                            const mrp = Number(product.mrp ?? 0);
                            const hasDiscount = mrp > effectivePrice;
                            const stockQty = Number(product.stock_quantity ?? 0);
                            const isOutOfStock = stockQty <= 0;

                            return (
                                <div
                                    key={product.id}
                                    className="group flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-2xs hover:shadow-xl hover:shadow-indigo-500/5 transition-all overflow-hidden"
                                >
                                    {/* Image & Quick Actions Container */}
                                    <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        {imgUrl ? (
                                            <img
                                                src={imgUrl}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                                <Package className="w-12 h-12" />
                                                <span className="text-[11px] font-medium mt-1">No Image</span>
                                            </div>
                                        )}

                                        {/* Badges */}
                                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                                            {product.discount_label && (
                                                <span className="px-2.5 py-1 rounded-xl bg-rose-500 text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
                                                    {product.discount_label}
                                                </span>
                                            )}
                                            {product.category && (
                                                <span className="px-2.5 py-1 rounded-xl bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-semibold">
                                                    {product.category.name}
                                                </span>
                                            )}
                                        </div>

                                        {/* Wishlist Button */}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleWishlist({
                                                    id: `${product.id}-wish`,
                                                    product_id: product.id,
                                                    name: product.name,
                                                    slug: product.slug,
                                                    price: effectivePrice,
                                                    mrp: mrp > 0 ? mrp : undefined,
                                                    image_url: imgUrl,
                                                })
                                            }
                                            className="absolute top-3 right-3 p-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-slate-600 dark:text-slate-300 hover:text-rose-500 shadow-md transition-all cursor-pointer"
                                            title={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
                                        >
                                            <Heart
                                                className={`w-4 h-4 transition-colors ${
                                                    isSaved ? 'text-rose-500 fill-rose-500' : ''
                                                }`}
                                            />
                                        </button>

                                        {/* Quick View Button overlay on hover */}
                                        <button
                                            type="button"
                                            onClick={() => openQuickView(product)}
                                            className="absolute bottom-3 left-3 right-3 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-800 dark:text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Quick View
                                        </button>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            {product.brand && (
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                                                    {product.brand.name}
                                                </p>
                                            )}
                                            <Link
                                                href={`/product/${product.slug}`}
                                                className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2 transition-colors"
                                            >
                                                {product.name}
                                            </Link>
                                            {product.short_description && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                                    {product.short_description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Price and Cart Action */}
                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                            <div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="font-extrabold text-base text-slate-900 dark:text-white">
                                                        {currency}{effectivePrice.toFixed(2)}
                                                    </span>
                                                    {hasDiscount && (
                                                        <span className="text-xs text-slate-400 line-through">
                                                            {currency}{mrp.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span
                                                    className={`text-[10px] font-semibold ${
                                                        isOutOfStock ? 'text-rose-500' : 'text-emerald-600'
                                                    }`}
                                                >
                                                    {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={isOutOfStock}
                                                onClick={() => {
                                                    const defaultVariant = product.has_variants && product.variants && product.variants.length > 0
                                                        ? product.variants.find((v) => v.is_active && v.stock_quantity > 0) || product.variants[0]
                                                        : null;
                                                    const targetVariantId = defaultVariant ? defaultVariant.id : null;
                                                    const targetVariantName = defaultVariant ? defaultVariant.name : null;
                                                    const targetSku = defaultVariant?.sku || product.sku;
                                                    const targetPrice = defaultVariant
                                                        ? Number(defaultVariant.sale_price ?? defaultVariant.price ?? effectivePrice)
                                                        : effectivePrice;
                                                    const targetStock = defaultVariant ? defaultVariant.stock_quantity : (stockQty || 10);

                                                    addToCart({
                                                        id: `${product.id}-${targetVariantId || 'default'}`,
                                                        product_id: product.id,
                                                        product_variant_id: targetVariantId,
                                                        product_name: product.name,
                                                        variant_name: targetVariantName,
                                                        sku: targetSku,
                                                        price: targetPrice,
                                                        mrp: mrp > 0 ? mrp : undefined,
                                                        quantity: 1,
                                                        image_url: imgUrl,
                                                        max_stock: targetStock,
                                                    });
                                                }}
                                                className="p-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-950/50 dark:hover:bg-indigo-600 dark:text-indigo-400 dark:hover:text-white transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                                                title="Add to Cart"
                                            >
                                                <ShoppingCart className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* PAGINATION POWERED BY USER API */}
                {pagination.last_page > 1 && (
                    <div className="pt-6 flex items-center justify-center gap-2">
                        <button
                            type="button"
                            disabled={pagination.current_page <= 1 || loading}
                            onClick={() => handlePageChange(pagination.current_page - 1)}
                            className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" /> Previous
                        </button>

                        {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map((pageNum) => {
                            const isCurrent = pageNum === pagination.current_page;
                            return (
                                <button
                                    key={pageNum}
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handlePageChange(pageNum)}
                                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                                        isCurrent
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            disabled={pagination.current_page >= pagination.last_page || loading}
                            onClick={() => handlePageChange(pagination.current_page + 1)}
                            className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
                        >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* QUICK VIEW PRODUCT MODAL */}
            {quickViewProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row">
                        <div className="md:w-1/2 aspect-square bg-slate-100 dark:bg-slate-800 relative">
                            {quickViewProduct.primary_image?.url || quickViewProduct.primary_image?.media?.url ? (
                                <img
                                    src={quickViewProduct.primary_image.url || quickViewProduct.primary_image.media?.url}
                                    alt={quickViewProduct.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <Package className="w-16 h-16" />
                                </div>
                            )}
                        </div>

                        <div className="md:w-1/2 p-6 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between">
                                    {quickViewProduct.brand && (
                                        <span className="text-[11px] font-bold uppercase text-indigo-600">
                                            {quickViewProduct.brand.name}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setQuickViewProduct(null)}
                                        className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mt-1">
                                    {quickViewProduct.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-2 line-clamp-3">
                                    {quickViewProduct.short_description || quickViewProduct.description}
                                </p>

                                <div className="mt-4 flex items-baseline gap-2">
                                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                        {currency}{Number(quickViewProduct.sale_price ?? quickViewProduct.retail_price ?? 0).toFixed(2)}
                                    </span>
                                    {Number(quickViewProduct.mrp) > 0 && (
                                        <span className="text-sm text-slate-400 line-through">
                                            {currency}{Number(quickViewProduct.mrp).toFixed(2)}
                                        </span>
                                    )}
                                </div>

                                {/* Variant selector if variants exist */}
                                {quickViewProduct.has_variants && quickViewProduct.variants && (
                                    <div className="mt-4">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Select Variant
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {quickViewProduct.variants.map((v) => (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    onClick={() => setSelectedVariantId(v.id)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                                        selectedVariantId === v.id
                                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40'
                                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:border-slate-400'
                                                    }`}
                                                >
                                                    {v.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Quantity selector */}
                                <div className="mt-4 flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Quantity:</span>
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-2 py-1">
                                        <button
                                            type="button"
                                            onClick={() => setQuickViewQty((q) => Math.max(1, q - 1))}
                                            className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="text-xs font-bold px-2">{quickViewQty}</span>
                                        <button
                                            type="button"
                                            onClick={() => setQuickViewQty((q) => q + 1)}
                                            className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const effectivePrice = Number(
                                            quickViewProduct.sale_price ?? quickViewProduct.retail_price ?? 0
                                        );
                                        const selectedVariant = quickViewProduct.variants?.find((v) => v.id === selectedVariantId);
                                        const imgUrl = quickViewProduct.primary_image?.url || quickViewProduct.primary_image?.media?.url;

                                        addToCart({
                                            id: `${quickViewProduct.id}-${selectedVariantId || 'default'}`,
                                            product_id: quickViewProduct.id,
                                            product_variant_id: selectedVariantId,
                                            product_name: quickViewProduct.name,
                                            variant_name: selectedVariant?.name,
                                            sku: selectedVariant?.sku || quickViewProduct.sku,
                                            price: selectedVariant?.sale_price ?? selectedVariant?.price ?? effectivePrice,
                                            quantity: quickViewQty,
                                            image_url: imgUrl,
                                            max_stock: selectedVariant?.stock_quantity ?? quickViewProduct.stock_quantity ?? 10,
                                        });
                                        setQuickViewProduct(null);
                                    }}
                                    className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    <span>Add to Cart</span>
                                </button>
                                <Link
                                    href={`/product/${quickViewProduct.slug}`}
                                    className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                                >
                                    Full Details
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

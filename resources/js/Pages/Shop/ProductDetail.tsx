import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import ShopLayout, { useShop } from '../../Layouts/ShopLayout';
import {
    Product,
    ProductVariant,
    ProductImage,
    Category,
    Brand,
    PageProps,
    Attribute,
    AttributeValue,
} from '../../types';
import {
    ShoppingBag,
    ShoppingCart,
    Check,
    Truck,
    ShieldCheck,
    ChevronRight,
    Minus,
    Plus,
    Star,
    RefreshCw,
    ArrowLeft,
    CreditCard,
    Layers,
    Heart,
    Boxes,
    Share2,
    CheckCircle2,
} from 'lucide-react';

interface ProductDetailProps {
    product: Product & {
        brand?: Brand | null;
        category?: Category | null;
        images?: (ProductImage & { media?: { id: string; url?: string } })[];
        attributes?: (Attribute & { values: AttributeValue[] })[];
        attribute_values?: AttributeValue[];
        variants?: (ProductVariant & {
            media?: { id: string; url?: string };
            attribute_values?: AttributeValue[];
        })[];
        return_policy?: string | null;
        refund_policy?: string | null;
    };
    relatedProducts?: (Product & {
        brand?: Brand | null;
        primary_image?: ProductImage & { media?: { url: string } };
    })[];
}

export default function ProductDetailPage(props: ProductDetailProps) {
    return (
        <ShopLayout>
            <ProductDetailContent {...props} />
        </ShopLayout>
    );
}

function ProductDetailContent({ product: initialProduct, relatedProducts: initialRelated = [] }: ProductDetailProps) {
    const { store } = usePage<PageProps>().props;
    const currency = store?.currency || '$';

    const {
        addToCart,
        setIsCartOpen,
        setIsCheckoutModalOpen,
        isInWishlist,
        toggleWishlist,
        showToast,
    } = useShop();

    // Live Product State powered by User API (/api/user/products/{slugOrId})
    const [product, setProduct] = useState(initialProduct);
    const [relatedProducts, setRelatedProducts] = useState(initialRelated);
    const [copiedShare, setCopiedShare] = useState(false);

    // Fetch live product detail from User API on mount to get live real-time stock & specs
    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('customer_token') : null;
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const productKey = initialProduct.slug || initialProduct.id;

        // 1. Fetch live product from User API
        fetch(`/api/user/products/${productKey}`, { headers })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (json?.data) {
                    setProduct((prev) => ({
                        ...prev,
                        ...json.data,
                    }));
                }
            })
            .catch(console.error);

        // 2. Fetch live related products from User API
        fetch(`/api/user/products/${productKey}/related`, { headers })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
                    setRelatedProducts(json.data);
                }
            })
            .catch(console.error);
    }, [initialProduct.id, initialProduct.slug]);

    const hasVariants = Boolean(product.has_variants && product.variants && product.variants.length > 0);
    const variants = useMemo(() => product.variants || [], [product.variants]);
    const attributes = useMemo(() => product.attributes || [], [product.attributes]);

    // Initialize selected attributes state from the first active variant
    const initialSelectedAttributes = useMemo(() => {
        const initial: Record<string, string> = {};
        if (hasVariants && variants.length > 0) {
            const firstActive = variants.find((v) => v.is_active && v.stock_quantity > 0) || variants[0];
            if (firstActive.attributes) {
                Object.entries(firstActive.attributes).forEach(([k, v]) => {
                    initial[k] = v;
                });
            } else if (firstActive.attribute_values) {
                firstActive.attribute_values.forEach((av) => {
                    const parentAttr = attributes.find((a) => a.id === av.attribute_id);
                    if (parentAttr) {
                        initial[parentAttr.name] = av.value;
                    }
                });
            }
        }
        return initial;
    }, [hasVariants, variants, attributes]);

    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(initialSelectedAttributes);

    // Synchronize if initialSelectedAttributes changed due to live fetch
    useEffect(() => {
        if (Object.keys(selectedAttributes).length === 0 && Object.keys(initialSelectedAttributes).length > 0) {
            setSelectedAttributes(initialSelectedAttributes);
        }
    }, [initialSelectedAttributes]);

    // Compute active matching variant
    const activeVariant = useMemo<ProductVariant | null>(() => {
        if (!hasVariants || variants.length === 0) return null;

        // Try exact match on attributes record
        const exact = variants.find((v) => {
            if (!v.is_active) return false;
            if (!v.attributes) return false;
            return Object.entries(selectedAttributes).every(
                ([attrName, val]) => v.attributes?.[attrName] === val
            );
        });

        if (exact) return exact;

        // Fallback: match by attribute_values
        const byValues = variants.find((v) => {
            if (!v.is_active || !v.attribute_values) return false;
            const variantValStrings = v.attribute_values.map((av) => av.value);
            return Object.values(selectedAttributes).every((val) => variantValStrings.includes(val));
        });

        return byValues || variants[0] || null;
    }, [hasVariants, variants, selectedAttributes]);

    // Active media images list
    const galleryImages = useMemo(() => {
        const list: { url: string; alt: string; is_primary: boolean }[] = [];
        if (product.images && product.images.length > 0) {
            product.images.forEach((img) => {
                const url = img.url || img.media?.url;
                if (url) {
                    list.push({
                        url,
                        alt: img.alt_text || product.name,
                        is_primary: Boolean(img.is_primary),
                    });
                }
            });
        }
        return list;
    }, [product]);

    // Primary display image URL (reactively switches to variant-specific image if present)
    const [activeImageUrl, setActiveImageUrl] = useState<string>(() => {
        if (activeVariant?.image_url) return activeVariant.image_url;
        if (galleryImages.length > 0) {
            const primary = galleryImages.find((g) => g.is_primary);
            return primary ? primary.url : galleryImages[0].url;
        }
        return '';
    });

    useEffect(() => {
        if (activeVariant?.image_url) {
            setActiveImageUrl(activeVariant.image_url);
        } else if (galleryImages.length > 0) {
            const primary = galleryImages.find((g) => g.is_primary);
            setActiveImageUrl(primary ? primary.url : galleryImages[0].url);
        }
    }, [activeVariant, galleryImages]);

    // Current price & MRP
    const currentPrice = useMemo(() => {
        if (activeVariant) {
            return Number(activeVariant.sale_price || activeVariant.price);
        }
        return Number(product.sale_price || product.retail_price);
    }, [activeVariant, product]);

    const currentMrp = useMemo(() => {
        if (activeVariant && activeVariant.mrp) {
            return Number(activeVariant.mrp);
        }
        return product.mrp ? Number(product.mrp) : null;
    }, [activeVariant, product]);

    const discountBadge = useMemo<{ label: string; isFixed: boolean } | null>(() => {
        if (activeVariant) {
            if (currentMrp && currentMrp > currentPrice) {
                const pct = Math.round(((currentMrp - currentPrice) / currentMrp) * 100);
                return { label: `${pct}% OFF`, isFixed: false };
            }
            return null;
        }

        const discountType = product.discount_type;
        if (product.discount_value && Number(product.discount_value) > 0) {
            if (discountType === 'fixed') {
                return { label: `${currency}${Number(product.discount_value).toFixed(2)} OFF`, isFixed: true };
            }
            return { label: `${Number(product.discount_value).toFixed(0)}% OFF`, isFixed: false };
        }

        if (currentMrp && currentMrp > currentPrice) {
            const pct = Math.round(((currentMrp - currentPrice) / currentMrp) * 100);
            return { label: `${pct}% OFF`, isFixed: false };
        }
        return null;
    }, [activeVariant, currentMrp, currentPrice, product, currency]);

    const currentSku = activeVariant?.sku || product.sku;
    const currentStock = activeVariant ? activeVariant.stock_quantity : (product.stock_quantity ?? 0);
    const isOutOfStock = currentStock <= 0;
    const isLowStock = currentStock > 0 && currentStock <= (activeVariant?.low_stock_threshold || product.low_stock_threshold || 5);

    const [quantity, setQuantity] = useState(1);

    // Add to cart handler using ShopLayout context
    const handleAddToCart = (buyNow = false) => {
        if (isOutOfStock) {
            showToast('Item is currently out of stock.', 'error');
            return;
        }
        if (hasVariants && !activeVariant) {
            showToast('Please select all required product options.', 'info');
            return;
        }

        const cartItemId = activeVariant ? `${product.id}-${activeVariant.id}` : product.id;

        addToCart({
            id: cartItemId,
            product_id: product.id,
            product_variant_id: activeVariant?.id || null,
            product_name: product.name,
            variant_name: activeVariant?.name || null,
            sku: currentSku,
            price: currentPrice,
            mrp: currentMrp || undefined,
            quantity,
            image_url: activeVariant?.image_url || activeImageUrl,
            max_stock: currentStock,
        });

        if (buyNow) {
            setIsCheckoutModalOpen(true);
        } else {
            setIsCartOpen(true);
        }
    };

    const handleToggleWishlist = () => {
        toggleWishlist({
            id: product.id,
            product_id: product.id,
            name: product.name,
            slug: product.slug,
            price: currentPrice,
            mrp: currentMrp || undefined,
            image_url: activeImageUrl,
        });
    };

    const handleShare = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            setCopiedShare(true);
            showToast('Product link copied to clipboard!', 'success');
            setTimeout(() => setCopiedShare(false), 2000);
        }
    };

    const isWished = isInWishlist(product.id);

    return (
        <div className="space-y-8">
            <Head title={`${product.name} | ${store?.name || 'Store'}`} />

            {/* Breadcrumbs Navigation */}
            <nav className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <Link href="/shop" className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">
                    Shop
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                {product.category && (
                    <>
                        <Link
                            href={`/shop?category=${product.category.slug}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                        >
                            {product.category.name}
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </>
                )}
                <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-xs">
                    {product.name}
                </span>
            </nav>

            {/* Main Product Showcase */}
            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                {/* Left: Product Images Gallery (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Primary Photo Display */}
                    <div className="relative aspect-square rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center p-4 group">
                        {activeImageUrl ? (
                            <img
                                src={activeImageUrl}
                                alt={product.name}
                                className="w-full h-full object-contain transition-all duration-300 transform group-hover:scale-105"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                                <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
                                <span className="text-xs mt-2 font-medium">No photo available</span>
                            </div>
                        )}

                        {/* Discount Badge */}
                        {discountBadge && (
                            <div className="absolute top-4 left-4 bg-rose-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-xl shadow-md">
                                {discountBadge.label}
                            </div>
                        )}

                        {/* Floating Wishlist Button */}
                        <button
                            type="button"
                            onClick={handleToggleWishlist}
                            className={`absolute top-4 right-4 p-2.5 rounded-full transition-all shadow-md ${
                                isWished
                                    ? 'bg-rose-500 text-white shadow-rose-500/30 ring-2 ring-rose-400'
                                    : 'bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-rose-500'
                            }`}
                            title={isWished ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        >
                            <Heart className={`w-4 h-4 ${isWished ? 'fill-white stroke-white' : ''}`} />
                        </button>

                        {/* Variant indicator */}
                        {activeVariant?.image_url === activeImageUrl && activeVariant && (
                            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                                <Layers className="w-3 h-3 text-indigo-400" />
                                <span>Variant: {activeVariant.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Gallery Thumbnails Strip */}
                    {galleryImages.length > 1 && (
                        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                            {galleryImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setActiveImageUrl(img.url)}
                                    className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all p-1 bg-white dark:bg-slate-900 shrink-0 ${
                                        activeImageUrl === img.url
                                            ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                                            : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                                    }`}
                                >
                                    <img src={img.url} alt={img.alt} className="w-full h-full object-contain" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Product Details & Dynamic Variant Pickers (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Brand, Category & Social share */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                {product.brand && (
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                                        {product.brand.name}
                                    </span>
                                )}
                                {product.category && (
                                    <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        {product.category.name}
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleShare}
                                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Share product"
                            >
                                {copiedShare ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span className="text-emerald-500 font-semibold text-[11px]">Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Share2 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Share</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {product.name}
                        </h1>

                        <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>
                                SKU: <strong className="font-mono text-slate-600 dark:text-slate-300">{currentSku}</strong>
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1 text-amber-500">
                                <Star className="w-3.5 h-3.5 fill-amber-500" />
                                <strong className="text-slate-700 dark:text-slate-300">4.9</strong>
                                <span className="text-slate-400">(24 customer reviews)</span>
                            </span>
                        </div>
                    </div>

                    {/* Pricing Block */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400">
                                {currency}{currentPrice.toFixed(2)}
                            </span>
                            {currentMrp && currentMrp > currentPrice && (
                                <span className="text-base sm:text-lg text-slate-400 line-through">
                                    {currency}{currentMrp.toFixed(2)}
                                </span>
                            )}
                            {discountBadge && (
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                    Save {discountBadge.label}
                                </span>
                            )}
                        </div>

                        {/* Stock Availability Indicator */}
                        <div className="pt-2 flex items-center gap-2 text-xs">
                            {isOutOfStock ? (
                                <span className="inline-flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                    Out of stock
                                </span>
                            ) : isLowStock ? (
                                <span className="inline-flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                    Only {currentStock} units left in stock — order soon!
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    In Stock ({currentStock} available)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Dynamic Variant Selectors */}
                    {hasVariants && attributes.length > 0 && (
                        <div className="space-y-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                                <span>Select Options</span>
                                {activeVariant && (
                                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold normal-case">
                                        {activeVariant.name}
                                    </span>
                                )}
                            </div>

                            {attributes.map((attr) => {
                                const selectedVal = selectedAttributes[attr.name];

                                return (
                                    <div key={attr.id} className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                {attr.name}:{' '}
                                                <strong className="text-slate-900 dark:text-white font-bold">
                                                    {selectedVal || 'Select one'}
                                                </strong>
                                            </span>
                                        </div>

                                        {/* Attribute values picker */}
                                        <div className="flex flex-wrap gap-2.5">
                                            {attr.values?.map((val) => {
                                                const isSelected = selectedVal === val.value;

                                                if (attr.type === 'color') {
                                                    return (
                                                        <button
                                                            key={val.id}
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedAttributes((prev) => ({
                                                                    ...prev,
                                                                    [attr.name]: val.value,
                                                                }))
                                                            }
                                                            title={`${attr.name}: ${val.value}`}
                                                            className={`group relative flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all ${
                                                                isSelected
                                                                    ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/40'
                                                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-800'
                                                            }`}
                                                        >
                                                            <span
                                                                className="w-5 h-5 rounded-full border border-black/20 shadow-2xs shrink-0 flex items-center justify-center"
                                                                style={{ backgroundColor: val.color_code || '#cbd5e1' }}
                                                            >
                                                                {isSelected && (
                                                                    <Check className="w-3 h-3 text-white drop-shadow stroke-[3]" />
                                                                )}
                                                            </span>
                                                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                                {val.value}
                                                            </span>
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        key={val.id}
                                                        type="button"
                                                        onClick={() =>
                                                            setSelectedAttributes((prev) => ({
                                                                ...prev,
                                                                [attr.name]: val.value,
                                                            }))
                                                        }
                                                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                                                            isSelected
                                                                ? 'bg-indigo-600 text-white shadow-indigo-500/25 ring-2 ring-indigo-600'
                                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                                        }`}
                                                    >
                                                        {val.value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Quantity & CTA Buttons */}
                    <div className="space-y-3 pt-2">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            {/* Quantity Picker */}
                            <div className="flex items-center justify-between border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 p-1 w-full sm:w-36 shrink-0 shadow-2xs">
                                <button
                                    type="button"
                                    disabled={quantity <= 1 || isOutOfStock}
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-bold text-slate-900 dark:text-white px-2">
                                    {quantity}
                                </span>
                                <button
                                    type="button"
                                    disabled={quantity >= currentStock || isOutOfStock}
                                    onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                                    className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Add to Cart Button */}
                            <button
                                type="button"
                                disabled={isOutOfStock || (hasVariants && !activeVariant)}
                                onClick={() => handleAddToCart(false)}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                            >
                                <ShoppingCart className="w-4 h-4" />
                                <span>Add to Cart</span>
                            </button>

                            {/* Buy Now Button (triggers User API checkout directly) */}
                            <button
                                type="button"
                                disabled={isOutOfStock || (hasVariants && !activeVariant)}
                                onClick={() => handleAddToCart(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <CreditCard className="w-4 h-4" />
                                <span>Buy Now</span>
                            </button>
                        </div>

                        {/* Trust Assurances */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-[11px] text-slate-500">
                            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                <Truck className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span>Fast Delivery Available</span>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>Authentic Guarantee</span>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
                                <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
                                <span>Easy 14-Day Returns</span>
                            </div>
                        </div>
                    </div>

                    {/* Short Description */}
                    {product.short_description && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
                            {product.short_description}
                        </div>
                    )}
                </div>
            </main>

            {/* Lower Details: Specifications & Policies */}
            <div className="space-y-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Specifications */}
                    {product.specifications && Object.keys(product.specifications).length > 0 && (
                        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                                <Boxes className="w-4 h-4 text-indigo-500" />
                                Technical Specifications
                            </h3>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                {Object.entries(product.specifications).map(([key, val]) => (
                                    <div key={key} className="py-2.5 flex items-center justify-between">
                                        <span className="text-slate-500 font-medium">{key}</span>
                                        <span className="text-slate-900 dark:text-white font-semibold">{String(val)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Policies */}
                    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-teal-500" />
                            Returns &amp; Warranty Guidelines
                        </h3>
                        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                            <div>
                                <h4 className="font-semibold text-slate-900 dark:text-slate-200">Return Policy</h4>
                                <p className="mt-0.5">
                                    {product.return_policy ||
                                        'Standard 14-day hassle-free return on unopened items in original packaging.'}
                                </p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900 dark:text-slate-200">Refund Policy</h4>
                                <p className="mt-0.5">
                                    {product.refund_policy ||
                                        'Refunds are automatically processed to the original payment method within 3-5 business days of inspection.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Related Products from User API */}
                {relatedProducts.length > 0 && (
                    <div className="pt-6 space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            You May Also Like
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {relatedProducts.map((rel: any) => {
                                const relImg = rel.primary_image?.url || rel.primary_image?.media?.url;
                                const relPrice = Number(rel.sale_price || rel.retail_price || rel.effective_price || 0);

                                return (
                                    <Link
                                        key={rel.id}
                                        href={`/product/${rel.slug}`}
                                        className="group block p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-indigo-500 transition-all"
                                    >
                                        <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800/40 p-2 flex items-center justify-center mb-3">
                                            {relImg ? (
                                                <img
                                                    src={relImg}
                                                    alt={rel.name}
                                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                                />
                                            ) : (
                                                <ShoppingBag className="w-8 h-8 text-slate-400" />
                                            )}
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                            {rel.name}
                                        </h4>
                                        <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                                            {currency}{relPrice.toFixed(2)}
                                        </p>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

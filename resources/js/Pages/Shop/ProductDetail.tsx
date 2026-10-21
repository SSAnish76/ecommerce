import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
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
    ArrowRight,
    ChevronRight,
    Minus,
    Plus,
    X,
    Star,
    RefreshCw,
    AlertCircle,
    ArrowLeft,
    CreditCard,
    CheckCircle2,
    PackageCheck,
    Layers,
    Share2,
    Heart,
    Boxes,
} from 'lucide-react';

interface CartItem {
    id: string; // unique item cart id
    product_id: string;
    product_variant_id?: string | null;
    product_name: string;
    variant_name?: string | null;
    sku: string;
    price: number;
    mrp?: number;
    quantity: number;
    attributes?: Record<string, string> | null;
    image_url?: string | null;
    max_stock: number;
}

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
    };
    relatedProducts?: (Product & {
        brand?: Brand | null;
        primary_image?: ProductImage & { media?: { url: string } };
    })[];
}

const getCsrfToken = (): string => {
    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
    if (metaTag && metaTag.content) return metaTag.content;
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
};

export default function ProductDetailPage({ product, relatedProducts = [] }: ProductDetailProps) {
    const { store } = usePage<PageProps>().props;
    const currency = store?.currency || '$';

    const hasVariants = Boolean(product.has_variants && product.variants && product.variants.length > 0);
    const variants = useMemo(() => product.variants || [], [product.variants]);
    const attributes = useMemo(() => product.attributes || [], [product.attributes]);

    // Initialize selected attributes state from the first active variant (or first available values)
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
                    // Look up attribute name
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

    // Compute the currently active matching variant based on selected attributes
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

    // Primary display image URL (reactively switches to variant-specific image if present!)
    const [activeImageUrl, setActiveImageUrl] = useState<string>(() => {
        if (activeVariant?.image_url) return activeVariant.image_url;
        if (galleryImages.length > 0) {
            const primary = galleryImages.find((g) => g.is_primary);
            return primary ? primary.url : galleryImages[0].url;
        }
        return '';
    });

    // When activeVariant changes and has its own image, update the main image viewer
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

    const discountPercentage = useMemo(() => {
        if (currentMrp && currentMrp > currentPrice) {
            return Math.round(((currentMrp - currentPrice) / currentMrp) * 100);
        }
        return null;
    }, [currentMrp, currentPrice]);

    // Current SKU
    const currentSku = activeVariant?.sku || product.sku;

    // Current Stock
    const currentStock = activeVariant ? activeVariant.stock_quantity : product.stock_quantity;
    const isOutOfStock = currentStock <= 0;
    const isLowStock = currentStock > 0 && currentStock <= (activeVariant?.low_stock_threshold || product.low_stock_threshold || 5);

    // Selected Quantity
    const [quantity, setQuantity] = useState(1);

    // Cart Drawer State (persisted in localStorage)
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
        try {
            const saved = localStorage.getItem('ecommerce_shop_cart');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('ecommerce_shop_cart', JSON.stringify(cartItems));
        } catch {
            // ignore
        }
    }, [cartItems]);

    // Checkout Modal State
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [checkoutForm, setCheckoutForm] = useState({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        shipping_address: '',
        payment_method: 'cod',
        notes: '',
    });
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [orderSuccess, setOrderSuccess] = useState<{
        order_number: string;
        total: number;
        customer_email: string;
    } | null>(null);

    // Cart actions
    const addToCart = (buyNow = false) => {
        if (isOutOfStock) return;

        const cartItemId = activeVariant
            ? `${product.id}-${activeVariant.id}`
            : product.id;

        setCartItems((prev) => {
            const existingIndex = prev.findIndex((item) => item.id === cartItemId);
            if (existingIndex > -1) {
                const updated = [...prev];
                const newQty = Math.min(updated[existingIndex].quantity + quantity, currentStock);
                updated[existingIndex].quantity = newQty;
                return updated;
            } else {
                return [
                    ...prev,
                    {
                        id: cartItemId,
                        product_id: product.id,
                        product_variant_id: activeVariant?.id || null,
                        product_name: product.name,
                        variant_name: activeVariant?.name || null,
                        sku: currentSku,
                        price: currentPrice,
                        mrp: currentMrp || undefined,
                        quantity,
                        attributes: activeVariant?.attributes || null,
                        image_url: activeVariant?.image_url || activeImageUrl,
                        max_stock: currentStock,
                    },
                ];
            }
        });

        if (buyNow) {
            setIsCheckoutOpen(true);
        } else {
            setIsCartOpen(true);
        }
    };

    const updateCartQty = (cartItemId: string, delta: number) => {
        setCartItems((prev) =>
            prev
                .map((item) => {
                    if (item.id === cartItemId) {
                        const nextQty = item.quantity + delta;
                        return nextQty > 0 && nextQty <= item.max_stock
                            ? { ...item, quantity: nextQty }
                            : null;
                    }
                    return item;
                })
                .filter(Boolean) as CartItem[]
        );
    };

    const removeFromCart = (cartItemId: string) => {
        setCartItems((prev) => prev.filter((item) => item.id !== cartItemId));
    };

    const cartSubtotal = useMemo(() => {
        return cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [cartItems]);

    const totalCartCount = useMemo(() => {
        return cartItems.reduce((acc, item) => acc + item.quantity, 0);
    }, [cartItems]);

    // Handle Option Selection
    const handleSelectAttributeValue = (attrName: string, val: string) => {
        setSelectedAttributes((prev) => ({
            ...prev,
            [attrName]: val,
        }));
    };

    // Handle Order Submission
    const handleCheckoutSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCheckoutError(null);
        setCheckoutLoading(true);

        const token = getCsrfToken();
        const payload = {
            ...checkoutForm,
            items: cartItems.map((item) => ({
                product_id: item.product_id,
                product_variant_id: item.product_variant_id,
                quantity: item.quantity,
            })),
        };

        try {
            const res = await fetch('/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(token ? { 'X-CSRF-TOKEN': token } : {}),
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (res.ok && json.success) {
                setOrderSuccess({
                    order_number: json.order_number,
                    total: json.order?.total_amount || cartSubtotal,
                    customer_email: checkoutForm.customer_email,
                });
                setCartItems([]);
                localStorage.removeItem('ecommerce_shop_cart');
            } else {
                setCheckoutError(json.message || 'Failed to place order. Please check item availability.');
            }
        } catch {
            setCheckoutError('Connection error occurred while processing your order.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
            <Head title={`${product.name} | ${store?.name || 'Store'}`} />

            {/* Storefront Header */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/products"
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Back to Admin"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <Link href="/" className="font-extrabold text-lg sm:text-xl tracking-tight text-indigo-600 dark:text-indigo-400">
                            {store?.name || 'E-Commerce'}
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Cart Trigger */}
                        <button
                            type="button"
                            onClick={() => setIsCartOpen(true)}
                            className="relative flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-medium text-xs"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            <span className="hidden sm:inline">Cart</span>
                            {totalCartCount > 0 && (
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                                    {totalCartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Breadcrumbs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <nav className="flex items-center gap-2 text-xs text-slate-500">
                    <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">Home</Link>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    {product.category && (
                        <>
                            <span>{product.category.name}</span>
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                        </>
                    )}
                    <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-xs">{product.name}</span>
                </nav>
            </div>

            {/* Main Product Section */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    {/* Left: Product Images Gallery (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Primary View */}
                        <div className="relative aspect-square rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center p-4">
                            {activeImageUrl ? (
                                <img
                                    src={activeImageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-contain transition-all duration-300 transform hover:scale-105"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400">
                                    <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
                                    <span className="text-xs mt-2">No photo available</span>
                                </div>
                            )}

                            {/* Discount Badge */}
                            {discountPercentage && (
                                <div className="absolute top-4 left-4 bg-rose-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-xl shadow-md">
                                    {discountPercentage}% OFF
                                </div>
                            )}

                            {/* Variant photo indicator */}
                            {activeVariant?.image_url === activeImageUrl && (
                                <div className="absolute bottom-4 left-4 bg-slate-900/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                                    <Layers className="w-3 h-3 text-indigo-400" />
                                    <span>Variant: {activeVariant.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Gallery Thumbnails Strip */}
                        {galleryImages.length > 1 && (
                            <div className="flex items-center gap-3 overflow-x-auto pb-2">
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

                    {/* Right: Product Details & Variant Selectors (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Title, Brand, Category */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                {product.brand && (
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                                        {product.brand.name}
                                    </span>
                                )}
                                {product.category && (
                                    <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        {product.category.name}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                {product.name}
                            </h1>

                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span>SKU: <strong className="font-mono text-slate-600 dark:text-slate-300">{currentSku}</strong></span>
                                <span>&bull;</span>
                                <span className="flex items-center gap-1 text-amber-500">
                                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                                    <strong className="text-slate-700 dark:text-slate-300">4.9</strong>
                                    <span className="text-slate-400">(24 customer reviews)</span>
                                </span>
                            </div>
                        </div>

                        {/* Pricing Block */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400">
                                    {currency}{currentPrice.toFixed(2)}
                                </span>
                                {currentMrp && currentMrp > currentPrice && (
                                    <span className="text-base sm:text-lg text-slate-400 line-through">
                                        {currency}{currentMrp.toFixed(2)}
                                    </span>
                                )}
                                {discountPercentage && (
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                        Save {discountPercentage}%
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

                        {/* Dynamic Hybrid Variant Selectors */}
                        {hasVariants && attributes.length > 0 && (
                            <div className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
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
                                                {attr.values.map((val) => {
                                                    const isSelected = selectedVal === val.value;

                                                    if (attr.type === 'color') {
                                                        return (
                                                            <button
                                                                key={val.id}
                                                                type="button"
                                                                onClick={() => handleSelectAttributeValue(attr.name, val.value)}
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
                                                            onClick={() => handleSelectAttributeValue(attr.name, val.value)}
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
                                    disabled={isOutOfStock}
                                    onClick={() => addToCart(false)}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    <span>Add to Cart</span>
                                </button>

                                {/* Buy Now Button */}
                                <button
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={() => addToCart(true)}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    <span>Buy Now</span>
                                </button>
                            </div>

                            {/* Trust Assurances */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-[11px] text-slate-500">
                                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <Truck className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <span>Fast Delivery Available</span>
                                </div>
                                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>Authentic Guarantee</span>
                                </div>
                                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
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
                </div>

                {/* Lower Tabs / Details Section */}
                <div className="mt-16 space-y-8">
                    {/* Specifications & Description Cards */}
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
                                    <p className="mt-0.5">{product.return_policy || 'Standard 14-day hassle-free return on unopened items in original packaging.'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 dark:text-slate-200">Refund Policy</h4>
                                    <p className="mt-0.5">{product.refund_policy || 'Refunds are automatically processed to the original payment method within 3-5 business days of inspection.'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Related Products */}
                    {relatedProducts.length > 0 && (
                        <div className="pt-8 space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                You May Also Like
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {relatedProducts.map((rel) => {
                                    const relImg = rel.primary_image?.url || rel.primary_image?.media?.url;
                                    return (
                                        <Link
                                            key={rel.id}
                                            href={`/product/${rel.slug}`}
                                            className="group block p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-indigo-500 transition-all"
                                        >
                                            <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800/40 p-2 flex items-center justify-center mb-3">
                                                {relImg ? (
                                                    <img src={relImg} alt={rel.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <ShoppingBag className="w-8 h-8 text-slate-400" />
                                                )}
                                            </div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                                {rel.name}
                                            </h4>
                                            <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                                                {currency}{Number(rel.retail_price).toFixed(2)}
                                            </p>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Slide-over Cart Drawer */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setIsCartOpen(false)}
                    />
                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
                            {/* Drawer Header */}
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5 text-indigo-600" />
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                        Your Cart ({totalCartCount})
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCartOpen(false)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Cart Items List */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {cartItems.length === 0 ? (
                                    <div className="text-center py-16 space-y-3">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
                                            <ShoppingCart className="w-8 h-8 stroke-[1.5]" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Your cart is empty
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Add some items with your favorite variants to get started!
                                        </p>
                                    </div>
                                ) : (
                                    cartItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex gap-3 items-center"
                                        >
                                            {/* Item Thumbnail */}
                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 shrink-0 flex items-center justify-center">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.product_name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <ShoppingBag className="w-5 h-5 text-slate-400" />
                                                )}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                    {item.product_name}
                                                </h4>
                                                {item.variant_name && (
                                                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
                                                        {item.variant_name}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                                        {currency}{(item.price * item.quantity).toFixed(2)}
                                                    </span>
                                                    {/* Qty Controls */}
                                                    <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 px-1 py-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateCartQty(item.id, -1)}
                                                            className="text-slate-400 hover:text-slate-600 px-1"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-xs font-bold px-1">{item.quantity}</span>
                                                        <button
                                                            type="button"
                                                            disabled={item.quantity >= item.max_stock}
                                                            onClick={() => updateCartQty(item.id, 1)}
                                                            className="text-slate-400 hover:text-slate-600 px-1 disabled:opacity-30"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.id)}
                                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Cart Footer */}
                            {cartItems.length > 0 && (
                                <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="flex items-center justify-between text-sm font-bold">
                                        <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                                        <span className="text-slate-900 dark:text-white text-lg">
                                            {currency}{cartSubtotal.toFixed(2)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        Shipping &amp; taxes calculated during instant checkout.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCartOpen(false);
                                            setIsCheckoutOpen(true);
                                        }}
                                        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2"
                                    >
                                        <span>Proceed to Checkout</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Instant Checkout Modal */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-8">
                        {orderSuccess ? (
                            <div className="text-center py-6 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                                    Order Confirmed!
                                </h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                    Thank you for your order! Your confirmation number is{' '}
                                    <strong className="text-indigo-600 font-mono">{orderSuccess.order_number}</strong>.
                                    A confirmation receipt has been dispatched to {orderSuccess.customer_email}.
                                </p>
                                <div className="pt-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOrderSuccess(null);
                                            setIsCheckoutOpen(false);
                                        }}
                                        className="px-6 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-md"
                                    >
                                        Continue Shopping
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <PackageCheck className="w-5 h-5 text-indigo-600" />
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                            Instant Checkout
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsCheckoutOpen(false)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {checkoutError && (
                                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{checkoutError}</span>
                                    </div>
                                )}

                                <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Full Name <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={checkoutForm.customer_name}
                                                onChange={(e) => setCheckoutForm({ ...checkoutForm, customer_name: e.target.value })}
                                                placeholder="John Doe"
                                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Email Address <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                value={checkoutForm.customer_email}
                                                onChange={(e) => setCheckoutForm({ ...checkoutForm, customer_email: e.target.value })}
                                                placeholder="john@example.com"
                                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                value={checkoutForm.customer_phone}
                                                onChange={(e) => setCheckoutForm({ ...checkoutForm, customer_phone: e.target.value })}
                                                placeholder="+1 (555) 000-0000"
                                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Payment Method <span className="text-rose-500">*</span>
                                            </label>
                                            <select
                                                value={checkoutForm.payment_method}
                                                onChange={(e) => setCheckoutForm({ ...checkoutForm, payment_method: e.target.value })}
                                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-slate-900 dark:text-white"
                                            >
                                                <option value="cod">Cash on Delivery (COD)</option>
                                                <option value="card">Credit / Debit Card</option>
                                                <option value="wire">Bank Wire Transfer</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Shipping Delivery Address <span className="text-rose-500">*</span>
                                        </label>
                                        <textarea
                                            required
                                            rows={2}
                                            value={checkoutForm.shipping_address}
                                            onChange={(e) => setCheckoutForm({ ...checkoutForm, shipping_address: e.target.value })}
                                            placeholder="Street address, apartment, city, state, postal code"
                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-white"
                                        />
                                    </div>

                                    {/* Order Summary box */}
                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            <span>Items ({totalCartCount})</span>
                                            <span>{currency}{cartSubtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                                            <span>Total Amount Due</span>
                                            <span className="text-indigo-600 dark:text-indigo-400 text-sm">
                                                {currency}{cartSubtotal.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setIsCheckoutOpen(false)}
                                            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={checkoutLoading || cartItems.length === 0}
                                            className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 disabled:opacity-40"
                                        >
                                            {checkoutLoading ? 'Processing Order...' : `Place Order (${currency}${cartSubtotal.toFixed(2)})`}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

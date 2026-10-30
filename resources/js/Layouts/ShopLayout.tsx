import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { PageProps } from '../types';
import {
    ShoppingBag,
    ShoppingCart,
    Heart,
    Search,
    User as UserIcon,
    X,
    Plus,
    Minus,
    Trash2,
    Truck,
    ShieldCheck,
    Headphones,
    Sparkles,
    ChevronRight,
    ArrowRight,
    Lock,
    Package,
    CreditCard,
    AlertCircle,
    LogOut,
    CheckCircle2,
    Loader2,
    Check,
    Banknote,
    Building2,
    RotateCcw,
    MapPin,
    ExternalLink,
    Wallet,
} from 'lucide-react';

export interface CartItem {
    id: string;
    product_id: string;
    product_variant_id?: string | null;
    product_name: string;
    variant_name?: string | null;
    sku: string;
    price: number;
    mrp?: number;
    quantity: number;
    image_url?: string | null;
    max_stock: number;
}

export interface WishlistItem {
    id: string;
    product_id: string;
    name: string;
    slug: string;
    price: number;
    mrp?: number;
    image_url?: string | null;
}

export interface CustomerUser {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
}

interface ShopContextType {
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    updateCartQuantity: (itemId: string, delta: number) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    cartCount: number;
    cartSubtotal: number;
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;

    wishlist: WishlistItem[];
    toggleWishlist: (item: WishlistItem) => void;
    isInWishlist: (productId: string) => boolean;
    isWishlistOpen: boolean;
    setIsWishlistOpen: (open: boolean) => void;

    customer: CustomerUser | null;
    customerToken: string | null;
    isAuthModalOpen: boolean;
    setIsAuthModalOpen: (open: boolean) => void;
    isCheckoutModalOpen: boolean;
    setIsCheckoutModalOpen: (open: boolean) => void;
    isOrderTrackingModalOpen: boolean;
    setIsOrderTrackingModalOpen: (open: boolean) => void;
    loginCustomer: (token: string, user: CustomerUser) => void;
    logoutCustomer: () => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ShopContext = createContext<ShopContextType | null>(null);

export function useShop() {
    const context = useContext(ShopContext);
    if (!context) {
        throw new Error('useShop must be used within a ShopLayout');
    }
    return context;
}

const getCsrfToken = (): string => {
    if (typeof document === 'undefined') return '';
    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
    if (metaTag && metaTag.content) return metaTag.content;
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
};

interface ShopLayoutProps {
    children: React.ReactNode;
}

export default function ShopLayout({ children }: ShopLayoutProps) {
    const pageProps = usePage<PageProps>().props;
    const store = pageProps.store;
    const currency = store?.currency || '$';

    // State - unified storage keys (syncs with ProductDetail.tsx)
    const [cart, setCart] = useState<CartItem[]>(() => {
        try {
            if (typeof window === 'undefined') return [];
            const saved = localStorage.getItem('ecommerce_shop_cart') || localStorage.getItem('customer_cart');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
        try {
            if (typeof window === 'undefined') return [];
            const saved = localStorage.getItem('customer_wishlist');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [customer, setCustomer] = useState<CustomerUser | null>(() => {
        try {
            if (typeof window === 'undefined') return null;
            const saved = localStorage.getItem('customer_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const [customerToken, setCustomerToken] = useState<string | null>(() => {
        try {
            if (typeof window === 'undefined') return null;
            return localStorage.getItem('customer_token');
        } catch {
            return null;
        }
    });

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isWishlistOpen, setIsWishlistOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isOrderTrackingModalOpen, setIsOrderTrackingModalOpen] = useState(false);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Save cart & wishlist to localStorage under both keys
    useEffect(() => {
        try {
            const json = JSON.stringify(cart);
            localStorage.setItem('ecommerce_shop_cart', json);
            localStorage.setItem('customer_cart', json);
        } catch (e) {
            console.error(e);
        }
    }, [cart]);

    useEffect(() => {
        try {
            localStorage.setItem('customer_wishlist', JSON.stringify(wishlist));
        } catch (e) {
            console.error(e);
        }
    }, [wishlist]);

    // Cross-tab / external sync listener
    useEffect(() => {
        const handleStorage = () => {
            try {
                const saved = localStorage.getItem('ecommerce_shop_cart') || localStorage.getItem('customer_cart');
                if (saved) {
                    setCart(JSON.parse(saved));
                }
            } catch (e) {
                console.error(e);
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // Live suggestion search state in header
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; slug: string; price: number; image?: string; category?: string }>>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Debounced search suggestions via User API
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/user/search/suggestions?q=${encodeURIComponent(searchQuery)}`, {
                    headers: { Accept: 'application/json' },
                });
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data.data || []);
                    setShowSuggestions(true);
                }
            } catch (err) {
                console.error('Error fetching suggestions:', err);
            } finally {
                setIsSearching(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Cart calculations
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const addToCart = (item: CartItem) => {
        setCart((prev) => {
            const index = prev.findIndex(
                (i) => i.product_id === item.product_id && (i.product_variant_id ?? null) === (item.product_variant_id ?? null)
            );
            if (index > -1) {
                const next = [...prev];
                const currentQty = next[index].quantity;
                const newQty = Math.min(currentQty + item.quantity, item.max_stock || 999);
                next[index] = { ...next[index], quantity: newQty };
                return next;
            }
            return [...prev, item];
        });
        showToast(`Added "${item.product_name}" to your cart!`, 'success');
        setIsCartOpen(true);
    };

    const updateCartQuantity = (itemId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.id === itemId) {
                        const newQty = item.quantity + delta;
                        return newQty > 0 ? { ...item, quantity: Math.min(newQty, item.max_stock || 999) } : null;
                    }
                    return item;
                })
                .filter(Boolean) as CartItem[]
        );
    };

    const removeFromCart = (itemId: string) => {
        setCart((prev) => prev.filter((i) => i.id !== itemId));
        showToast('Item removed from cart', 'info');
    };

    const clearCart = () => {
        setCart([]);
        try {
            localStorage.removeItem('ecommerce_shop_cart');
            localStorage.removeItem('customer_cart');
        } catch (e) {
            console.error(e);
        }
    };

    // Wishlist actions
    const toggleWishlist = (item: WishlistItem) => {
        const exists = wishlist.some((w) => w.product_id === item.product_id);
        if (exists) {
            setWishlist((prev) => prev.filter((w) => w.product_id !== item.product_id));
            showToast(`Removed from wishlist`, 'info');
        } else {
            setWishlist((prev) => [...prev, item]);
            showToast(`Saved to wishlist!`, 'success');
        }

        if (customerToken) {
            fetch('/api/user/wishlist/toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${customerToken}`,
                },
                body: JSON.stringify({ product_id: item.product_id }),
            }).catch(console.error);
        }
    };

    const isInWishlist = (productId: string) => {
        return wishlist.some((w) => w.product_id === productId);
    };

    // Auth actions
    const loginCustomer = (token: string, user: CustomerUser) => {
        setCustomerToken(token);
        setCustomer(user);
        try {
            localStorage.setItem('customer_token', token);
            localStorage.setItem('customer_user', JSON.stringify(user));
        } catch (e) {
            console.error(e);
        }
        setIsAuthModalOpen(false);
        showToast(`Welcome back, ${user.name}!`, 'success');
    };

    const logoutCustomer = async () => {
        if (customerToken) {
            try {
                await fetch('/api/user/auth/logout', {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${customerToken}`,
                    },
                });
            } catch (e) {
                console.error(e);
            }
        }
        setCustomerToken(null);
        setCustomer(null);
        try {
            localStorage.removeItem('customer_token');
            localStorage.removeItem('customer_user');
        } catch (e) {
            console.error(e);
        }
        showToast('You have been logged out.', 'info');
    };

    // Verify customer token and fetch fresh profile on mount or token change
    useEffect(() => {
        if (!customerToken) return;

        fetch('/api/user/auth/profile', {
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${customerToken}`,
            },
        })
            .then((res) => {
                if (res.status === 401) {
                    setCustomerToken(null);
                    setCustomer(null);
                    try {
                        localStorage.removeItem('customer_token');
                        localStorage.removeItem('customer_user');
                    } catch {
                        // Ignore
                    }
                    return null;
                }
                return res.ok ? res.json() : null;
            })
            .then((data) => {
                if (data?.data?.customer) {
                    setCustomer(data.data.customer);
                    try {
                        localStorage.setItem('customer_user', JSON.stringify(data.data.customer));
                    } catch {
                        // Ignore
                    }
                }
            })
            .catch(() => {});
    }, [customerToken]);

    return (
        <ShopContext.Provider
            value={{
                cart,
                addToCart,
                updateCartQuantity,
                removeFromCart,
                clearCart,
                cartCount,
                cartSubtotal,
                isCartOpen,
                setIsCartOpen,
                wishlist,
                toggleWishlist,
                isInWishlist,
                isWishlistOpen,
                setIsWishlistOpen,
                customer,
                customerToken,
                isAuthModalOpen,
                setIsAuthModalOpen,
                isCheckoutModalOpen,
                setIsCheckoutModalOpen,
                isOrderTrackingModalOpen,
                setIsOrderTrackingModalOpen,
                loginCustomer,
                logoutCustomer,
                showToast,
            }}
        >
            <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
                {/* Top Notification Bar */}
                <div className="bg-indigo-600 text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" /> Free Express Shipping on orders over {currency}50
                    </span>
                    <span className="hidden md:inline">•</span>
                    <span className="hidden md:flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> 100% Secure Checkout & Satisfaction Guarantee
                    </span>
                </div>

                {/* Main Storefront Header */}
                <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
                        {/* Logo & Store Name */}
                        <Link href="/shop" className="flex items-center gap-2.5 group shrink-0">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white block leading-none">
                                    {store?.name || 'Customer Store'}
                                </span>
                                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                                    Official Storefront
                                </span>
                            </div>
                        </Link>

                        {/* Search Bar with Live Suggestions Dropdown */}
                        <div className="relative flex-1 max-w-xl hidden md:block">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search products, brands, or categories..."
                                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all outline-hidden"
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setShowSuggestions(false);
                                        }}
                                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Suggestions Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 overflow-hidden">
                                    <div className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                                        Search Suggestions
                                    </div>
                                    {suggestions.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={`/product/${item.slug}`}
                                            onClick={() => setShowSuggestions(false)}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                                        >
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-lg" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{currency}{item.price}</p>
                                            </div>
                                        </Link>
                                    ))}
                                    <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1 px-3">
                                        <Link
                                            href={`/shop?search=${encodeURIComponent(searchQuery)}`}
                                            onClick={() => setShowSuggestions(false)}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 py-1"
                                        >
                                            View all results for "{searchQuery}" <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Customer Header Action Buttons */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Track Order Button */}
                            <button
                                type="button"
                                onClick={() => setIsOrderTrackingModalOpen(true)}
                                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Track My Order"
                            >
                                <Package className="w-4 h-4 text-slate-500" />
                                <span>Track Order</span>
                            </button>

                            {/* Wishlist Button */}
                            <button
                                type="button"
                                onClick={() => setIsWishlistOpen(true)}
                                className="relative p-2.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Wishlist"
                            >
                                <Heart className="w-5 h-5" />
                                {wishlist.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                                        {wishlist.length}
                                    </span>
                                )}
                            </button>

                            {/* Cart Button */}
                            <button
                                type="button"
                                onClick={() => setIsCartOpen(true)}
                                className="relative flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
                            >
                                <ShoppingCart className="w-4.5 h-4.5" />
                                <span className="hidden sm:inline font-bold">
                                    {cartSubtotal > 0 ? `${currency}${cartSubtotal.toFixed(2)}` : 'Cart'}
                                </span>
                                {cartCount > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                                        {cartCount}
                                    </span>
                                )}
                            </button>

                            {/* Customer Auth / Profile Button */}
                            {customer ? (
                                <div className="relative group">
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-semibold cursor-pointer"
                                    >
                                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs uppercase font-bold">
                                            {customer.name.charAt(0)}
                                        </div>
                                        <span className="hidden sm:inline max-w-[100px] truncate">{customer.name}</span>
                                    </button>

                                    {/* User Dropdown */}
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 hidden group-hover:block hover:block z-50">
                                        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{customer.name}</p>
                                            <p className="text-[11px] text-slate-500 truncate">{customer.email}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsOrderTrackingModalOpen(true)}
                                            className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Package className="w-3.5 h-3.5" /> My Orders
                                        </button>
                                        <button
                                            type="button"
                                            onClick={logoutCustomer}
                                            className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 cursor-pointer"
                                        >
                                            <LogOut className="w-3.5 h-3.5" /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsAuthModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-500 dark:hover:text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
                                >
                                    <UserIcon className="w-4 h-4" />
                                    <span>Sign In</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile Search Input */}
                    <div className="px-4 pb-3 md:hidden">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search products..."
                                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                    </div>
                </header>

                {/* Main Page Content */}
                <main className="flex-1">{children}</main>

                {/* Storefront Footer */}
                <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-20 pt-12 pb-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Features Banner */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                                    <Truck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Free Delivery</h4>
                                    <p className="text-xs text-slate-500">Orders over {currency}50</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Secure Payments</h4>
                                    <p className="text-xs text-slate-500">Encrypted transactions</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Authentic Goods</h4>
                                    <p className="text-xs text-slate-500">100% Quality guarantee</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                                    <Headphones className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">24/7 Support</h4>
                                    <p className="text-xs text-slate-500">Dedicated assistance</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Bottom Links */}
                        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                            <p>© {new Date().getFullYear()} {store?.name || 'Customer Storefront'}. All rights reserved.</p>
                            <div className="flex items-center gap-6">
                                <Link href="/shop" className="hover:text-indigo-600">Shop Catalog</Link>
                                <button type="button" onClick={() => setIsOrderTrackingModalOpen(true)} className="hover:text-indigo-600 cursor-pointer">
                                    Order Tracking
                                </button>
                                <button type="button" onClick={() => setIsCartOpen(true)} className="hover:text-indigo-600 cursor-pointer">
                                    My Cart ({cartCount})
                                </button>
                            </div>
                        </div>
                    </div>
                </footer>

                {/* SLIDE-OVER CART DRAWER */}
                {isCartOpen && (
                    <div className="fixed inset-0 z-50 overflow-hidden">
                        <div
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                            onClick={() => setIsCartOpen(false)}
                        />
                        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                            <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
                                {/* Drawer Header */}
                                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5 text-indigo-600" />
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">Shopping Cart</h3>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                                            {cartCount} {cartCount === 1 ? 'item' : 'items'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {cart.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={clearCart}
                                                className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                            >
                                                Clear All
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setIsCartOpen(false)}
                                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Free Shipping Progress Bar */}
                                <div className="px-5 py-3 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50">
                                    {cartSubtotal >= 50 ? (
                                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                            <Sparkles className="w-4 h-4 text-amber-500" />
                                            <span>🎉 Congratulations! You unlocked FREE Delivery!</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                <span>Add <strong>{currency}{(50 - cartSubtotal).toFixed(2)}</strong> for FREE shipping</span>
                                                <span>{Math.round((cartSubtotal / 50) * 100)}%</span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                                                    style={{ width: `${Math.min(100, (cartSubtotal / 50) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Cart Items List */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                                                <ShoppingBag className="w-8 h-8" />
                                            </div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">Your cart is empty</p>
                                            <p className="text-xs mt-1 text-slate-500">Explore our catalog and find something you love!</p>
                                            <button
                                                type="button"
                                                onClick={() => setIsCartOpen(false)}
                                                className="mt-5 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
                                            >
                                                Start Shopping
                                            </button>
                                        </div>
                                    ) : (
                                        cart.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex gap-3 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 transition-all"
                                            >
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.product_name}
                                                        className="w-16 h-16 object-cover rounded-xl shrink-0 border border-slate-200/50 dark:border-slate-700"
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                                        <Package className="w-6 h-6" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                        {item.product_name}
                                                    </h4>
                                                    {item.variant_name && (
                                                        <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 truncate">
                                                            {item.variant_name}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-slate-400">SKU: {item.sku}</p>

                                                    <div className="flex items-center justify-between mt-2">
                                                        <div>
                                                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                                {currency}{(item.price * item.quantity).toFixed(2)}
                                                            </span>
                                                            {item.quantity > 1 && (
                                                                <span className="text-[10px] text-slate-400 ml-1">
                                                                    ({currency}{item.price.toFixed(2)} each)
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-2 py-0.5 shadow-2xs">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateCartQuantity(item.id, -1)}
                                                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                                                title="Decrease"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="text-xs font-bold px-1.5">{item.quantity}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateCartQuantity(item.id, 1)}
                                                                disabled={item.quantity >= item.max_stock}
                                                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                                                                title="Increase"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="text-slate-400 hover:text-rose-500 p-1 self-start cursor-pointer"
                                                    title="Remove item"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Drawer Footer */}
                                {cart.length > 0 && (
                                    <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">Subtotal ({cartCount} items)</span>
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {currency}{cartSubtotal.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">Estimated Delivery</span>
                                            <span className={`font-semibold ${cartSubtotal >= 50 ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {cartSubtotal >= 50 ? 'FREE' : `${currency}5.00`}
                                            </span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm font-bold">
                                            <span className="text-slate-900 dark:text-white">Estimated Total</span>
                                            <span className="text-indigo-600 dark:text-indigo-400 text-base font-extrabold">
                                                {currency}{(cartSubtotal + (cartSubtotal >= 50 ? 0 : 5)).toFixed(2)}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCartOpen(false);
                                                setIsCheckoutModalOpen(true);
                                            }}
                                            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
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

                {/* WISHLIST DRAWER */}
                {isWishlistOpen && (
                    <div className="fixed inset-0 z-50 overflow-hidden">
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setIsWishlistOpen(false)} />
                        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                            <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
                                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">My Wishlist</h3>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                                            {wishlist.length}
                                        </span>
                                    </div>
                                    <button type="button" onClick={() => setIsWishlistOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                    {wishlist.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                                            <Heart className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">Your wishlist is empty</p>
                                            <p className="text-xs text-slate-400 mt-1">Tap the heart icon on any product to save it for later.</p>
                                        </div>
                                    ) : (
                                        wishlist.map((item) => (
                                            <div key={item.product_id} className="flex gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt={item.name} className="w-14 h-14 object-cover rounded-xl" />
                                                    ) : (
                                                        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                            <Package className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <Link href={`/product/${item.slug}`} className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 truncate block max-w-[180px]">
                                                            {item.name}
                                                        </Link>
                                                        <p className="text-xs font-bold text-indigo-600 mt-0.5">{currency}{item.price.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            addToCart({
                                                                id: `${item.product_id}-cart`,
                                                                product_id: item.product_id,
                                                                product_name: item.name,
                                                                sku: item.product_id,
                                                                price: item.price,
                                                                mrp: item.mrp,
                                                                quantity: 1,
                                                                image_url: item.image_url,
                                                                max_stock: 99,
                                                            });
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 cursor-pointer"
                                                    >
                                                        Add to Cart
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleWishlist(item)}
                                                        className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CUSTOMER AUTH MODAL */}
                {isAuthModalOpen && (
                    <CustomerAuthModal
                        onClose={() => setIsAuthModalOpen(false)}
                        onSuccess={loginCustomer}
                    />
                )}

                {/* FULL CHECKOUT MODAL & FLOW */}
                {isCheckoutModalOpen && (
                    <CustomerCheckoutModal
                        onClose={() => setIsCheckoutModalOpen(false)}
                        cart={cart}
                        currency={currency}
                        customer={customer}
                        customerToken={customerToken}
                        onSuccess={(placedOrder) => {
                            clearCart();
                            showToast(`Order #${placedOrder?.order_number || ''} placed successfully!`, 'success');
                        }}
                        onOpenTracking={() => {
                            setIsCheckoutModalOpen(false);
                            setIsOrderTrackingModalOpen(true);
                        }}
                        onLoginSuccess={loginCustomer}
                    />
                )}

                {/* ORDER TRACKING MODAL */}
                {isOrderTrackingModalOpen && (
                    <CustomerOrderModal
                        onClose={() => setIsOrderTrackingModalOpen(false)}
                        customer={customer}
                        customerToken={customerToken}
                        currency={currency}
                    />
                )}

                {/* TOAST NOTIFICATION POPUP */}
                {toast && (
                    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
                        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                        {toast.type === 'info' && <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />}
                        <span className="text-xs font-medium">{toast.message}</span>
                    </div>
                )}
            </div>
        </ShopContext.Provider>
    );
}

// -------------------------------------------------------------
// Customer Auth Modal Component
// -------------------------------------------------------------
function CustomerAuthModal({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: (token: string, user: CustomerUser) => void;
}) {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            let accessToken = '';

            if (mode === 'login') {
                const res = await fetch('/api/user/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ email: email.trim(), password }),
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Invalid email or password');
                }
                accessToken = data.data?.access_token || data.token;
            } else {
                const res = await fetch('/api/user/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({
                        name: name.trim(),
                        email: email.trim(),
                        phone: phone.trim() || undefined,
                        password,
                        password_confirmation: passwordConfirmation,
                    }),
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    const validationMsg = data.errors ? Object.values(data.errors).flat().join(' ') : null;
                    throw new Error(validationMsg || data.message || 'Registration failed');
                }
                accessToken = data.data?.access_token || data.token;
            }

            if (!accessToken) {
                throw new Error('Access token was not returned. Please try again.');
            }

            // Immediately retrieve the authenticated customer profile
            let customerData: CustomerUser = {
                id: '',
                name: name.trim() || email.split('@')[0],
                email: email.trim(),
                phone: phone.trim() || null,
            };

            try {
                const profileRes = await fetch('/api/user/auth/profile', {
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                if (profileRes.ok) {
                    const profileJson = await profileRes.json();
                    if (profileJson.data?.customer) {
                        customerData = profileJson.data.customer;
                    }
                }
            } catch {
                // Keep customerData fallback
            }

            onSuccess(accessToken, customerData);
        } catch (err: any) {
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                            {mode === 'login' ? 'Customer Sign In' : 'Create an Account'}
                        </h3>
                        <p className="text-xs text-slate-500">Access your orders, saved cart, and wishlist</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex border-b border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('login');
                            setError(null);
                        }}
                        className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                            mode === 'login'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode('register');
                            setError(null);
                        }}
                        className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                            mode === 'register'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Register
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {mode === 'register' && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Jane Doe"
                                className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jane@example.com"
                            className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                        />
                    </div>

                    {mode === 'register' && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Phone Number (Optional)
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 234 567 8900"
                                className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                        />
                    </div>

                    {mode === 'register' && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                required
                                value={passwordConfirmation}
                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
}

// -------------------------------------------------------------
// Customer Address & Shipping Types
// -------------------------------------------------------------
interface CustomerAddress {
    id: string;
    customer_id?: string;
    type?: string;
    name: string;
    phone?: string | null;
    address_line_1: string;
    address_line_2?: string | null;
    city: string;
    state?: string | null;
    postal_code: string;
    country?: string | null;
    is_default?: boolean;
    formatted_address?: string;
}

interface ShippingRate {
    carrier: string;
    service_name: string;
    cost: number;
    estimated_days: number;
    currency: string;
    available: boolean;
}

// -------------------------------------------------------------
interface PaymentMethodOption {
    id: string;
    name: string;
    label: string;
    sub?: string;
}

// Customer Checkout Modal (Integrated with app/Http/Controllers/User APIs)
// -------------------------------------------------------------
function CustomerCheckoutModal({
    onClose,
    cart,
    currency,
    customer,
    customerToken,
    onSuccess,
    onOpenTracking,
    onLoginSuccess,
}: {
    onClose: () => void;
    cart: CartItem[];
    currency: string;
    customer: CustomerUser | null;
    customerToken: string | null;
    onSuccess: (order: any) => void;
    onOpenTracking: () => void;
    onLoginSuccess: (token: string, user: CustomerUser) => void;
}) {
    // In-modal authentication state for non-logged in shoppers
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [authName, setAuthName] = useState('');
    const [authEmail, setAuthEmail] = useState('');
    const [authPhone, setAuthPhone] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authConfirmPassword, setAuthConfirmPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // Saved Addresses from User\AddressController
    const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [useNewAddress, setUseNewAddress] = useState(false);
    const [loadingAddresses, setLoadingAddresses] = useState(false);

    // New Address Form Fields
    const [recipientName, setRecipientName] = useState(customer?.name || '');
    const [recipientPhone, setRecipientPhone] = useState(customer?.phone || '');
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('United States');
    const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);

    // Shipping Carrier & Rates from User\CheckoutController@getShippingRates
    const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
    const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>('flat_rate');
    const [loadingShippingRates, setLoadingShippingRates] = useState(false);

    // Payment Gateways loaded dynamically based on Settings via User\CheckoutController
    const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethodOption[]>([
        { id: 'cod', name: 'cod', label: 'Cash on Delivery', sub: 'Pay upon parcel arrival' },
        { id: 'stripe', name: 'stripe', label: 'Stripe', sub: 'Instant & Encrypted (Stripe)' },
        { id: 'paypal', name: 'paypal', label: 'PayPal', sub: 'Safe digital checkout' },
    ]);
    const [paymentGateway, setPaymentGateway] = useState<string>('cod');
    const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

    // Coupon
    const [couponCode, setCouponCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [couponMessage, setCouponMessage] = useState<string | null>(null);

    // Order notes & state
    const [orderNotes, setOrderNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);

    // Fetch saved addresses via User\AddressController
    const fetchAddresses = async (token: string) => {
        setLoadingAddresses(true);
        try {
            const res = await fetch('/api/user/addresses', {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                const addresses: CustomerAddress[] = data.data || [];
                setSavedAddresses(addresses);
                if (addresses.length > 0) {
                    const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
                    setSelectedAddressId(defaultAddr.id);
                    setUseNewAddress(false);
                } else {
                    setUseNewAddress(true);
                }
            }
        } catch (err) {
            console.error('Error fetching customer addresses:', err);
        } finally {
            setLoadingAddresses(false);
        }
    };

    useEffect(() => {
        if (customerToken) {
            fetchAddresses(customerToken);
        }
    }, [customerToken]);

    // Fetch active payment methods configured in Settings via User\CheckoutController
    const fetchPaymentMethods = async () => {
        setLoadingPaymentMethods(true);
        try {
            const res = await fetch('/api/user/checkout/payment-methods', {
                headers: {
                    Accept: 'application/json',
                    ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}),
                },
            });
            if (res.ok) {
                const data = await res.json();
                const methods: PaymentMethodOption[] = data.data?.payment_methods || data.data || [];
                if (methods.length > 0) {
                    setAvailablePaymentMethods(methods);
                    setPaymentGateway((prev) => {
                        return methods.some((m) => m.id === prev) ? prev : methods[0].id;
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching available payment methods:', err);
        } finally {
            setLoadingPaymentMethods(false);
        }
    };

    useEffect(() => {
        fetchPaymentMethods();
    }, [customerToken]);

    // Subtotal calculations
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    // Fetch real-time shipping rate quotes from User\CheckoutController@getShippingRates
    useEffect(() => {
        if (!customerToken) return;

        const timer = setTimeout(async () => {
            setLoadingShippingRates(true);
            try {
                const body: any = {
                    subtotal: subtotal,
                    items: cart.map((i) => ({
                        product_id: i.product_id,
                        product_variant_id: i.product_variant_id || null,
                        quantity: i.quantity,
                    })),
                };

                if (selectedAddressId && !useNewAddress) {
                    body.shipping_address_id = selectedAddressId;
                } else if (addressLine1.trim() && city.trim()) {
                    body.shipping_address = [addressLine1, addressLine2, city, state, postalCode, country].filter(Boolean).join(', ');
                }

                const res = await fetch('/api/user/checkout/shipping-rates', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${customerToken}`,
                    },
                    body: JSON.stringify(body),
                });

                if (res.ok) {
                    const data = await res.json();
                    const rates: ShippingRate[] = data.data?.rates || [];
                    setShippingRates(rates);
                    if (rates.length > 0) {
                        const freeRate = rates.find((r) => r.carrier === 'free_shipping' && r.available);
                        const defaultRate = freeRate || rates.find((r) => r.available) || rates[0];
                        setSelectedShippingMethod(defaultRate.carrier);
                    }
                }
            } catch (err) {
                console.error('Error fetching shipping rates:', err);
            } finally {
                setLoadingShippingRates(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [customerToken, selectedAddressId, useNewAddress, addressLine1, city, subtotal, cart.length]);

    // Current shipping fee
    const currentRate = shippingRates.find((r) => r.carrier === selectedShippingMethod);
    const shippingFee = currentRate ? Number(currentRate.cost) : (subtotal >= 50 ? 0 : 10.0);
    const grandTotal = Math.max(0, subtotal - discount + shippingFee);

    // Inline Auth Handler
    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setAuthLoading(true);

        try {
            let token = '';
            if (authMode === 'login') {
                const res = await fetch('/api/user/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Invalid email or password.');
                }
                token = data.data?.access_token || data.token;
            } else {
                const res = await fetch('/api/user/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({
                        name: authName.trim(),
                        email: authEmail.trim(),
                        phone: authPhone.trim() || undefined,
                        password: authPassword,
                        password_confirmation: authConfirmPassword,
                    }),
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    const msg = data.errors ? Object.values(data.errors).flat().join(' ') : data.message;
                    throw new Error(msg || 'Registration failed.');
                }
                token = data.data?.access_token || data.token;
            }

            if (!token) throw new Error('Authentication token was not returned.');

            // Fetch profile
            const profileRes = await fetch('/api/user/auth/profile', {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            let userObj: CustomerUser = {
                id: '',
                name: authName.trim() || authEmail.split('@')[0],
                email: authEmail.trim(),
                phone: authPhone.trim() || null,
            };
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                if (profileData.data?.customer) {
                    userObj = profileData.data.customer;
                }
            }

            onLoginSuccess(token, userObj);
            setRecipientName(userObj.name);
            setRecipientPhone(userObj.phone || '');
            fetchAddresses(token);
        } catch (err: any) {
            setAuthError(err.message || 'Authentication error.');
        } finally {
            setAuthLoading(false);
        }
    };

    // Apply Coupon via User CheckoutController
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        setCouponMessage(null);
        try {
            const res = await fetch('/api/user/checkout/apply-coupon', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${customerToken}`,
                },
                body: JSON.stringify({
                    code: couponCode.trim(),
                    subtotal: subtotal,
                    items: cart.map((i) => ({
                        product_id: i.product_id,
                        product_variant_id: i.product_variant_id || null,
                        quantity: i.quantity,
                        price: i.price,
                    })),
                }),
            });
            const data = await res.json();
            const disc = data.data?.discount ?? data.discount ?? 0;
            if (data.success && Number(disc) > 0) {
                setDiscount(Number(disc));
                setCouponMessage(`Coupon Applied: -${currency}${Number(disc).toFixed(2)} savings!`);
            } else if (data.success) {
                setDiscount(0);
                setCouponMessage(data.message || 'Coupon validated.');
            } else {
                setDiscount(0);
                setCouponMessage(data.message || 'Invalid or expired coupon code.');
            }
        } catch {
            setCouponMessage('Error validating coupon. Please try again.');
        } finally {
            setValidatingCoupon(false);
        }
    };

    // Submit Checkout via User\CheckoutController@checkout
    const handleSubmitCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setCheckoutError(null);

        if (!customerToken) {
            setCheckoutError('Please sign in to complete checkout.');
            return;
        }

        if (cart.length === 0) {
            setCheckoutError('Your shopping cart is empty.');
            return;
        }

        if (!selectedAddressId && (!addressLine1.trim() || !city.trim() || !postalCode.trim())) {
            setCheckoutError('Please select or enter a complete shipping address.');
            return;
        }

        setIsSubmitting(true);

        const payload: Record<string, any> = {
            billing_same_as_shipping: true,
            shipping_method: selectedShippingMethod || 'flat_rate',
            payment_method: paymentGateway,
            coupon_code: discount > 0 ? couponCode.trim().toUpperCase() : null,
            notes: orderNotes.trim() || null,
            items: cart.map((i) => ({
                product_id: i.product_id,
                product_variant_id: i.product_variant_id || null,
                quantity: i.quantity,
            })),
        };

        if (selectedAddressId && !useNewAddress) {
            payload.shipping_address_id = selectedAddressId;
        } else {
            payload.shipping_address = {
                name: recipientName.trim() || customer?.name,
                phone: recipientPhone.trim() || customer?.phone,
                address_line_1: addressLine1.trim(),
                address_line_2: addressLine2.trim() || null,
                city: city.trim(),
                state: state.trim() || null,
                postal_code: postalCode.trim(),
                country: country.trim() || 'United States',
            };
            payload.save_address = saveAddressToAccount;
        }

        if (paymentGateway === 'stripe') {
            payload.flow = 'checkout_session';
        }

        try {
            const res = await fetch('/api/user/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${customerToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                const errMsg = data.errors ? Object.values(data.errors).flat().join(', ') : data.message;
                throw new Error(errMsg || 'Checkout failed. Please review your address and payment.');
            }

            const order = data.data?.order || data.order;
            const payment = data.data?.payment || data.payment;
            const redirectUrl = data.data?.redirect_url || data.redirect_url;

            setConfirmedOrder({
                ...order,
                payment,
                redirect_url: redirectUrl,
            });
            onSuccess(order);
        } catch (err: any) {
            setCheckoutError(err.message || 'Checkout failed. Please review your address and payment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // If order is confirmed, display full confirmation screen
    if (confirmedOrder) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6 animate-in fade-in zoom-in-95">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                        <Check className="w-10 h-10 stroke-[3]" />
                    </div>

                    <div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            Order Confirmed
                        </span>
                        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                            Thank you for your order!
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            Your order has been recorded and processed via our User Checkout System.
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-left space-y-2.5 text-xs">
                        <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                            <span className="text-slate-500">Order Reference</span>
                            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                                #{confirmedOrder.order_number}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Carrier & Tracking</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                                {confirmedOrder.shipping_carrier || 'Standard'} ({confirmedOrder.tracking_number || 'Tracking Generated'})
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Payment Gateway</span>
                            <span className="font-semibold uppercase text-slate-800 dark:text-slate-200">
                                {confirmedOrder.payment_method === 'cod'
                                    ? 'Cash on Delivery (Pending)'
                                    : confirmedOrder.payment_method === 'stripe'
                                    ? (confirmedOrder.redirect_url ? 'Stripe Checkout (Action Required)' : 'Stripe Credit Card (Paid)')
                                    : confirmedOrder.payment_method === 'razorpay'
                                    ? (confirmedOrder.redirect_url ? 'Razorpay (Action Required)' : 'Razorpay (Paid)')
                                    : 'PayPal Gateway'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Total Paid</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                                {currency}{Number(confirmedOrder.total).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Delivery To</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                                {confirmedOrder.shipping_address}
                            </span>
                        </div>
                    </div>

                    {confirmedOrder.redirect_url && (
                        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 text-left">
                            <p className="font-bold mb-1">
                                {confirmedOrder.payment_method === 'stripe'
                                    ? 'Stripe Card Payment Required'
                                    : confirmedOrder.payment_method === 'razorpay'
                                    ? 'Razorpay Payment Required'
                                    : 'External Payment Required'}
                            </p>
                            <p className="text-[11px] mb-2 text-slate-600 dark:text-slate-400">
                                {confirmedOrder.payment_method === 'stripe'
                                    ? 'Please proceed to Stripe secure checkout to enter your card details and complete payment:'
                                    : confirmedOrder.payment_method === 'razorpay'
                                    ? 'Please proceed to Razorpay secure checkout to complete payment via UPI, NetBanking, or Card:'
                                    : 'Please complete payment through the PayPal approval session:'}
                            </p>
                            <a
                                href={confirmedOrder.redirect_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                            >
                                <span>
                                    {confirmedOrder.payment_method === 'stripe'
                                        ? 'Pay on Stripe (Enter Card Details)'
                                        : confirmedOrder.payment_method === 'razorpay'
                                        ? 'Pay with Razorpay (UPI, Card, NetBanking)'
                                        : 'Proceed to PayPal'}
                                </span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onOpenTracking}
                            className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                        >
                            <Package className="w-4 h-4" />
                            <span>Track Order</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs transition-colors cursor-pointer"
                        >
                            Continue Shopping
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // IF NOT LOGGED IN: Show Customer Login / Register Screen
    if (!customerToken || !customer) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <Lock className="w-5 h-5 text-indigo-600" />
                                <span>Customer Checkout Login</span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Please sign in to proceed with your saved addresses & order placement</p>
                        </div>
                        <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                setAuthMode('login');
                                setAuthError(null);
                            }}
                            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                                authMode === 'login'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAuthMode('register');
                                setAuthError(null);
                            }}
                            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                                authMode === 'register'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            Create Customer Account
                        </button>
                    </div>

                    <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
                        {authError && (
                            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{authError}</span>
                            </div>
                        )}

                        {authMode === 'register' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={authName}
                                    onChange={(e) => setAuthName(e.target.value)}
                                    placeholder="Jane Doe"
                                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Email Address *
                            </label>
                            <input
                                type="email"
                                required
                                value={authEmail}
                                onChange={(e) => setAuthEmail(e.target.value)}
                                placeholder="jane@example.com"
                                className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                            />
                        </div>

                        {authMode === 'register' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Phone Number (Optional)
                                </label>
                                <input
                                    type="tel"
                                    value={authPhone}
                                    onChange={(e) => setAuthPhone(e.target.value)}
                                    placeholder="+1 234 567 8900"
                                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Password *
                            </label>
                            <input
                                type="password"
                                required
                                value={authPassword}
                                onChange={(e) => setAuthPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                            />
                        </div>

                        {authMode === 'register' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Confirm Password *
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={authConfirmPassword}
                                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                        >
                            {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>{authMode === 'login' ? 'Sign In & Continue' : 'Create Account & Continue'}</span>
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // MAIN CHECKOUT MODAL (AUTHENTICATED CUSTOMER)
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                <span>Customer Checkout</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                    Official Gateway
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500">
                                Signed in as <strong className="text-slate-700 dark:text-slate-300">{customer.name}</strong> ({customer.email})
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmitCheckout} className="p-6 overflow-y-auto space-y-6 flex-1">
                    {checkoutError && (
                        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="font-medium">{checkoutError}</span>
                        </div>
                    )}

                    {/* Step 1: Shipping Address Flow */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-indigo-600" />
                                <span>1. Delivery Address</span>
                            </h4>
                            {savedAddresses.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setUseNewAddress(!useNewAddress)}
                                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                >
                                    {useNewAddress ? '← Choose from Saved Addresses' : '+ Add New Address'}
                                </button>
                            )}
                        </div>

                        {/* List Saved Addresses */}
                        {!useNewAddress && savedAddresses.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {savedAddresses.map((addr) => {
                                    const isSelected = selectedAddressId === addr.id;
                                    return (
                                        <div
                                            key={addr.id}
                                            onClick={() => setSelectedAddressId(addr.id)}
                                            className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-600/20'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {addr.name}
                                                </span>
                                                {addr.is_default && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                {addr.address_line_1} {addr.address_line_2}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {addr.city}, {addr.state} {addr.postal_code}
                                            </p>
                                            {addr.phone && (
                                                <p className="text-[11px] text-slate-400 mt-1">Tel: {addr.phone}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Add New Address Form */}
                        {(useNewAddress || savedAddresses.length === 0) && (
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Recipient Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={recipientName}
                                            onChange={(e) => setRecipientName(e.target.value)}
                                            placeholder="Jane Doe"
                                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Phone Number *
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={recipientPhone}
                                            onChange={(e) => setRecipientPhone(e.target.value)}
                                            placeholder="+1 234 567 8900"
                                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Street Address (Line 1) *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={addressLine1}
                                        onChange={(e) => setAddressLine1(e.target.value)}
                                        placeholder="123 Market St, Apt 4B"
                                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            City *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="San Francisco"
                                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            State
                                        </label>
                                        <input
                                            type="text"
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            placeholder="CA"
                                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Postal Code *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={postalCode}
                                            onChange={(e) => setPostalCode(e.target.value)}
                                            placeholder="94103"
                                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                        />
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={saveAddressToAccount}
                                        onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>Save this address to my account for future orders</span>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Shipping Method Flow */}
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Truck className="w-4 h-4 text-indigo-600" />
                                <span>2. Shipping Carrier & Delivery Method</span>
                            </h4>
                            {loadingShippingRates && (
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Calculating rates...
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {shippingRates.length > 0 ? (
                                shippingRates.map((rate) => {
                                    const isSelected = selectedShippingMethod === rate.carrier;
                                    return (
                                        <button
                                            type="button"
                                            key={rate.carrier}
                                            onClick={() => setSelectedShippingMethod(rate.carrier)}
                                            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                                                isSelected
                                                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-600/20'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                            }`}
                                        >
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {rate.service_name}
                                                </p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    Est. delivery: {rate.estimated_days} business days
                                                </p>
                                            </div>
                                            <span className={`text-xs font-extrabold ${rate.cost === 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                                                {rate.cost === 0 ? 'FREE' : `${currency}${Number(rate.cost).toFixed(2)}`}
                                            </span>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between col-span-2">
                                    <div>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">Standard Delivery</p>
                                        <p className="text-[11px] text-slate-500">Free shipping on orders over {currency}50</p>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-600">
                                        {subtotal >= 50 ? 'FREE' : `${currency}10.00`}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 3: Payment Gateway Architecture */}
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <CreditCard className="w-4 h-4 text-indigo-600" />
                                <span>3. Payment Gateway Concept</span>
                            </span>
                            {loadingPaymentMethods && (
                                <span className="text-[10px] text-slate-400 font-normal">Loading...</span>
                            )}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {availablePaymentMethods.map((pm) => {
                                const Icon = pm.id === 'stripe' ? CreditCard : pm.id === 'paypal' ? Wallet : Banknote;
                                const isSelected = paymentGateway === pm.id;
                                return (
                                    <button
                                        type="button"
                                        key={pm.id}
                                        onClick={() => setPaymentGateway(pm.id)}
                                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                            isSelected
                                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-600/20'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <Icon className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            {isSelected && <Check className="w-4 h-4 text-indigo-600 stroke-[3]" />}
                                        </div>
                                        <div>
                                            <p className={`text-xs font-bold ${isSelected ? 'text-indigo-950 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {pm.label}
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">{pm.sub || 'Instant checkout'}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Stripe Payment Badge (Card details removed, securely handled via Stripe) */}
                        {paymentGateway === 'stripe' && (
                            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5 animate-in fade-in">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                        Stripe Encrypted Payment
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                        <Lock className="w-3 h-3" /> PCI-DSS Compliant
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Payment processed securely via Stripe. Bank-level encryption with automated 3D-Secure authentication.
                                </p>
                            </div>
                        )}

                        {paymentGateway === 'cod' && (
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>💡 <strong>Cash on Delivery:</strong> Pay upon doorstep delivery of your parcel.</span>
                            </div>
                        )}

                        {paymentGateway === 'paypal' && (
                            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>🔒 <strong>PayPal Gateway:</strong> You will be redirected to PayPal sandbox to approve this checkout session.</span>
                            </div>
                        )}

                        {paymentGateway === 'razorpay' && (
                            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300 flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-sky-600 shrink-0" />
                                <span>🔒 <strong>Razorpay:</strong> Pay securely using UPI, NetBanking, or Cards.</span>
                            </div>
                        )}
                    </div>

                    {/* Step 4: Promo / Coupon Code */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Promo / Coupon Code
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                placeholder="E.g. DISCOUNT10"
                                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs uppercase font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden"
                            />
                            <button
                                type="button"
                                onClick={handleApplyCoupon}
                                disabled={validatingCoupon || !couponCode}
                                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {validatingCoupon ? 'Checking...' : 'Apply Code'}
                            </button>
                        </div>
                        {couponMessage && (
                            <p className={`text-[11px] mt-1.5 font-semibold ${discount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {couponMessage}
                            </p>
                        )}
                    </div>

                    {/* Order Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Order Instructions / Delivery Notes (Optional)
                        </label>
                        <textarea
                            rows={2}
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            placeholder="Leave parcel at front door, ring doorbell..."
                            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden resize-none"
                        />
                    </div>

                    {/* Order Summary Recap */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-2 border border-slate-200/80 dark:border-slate-700 text-xs">
                        <div className="flex items-center justify-between text-slate-500">
                            <span>Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {currency}{subtotal.toFixed(2)}
                            </span>
                        </div>
                        {discount > 0 && (
                            <div className="flex items-center justify-between text-emerald-600 font-bold">
                                <span>Coupon Discount</span>
                                <span>-{currency}{discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-slate-500">
                            <span>Shipping Fee ({currentRate?.service_name || 'Standard'})</span>
                            <span className={shippingFee === 0 ? 'text-emerald-600 font-bold' : 'font-semibold text-slate-800 dark:text-slate-200'}>
                                {shippingFee === 0 ? 'FREE' : `${currency}${shippingFee.toFixed(2)}`}
                            </span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-center justify-between text-base font-extrabold text-slate-900 dark:text-white">
                            <span>Grand Total</span>
                            <span className="text-indigo-600 dark:text-indigo-400">
                                {currency}{grandTotal.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || cart.length === 0}
                        className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Processing Payment with {paymentGateway.toUpperCase()}...</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-5 h-5" />
                                <span>Complete Order & Pay {currency}{grandTotal.toFixed(2)}</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

// -------------------------------------------------------------
// Customer Order Tracking Modal Component
// -------------------------------------------------------------
function CustomerOrderModal({
    onClose,
    customer,
    customerToken,
    currency,
}: {
    onClose: () => void;
    customer: CustomerUser | null;
    customerToken: string | null;
    currency: string;
}) {
    const [orderNumber, setOrderNumber] = useState('');
    const [searchedOrder, setSearchedOrder] = useState<any>(null);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch user recent orders if logged in
    useEffect(() => {
        if (!customerToken) return;
        fetch('/api/user/orders', {
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${customerToken}`,
            },
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.data) {
                    setRecentOrders(data.data);
                }
            })
            .catch(console.error);
    }, [customerToken]);

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderNumber.trim()) return;
        setError(null);
        setLoading(true);

        try {
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (customerToken) headers['Authorization'] = `Bearer ${customerToken}`;

            const res = await fetch(`/api/user/orders/${encodeURIComponent(orderNumber.trim())}`, {
                headers,
            });
            const data = await res.json();
            if (!res.ok || !data.data) {
                throw new Error(data.message || 'Order not found. Please verify the order number.');
            }
            setSearchedOrder(data.data);
        } catch (err: any) {
            setError(err.message || 'Unable to locate order.');
            setSearchedOrder(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[85vh] flex flex-col">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">Order Status & Tracking</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5">
                    {/* Search by Order ID */}
                    <form onSubmit={handleTrack} className="flex gap-2">
                        <input
                            type="text"
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            placeholder="Enter Order ID e.g. ORD-1001..."
                            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                        />
                        <button
                            type="submit"
                            disabled={loading || !orderNumber}
                            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? 'Tracking...' : 'Track'}
                        </button>
                    </form>

                    {error && (
                        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Searched Order Details */}
                    {searchedOrder && (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                    Order #{searchedOrder.order_number || searchedOrder.id}
                                </span>
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                    {searchedOrder.status || 'Processing'}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1">
                                <p>Placed: {new Date(searchedOrder.created_at || Date.now()).toLocaleDateString()}</p>
                                <p>Total: <strong className="text-slate-900 dark:text-white">{currency}{Number(searchedOrder.grand_total || searchedOrder.total || 0).toFixed(2)}</strong></p>
                                <p>Destination: {searchedOrder.shipping_address}</p>
                            </div>
                        </div>
                    )}

                    {/* Recent Orders List if Logged In */}
                    {recentOrders.length > 0 && !searchedOrder && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Recent Orders</h4>
                            {recentOrders.map((ord) => (
                                <div
                                    key={ord.id}
                                    onClick={() => setSearchedOrder(ord)}
                                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer transition-all flex items-center justify-between"
                                >
                                    <div>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">#{ord.order_number || ord.id}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {new Date(ord.created_at).toLocaleDateString()} • {currency}{Number(ord.grand_total || ord.total || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                                        View <ChevronRight className="w-3 h-3" />
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

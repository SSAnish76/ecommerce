import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { Customer, Address, Order, PageProps } from '../../../types';
import {
    Button,
    Badge,
    Modal,
    PageHeader,
    EmptyState,
} from '../../../Components/UI';
import {
    User,
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    DollarSign,
    ShoppingCart,
    Clock,
    CheckCircle2,
    XCircle,
    Plus,
    Pencil,
    Trash2,
    Star,
    ExternalLink,
    Calendar,
    Eye,
    Shield,
} from 'lucide-react';

interface PaginatedOrders {
    data: Order[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface CustomerShowProps {
    customer: Customer;
    orders: PaginatedOrders;
    metrics: {
        total_spent: number;
        total_orders: number;
        completed_orders: number;
        pending_orders: number;
        cancelled_orders: number;
    };
    addressTypes?: { value: string; label: string }[];
    customerStatuses?: { value: string; label: string }[];
}

export default function CustomerShowPage({
    customer,
    orders,
    metrics,
    addressTypes,
    customerStatuses,
}: CustomerShowProps) {
    const { store } = usePage<PageProps>().props;
    const currency = store?.currency || '$';

    // Profile Edit State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const profileForm = useForm({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        status: customer.status,
        password: '',
    });

    // Address Modals State
    const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);

    const addressForm = useForm({
        type: 'shipping',
        name: customer.name,
        phone: customer.phone || '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'United States',
        is_default: false,
    });

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        profileForm.put(`/admin/customers/${customer.id}`, {
            preserveScroll: true,
            onSuccess: () => setIsProfileModalOpen(false),
        });
    };

    const handleToggleStatus = () => {
        router.patch(
            `/admin/customers/${customer.id}/toggle-status`,
            {},
            { preserveScroll: true }
        );
    };

    const openAddAddressModal = () => {
        addressForm.reset();
        addressForm.setData({
            type: 'shipping',
            name: customer.name,
            phone: customer.phone || '',
            address_line_1: '',
            address_line_2: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'United States',
            is_default: (customer.addresses?.length || 0) === 0,
        });
        setIsAddAddressOpen(true);
    };

    const handleAddAddressSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addressForm.post(`/admin/customers/${customer.id}/addresses`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddAddressOpen(false);
                addressForm.reset();
            },
        });
    };

    const openEditAddressModal = (address: Address) => {
        setEditingAddress(address);
        addressForm.setData({
            type: address.type,
            name: address.name,
            phone: address.phone || '',
            address_line_1: address.address_line_1,
            address_line_2: address.address_line_2 || '',
            city: address.city,
            state: address.state || '',
            postal_code: address.postal_code,
            country: address.country,
            is_default: address.is_default,
        });
    };

    const handleEditAddressSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAddress) return;

        addressForm.put(`/admin/customers/${customer.id}/addresses/${editingAddress.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingAddress(null);
                addressForm.reset();
            },
        });
    };

    const handleDeleteAddress = (e: React.FormEvent) => {
        e.preventDefault();
        if (!deletingAddress) return;

        router.delete(`/admin/customers/${customer.id}/addresses/${deletingAddress.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingAddress(null),
        });
    };

    const handleSetDefaultAddress = (address: Address) => {
        router.patch(
            `/admin/customers/${customer.id}/addresses/${address.id}/default`,
            {},
            { preserveScroll: true }
        );
    };

    const availableAddressTypes = addressTypes && addressTypes.length > 0 ? addressTypes : [
        { value: 'shipping', label: 'Shipping Address' },
        { value: 'billing', label: 'Billing Address' },
        { value: 'home', label: 'Home' },
        { value: 'office', label: 'Office' },
        { value: 'other', label: 'Other' },
    ];

    return (
        <AdminLayout>
            <Head title={`Customer: ${customer.name} - Admin`} />

            <div className="space-y-6">
                {/* Header with Navigation and Profile Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/customers"
                            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs"
                            title="Back to Customers List"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base uppercase shrink-0">
                                {customer.name.substring(0, 2)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                        {customer.name}
                                    </h1>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                        customer.status === 'active'
                                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {customer.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Registered {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'} • {customer.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsProfileModalOpen(true)}
                            leftIcon={<Pencil className="w-3.5 h-3.5" />}
                        >
                            Edit Profile
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleToggleStatus}
                            className={customer.status === 'active' ? 'text-amber-600' : 'text-emerald-600'}
                        >
                            {customer.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                    </div>
                </div>

                {/* Metrics Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-slate-500">Lifetime Spend</span>
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                            {currency}{metrics.total_spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-slate-500">Total Orders</span>
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                                <ShoppingCart className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                            {metrics.total_orders}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-slate-500">Completed Orders</span>
                            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                            {metrics.completed_orders}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-slate-500">Pending / Processing</span>
                            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                            {metrics.pending_orders}
                        </div>
                    </div>
                </div>

                {/* 2-Column Split: Left (Customer Profile & Addresses), Right (Order History) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Profile and Address Management */}
                    <div className="space-y-6">
                        {/* Profile Info Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <User className="w-4 h-4 text-indigo-500" />
                                <span>Profile Information</span>
                            </h3>

                            <div className="space-y-2.5 text-xs">
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Email</span>
                                    <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{customer.email}</span>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Phone</span>
                                    <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{customer.phone || 'No phone number provided'}</span>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Member Since</span>
                                    <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{customer.created_at ? new Date(customer.created_at).toLocaleString() : 'N/A'}</span>
                                    </div>
                                </div>

                                {customer.last_login_at && (
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Last Login</span>
                                        <div className="font-medium text-slate-800 dark:text-slate-200">
                                            {new Date(customer.last_login_at).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Customer Address Management Section */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-emerald-500" />
                                    <span>Saved Addresses ({customer.addresses?.length || 0})</span>
                                </h3>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={openAddAddressModal}
                                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                                    className="text-xs py-1 px-2.5 rounded-xl"
                                >
                                    Add Address
                                </Button>
                            </div>

                            {customer.addresses && customer.addresses.length > 0 ? (
                                <div className="space-y-3">
                                    {customer.addresses.map((addr) => (
                                        <div
                                            key={addr.id}
                                            className={`p-3.5 rounded-2xl border transition-colors ${
                                                addr.is_default
                                                    ? 'border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20'
                                                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                        {addr.type}
                                                    </span>
                                                    {addr.is_default && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                                                            <Star className="w-2.5 h-2.5 fill-current" />
                                                            Default
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    {!addr.is_default && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetDefaultAddress(addr)}
                                                            className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline mr-1"
                                                        >
                                                            Set Default
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditAddressModal(addr)}
                                                        className="p-1 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="Edit address"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeletingAddress(addr)}
                                                        className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="Delete address"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                                                {addr.name}
                                                {addr.phone && (
                                                    <span className="text-slate-400 font-normal ml-2">
                                                        ({addr.phone})
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                                {addr.address_line_1}
                                                {addr.address_line_2 && `, ${addr.address_line_2}`}
                                                <br />
                                                {addr.city}, {addr.state} {addr.postal_code}
                                                <br />
                                                {addr.country}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                                    No delivery addresses on file for this customer.
                                    <div className="mt-2">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={openAddAddressModal}
                                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                                        >
                                            Add First Address
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Customer Orders List (2 Cols on lg) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-indigo-500" />
                                    <span>Order History ({orders.total})</span>
                                </h3>
                                <span className="text-xs text-slate-400">
                                    Click any order to view details, update status, or issue refund
                                </span>
                            </div>

                            {orders.data.length === 0 ? (
                                <div className="p-10 text-center text-xs text-slate-400">
                                    This customer has not placed any orders yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                <th className="py-3 px-4">Order #</th>
                                                <th className="py-3 px-4">Date</th>
                                                <th className="py-3 px-4">Items</th>
                                                <th className="py-3 px-4">Order Status</th>
                                                <th className="py-3 px-4">Payment</th>
                                                <th className="py-3 px-4">Total</th>
                                                <th className="py-3 px-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                            {orders.data.map((order) => (
                                                <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                        <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                                                            {order.order_number}
                                                        </Link>
                                                    </td>

                                                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                                                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                                                    </td>

                                                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                                                        {order.items?.length || 0} item{order.items?.length === 1 ? '' : 's'}
                                                    </td>

                                                    <td className="py-3.5 px-4 capitalize">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            order.status === 'completed'
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                                : order.status === 'cancelled'
                                                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                                        }`}>
                                                            {order.status}
                                                        </span>
                                                    </td>

                                                    <td className="py-3.5 px-4 capitalize">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                            order.payment_status === 'paid'
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                                : order.payment_status === 'refunded'
                                                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400'
                                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                                        }`}>
                                                            {order.payment_status}
                                                        </span>
                                                    </td>

                                                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                                        {currency}{Number(order.total).toFixed(2)}
                                                    </td>

                                                    <td className="py-3.5 px-4 text-right">
                                                        <Link
                                                            href={`/admin/orders/${order.id}`}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                                            <span>View</span>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination */}
                            {orders.last_page > 1 && (
                                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="text-xs text-slate-500">
                                        Showing page {orders.current_page} of {orders.last_page}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {orders.links.map((link, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                                disabled={!link.url || link.active}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                                                    link.active
                                                        ? 'bg-indigo-600 text-white'
                                                        : link.url
                                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                        : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Edit Customer Profile */}
            <Modal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                title="Edit Customer Profile"
                size="md"
            >
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={profileForm.data.name}
                            onChange={(e) => profileForm.setData('name', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Email Address *
                        </label>
                        <input
                            type="email"
                            required
                            value={profileForm.data.email}
                            onChange={(e) => profileForm.setData('email', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Phone Number
                        </label>
                        <input
                            type="text"
                            value={profileForm.data.phone}
                            onChange={(e) => profileForm.setData('phone', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Account Status
                        </label>
                        <select
                            value={profileForm.data.status}
                            onChange={(e) => profileForm.setData('status', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Reset Password (Optional)
                        </label>
                        <input
                            type="password"
                            value={profileForm.data.password}
                            onChange={(e) => profileForm.setData('password', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Leave blank to keep current password"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsProfileModalOpen(false)}
                            disabled={profileForm.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={profileForm.processing}
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Add Address */}
            <Modal
                isOpen={isAddAddressOpen}
                onClose={() => setIsAddAddressOpen(false)}
                title="Add Customer Address"
                size="md"
            >
                <form onSubmit={handleAddAddressSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Address Type *
                            </label>
                            <select
                                value={addressForm.data.type}
                                onChange={(e) => addressForm.setData('type', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                {availableAddressTypes.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Contact Phone
                            </label>
                            <input
                                type="text"
                                value={addressForm.data.phone}
                                onChange={(e) => addressForm.setData('phone', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Recipient Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={addressForm.data.name}
                            onChange={(e) => addressForm.setData('name', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Address Line 1 *
                        </label>
                        <input
                            type="text"
                            required
                            value={addressForm.data.address_line_1}
                            onChange={(e) => addressForm.setData('address_line_1', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Street number and name"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Address Line 2 (Optional)
                        </label>
                        <input
                            type="text"
                            value={addressForm.data.address_line_2}
                            onChange={(e) => addressForm.setData('address_line_2', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Apartment, suite, unit, etc."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                City *
                            </label>
                            <input
                                type="text"
                                required
                                value={addressForm.data.city}
                                onChange={(e) => addressForm.setData('city', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                State / Region
                            </label>
                            <input
                                type="text"
                                value={addressForm.data.state}
                                onChange={(e) => addressForm.setData('state', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Postal Code *
                            </label>
                            <input
                                type="text"
                                required
                                value={addressForm.data.postal_code}
                                onChange={(e) => addressForm.setData('postal_code', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Country *
                            </label>
                            <input
                                type="text"
                                required
                                value={addressForm.data.country}
                                onChange={(e) => addressForm.setData('country', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={addressForm.data.is_default}
                                onChange={(e) => addressForm.setData('is_default', e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                            />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Make this the default address
                            </span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsAddAddressOpen(false)}
                            disabled={addressForm.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={addressForm.processing}
                        >
                            Save Address
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Address */}
            <Modal
                isOpen={Boolean(editingAddress)}
                onClose={() => setEditingAddress(null)}
                title="Edit Address"
                size="md"
            >
                <form onSubmit={handleEditAddressSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Address Type *
                            </label>
                            <select
                                value={addressForm.data.type}
                                onChange={(e) => addressForm.setData('type', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                {availableAddressTypes.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Contact Phone
                            </label>
                            <input
                                type="text"
                                value={addressForm.data.phone}
                                onChange={(e) => addressForm.setData('phone', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Recipient Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={addressForm.data.name}
                            onChange={(e) => addressForm.setData('name', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Address Line 1 *
                        </label>
                        <input
                            type="text"
                            required
                            value={addressForm.data.address_line_1}
                            onChange={(e) => addressForm.setData('address_line_1', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Address Line 2
                        </label>
                        <input
                            type="text"
                            value={addressForm.data.address_line_2}
                            onChange={(e) => addressForm.setData('address_line_2', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                City *
                            </label>
                            <input
                                type="text"
                                required
                                value={addressForm.data.city}
                                onChange={(e) => addressForm.setData('city', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                State / Region
                            </label>
                            <input
                                type="text"
                                value={addressForm.data.state}
                                onChange={(e) => addressForm.setData('state', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Postal Code *
                            </label>
                            <input
                                type="text"
                                required
                                value={addressForm.data.postal_code}
                                onChange={(e) => addressForm.setData('postal_code', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Country *
                            </label>
                            <input
                                type="text"
                                required
                                value={addressForm.data.country}
                                onChange={(e) => addressForm.setData('country', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={addressForm.data.is_default}
                                onChange={(e) => addressForm.setData('is_default', e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                            />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Make this the default address
                            </span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setEditingAddress(null)}
                            disabled={addressForm.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={addressForm.processing}
                        >
                            Update Address
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Delete Address Confirmation */}
            <Modal
                isOpen={Boolean(deletingAddress)}
                onClose={() => setDeletingAddress(null)}
                title="Delete Address"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        Are you sure you want to delete this address ({deletingAddress?.address_line_1}, {deletingAddress?.city})?
                    </p>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setDeletingAddress(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={handleDeleteAddress}
                        >
                            Delete Address
                        </Button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}


import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { Customer, PageProps } from '../../types';
import {
    Button,
    Badge,
    Modal,
    PageHeader,
    EmptyState,
} from '../../Components/UI';
import {
    Users as UsersIcon,
    Search,
    Plus,
    UserCheck,
    Pencil,
    Trash2,
    Eye,
    Mail,
    Phone,
    MapPin,
    DollarSign,
    ShoppingCart,
    ShieldAlert,
    CheckCircle2,
    XCircle,
    UserX,
} from 'lucide-react';

interface PaginatedCustomers {
    data: Customer[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface CustomersProps {
    customers: PaginatedCustomers;
    metrics: {
        total_customers: number;
        active_customers: number;
        inactive_customers: number;
    };
    filters: {
        search: string;
        status: string;
    };
    statuses?: { value: string; label: string }[];
}

export default function CustomersPage({
    customers,
    metrics,
    filters,
    statuses,
}: CustomersProps) {
    const { store } = usePage<PageProps>().props;
    const currency = store?.currency || '$';

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

    // Create Form
    const createForm = useForm({
        name: '',
        email: '',
        phone: '',
        status: 'active',
        password: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'United States',
    });

    // Edit Form
    const editForm = useForm({
        name: '',
        email: '',
        phone: '',
        status: 'active',
        password: '',
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/customers',
            { search, status: statusFilter },
            { preserveState: true }
        );
    };

    const handleToggleStatus = (customer: Customer) => {
        router.patch(
            `/admin/customers/${customer.id}/toggle-status`,
            {},
            { preserveScroll: true }
        );
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/customers', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const openEditModal = (customer: Customer) => {
        setEditingCustomer(customer);
        editForm.setData({
            name: customer.name,
            email: customer.email,
            phone: customer.phone || '',
            status: customer.status,
            password: '',
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCustomer) return;

        editForm.put(`/admin/customers/${editingCustomer.id}`, {
            onSuccess: () => {
                setEditingCustomer(null);
                editForm.reset();
            },
        });
    };

    const handleDeleteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!deletingCustomer) return;

        router.delete(`/admin/customers/${deletingCustomer.id}`, {
            onSuccess: () => setDeletingCustomer(null),
        });
    };

    const availableStatuses = statuses && statuses.length > 0 ? statuses : [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' },
    ];

    return (
        <AdminLayout>
            <Head title="Customer Management - Admin" />

            <div className="space-y-6">
                <PageHeader
                    title="Customers"
                    description="Manage registered customer profiles, saved delivery addresses, and customer lifetime orders."
                    breadcrumbs={[
                        { label: 'Admin', href: '/admin/dashboard' },
                        { label: 'Sales' },
                        { label: 'Customers' },
                    ]}
                    action={
                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => setIsCreateOpen(true)}
                            leftIcon={<Plus className="w-4 h-4" />}
                        >
                            Add Customer
                        </Button>
                    }
                />

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-3 w-full">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search customers by Name, Email, or Phone..."
                                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                router.get(
                                    '/admin/customers',
                                    { search, status: e.target.value },
                                    { preserveState: true }
                                );
                            }}
                            className="text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            {availableStatuses.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>

                        <Button type="submit" variant="secondary" size="sm" className="hidden sm:inline-flex">
                            Search
                        </Button>
                    </form>

                    <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                        Total: <span className="font-bold text-slate-900 dark:text-white">{customers.total}</span> customers
                    </div>
                </div>

                {/* Customers Table */}
                {customers.data.length === 0 ? (
                    <EmptyState
                        icon={<UsersIcon className="w-10 h-10 text-slate-400" />}
                        title="No Customers Found"
                        description="Customer profiles created through storefront registration or administrator creation will appear here."
                    />
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        <th className="py-3.5 px-5">Customer</th>
                                        <th className="py-3.5 px-5">Contact Info</th>
                                        <th className="py-3.5 px-5">Status</th>
                                        <th className="py-3.5 px-5">Orders</th>
                                        <th className="py-3.5 px-5">Total Spend</th>
                                        <th className="py-3.5 px-5">Default Address</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                                    {customers.data.map((customer) => {
                                        const defaultAddress = customer.addresses?.[0];

                                        return (
                                            <tr
                                                key={customer.id}
                                                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                                            >
                                                <td className="py-4 px-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                            {customer.name.substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <Link
                                                                href={`/admin/customers/${customer.id}`}
                                                                className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline block"
                                                            >
                                                                {customer.name}
                                                            </Link>
                                                            <span className="text-[10px] text-slate-400">
                                                                Joined {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-5">
                                                    <div className="text-slate-800 dark:text-slate-200 font-medium">
                                                        {customer.email}
                                                    </div>
                                                    {customer.phone && (
                                                        <div className="text-[11px] text-slate-400">
                                                            {customer.phone}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-4 px-5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(customer)}
                                                        title="Click to toggle status"
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-opacity hover:opacity-80 ${
                                                            customer.status === 'active'
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                                                                : customer.status === 'suspended'
                                                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                                            customer.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                                                        }`} />
                                                        <span className="capitalize">{customer.status}</span>
                                                    </button>
                                                </td>

                                                <td className="py-4 px-5 font-semibold text-slate-900 dark:text-white">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-mono">
                                                        <ShoppingCart className="w-3 h-3" />
                                                        {customer.orders_count || 0}
                                                    </span>
                                                </td>

                                                <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                                                    {currency}
                                                    {Number(customer.total_spent || 0).toFixed(2)}
                                                </td>

                                                <td className="py-4 px-5 text-slate-600 dark:text-slate-400 max-w-[200px] truncate text-[11px]">
                                                    {defaultAddress ? (
                                                        <span title={defaultAddress.formatted_address || `${defaultAddress.city}, ${defaultAddress.country}`}>
                                                            {defaultAddress.city ? `${defaultAddress.city}, ` : ''}{defaultAddress.country}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600 italic">No address saved</span>
                                                    )}
                                                </td>

                                                <td className="py-4 px-5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Link
                                                            href={`/admin/customers/${customer.id}`}
                                                            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                            title="View customer profile & addresses"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(customer)}
                                                            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                                            title="Edit customer profile"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletingCustomer(customer)}
                                                            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                                            title="Delete customer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {customers.last_page > 1 && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="text-xs text-slate-500">
                                    Showing page {customers.current_page} of {customers.last_page}
                                </div>
                                <div className="flex items-center gap-1">
                                    {customers.links.map((link, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                            disabled={!link.url || link.active}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
                                                link.active
                                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                                    : link.url
                                                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                    : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Add New Customer */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Add New Customer"
                size="lg"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                placeholder="Jane Doe"
                            />
                            {createForm.errors.name && (
                                <span className="text-[11px] text-rose-500 mt-0.5 block">{createForm.errors.name}</span>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Email Address *
                            </label>
                            <input
                                type="email"
                                required
                                value={createForm.data.email}
                                onChange={(e) => createForm.setData('email', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                placeholder="jane@example.com"
                            />
                            {createForm.errors.email && (
                                <span className="text-[11px] text-rose-500 mt-0.5 block">{createForm.errors.email}</span>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Phone Number
                            </label>
                            <input
                                type="text"
                                value={createForm.data.phone}
                                onChange={(e) => createForm.setData('phone', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                Account Status
                            </label>
                            <select
                                value={createForm.data.status}
                                onChange={(e) => createForm.setData('status', e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Account Password (Optional)
                        </label>
                        <input
                            type="password"
                            value={createForm.data.password}
                            onChange={(e) => createForm.setData('password', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Leave blank to generate random secure password"
                        />
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
                            Primary Address (Optional)
                        </span>

                        <div className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    value={createForm.data.address_line_1}
                                    onChange={(e) => createForm.setData('address_line_1', e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Street Address Line 1"
                                />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <input
                                    type="text"
                                    value={createForm.data.city}
                                    onChange={(e) => createForm.setData('city', e.target.value)}
                                    className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="City"
                                />
                                <input
                                    type="text"
                                    value={createForm.data.state}
                                    onChange={(e) => createForm.setData('state', e.target.value)}
                                    className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="State / Region"
                                />
                                <input
                                    type="text"
                                    value={createForm.data.postal_code}
                                    onChange={(e) => createForm.setData('postal_code', e.target.value)}
                                    className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="ZIP / Postal Code"
                                />
                                <input
                                    type="text"
                                    value={createForm.data.country}
                                    onChange={(e) => createForm.setData('country', e.target.value)}
                                    className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Country"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsCreateOpen(false)}
                            disabled={createForm.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={createForm.processing}
                        >
                            Save Customer
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Customer */}
            <Modal
                isOpen={Boolean(editingCustomer)}
                onClose={() => setEditingCustomer(null)}
                title={`Edit Customer: ${editingCustomer?.name || ''}`}
                size="md"
            >
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={editForm.data.name}
                            onChange={(e) => editForm.setData('name', e.target.value)}
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
                            value={editForm.data.email}
                            onChange={(e) => editForm.setData('email', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Phone Number
                        </label>
                        <input
                            type="text"
                            value={editForm.data.phone}
                            onChange={(e) => editForm.setData('phone', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Account Status
                        </label>
                        <select
                            value={editForm.data.status}
                            onChange={(e) => editForm.setData('status', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            New Password (Optional)
                        </label>
                        <input
                            type="password"
                            value={editForm.data.password}
                            onChange={(e) => editForm.setData('password', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Leave blank to keep existing password"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setEditingCustomer(null)}
                            disabled={editForm.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={editForm.processing}
                        >
                            Update Profile
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Delete Confirmation */}
            <Modal
                isOpen={Boolean(deletingCustomer)}
                onClose={() => setDeletingCustomer(null)}
                title="Delete Customer Account"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        Are you sure you want to permanently delete customer <span className="font-bold text-slate-900 dark:text-white">{deletingCustomer?.name}</span>? Saved addresses will be removed.
                    </p>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setDeletingCustomer(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={handleDeleteSubmit}
                        >
                            Delete Customer
                        </Button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}


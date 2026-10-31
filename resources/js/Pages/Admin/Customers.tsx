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
    ChevronRight,
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
        <AdminLayout title="Customers">
            <Head title="Customer Management - Admin" />

            <div className="space-y-6">
                <PageHeader
                    title="Customers"
                    description="Manage registered customer profiles, saved delivery addresses, and customer lifetime orders."
                    breadcrumbs={[
                        { label: 'Admin', href: '/admin' },
                        { label: 'Sales' },
                        { label: 'Customers' },
                    ]}
                    action={
                        <Button
                            type="button"
                            variant="primary"
                            size="md"
                            pill
                            onClick={() => setIsCreateOpen(true)}
                            leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                            className="tap-bounce"
                        >
                            Add Customer
                        </Button>
                    }
                />

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--admin-surface)] p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                    <form onSubmit={handleSearchSubmit} className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search customers by Name, Email, or Phone..."
                                className="w-full text-xs sm:text-sm pl-10 pr-4 h-11 sm:h-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]/20 focus:border-[var(--admin-primary)]"
                            />
                        </div>

                        <div className="flex items-center gap-2">
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
                                className="flex-1 sm:flex-initial text-xs font-semibold h-11 sm:h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)] cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                {availableStatuses.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>

                            <Button type="submit" variant="secondary" size="md" className="hidden sm:inline-flex">
                                Filter
                            </Button>
                        </div>
                    </form>

                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1 shrink-0 text-right sm:text-left">
                        Total: <span className="font-bold text-slate-900 dark:text-white">{customers.total}</span> customers
                    </div>
                </div>

                {/* Customers View */}
                {customers.data.length === 0 ? (
                    <EmptyState
                        icon={<UsersIcon className="w-8 h-8 text-[var(--admin-primary)]" />}
                        title="No Customers Found"
                        description="Customer profiles created through storefront registration or administrator creation will appear here."
                    />
                ) : (
                    <div className="bg-[var(--admin-surface)] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        {/* Mobile Customer Cards (< md) */}
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
                            {customers.data.map((customer) => (
                                <div key={customer.id} className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-2xl bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] border border-[var(--admin-primary)]/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                {customer.name.substring(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/admin/customers/${customer.id}`}
                                                    className="font-bold text-sm text-slate-900 dark:text-white hover:text-[var(--admin-primary)] truncate block"
                                                >
                                                    {customer.name}
                                                </Link>
                                                <span className="text-[11px] text-slate-400 truncate block">
                                                    {customer.email}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleToggleStatus(customer)}
                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                customer.status === 'active'
                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                                    : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                                            }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${customer.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            <span className="capitalize">{customer.status}</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-white/5 p-2.5 rounded-2xl">
                                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                            <ShoppingCart className="w-3.5 h-3.5 text-[var(--admin-primary)]" />
                                            <span>{customer.orders_count || 0} Orders</span>
                                        </div>
                                        <div className="font-extrabold text-slate-900 dark:text-white">
                                            {currency}{Number(customer.total_spent || 0).toFixed(2)} spent
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <Link
                                            href={`/admin/customers/${customer.id}`}
                                            className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 rounded-xl"
                                        >
                                            View Profile
                                        </Link>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setEditingCustomer(customer);
                                                editForm.setData({
                                                    name: customer.name,
                                                    email: customer.email,
                                                    phone: customer.phone || '',
                                                    status: customer.status,
                                                    password: '',
                                                });
                                            }}
                                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-[var(--admin-primary)] rounded-xl"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setDeletingCustomer(customer)}
                                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-rose-600 rounded-xl"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table (>= md) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        <th className="py-3.5 px-5">Customer</th>
                                        <th className="py-3.5 px-5">Contact Info</th>
                                        <th className="py-3.5 px-5">Status</th>
                                        <th className="py-3.5 px-5">Orders</th>
                                        <th className="py-3.5 px-5">Total Spend</th>
                                        <th className="py-3.5 px-5">Default Address</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                                    {customers.data.map((customer) => {
                                        const defaultAddress = customer.addresses?.[0];

                                        return (
                                            <tr
                                                key={customer.id}
                                                className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <td className="py-4 px-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-2xl bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] border border-[var(--admin-primary)]/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                            {customer.name.substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <Link
                                                                href={`/admin/customers/${customer.id}`}
                                                                className="font-bold text-slate-900 dark:text-white hover:text-[var(--admin-primary)] hover:underline block"
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
                                                    <div className="text-slate-800 dark:text-slate-200 font-semibold">
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
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border cursor-pointer transition-opacity hover:opacity-80 ${
                                                            customer.status === 'active'
                                                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                                                : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                                                        }`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                                            customer.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                                                        }`} />
                                                        <span className="capitalize">{customer.status}</span>
                                                    </button>
                                                </td>

                                                <td className="py-4 px-5 font-semibold text-slate-900 dark:text-white">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--admin-primary-subtle)] text-[var(--admin-primary)] font-mono font-bold">
                                                        <ShoppingCart className="w-3 h-3" />
                                                        {customer.orders_count || 0}
                                                    </span>
                                                </td>

                                                <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                                                    {currency}
                                                    {Number(customer.total_spent || 0).toFixed(2)}
                                                </td>

                                                <td className="py-4 px-5 text-slate-500 dark:text-slate-400 text-xs">
                                                    {defaultAddress ? (
                                                        <div>
                                                            <div>{defaultAddress.address_line_1}</div>
                                                            <div className="text-[11px] text-slate-400">
                                                                {defaultAddress.city}, {defaultAddress.country}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">No address on file</span>
                                                    )}
                                                </td>

                                                <td className="py-4 px-5 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link
                                                            href={`/admin/customers/${customer.id}`}
                                                            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                            title="View details"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </Link>
                                                        <button
                                                            onClick={() => {
                                                                setEditingCustomer(customer);
                                                                editForm.setData({
                                                                    name: customer.name,
                                                                    email: customer.email,
                                                                    phone: customer.phone || '',
                                                                    status: customer.status,
                                                                    password: '',
                                                                });
                                                            }}
                                                            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-[var(--admin-primary)] transition-colors cursor-pointer"
                                                            title="Edit profile"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingCustomer(customer)}
                                                            className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                                            title="Delete customer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
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
                            <div className="p-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="text-xs text-slate-500 font-medium">
                                    Showing page {customers.current_page} of {customers.last_page}
                                </div>
                                <div className="flex items-center gap-1 flex-wrap justify-center">
                                    {customers.links.map((link, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                            disabled={!link.url || link.active}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-colors tap-bounce ${
                                                link.active
                                                    ? 'bg-[var(--admin-primary)] text-white shadow-2xs'
                                                    : link.url
                                                    ? 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
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

            {/* Create Customer Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create Customer Profile"
                description="Register a new customer account directly to your storefront database."
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            placeholder="e.g. John Doe"
                            className="w-full text-xs sm:text-sm px-3.5 h-11 sm:h-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                Email Address <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={createForm.data.email}
                                onChange={(e) => createForm.setData('email', e.target.value)}
                                placeholder="john@example.com"
                                className="w-full text-xs sm:text-sm px-3.5 h-11 sm:h-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={createForm.data.phone}
                                onChange={(e) => createForm.setData('phone', e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                className="w-full text-xs sm:text-sm px-3.5 h-11 sm:h-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                Initial Password <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="password"
                                required
                                value={createForm.data.password}
                                onChange={(e) => createForm.setData('password', e.target.value)}
                                placeholder="Min 8 characters"
                                className="w-full text-xs sm:text-sm px-3.5 h-11 sm:h-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                Account Status
                            </label>
                            <select
                                value={createForm.data.status}
                                onChange={(e) => createForm.setData('status', e.target.value)}
                                className="w-full text-xs sm:text-sm px-3.5 h-11 sm:h-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsCreateOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={createForm.processing}
                        >
                            Create Customer
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Customer Modal */}
            <Modal
                isOpen={!!editingCustomer}
                onClose={() => setEditingCustomer(null)}
                title="Edit Customer Profile"
                description={`Updating account details for ${editingCustomer?.name}`}
            >
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={editForm.data.name}
                            onChange={(e) => editForm.setData('name', e.target.value)}
                            className="w-full text-xs sm:text-sm px-3.5 h-11 sm:h-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                Email Address <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={editForm.data.email}
                                onChange={(e) => editForm.setData('email', e.target.value)}
                                className="w-full text-xs sm:text-sm px-3.5 h-11 sm:h-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={editForm.data.phone}
                                onChange={(e) => editForm.setData('phone', e.target.value)}
                                className="w-full text-xs sm:text-sm px-3.5 h-11 sm:h-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                Reset Password (Optional)
                            </label>
                            <input
                                type="password"
                                value={editForm.data.password}
                                onChange={(e) => editForm.setData('password', e.target.value)}
                                placeholder="Leave blank to keep current"
                                className="w-full text-xs sm:text-sm px-3.5 h-11 sm:h-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                Account Status
                            </label>
                            <select
                                value={editForm.data.status}
                                onChange={(e) => editForm.setData('status', e.target.value)}
                                className="w-full text-xs sm:text-sm px-3.5 h-11 sm:h-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setEditingCustomer(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={editForm.processing}
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Customer Confirmation Modal */}
            <Modal
                isOpen={!!deletingCustomer}
                onClose={() => setDeletingCustomer(null)}
                title="Delete Customer Profile"
                description={`Are you sure you want to delete ${deletingCustomer?.name}?`}
            >
                <form onSubmit={handleDeleteSubmit} className="space-y-4">
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3">
                        <Trash2 className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold block">Permanent Account Removal</span>
                            <span className="leading-relaxed">
                                This will remove the customer profile, saved addresses, and unbind past orders.
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setDeletingCustomer(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                        >
                            Confirm Delete
                        </Button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

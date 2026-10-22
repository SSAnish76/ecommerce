import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { PageProps, Store, StoreStatus } from '../../types';
import { useEssentials } from '../../hooks/useEssentials';
import {
    Button,
    Input,
    Select,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    PageHeader,
    ImagePicker,
} from '../../Components/UI';
import {
    Store as StoreIcon,
    Building2,
    MapPin,
    Mail,
    Phone,
    Globe,
    Save,
    Pencil,
    Eye,
    Copy,
    Check,
    ExternalLink,
    Power,
} from 'lucide-react';

interface StorePageProps extends PageProps {
    store: Store;
}

export default function StorePage({ store }: StorePageProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const { getOptions } = useEssentials();
    const storeStatusOptions = getOptions<StoreStatus>('store_status');
    const defaultStoreStatus = (storeStatusOptions[0]?.value ?? 'active') as StoreStatus;

    const form = useForm({
        name: store.name || '',
        legal_name: store.legal_name || '',
        email: store.email || '',
        phone: store.phone || '',
        address_line1: store.address_line1 || '',
        address_line2: store.address_line2 || '',
        city: store.city || '',
        state: store.state || '',
        postal_code: store.postal_code || '',
        country: store.country || '',
        logo_url: store.logo_url || '',
        favicon_url: store.favicon_url || '',
        logo_id: store.logo_id || null,
        favicon_id: store.favicon_id || null,
        tax_number: store.tax_number || '',
        description: store.description || '',
        website_url: store.website_url || '',
        status: (store.status ?? defaultStoreStatus) as StoreStatus,
    });

    const handleCopy = (text: string, fieldName: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put('/admin/store', {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditing(false);
            },
        });
    };

    const formattedAddress = [
        form.data.address_line1,
        form.data.address_line2,
        form.data.city,
        form.data.state,
        form.data.postal_code,
        form.data.country,
    ].filter(Boolean).join(', ');

    const currentStatus = form.data.status || 'active';
    const statusLabel =
        storeStatusOptions.find((o) => o.value === currentStatus)?.label ||
        (currentStatus === 'active' ? 'Active' : currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1));

    return (
        <AdminLayout title="Store Profile">
            <Head title="Store Profile" />

            <div className="space-y-6">
                {/* Page Header */}
                <PageHeader
                    title="Store Profile"
                    badge={
                        <Badge
                            variant={currentStatus === 'active' ? 'emerald' : currentStatus === 'inactive' ? 'amber' : 'default'}
                            size="md"
                            dot
                        >
                            {statusLabel}
                        </Badge>
                    }
                    actions={
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant={isEditing ? 'secondary' : 'primary'}
                                onClick={() => setIsEditing(!isEditing)}
                                leftIcon={isEditing ? <Eye className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                            >
                                {isEditing ? 'View Mode' : 'Edit Profile'}
                            </Button>
                            {isEditing && (
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleSubmit}
                                    isLoading={form.processing}
                                    leftIcon={<Save className="w-4 h-4" />}
                                >
                                    Save Changes
                                </Button>
                            )}
                        </div>
                    }
                />

                {/* Hero Store Identity Card */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-indigo-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="relative group shrink-0">
                                {form.data.logo_url ? (
                                    <a
                                        href={form.data.logo_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="View logo"
                                        className="block cursor-pointer transition-transform hover:scale-105"
                                    >
                                        <img
                                            src={form.data.logo_url}
                                            alt={form.data.name}
                                            className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-200 dark:border-indigo-500/30 shadow-md bg-white dark:bg-slate-800"
                                        />
                                    </a>
                                ) : (
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-2xl font-black shadow-md">
                                        <StoreIcon className="w-10 h-10" />
                                    </div>
                                )}
                                {form.data.favicon_url && (
                                    <a
                                        href={form.data.favicon_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="View favicon"
                                        className="absolute -bottom-1 -right-1 block cursor-pointer transition-transform hover:scale-110"
                                    >
                                        <img
                                            src={form.data.favicon_url}
                                            alt="Favicon"
                                            className="w-6 h-6 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow p-0.5"
                                        />
                                    </a>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                        {form.data.name || 'Store'}
                                    </h2>
                                </div>
                                {form.data.legal_name && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-slate-400" />
                                        {form.data.legal_name}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600 dark:text-slate-400">
                                    {form.data.email && (
                                        <span className="flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5 text-indigo-500" />
                                            {form.data.email}
                                        </span>
                                    )}
                                    {form.data.phone && (
                                        <span className="flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5 text-indigo-500" />
                                            {form.data.phone}
                                        </span>
                                    )}
                                    {form.data.website_url && (
                                        <a
                                            href={form.data.website_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            <Globe className="w-3.5 h-3.5" />
                                            Website
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {form.data.tax_number && (
                                <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                                    <span className="text-slate-400 mr-1.5">Tax ID:</span>
                                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{form.data.tax_number}</span>
                                </div>
                            )}
                            <Badge
                                variant={currentStatus === 'active' ? 'emerald' : currentStatus === 'inactive' ? 'amber' : 'default'}
                                size="md"
                                dot
                            >
                                {statusLabel}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Main Form Content */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Brand & Address */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Brand Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <StoreIcon className="w-5 h-5 text-indigo-500" />
                                        Brand Profile
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input
                                            label="Brand Name"
                                            required
                                            disabled={!isEditing}
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            error={form.errors.name}
                                        />
                                        <Input
                                            label="Legal Entity Name"
                                            disabled={!isEditing}
                                            value={form.data.legal_name}
                                            onChange={(e) => form.setData('legal_name', e.target.value)}
                                            error={form.errors.legal_name}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <ImagePicker
                                            label="Store Logo"
                                            value={form.data.logo_url}
                                            collection="logo"
                                            accept="image/*"
                                            disabled={!isEditing}
                                            error={form.errors.logo_url}
                                            onChange={({ id, url }) => {
                                                form.setData((data) => ({
                                                    ...data,
                                                    logo_id: id,
                                                    logo_url: url,
                                                }));
                                            }}
                                        />

                                        <ImagePicker
                                            label="Store Favicon"
                                            value={form.data.favicon_url}
                                            collection="favicon"
                                            accept="image/*,.ico"
                                            disabled={!isEditing}
                                            error={form.errors.favicon_url}
                                            onChange={({ id, url }) => {
                                                form.setData((data) => ({
                                                    ...data,
                                                    favicon_id: id,
                                                    favicon_url: url,
                                                }));
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Store Description
                                        </label>
                                        <textarea
                                            rows={3}
                                            disabled={!isEditing}
                                            value={form.data.description}
                                            onChange={(e) => form.setData('description', e.target.value)}
                                            className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder="Store description..."
                                        />
                                        {form.errors.description && (
                                            <p className="text-xs text-rose-500 mt-1">{form.errors.description}</p>
                                        )}
                                    </div>

                                    <Input
                                        label="Website URL"
                                        placeholder="https://example.com"
                                        disabled={!isEditing}
                                        value={form.data.website_url}
                                        onChange={(e) => form.setData('website_url', e.target.value)}
                                        error={form.errors.website_url}
                                    />
                                </CardContent>
                            </Card>

                            {/* Physical Address */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-indigo-500" />
                                        Physical Store Address
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Input
                                        label="Address Line 1"
                                        placeholder="Street address, building number"
                                        disabled={!isEditing}
                                        value={form.data.address_line1}
                                        onChange={(e) => form.setData('address_line1', e.target.value)}
                                        error={form.errors.address_line1}
                                    />

                                    <Input
                                        label="Address Line 2"
                                        placeholder="Apartment, suite, unit (optional)"
                                        disabled={!isEditing}
                                        value={form.data.address_line2}
                                        onChange={(e) => form.setData('address_line2', e.target.value)}
                                        error={form.errors.address_line2}
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Input
                                            label="City"
                                            disabled={!isEditing}
                                            value={form.data.city}
                                            onChange={(e) => form.setData('city', e.target.value)}
                                            error={form.errors.city}
                                        />
                                        <Input
                                            label="State / Province"
                                            disabled={!isEditing}
                                            value={form.data.state}
                                            onChange={(e) => form.setData('state', e.target.value)}
                                            error={form.errors.state}
                                        />
                                        <Input
                                            label="Postal Code"
                                            disabled={!isEditing}
                                            value={form.data.postal_code}
                                            onChange={(e) => form.setData('postal_code', e.target.value)}
                                            error={form.errors.postal_code}
                                        />
                                    </div>

                                    <Input
                                        label="Country"
                                        disabled={!isEditing}
                                        value={form.data.country}
                                        onChange={(e) => form.setData('country', e.target.value)}
                                        error={form.errors.country}
                                    />

                                    {!isEditing && formattedAddress && (
                                        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 flex items-start justify-between gap-4">
                                            <div>
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                                    Formatted Address
                                                </span>
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                                                    {formattedAddress}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCopy(formattedAddress, 'address')}
                                                leftIcon={copiedField === 'address' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            >
                                                {copiedField === 'address' ? 'Copied' : 'Copy'}
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Sidebar: Status & Contact */}
                        <div className="space-y-6">
                            {/* Store Status Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Power className="w-5 h-5 text-indigo-500" />
                                        Store Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Select
                                        label="Status"
                                        disabled={!isEditing}
                                        value={form.data.status}
                                        onChange={(e) => form.setData('status', e.target.value as StoreStatus)}
                                        error={form.errors.status}
                                    >
                                        {storeStatusOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </Select>
                                </CardContent>
                            </Card>

                            {/* Customer Contact */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Phone className="w-5 h-5 text-indigo-500" />
                                        Customer Contact
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Input
                                        label="Support Email"
                                        type="email"
                                        required
                                        disabled={!isEditing}
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                        error={form.errors.email}
                                    />

                                    <Input
                                        label="Support Phone"
                                        placeholder="+1 (800) 555-0199"
                                        disabled={!isEditing}
                                        value={form.data.phone}
                                        onChange={(e) => form.setData('phone', e.target.value)}
                                        error={form.errors.phone}
                                    />

                                    <Input
                                        label="Tax / VAT Number"
                                        placeholder="e.g. US-EIN-987654321"
                                        disabled={!isEditing}
                                        value={form.data.tax_number}
                                        onChange={(e) => form.setData('tax_number', e.target.value)}
                                        error={form.errors.tax_number}
                                    />
                                </CardContent>
                            </Card>

                            {/* Action footer when editing */}
                            {isEditing && (
                                <div className="sticky bottom-4 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-between gap-4">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={handleSubmit}
                                        isLoading={form.processing}
                                        leftIcon={<Save className="w-4 h-4" />}
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}

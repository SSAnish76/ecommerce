import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { PageProps, Store, StoreStatus } from '../../types';
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
    MapPin,
    Mail,
    Phone,
    Globe,
    Save,
    Pencil,
    Copy,
    Check,
    ExternalLink,
    FileText,
    Image as ImageIcon,
} from 'lucide-react';

interface StorePageProps extends PageProps {
    store: Store;
    statuses?: Array<{ value: string; label: string }>;
}

export default function StorePage({ store, statuses = [] }: StorePageProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const storeStatusOptions = statuses.length > 0 ? statuses : [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'maintenance', label: 'Maintenance' },
    ];
    const defaultStoreStatus = (storeStatusOptions[0]?.value ?? 'active') as StoreStatus;

    const form = useForm({
        name: store.name || '',
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

    const handleCancel = () => {
        form.reset();
        setIsEditing(false);
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

            <div className="max-w-5xl mx-auto space-y-5">
                {/* Compact Page Header */}
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
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleCancel}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSubmit}
                                        isLoading={form.processing}
                                        leftIcon={<Save className="w-3.5 h-3.5" />}
                                    >
                                        Save Changes
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                    leftIcon={<Pencil className="w-3.5 h-3.5" />}
                                >
                                    Edit Profile
                                </Button>
                            )}
                        </div>
                    }
                />

                {/* ======================================================== */}
                {/* 1. VIEW MODE: Single Compact Card (No Scroll)            */}
                {/* ======================================================== */}
                {!isEditing && (
                    <Card className="shadow-sm border border-slate-200/90 dark:border-slate-800">
                        <CardContent className="p-6 space-y-6">
                            {/* Top Hero Row */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-4">
                                    <div className="relative shrink-0">
                                        {form.data.logo_url ? (
                                            <a
                                                href={form.data.logo_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                title="View full logo"
                                                className="block cursor-pointer transition-transform hover:scale-105"
                                            >
                                                <img
                                                    src={form.data.logo_url}
                                                    alt={form.data.name}
                                                    className="w-14 h-14 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 shadow-sm"
                                                />
                                            </a>
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                <StoreIcon className="w-7 h-7" />
                                            </div>
                                        )}
                                        {form.data.favicon_url && (
                                            <a
                                                href={form.data.favicon_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                title="View favicon"
                                                className="absolute -bottom-1 -right-1 block cursor-pointer transition-transform hover:scale-110"
                                            >
                                                <img
                                                    src={form.data.favicon_url}
                                                    alt="Favicon"
                                                    className="w-5 h-5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm"
                                                />
                                            </a>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2.5">
                                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                                {form.data.name || 'Store'}
                                            </h2>
                                            <Badge
                                                variant={currentStatus === 'active' ? 'emerald' : currentStatus === 'inactive' ? 'amber' : 'default'}
                                                size="sm"
                                                dot
                                            >
                                                {statusLabel}
                                            </Badge>
                                        </div>
                                        {form.data.website_url ? (
                                            <a
                                                href={form.data.website_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 mt-0.5 font-medium"
                                            >
                                                <Globe className="w-3 h-3" />
                                                {form.data.website_url}
                                                <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                        ) : (
                                            <p className="text-xs text-slate-400 mt-0.5">Website not configured</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {form.data.tax_number && (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-slate-400">Tax ID:</span>
                                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{form.data.tax_number}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(form.data.tax_number, 'tax')}
                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
                                                title="Copy Tax ID"
                                            >
                                                {copiedField === 'tax' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Main Details Grid: 2 Clean Columns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Side: About & Visuals */}
                                <div className="space-y-4">
                                    <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1">
                                                {form.data.favicon_url ? (
                                                    <img src={form.data.favicon_url} alt="Favicon" className="w-5 h-5 object-contain" />
                                                ) : (
                                                    <ImageIcon className="w-4 h-4 text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Favicon Asset</span>
                                                <span className="text-[11px] text-slate-400">
                                                    {form.data.favicon_url ? 'Configured browser tab icon' : 'No favicon uploaded'}
                                                </span>
                                            </div>
                                        </div>
                                        {form.data.favicon_url && (
                                            <a
                                                href={form.data.favicon_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                            >
                                                View
                                            </a>
                                        )}
                                    </div>

                                    <div>
                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                            Store Description
                                        </span>
                                        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 min-h-[72px]">
                                            {form.data.description || <span className="text-slate-400 italic">No description provided.</span>}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side: Contact & Address */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/70 dark:border-slate-800">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                                                    <Mail className="w-3 h-3 text-indigo-500" />
                                                    Support Email
                                                </span>
                                                {form.data.email && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(form.data.email, 'email')}
                                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                        title="Copy Email"
                                                    >
                                                        {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                )}
                                            </div>
                                            {form.data.email ? (
                                                <a href={`mailto:${form.data.email}`} className="text-xs font-semibold text-slate-800 dark:text-slate-200 hover:underline truncate block">
                                                    {form.data.email}
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Not set</span>
                                            )}
                                        </div>

                                        <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/70 dark:border-slate-800">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-indigo-500" />
                                                    Support Phone
                                                </span>
                                                {form.data.phone && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(form.data.phone, 'phone')}
                                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                        title="Copy Phone"
                                                    >
                                                        {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                )}
                                            </div>
                                            {form.data.phone ? (
                                                <a href={`tel:${form.data.phone}`} className="text-xs font-semibold text-slate-800 dark:text-slate-200 hover:underline truncate block">
                                                    {form.data.phone}
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Not set</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/70 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-indigo-500" />
                                                Store Address
                                            </span>
                                            {formattedAddress && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(formattedAddress, 'address')}
                                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                                                >
                                                    {copiedField === 'address' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                                    {copiedField === 'address' ? 'Copied' : 'Copy'}
                                                </button>
                                            )}
                                        </div>
                                        {formattedAddress ? (
                                            <div>
                                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                                                    {formattedAddress}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                                                    {form.data.city && <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">{form.data.city}</span>}
                                                    {form.data.state && <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">{form.data.state}</span>}
                                                    {form.data.postal_code && <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">{form.data.postal_code}</span>}
                                                    {form.data.country && <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">{form.data.country}</span>}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">No physical address set.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ======================================================== */}
                {/* 2. EDIT MODE: Regular full edit form (Not changed)        */}
                {/* ======================================================== */}
                {isEditing && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Section 1: Brand Profile */}
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
                                        label="Name"
                                        required
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        error={form.errors.name}
                                    />
                                    <Select
                                        label="Status"
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
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <ImagePicker
                                        label="Logo"
                                        value={form.data.logo_url}
                                        collection="logo"
                                        accept="image/*"
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
                                        label="Favicon"
                                        value={form.data.favicon_url}
                                        collection="favicon"
                                        accept="image/*,.ico"
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

                                <Input
                                    label="Website URL"
                                    placeholder="https://example.com"
                                    value={form.data.website_url}
                                    onChange={(e) => form.setData('website_url', e.target.value)}
                                    error={form.errors.website_url}
                                />

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={form.data.description}
                                        onChange={(e) => form.setData('description', e.target.value)}
                                        className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="Store description..."
                                    />
                                    {form.errors.description && (
                                        <p className="text-xs text-rose-500 mt-1">{form.errors.description}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section 2: Contact & Address */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-indigo-500" />
                                    Contact &amp; Address
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Input
                                        label="Support Email"
                                        type="email"
                                        required
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                        error={form.errors.email}
                                    />
                                    <Input
                                        label="Support Phone"
                                        placeholder="+1 (800) 555-0199"
                                        value={form.data.phone}
                                        onChange={(e) => form.setData('phone', e.target.value)}
                                        error={form.errors.phone}
                                    />
                                    <Input
                                        label="Tax / VAT Number"
                                        placeholder="e.g. US-EIN-987654321"
                                        value={form.data.tax_number}
                                        onChange={(e) => form.setData('tax_number', e.target.value)}
                                        error={form.errors.tax_number}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input
                                        label="Address Line 1"
                                        placeholder="Street address, building number"
                                        value={form.data.address_line1}
                                        onChange={(e) => form.setData('address_line1', e.target.value)}
                                        error={form.errors.address_line1}
                                    />
                                    <Input
                                        label="Address Line 2"
                                        placeholder="Apartment, suite, unit (optional)"
                                        value={form.data.address_line2}
                                        onChange={(e) => form.setData('address_line2', e.target.value)}
                                        error={form.errors.address_line2}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <Input
                                        label="City"
                                        value={form.data.city}
                                        onChange={(e) => form.setData('city', e.target.value)}
                                        error={form.errors.city}
                                    />
                                    <Input
                                        label="State"
                                        value={form.data.state}
                                        onChange={(e) => form.setData('state', e.target.value)}
                                        error={form.errors.state}
                                    />
                                    <Input
                                        label="Postal Code"
                                        value={form.data.postal_code}
                                        onChange={(e) => form.setData('postal_code', e.target.value)}
                                        error={form.errors.postal_code}
                                    />
                                    <Input
                                        label="Country"
                                        value={form.data.country}
                                        onChange={(e) => form.setData('country', e.target.value)}
                                        error={form.errors.country}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action buttons at bottom */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={form.processing}
                                leftIcon={<Save className="w-4 h-4" />}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}

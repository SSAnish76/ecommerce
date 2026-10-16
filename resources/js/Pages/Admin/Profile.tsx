import React, { useState, useEffect } from 'react';
import { Head, usePage, router, useForm } from '@inertiajs/react';
import AdminLayout from '../../Layouts/AdminLayout';
import { PageProps } from '../../types';
import {
    Button,
    Input,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    Modal,
    PageHeader,
} from '../../Components/UI';
import {
    User as UserIcon,
    Shield,
    ShieldCheck,
    Lock,
    KeyRound,
    Copy,
    Download,
    Eye,
    EyeOff,
    CheckCircle2,
    RefreshCw,
    Check,
    Smartphone,
    Info,
    Sparkles,
    AlertTriangle,
} from 'lucide-react';

export default function Profile() {
    const { url } = usePage();
    const { auth, flash, app_name, store } = usePage<PageProps>().props;
    const user = auth?.user;
    const appName = store?.name || app_name || 'E-Commerce';

    const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security'>('profile');

    // Profile form
    const profileForm = useForm<{ name: string; email: string }>({
        name: user?.name || '',
        email: user?.email || '',
    });

    // Password form
    const passwordForm = useForm<{
        current_password: string;
        password: string;
        password_confirmation: string;
    }>({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // 2FA Setup State
    const [isSetupOpen, setIsSetupOpen] = useState(false);
    const [setupLoading, setSetupLoading] = useState(false);
    const [setupData, setSetupData] = useState<{
        secret: string;
        formatted_secret: string;
        qr_code_svg: string;
        qr_code_url?: string;
        otp_auth_uri: string;
    } | null>(null);

    const enableForm = useForm<{ code: string }>({
        code: '',
    });

    // 2FA Disable State
    const [isDisableOpen, setIsDisableOpen] = useState(false);
    const disableForm = useForm<{ password: string }>({
        password: '',
    });

    // Recovery Codes State
    const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [recoveryPassword, setRecoveryPassword] = useState('');
    const [recoveryLoading, setRecoveryLoading] = useState(false);
    const [recoveryError, setRecoveryError] = useState('');
    const [copiedSecret, setCopiedSecret] = useState(false);
    const [copiedCodes, setCopiedCodes] = useState(false);

    // Show recovery codes on activation or regeneration if flash provides them
    useEffect(() => {
        if (flash?.recovery_codes && Array.isArray(flash.recovery_codes)) {
            setRecoveryCodes(flash.recovery_codes);
            setIsRecoveryOpen(true);
            setIsSetupOpen(false);
        }
    }, [flash?.recovery_codes]);

    // Handle scroll to hash / section
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hash = window.location.hash.replace('#', '');
            const params = new URLSearchParams(window.location.search);
            const section = params.get('section') || hash;

            if (section) {
                if (section.includes('password')) setActiveTab('password');
                else if (section.includes('two-factor') || section.includes('security')) setActiveTab('security');
                else setActiveTab('profile');

                setTimeout(() => {
                    const el = document.getElementById(`section-${section}`) || document.getElementById(section);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 150);
            }
        }
    }, [url]);

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        profileForm.put('/admin/profile');
    };

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        passwordForm.put('/admin/profile/password', {
            onSuccess: () => passwordForm.reset(),
        });
    };

    const handleStart2FASetup = async () => {
        setSetupLoading(true);
        setIsSetupOpen(true);
        try {
            const response = await fetch('/admin/two-factor/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    Accept: 'application/json',
                },
            });
            const data = await response.json();
            setSetupData(data);
        } catch (err) {
            console.error('Failed to initialize 2FA setup', err);
        } finally {
            setSetupLoading(false);
        }
    };

    const handleConfirmEnable2FA = (e: React.FormEvent) => {
        e.preventDefault();
        enableForm.post('/admin/two-factor/enable', {
            onSuccess: () => {
                enableForm.reset();
            },
        });
    };

    const handleDisable2FA = (e: React.FormEvent) => {
        e.preventDefault();
        disableForm.delete('/admin/two-factor/disable', {
            onSuccess: () => {
                setIsDisableOpen(false);
                disableForm.reset();
            },
        });
    };

    const handleViewOrRegenerateRecoveryCodes = async () => {
        setRecoveryLoading(true);
        setRecoveryError('');
        try {
            const response = await fetch('/admin/two-factor/recovery-codes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ password: recoveryPassword }),
            });
            const data = await response.json();
            if (response.ok && data.recovery_codes) {
                setRecoveryCodes(data.recovery_codes);
                setIsRecoveryOpen(true);
                setRecoveryPassword('');
            } else {
                setRecoveryError(data.message || 'Incorrect password verification.');
            }
        } catch (err) {
            setRecoveryError('Failed to communicate with authentication server.');
        } finally {
            setRecoveryLoading(false);
        }
    };

    const copyToClipboard = (text: string, isSecret = false) => {
        navigator.clipboard.writeText(text);
        if (isSecret) {
            setCopiedSecret(true);
            setTimeout(() => setCopiedSecret(false), 2000);
        } else {
            setCopiedCodes(true);
            setTimeout(() => setCopiedCodes(false), 2000);
        }
    };

    const downloadRecoveryCodes = () => {
        const element = document.createElement('a');
        const file = new Blob([`${appName} 2FA Emergency Recovery Codes\nGenerated: ${new Date().toISOString()}\nAccount: ${user?.email}\n\n` + recoveryCodes.join('\n')], {
            type: 'text/plain',
        });
        element.href = URL.createObjectURL(file);
        element.download = `recovery-codes-${user?.name?.toLowerCase().replace(/\s+/g, '-')}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <AdminLayout title="Account & Security">
            <Head title="Admin Profile & Security" />

            <div className="space-y-6">
                {/* Page Header */}
                <PageHeader
                    title="Account Profile & Security"
                    description="Manage your administrator credentials, master security password, and Two-Factor Authentication (TOTP)."
                    badge={
                        Boolean(user?.is_2fa) ? (
                            <Badge variant="emerald" size="md" dot icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                                2FA Protected
                            </Badge>
                        ) : (
                            <Badge variant="amber" size="md" dot>
                                2FA Recommended
                            </Badge>
                        )
                    }
                />

                {/* Sub-navigation tabs */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-x-auto scrollbar-none">
                    <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                            activeTab === 'profile'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Profile Information</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('password')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                            activeTab === 'password'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Update Password</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                            activeTab === 'security'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Two-Factor Authentication</span>
                        {Boolean(user?.is_2fa) && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                    </button>
                </div>

                {/* TAB 1: Profile Information */}
                {activeTab === 'profile' && (
                    <Card id="section-profile" className="max-w-2xl">
                        <CardHeader>
                            <CardTitle>Profile Details</CardTitle>
                            <CardDescription>
                                Update your administrative display name and primary contact email.
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpdateProfile}>
                            <CardContent className="space-y-4">
                                <Input
                                    label="Full Name"
                                    required
                                    value={profileForm.data.name}
                                    onChange={(e) => profileForm.setData('name', e.target.value)}
                                    error={profileForm.errors.name}
                                />

                                <Input
                                    label="Email Address"
                                    type="email"
                                    required
                                    value={profileForm.data.email}
                                    onChange={(e) => profileForm.setData('email', e.target.value)}
                                    error={profileForm.errors.email}
                                />

                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 text-xs text-slate-500 flex items-center justify-between">
                                    <span>Assigned Role</span>
                                    <Badge variant="indigo" size="sm">
                                        {user?.role || (user?.is_super_admin ? 'Super Admin' : 'Admin')}
                                    </Badge>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <span className="text-xs text-slate-400">
                                    Changes take effect immediately across all active sessions.
                                </span>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="md"
                                    isLoading={profileForm.processing}
                                >
                                    Save Profile
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {/* TAB 2: Change Password */}
                {activeTab === 'password' && (
                    <Card id="section-password" className="max-w-2xl">
                        <CardHeader>
                            <CardTitle>Master Password Security</CardTitle>
                            <CardDescription>
                                Ensure your account is using a long, random password to prevent unauthorized console access.
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpdatePassword}>
                            <CardContent className="space-y-4">
                                <Input
                                    label="Current Password"
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    required
                                    value={passwordForm.data.current_password}
                                    onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                                    error={passwordForm.errors.current_password}
                                    rightIcon={
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    }
                                />

                                <Input
                                    label="New Password"
                                    type={showNewPassword ? 'text' : 'password'}
                                    required
                                    helperText="Minimum 8 characters with letters, numbers, and symbols."
                                    value={passwordForm.data.password}
                                    onChange={(e) => passwordForm.setData('password', e.target.value)}
                                    error={passwordForm.errors.password}
                                    rightIcon={
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    }
                                />

                                <Input
                                    label="Confirm New Password"
                                    type={showNewPassword ? 'text' : 'password'}
                                    required
                                    value={passwordForm.data.password_confirmation}
                                    onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                    error={passwordForm.errors.password_confirmation}
                                />
                            </CardContent>
                            <CardFooter>
                                <span className="text-xs text-slate-400">
                                    Never share your master credentials with other staff.
                                </span>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="md"
                                    isLoading={passwordForm.processing}
                                >
                                    Update Password
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {/* TAB 3: Two-Factor Authentication */}
                {activeTab === 'security' && (
                    <Card id="section-two-factor" className="max-w-3xl">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                                    <CardDescription>
                                        Add an extra layer of defense using time-based one-time passwords (TOTP) from Google Authenticator, Authy, or 1Password.
                                    </CardDescription>
                                </div>
                                {Boolean(user?.is_2fa) ? (
                                    <Badge variant="emerald" size="md" dot>
                                        Enabled
                                    </Badge>
                                ) : (
                                    <Badge variant="amber" size="md" dot>
                                        Disabled
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {Boolean(user?.is_2fa) ? (
                                <div className="space-y-5">
                                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-3">
                                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-sm">Two-Factor Authentication is Active</p>
                                            <p className="mt-1 text-emerald-800 dark:text-emerald-300 leading-relaxed">
                                                Your account is safeguarded with multi-factor TOTP authentication. You will be prompted for an authenticator code whenever you log in from a new session.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions Row */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="md"
                                            leftIcon={<KeyRound className="w-4 h-4" />}
                                            onClick={handleViewOrRegenerateRecoveryCodes}
                                            isLoading={recoveryLoading}
                                        >
                                            View Recovery Codes
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="md"
                                            className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/30"
                                            onClick={() => setIsDisableOpen(true)}
                                        >
                                            Disable Two-Factor Auth
                                        </Button>
                                    </div>

                                    {recoveryError && (
                                        <p className="text-xs text-rose-600 font-semibold">{recoveryError}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
                                        <Smartphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                Enhance Your Administrative Account Defense
                                            </p>
                                            <p className="mt-1 leading-relaxed text-slate-500 dark:text-slate-400">
                                                With 2FA activated, signing in requires your regular password plus a 6-digit rolling verification code generated by your mobile device.
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="primary"
                                        size="md"
                                        leftIcon={<ShieldCheck className="w-4 h-4" />}
                                        onClick={handleStart2FASetup}
                                        isLoading={setupLoading}
                                    >
                                        Begin 2FA Setup
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* 2FA Setup Step Modal */}
            <Modal
                isOpen={isSetupOpen}
                onClose={() => setIsSetupOpen(false)}
                title="Configure Two-Factor Authentication"
                description="Scan the QR code below using your mobile authenticator app (Google Authenticator, Authy, Microsoft Authenticator)."
                maxWidth="md"
                footer={
                    <>
                        <Button variant="outline" size="md" onClick={() => setIsSetupOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="md"
                            isLoading={enableForm.processing}
                            onClick={handleConfirmEnable2FA}
                        >
                            Verify &amp; Activate
                        </Button>
                    </>
                }
            >
                {setupLoading ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                        Generating cryptographic authentication secret...
                    </div>
                ) : setupData ? (
                    <div className="space-y-4">
                        {/* QR Code Container */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-center max-w-[220px] mx-auto shadow-xs">
                            <div
                                dangerouslySetInnerHTML={{ __html: setupData.qr_code_svg }}
                                className="w-full h-auto"
                            />
                        </div>

                        {/* Secret Key Manual Copy */}
                        <div className="space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Can't scan? Enter secret manually:
                            </span>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 select-all truncate">
                                    {setupData.formatted_secret || setupData.secret}
                                </code>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(setupData.secret, true)}
                                >
                                    {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </Button>
                            </div>
                        </div>

                        {/* Verification code input */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <Input
                                label="6-Digit Verification Code"
                                placeholder="123456"
                                maxLength={6}
                                required
                                autoFocus
                                value={enableForm.data.code}
                                onChange={(e) => enableForm.setData('code', e.target.value.replace(/\D/g, ''))}
                                error={enableForm.errors.code}
                                helperText="Enter the 6-digit code shown in your authenticator app."
                            />
                        </div>
                    </div>
                ) : null}
            </Modal>

            {/* Disable 2FA Modal */}
            <Modal
                isOpen={isDisableOpen}
                onClose={() => setIsDisableOpen(false)}
                title="Disable Two-Factor Authentication"
                description="This will downgrade your account security. Please confirm your current password to proceed."
                maxWidth="sm"
                footer={
                    <>
                        <Button variant="outline" size="md" onClick={() => setIsDisableOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            size="md"
                            isLoading={disableForm.processing}
                            onClick={handleDisable2FA}
                        >
                            Disable 2FA
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleDisable2FA} className="space-y-4">
                    <Input
                        label="Account Password"
                        type="password"
                        placeholder="••••••••••••"
                        required
                        value={disableForm.data.password}
                        onChange={(e) => disableForm.setData('password', e.target.value)}
                        error={disableForm.errors.password}
                    />
                </form>
            </Modal>

            {/* Recovery Codes Modal */}
            <Modal
                isOpen={isRecoveryOpen}
                onClose={() => setIsRecoveryOpen(false)}
                title="Emergency Recovery Codes"
                description="Save these single-use recovery codes in a secure location. You can use them to access your account if you lose your phone."
                maxWidth="md"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="md"
                            leftIcon={<Download className="w-4 h-4" />}
                            onClick={downloadRecoveryCodes}
                        >
                            Download Codes (.txt)
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            leftIcon={copiedCodes ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            onClick={() => copyToClipboard(recoveryCodes.join('\n'))}
                        >
                            {copiedCodes ? 'Copied' : 'Copy All'}
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="md"
                            onClick={() => setIsRecoveryOpen(false)}
                        >
                            Done
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {recoveryCodes.map((code, idx) => (
                            <div key={idx} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-center select-all">
                                {code}
                            </div>
                        ))}
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        ⚠️ Each code may only be used once. If you regenerate recovery codes, previous codes are invalidated immediately.
                    </p>
                </div>
            </Modal>
        </AdminLayout>
    );
}

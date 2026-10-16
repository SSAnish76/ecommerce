import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ShieldCheck,
    KeyRound,
    Smartphone,
    ArrowRight,
    AlertCircle,
    ArrowLeft,
    Sun,
    Moon,
} from 'lucide-react';
import { ThemeProvider, useTheme } from '../../../Contexts/ThemeContext';
import { Button, Input } from '../../../Components/UI';

function TwoFactorChallengeContent() {
    const { theme, toggleTheme } = useTheme();
    const [recovery, setRecovery] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
        recovery_code: '',
    });

    const toggleMode = () => {
        reset();
        setRecovery(!recovery);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/two-factor-challenge');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 transition-colors duration-200">
            {/* Top theme toggle bar */}
            <div className="absolute top-5 right-5 sm:top-8 sm:right-8">
                <button
                    onClick={toggleTheme}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                        <Moon className="w-4 h-4 text-indigo-600" />
                    )}
                </button>
            </div>

            <div className="w-full max-w-md">
                {/* Brand icon */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 mb-3">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Two-Factor Authentication
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Second-layer verification is required to sign in
                    </p>
                </div>

                {/* Challenge Card */}
                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-7 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-2xl">
                    <div className="mb-6 flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                            {recovery ? <KeyRound className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                {recovery ? 'Emergency Recovery Code' : 'Authenticator Code'}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                {recovery
                                    ? 'Enter one of your 10-character backup recovery codes generated during 2FA setup.'
                                    : 'Enter the 6-digit verification code from your mobile authenticator app.'}
                            </p>
                        </div>
                    </div>

                    {(errors.code || errors.recovery_code) && (
                        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 shadow-2xs">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{errors.code || errors.recovery_code}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!recovery ? (
                            <Input
                                label="6-Digit Verification Code"
                                inputMode="numeric"
                                autoFocus
                                required
                                placeholder="123456"
                                maxLength={6}
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value.replace(/\D/g, ''))}
                                error={errors.code}
                                className="font-mono text-center tracking-widest text-lg font-bold"
                            />
                        ) : (
                            <Input
                                label="Emergency Recovery Code"
                                autoFocus
                                required
                                placeholder="abc12-xyz34"
                                value={data.recovery_code}
                                onChange={(e) => setData('recovery_code', e.target.value)}
                                error={errors.recovery_code}
                                className="font-mono text-center tracking-wider text-sm font-semibold uppercase"
                            />
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full mt-2"
                            isLoading={processing}
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                        >
                            Verify &amp; Continue
                        </Button>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                                {recovery ? 'Use Authenticator App' : 'Use Recovery Code'}
                            </button>

                            <Link
                                href="/admin/login"
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function TwoFactorChallenge() {
    return (
        <ThemeProvider>
            <Head title="Two-Factor Challenge" />
            <TwoFactorChallengeContent />
        </ThemeProvider>
    );
}

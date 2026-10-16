import React from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Sparkles,
    Mail,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Sun,
    Moon,
} from 'lucide-react';
import { ThemeProvider, useTheme } from '../../../Contexts/ThemeContext';
import { PageProps } from '../../../types';
import { Button, Input } from '../../../Components/UI';

function ForgotPasswordContent() {
    const { theme, toggleTheme } = useTheme();
    const { flash } = usePage<PageProps>().props;

    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/forgot-password');
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
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 mb-3">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Password Recovery
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Request a secure administrator password reset link
                    </p>
                </div>

                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-7 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-2xl">
                    {flash?.status && (
                        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5 shadow-2xs">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{flash.status}</span>
                        </div>
                    )}

                    {errors.email && (
                        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 shadow-2xs">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{errors.email}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Administrator Email Address"
                            type="email"
                            required
                            autoFocus
                            placeholder="admin@store.com"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            leftIcon={<Mail className="w-4 h-4" />}
                            helperText="We will send a single-use password reset link to this address."
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full mt-2"
                            isLoading={processing}
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                        >
                            Send Recovery Link
                        </Button>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                            <Link
                                href="/admin/login"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Return to Login</span>
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function ForgotPassword() {
    return (
        <ThemeProvider>
            <Head title="Forgot Password" />
            <ForgotPasswordContent />
        </ThemeProvider>
    );
}

import React, { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { PageProps } from '../../../types';
import {
    Sparkles,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Sun,
    Moon,
    AlertCircle,
} from 'lucide-react';
import { ThemeProvider, useTheme } from '../../../Contexts/ThemeContext';
import { Button, Input } from '../../../Components/UI';

function LoginContent() {
    const { theme, toggleTheme } = useTheme();
    const { app_name, store } = usePage<PageProps>().props;
    const appName = store?.name || app_name || 'E-Commerce';
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 transition-colors duration-200">
            {/* Top theme toggle bar */}
            <div className="absolute top-5 right-5 sm:top-8 sm:right-8">
                <button
                    onClick={toggleTheme}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    aria-label="Toggle theme"
                    title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
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
                        {appName}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Administrative Operations Gateway
                    </p>
                </div>

                {/* Login Card */}
                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-7 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-2xl">
                    <div className="mb-6">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Admin Authentication</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Enter your credentials to access the console
                        </p>
                    </div>

                    {errors.email && (
                        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 shadow-2xs">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{errors.email}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Administrator Email"
                            type="email"
                            required
                            autoFocus
                            placeholder="admin@store.com"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            leftIcon={<Mail className="w-4 h-4" />}
                        />

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    Password <span className="text-rose-500">*</span>
                                </label>
                                <Link
                                    href="/admin/forgot-password"
                                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                required
                                placeholder="••••••••••••"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                error={errors.password}
                                leftIcon={<Lock className="w-4 h-4" />}
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/25 border-slate-300 dark:border-slate-700 cursor-pointer"
                                />
                                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                    Remember session for 30 days
                                </span>
                            </label>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full mt-2"
                            isLoading={processing}
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                        >
                            Sign In to Console
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function Login() {
    const { app_name, store } = usePage<PageProps>().props;
    const appName = store?.name || app_name || 'E-Commerce';

    return (
        <ThemeProvider>
            <Head title={`Admin Login — ${appName}`} />
            <LoginContent />
        </ThemeProvider>
    );
}

import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    Sparkles,
    Lock,
    Eye,
    EyeOff,
    Mail,
    ArrowRight,
    AlertCircle,
    Sun,
    Moon,
} from 'lucide-react';
import { ThemeProvider, useTheme } from '../../../Contexts/ThemeContext';
import { Button, Input } from '../../../Components/UI';

interface ResetPasswordProps {
    token: string;
    email: string;
}

function ResetPasswordContent({ token, email }: ResetPasswordProps) {
    const { theme, toggleTheme } = useTheme();
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        token: token,
        email: email || '',
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/reset-password');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 transition-colors duration-200">
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
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 mb-3">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Reset Password
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Set a secure new master password for your administrator account
                    </p>
                </div>

                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-7 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-2xl">
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
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            leftIcon={<Mail className="w-4 h-4" />}
                        />

                        <Input
                            label="New Master Password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            error={errors.password}
                            leftIcon={<Lock className="w-4 h-4" />}
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                        />

                        <Input
                            label="Confirm New Password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            error={errors.password_confirmation}
                            leftIcon={<Lock className="w-4 h-4" />}
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full mt-2"
                            isLoading={processing}
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                        >
                            Reset Password &amp; Login
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function ResetPassword(props: ResetPasswordProps) {
    return (
        <ThemeProvider>
            <Head title="Reset Password" />
            <ResetPasswordContent {...props} />
        </ThemeProvider>
    );
}

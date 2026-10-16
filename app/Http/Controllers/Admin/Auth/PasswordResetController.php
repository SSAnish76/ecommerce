<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetController extends Controller
{
    /**
     * Show the forgot password form.
     */
    public function showForgotPassword(): Response
    {
        return Inertia::render('Admin/Auth/ForgotPassword');
    }

    /**
     * Send password reset link to user.
     */
    public function sendResetLink(Request $request): RedirectResponse
    {
        /** @var array{email: string} $validated */
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($validated['email']));
        $throttleKey = 'password-reset|'.\Illuminate\Support\Str::transliterate($email.'|'.$request->ip());

        if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = \Illuminate\Support\Facades\RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => trans('auth.throttle', [
                    'seconds' => $seconds,
                    'minutes' => (int) ceil($seconds / 60),
                ]),
            ]);
        }

        \Illuminate\Support\Facades\RateLimiter::hit($throttleKey, 300);

        $user = User::query()->where('email', $email)->first();

        // Always show positive message to prevent user enumeration attacks
        if ($user && $user->isAdmin()) {
            $rawToken = Str::random(64);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $email],
                [
                    'token' => Hash::make($rawToken),
                    'created_at' => now(),
                ]
            );

            $resetUrl = route('admin.password.reset', [
                'token' => $rawToken,
                'email' => $email,
            ]);

            event(new \App\Events\Auth\PasswordResetRequested($user, $rawToken, $resetUrl));
        }

        return redirect()->back()->with('status', 'If an administrator account with that email exists, a password reset link has been dispatched.');
    }

    /**
     * Show the reset password form.
     */
    public function showResetPassword(Request $request, string $token): Response
    {
        return Inertia::render('Admin/Auth/ResetPassword', [
            'token' => $token,
            'email' => $request->string('email')->value(),
        ]);
    }

    /**
     * Reset the user's password.
     */
    public function resetPassword(Request $request): RedirectResponse
    {
        /** @var array{token: string, email: string, password: string} $validated */
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->first();

        if (! $record) {
            throw ValidationException::withMessages([
                'email' => 'This password reset token is invalid or has expired.',
            ]);
        }

        // Check if token expired (e.g. 60 minutes)
        if (Carbon::parse((string) $record->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();
            throw ValidationException::withMessages([
                'email' => 'This password reset link has expired. Please request a new one.',
            ]);
        }

        if (! Hash::check($validated['token'], (string) $record->token)) {
            throw ValidationException::withMessages([
                'email' => 'This password reset token is invalid.',
            ]);
        }

        $user = User::query()->where('email', $validated['email'])->first();
        if (! $user) {
            throw ValidationException::withMessages([
                'email' => 'We could not find an administrator with that email address.',
            ]);
        }

        $user->password = Hash::make($validated['password']);
        $user->save();

        DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();

        return redirect()->route('admin.login')->with('success', 'Your password has been successfully reset. You may now log in.');
    }
}

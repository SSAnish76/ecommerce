<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TwoFactorAuthenticationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorChallengeController extends Controller
{
    public function __construct(
        protected readonly TwoFactorAuthenticationService $twoFactorService
    ) {}

    /**
     * Show the two-factor authentication challenge form.
     */
    public function show(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has('login.id')) {
            return redirect()->route('admin.login');
        }

        return Inertia::render('Admin/Auth/TwoFactorChallenge');
    }

    /**
     * Attempt to authenticate using TOTP code or recovery code.
     */
    public function verify(Request $request): RedirectResponse
    {
        $user = $this->getChallengedUser($request);
        if (! $user) {
            return redirect()->route('admin.login');
        }

        $throttleKey = '2fa_challenge|'.Str::transliterate($user->id.'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'code' => trans('auth.throttle', [
                    'seconds' => $seconds,
                    'minutes' => (int) ceil($seconds / 60),
                ]),
            ]);
        }

        /** @var array{code?: ?string, recovery_code?: ?string} $validated */
        $validated = $request->validate([
            'code' => ['nullable', 'string'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        $code = $validated['code'] ?? null;
        $recoveryCode = $validated['recovery_code'] ?? null;

        $challenge = $this->twoFactorService->verifyChallenge($user, $code, $recoveryCode);

        if (! $challenge['valid']) {
            RateLimiter::hit($throttleKey, 60);

            $isRecovery = filled($recoveryCode);

            throw ValidationException::withMessages([
                $isRecovery ? 'recovery_code' : 'code' => $isRecovery
                    ? 'The provided recovery code is invalid or has already been used.'
                    : 'The provided two-factor authentication code is invalid or expired.',
            ]);
        }

        RateLimiter::clear($throttleKey);

        $remember = (bool) $request->session()->get('login.remember', false);
        $request->session()->forget(['login.id', 'login.remember']);

        Auth::login($user, $remember);
        $request->session()->regenerate();
        $request->session()->put('auth.two_factor_verified', true);

        $user->update(['last_login_at' => now()]);

        if ($challenge['used_recovery_code']) {
            $request->session()->flash('warning', 'You logged in using an emergency recovery code. This code cannot be reused.');
        }

        return redirect()->intended(route('admin.dashboard'));
    }

    /**
     * Retrieve the user undergoing the 2FA challenge.
     */
    private function getChallengedUser(Request $request): ?User
    {
        $userId = $request->session()->get('login.id');

        return $userId ? User::query()->find($userId) : null;
    }
}

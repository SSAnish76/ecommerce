<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TwoFactorAuthenticationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class TwoFactorManagementController extends Controller
{
    public function __construct(
        protected readonly TwoFactorAuthenticationService $twoFactorService
    ) {}

    /**
     * Start the 2FA setup process: generate a secret key, QR code, and manual key.
     */
    public function setup(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $setupData = $this->twoFactorService->generateSetupData($user);
        $request->session()->put('two_factor.pending_secret', $setupData['secret']);

        return response()->json($setupData);
    }

    /**
     * Confirm 6-digit OTP code and enable 2FA on the user's account.
     */
    public function enable(Request $request): RedirectResponse
    {
        /** @var array{code: string} $validated */
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $pendingSecret = $request->session()->get('two_factor.pending_secret');

        if (! is_string($pendingSecret) || $pendingSecret === '') {
            throw ValidationException::withMessages([
                'code' => 'The two-factor setup session has expired. Please initiate setup again.',
            ]);
        }

        if (! $this->twoFactorService->verify($pendingSecret, $validated['code'])) {
            throw ValidationException::withMessages([
                'code' => 'The verification code provided is invalid. Check your authenticator app and try again.',
            ]);
        }

        /** @var User $user */
        $user = $request->user();
        $recoveryCodes = $this->twoFactorService->enable($user, $pendingSecret);

        $request->session()->forget('two_factor.pending_secret');
        $request->session()->put('auth.two_factor_verified', true);
        $request->session()->flash('recovery_codes', $recoveryCodes);

        return redirect()->back()->with('success', 'Two-factor authentication has been successfully activated.');
    }

    /**
     * Disable two-factor authentication on the account.
     */
    public function disable(Request $request): RedirectResponse
    {
        $user = $this->ensureValidPassword($request);

        $this->twoFactorService->disable($user);

        $request->session()->forget(['two_factor.pending_secret', 'auth.two_factor_verified']);

        return redirect()->back()->with('success', 'Two-factor authentication has been disabled.');
    }

    /**
     * View current recovery codes (requires current password).
     */
    public function showRecoveryCodes(Request $request): JsonResponse
    {
        $user = $this->ensureValidPassword($request);

        return response()->json([
            'recovery_codes' => $this->twoFactorService->getRecoveryCodesForUser($user),
        ]);
    }

    /**
     * Regenerate new recovery codes (requires current password).
     */
    public function regenerateRecoveryCodes(Request $request): RedirectResponse
    {
        $user = $this->ensureValidPassword($request);

        $newCodes = $this->twoFactorService->regenerateRecoveryCodesForUser($user);

        $request->session()->flash('recovery_codes', $newCodes);

        return redirect()->back()->with('success', 'New emergency recovery backup codes have been generated.');
    }

    /**
     * Validate the current user's password for sensitive 2FA actions.
     */
    private function ensureValidPassword(Request $request): User
    {
        /** @var array{password: string} $validated */
        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($validated['password'], (string) $user->password)) {
            throw ValidationException::withMessages([
                'password' => 'The password entered is incorrect.',
            ]);
        }

        return $user;
    }
}

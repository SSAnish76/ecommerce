<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * Default token duration fallbacks in minutes and days.
     */
    public const DEFAULT_ACCESS_TOKEN_EXPIRATION_MINUTES = 60; // 1 hour
    public const DEFAULT_REFRESH_TOKEN_EXPIRATION_DAYS = 30;   // 30 days

    /**
     * Get access token expiration in minutes from config / env.
     */
    protected function getAccessTokenExpirationMinutes(): int
    {
        return (int) config('sanctum.access_token_expiration_minutes', self::DEFAULT_ACCESS_TOKEN_EXPIRATION_MINUTES);
    }

    /**
     * Get refresh token expiration in days from config / env.
     */
    protected function getRefreshTokenExpirationDays(): int
    {
        return (int) config('sanctum.refresh_token_expiration_days', self::DEFAULT_REFRESH_TOKEN_EXPIRATION_DAYS);
    }

    /**
     * Issue access and refresh token pair for a customer.
     *
     * @return array{token: string, access_token: string, refresh_token: string, token_type: string, expires_in: int, expires_at: string}
     */
    protected function generateAuthTokens(Customer $customer, string $deviceName = 'customer-app'): array
    {
        $accessMinutes = $this->getAccessTokenExpirationMinutes();
        $refreshDays = $this->getRefreshTokenExpirationDays();

        $accessExpiresAt = now()->addMinutes($accessMinutes);
        $refreshExpiresAt = now()->addDays($refreshDays);

        $accessToken = $customer->createToken(
            name: $deviceName.'-access-token',
            abilities: ['access-api'],
            expiresAt: $accessExpiresAt
        )->plainTextToken;

        $refreshToken = $customer->createToken(
            name: $deviceName.'-refresh-token',
            abilities: ['issue-access-token'],
            expiresAt: $refreshExpiresAt
        )->plainTextToken;

        return [
            'token' => $accessToken,
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'token_type' => 'Bearer',
            'expires_in' => $accessMinutes * 60,
            'expires_at' => $accessExpiresAt->toISOString(),
        ];
    }

    /**
     * Register a new customer account.
     */
    public function register(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'string', 'email', 'max:255', 'unique:customers,email'],
                'phone' => ['nullable', 'string', 'max:50'],
                'password' => ['required', 'string', 'min:8', 'confirmed'],
            ]);

            $customer = Customer::create([
                'name' => $validated['name'],
                'email' => strtolower(trim($validated['email'])),
                'phone' => $validated['phone'] ?? null,
                'password' => Hash::make($validated['password']),
                'status' => 'active',
                'last_login_at' => now(),
            ]);

            $tokenData = $this->generateAuthTokens($customer, 'customer-auth-token');

            $data = [
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                    'status' => $customer->status,
                    'created_at' => $customer->created_at?->toISOString(),
                ],
                ...$tokenData,
            ];

            return $this->returnSuccess($data, 'Registration successful!', 201);
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Authenticate customer credentials and return access token.
     */
    public function login(Request $request)
    {
        try {
            $validated = $request->validate([
                'email' => ['required', 'string', 'email'],
                'password' => ['required', 'string'],
                'device_name' => ['nullable', 'string', 'max:100'],
            ]);

            /** @var Customer|null $customer */
            $customer = Customer::where('email', strtolower(trim($validated['email'])))->first();

            if (! $customer || ! Hash::check($validated['password'], $customer->password)) {
                return $this->returnError(
                    'The provided credentials do not match our records.',
                    'The provided credentials do not match our records.',
                    401
                );
            }

            if (! $customer->isActive()) {
                return $this->returnError(
                    'Your account is currently inactive. Please contact support.',
                    'Your account is currently inactive. Please contact support.',
                    403
                );
            }

            $customer->update(['last_login_at' => now()]);

            $deviceName = $validated['device_name'] ?? 'customer-app';
            $tokenData = $this->generateAuthTokens($customer, $deviceName);

            $data = [
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                    'status' => $customer->status,
                    'created_at' => $customer->created_at?->toISOString(),
                ],
                ...$tokenData,
            ];

            return $this->returnSuccess($data, 'Login successful!');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Refresh access token using a valid refresh token.
     */
    public function refresh(Request $request)
    {
        try {
            $refreshTokenString = $request->input('refresh_token') ?? $request->bearerToken();

            if (! $refreshTokenString) {
                return $this->returnError(
                    'Refresh token is required.',
                    'Refresh token is required.',
                    400
                );
            }

            /** @var PersonalAccessToken|null $tokenModel */
            $tokenModel = PersonalAccessToken::findToken($refreshTokenString);

            if (! $tokenModel) {
                return $this->returnError(
                    'Invalid refresh token.',
                    'Invalid refresh token.',
                    401
                );
            }

            if ($tokenModel->expires_at && $tokenModel->expires_at->isPast()) {
                $tokenModel->delete();

                return $this->returnError(
                    'Refresh token has expired. Please log in again.',
                    'Refresh token has expired.',
                    401
                );
            }

            if (! $tokenModel->can('issue-access-token')) {
                return $this->returnError(
                    'The provided token is not a valid refresh token.',
                    'Invalid token type.',
                    401
                );
            }

            $customer = $tokenModel->tokenable;

            if (! ($customer instanceof Customer)) {
                return $this->returnError(
                    'Invalid customer token.',
                    'Invalid customer token.',
                    401
                );
            }

            if (! $customer->isActive()) {
                return $this->returnError(
                    'Your account is currently inactive. Please contact support.',
                    'Your account is currently inactive.',
                    403
                );
            }

            // Token rotation: Revoke the used refresh token
            $tokenModel->delete();

            $deviceName = $request->input('device_name') ?? 'customer-app';
            $tokenData = $this->generateAuthTokens($customer, $deviceName);

            $data = [
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                    'status' => $customer->status,
                    'created_at' => $customer->created_at?->toISOString(),
                ],
                ...$tokenData,
            ];

            return $this->returnSuccess($data, 'Token refreshed successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Get the authenticated customer profile.
     */
    public function profile(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $defaultAddress = $customer->addresses()->where('is_default', true)->first();
            $ordersCount = $customer->orders()->count();
            $wishlistCount = $customer->wishlists()->count();

            $data = [
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                    'status' => $customer->status,
                    'created_at' => $customer->created_at?->toISOString(),
                ],
                'default_address' => $defaultAddress,
                'counts' => [
                    'orders' => $ordersCount,
                    'wishlist' => $wishlistCount,
                ],
            ];

            return $this->returnSuccess($data, 'Profile retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Update customer profile details.
     */
    public function updateProfile(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'string', 'email', 'max:255', Rule::unique('customers', 'email')->ignore($customer->id)],
                'phone' => ['nullable', 'string', 'max:50'],
            ]);

            $customer->update([
                'name' => $validated['name'],
                'email' => strtolower(trim($validated['email'])),
                'phone' => $validated['phone'] ?? null,
            ]);

            $data = [
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                    'status' => $customer->status,
                    'updated_at' => $customer->updated_at?->toISOString(),
                ],
            ];

            return $this->returnSuccess($data, 'Profile updated successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Update customer password.
     */
    public function updatePassword(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $validated = $request->validate([
                'current_password' => ['required', 'string'],
                'password' => ['required', 'string', 'min:8', 'confirmed'],
            ]);

            if (! Hash::check($validated['current_password'], $customer->password)) {
                return $this->returnError(
                    ['current_password' => ['The current password provided is incorrect.']],
                    'The current password provided is incorrect.'
                );
            }

            $customer->update([
                'password' => Hash::make($validated['password']),
            ]);

            return $this->returnSuccess([], 'Password updated successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Revoke customer current access token (logout).
     */
    public function logout(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            if ($customer) {
                if ($request->boolean('all')) {
                    $customer->tokens()->delete();
                } else {
                    if ($customer->currentAccessToken()) {
                        $customer->currentAccessToken()->delete();
                    }

                    if ($refreshToken = $request->input('refresh_token')) {
                        if ($tokenModel = PersonalAccessToken::findToken($refreshToken)) {
                            $tokenModel->delete();
                        }
                    }
                }
            }

            return $this->returnSuccess([], 'Successfully logged out.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }
}

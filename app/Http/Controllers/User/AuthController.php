<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Enums\Customer\CustomerStatus;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * Issue access and refresh token pair for a customer.
     *
     * @return array{access_token: string, refresh_token: string, token_type: string, expires_in: int, expires_at: string}
     */
    protected function generateAuthTokens(Customer $customer, string $deviceName = 'customer-app'): array
    {
        $accessMinutes = (int) config('sanctum.access_token_expiration_minutes', 60);
        $refreshDays = (int) config('sanctum.refresh_token_expiration_days', 30);

        $accessExpiresAt = now()->addMinutes($accessMinutes);
        $refreshExpiresAt = now()->addDays($refreshDays);

        $accessToken = $customer->createToken(
            name: $deviceName . '-access-token',
            abilities: ['access-api'],
            expiresAt: $accessExpiresAt
        )->plainTextToken;

        $refreshToken = $customer->createToken(
            name: $deviceName . '-refresh-token',
            abilities: ['issue-access-token'],
            expiresAt: $refreshExpiresAt
        )->plainTextToken;

        return [
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
    public function register(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
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
                'status' => CustomerStatus::Active,
                'last_login_at' => now(),
            ]);

            $tokenData = $this->generateAuthTokens($customer, 'customer-auth-token');

            return $this->returnSuccess($tokenData, 'Registration successful!', 201);
        });
    }

    /**
     * Authenticate customer credentials and return access token.
     */
    public function login(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
            $validated = $request->validate([
                'email' => ['required', 'string', 'email'],
                'password' => ['required', 'string'],
                'device_name' => ['nullable', 'string', 'max:100'],
            ]);

            /** @var Customer|null $customer */
            $customer = Customer::where('email', strtolower(trim($validated['email'])))->first();

            if (! $customer || ! Hash::check($validated['password'], $customer->password)) {
                return $this->returnError(
                    null,
                    'The provided credentials do not match our records.',
                    401
                );
            }

            if (! $customer->isActive()) {
                return $this->returnError(
                    null,
                    'Your account is currently inactive. Please contact support.',
                    403
                );
            }

            $customer->update(['last_login_at' => now()]);

            $deviceName = $validated['device_name'] ?? 'customer-app';
            $tokenData = $this->generateAuthTokens($customer, $deviceName);

            return $this->returnSuccess($tokenData, 'Login successful!');
        });
    }

    /**
     * Refresh access token using a valid refresh token.
     */
    public function refresh(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
            $refreshTokenString = $request->input('refresh_token') ?? $request->bearerToken();

            if (! $refreshTokenString) {
                return $this->returnError(
                    null,
                    'Refresh token is required.',
                    400
                );
            }

            /** @var PersonalAccessToken|null $tokenModel */
            $tokenModel = PersonalAccessToken::findToken($refreshTokenString);

            if (! $tokenModel) {
                return $this->returnError(
                    null,
                    'Invalid refresh token.',
                    401
                );
            }

            if ($tokenModel->expires_at && $tokenModel->expires_at->isPast()) {
                $tokenModel->delete();

                return $this->returnError(
                    null,
                    'Refresh token has expired. Please log in again.',
                    401
                );
            }

            if (! $tokenModel->can('issue-access-token')) {
                return $this->returnError(
                    null,
                    'The provided token is not a valid refresh token.',
                    401
                );
            }

            $customer = $tokenModel->tokenable;

            if (! ($customer instanceof Customer)) {
                return $this->returnError(
                    null,
                    'Invalid customer token.',
                    401
                );
            }

            if (! $customer->isActive()) {
                return $this->returnError(
                    null,
                    'Your account is currently inactive. Please contact support.',
                    403
                );
            }

            // Token rotation: Revoke the used refresh token
            $tokenModel->delete();

            $deviceName = $request->input('device_name') ?? 'customer-app';
            $tokenData = $this->generateAuthTokens($customer, $deviceName);

            return $this->returnSuccess($tokenData, 'Token refreshed successfully.');
        });
    }

    /**
     * Get the authenticated customer profile.
     */
    public function profile(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
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
        });
    }

    /**
     * Update customer profile details.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
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
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'status' => $customer->status,
                'updated_at' => $customer->updated_at?->toISOString(),
            ];

            return $this->returnSuccess($data, 'Profile updated successfully.');
        });
    }

    /**
     * Update customer password.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
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
        });
    }

    /**
     * Revoke customer current access token (logout).
     */
    public function logout(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
            /** @var Customer|null $customer */
            $customer = $request->user();

            if ($customer) {
                if ($request->boolean('all')) {
                    $customer->tokens()->delete();
                } else {
                    $customer->currentAccessToken()?->delete();

                    if ($refreshToken = $request->input('refresh_token')) {
                        PersonalAccessToken::findToken($refreshToken)?->delete();
                    }
                }
            }

            return $this->returnSuccess([], 'Successfully logged out.');
        });
    }
}

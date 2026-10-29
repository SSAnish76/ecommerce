<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Enums\Address\AddressType;
use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AddressController extends Controller
{
    /**
     * Display a listing of customer shipping and billing addresses.
     */
    public function index(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
            /** @var Customer $customer */
            $customer = $request->user();

            $addresses = $customer->addresses()
                ->orderBy('is_default', 'desc')
                ->latest()
                ->get();

            return $this->returnSuccess($addresses, 'Addresses retrieved successfully.');
        });
    }

    /**
     * Create a new address for the customer.
     */
    public function store(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
            /** @var Customer $customer */
            $customer = $request->user();

            $validated = $request->validate([
                'type' => ['nullable', Rule::enum(AddressType::class)],
                'name' => ['required', 'string', 'max:255'],
                'phone' => ['nullable', 'string', 'max:50'],
                'address_line_1' => ['required', 'string', 'max:255'],
                'address_line_2' => ['nullable', 'string', 'max:255'],
                'city' => ['required', 'string', 'max:100'],
                'state' => ['nullable', 'string', 'max:100'],
                'postal_code' => ['required', 'string', 'max:30'],
                'country' => ['nullable', 'string', 'max:100'],
                'is_default' => ['nullable', 'boolean'],
            ]);

            $address = DB::transaction(function () use ($customer, $validated): Address {
                $hasAddresses = $customer->addresses()->exists();
                $isDefault = $validated['is_default'] ?? (! $hasAddresses);

                if ($isDefault) {
                    $customer->addresses()->update(['is_default' => false]);
                }

                return $customer->addresses()->create([
                    'type' => $validated['type'] ?? AddressType::Shipping->value,
                    'name' => $validated['name'],
                    'phone' => $validated['phone'] ?? $customer->phone,
                    'address_line_1' => $validated['address_line_1'],
                    'address_line_2' => $validated['address_line_2'] ?? null,
                    'city' => $validated['city'],
                    'state' => $validated['state'] ?? null,
                    'postal_code' => $validated['postal_code'],
                    'country' => $validated['country'] ?? null,
                    'is_default' => (bool) $isDefault,
                ]);
            });

            return $this->returnSuccess($address, 'Address created successfully.', 201);
        });
    }

    /**
     * Display the specified address.
     */
    public function show(string $id, Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($id, $request): JsonResponse {
            /** @var Customer $customer */
            $customer = $request->user();

            $address = $customer->addresses()->find($id);
            if (! $address) {
                return $this->returnError(null, 'Address not found.');
            }

            return $this->returnSuccess($address, 'Address retrieved successfully.');
        });
    }

    /**
     * Update the specified address.
     */
    public function update(string $id, Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($id, $request): JsonResponse {
            /** @var Customer $customer */
            $customer = $request->user();

            $address = $customer->addresses()->find($id);
            if (! $address) {
                return $this->returnError(null, 'Address not found.');
            }

            $validated = $request->validate([
                'type' => ['nullable', Rule::enum(AddressType::class)],
                'name' => ['sometimes', 'required', 'string', 'max:255'],
                'phone' => ['nullable', 'string', 'max:50'],
                'address_line_1' => ['sometimes', 'required', 'string', 'max:255'],
                'address_line_2' => ['nullable', 'string', 'max:255'],
                'city' => ['sometimes', 'required', 'string', 'max:100'],
                'state' => ['nullable', 'string', 'max:100'],
                'postal_code' => ['sometimes', 'required', 'string', 'max:30'],
                'country' => ['nullable', 'string', 'max:100'],
                'is_default' => ['nullable', 'boolean'],
            ]);

            DB::transaction(function () use ($customer, $address, $validated): void {
                if (! empty($validated['is_default'])) {
                    $customer->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
                }

                $address->update($validated);
            });

            return $this->returnSuccess($address->fresh(), 'Address updated successfully.');
        });
    }

    /**
     * Delete the specified address.
     */
    public function destroy(string $id, Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($id, $request): JsonResponse {
            /** @var Customer $customer */
            $customer = $request->user();

            $address = $customer->addresses()->find($id);
            if (! $address) {
                return $this->returnError(null, 'Address not found.');
            }

            DB::transaction(function () use ($customer, $address): void {
                $wasDefault = $address->is_default;
                $address->delete();

                // If deleted address was default, promote another address to default
                if ($wasDefault) {
                    $nextDefault = $customer->addresses()->latest()->first();
                    if ($nextDefault) {
                        $nextDefault->update(['is_default' => true]);
                    }
                }
            });

            return $this->returnSuccess([], 'Address deleted successfully.');
        });
    }

    /**
     * Set the specified address as default.
     */
    public function setDefault(string $id, Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($id, $request): JsonResponse {
            /** @var Customer $customer */
            $customer = $request->user();

            $address = $customer->addresses()->find($id);
            if (! $address) {
                return $this->returnError(null, 'Address not found.');
            }

            DB::transaction(function () use ($customer, $address): void {
                $customer->addresses()->update(['is_default' => false]);
                $address->update(['is_default' => true]);
            });

            return $this->returnSuccess($address->fresh(), 'Address set as default successfully.');
        });
    }
}

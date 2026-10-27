<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Customer;
use Exception;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    /**
     * Display a listing of customer shipping and billing addresses.
     */
    public function index(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $addresses = Address::where('customer_id', $customer->id)
                ->orderBy('is_default', 'desc')
                ->latest()
                ->get();

            return $this->returnSuccess($addresses, 'Addresses retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Create a new address for the customer.
     */
    public function store(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $validated = $request->validate([
                'type' => ['nullable', 'string', 'in:shipping,billing,home,office,other'],
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

            $hasAddresses = Address::where('customer_id', $customer->id)->exists();
            $isDefault = $validated['is_default'] ?? (! $hasAddresses);

            if ($isDefault) {
                Address::where('customer_id', $customer->id)->update(['is_default' => false]);
            }

            $address = Address::create([
                'customer_id' => $customer->id,
                'type' => $validated['type'] ?? 'shipping',
                'name' => $validated['name'],
                'phone' => $validated['phone'] ?? $customer->phone,
                'address_line_1' => $validated['address_line_1'],
                'address_line_2' => $validated['address_line_2'] ?? null,
                'city' => $validated['city'],
                'state' => $validated['state'] ?? null,
                'postal_code' => $validated['postal_code'],
                'country' => $validated['country'] ?? 'United States',
                'is_default' => (bool) $isDefault,
            ]);

            return $this->returnSuccess($address, 'Address created successfully.', 201);
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Display the specified address.
     */
    public function show(string $id, Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $address = Address::where('customer_id', $customer->id)->where('id', $id)->first();
            if (! $address) {
                return $this->returnError('Address not found.', 'Address not found.', 404);
            }

            return $this->returnSuccess($address, 'Address retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Update the specified address.
     */
    public function update(string $id, Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $address = Address::where('customer_id', $customer->id)->where('id', $id)->first();
            if (! $address) {
                return $this->returnError('Address not found.', 'Address not found.', 404);
            }

            $validated = $request->validate([
                'type' => ['nullable', 'string', 'in:shipping,billing,home,office,other'],
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

            if (! empty($validated['is_default'])) {
                Address::where('customer_id', $customer->id)->where('id', '!=', $address->id)->update(['is_default' => false]);
            }

            $address->update($validated);

            return $this->returnSuccess($address, 'Address updated successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Delete the specified address.
     */
    public function destroy(string $id, Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $address = Address::where('customer_id', $customer->id)->where('id', $id)->first();
            if (! $address) {
                return $this->returnError('Address not found.', 'Address not found.', 404);
            }

            $wasDefault = $address->is_default;
            $address->delete();

            // If deleted address was default, promote another address to default
            if ($wasDefault) {
                $nextDefault = Address::where('customer_id', $customer->id)->latest()->first();
                if ($nextDefault) {
                    $nextDefault->update(['is_default' => true]);
                }
            }

            return $this->returnSuccess([], 'Address deleted successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Set the specified address as default.
     */
    public function setDefault(string $id, Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $address = Address::where('customer_id', $customer->id)->where('id', $id)->first();
            if (! $address) {
                return $this->returnError('Address not found.', 'Address not found.', 404);
            }

            Address::where('customer_id', $customer->id)->update(['is_default' => false]);
            $address->update(['is_default' => true]);

            return $this->returnSuccess($address, 'Address set as default successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }
}

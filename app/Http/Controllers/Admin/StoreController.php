<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\Store\StoreStatus;
use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StoreController extends Controller
{
    /**
     * Display the singleton store profile view & edit page.
     */
    public function index(): Response
    {
        $store = Store::current();

        return Inertia::render('Admin/Store', [
            'store' => array_merge($store->toArray(), [
                'status' => $store->status?->value ?? StoreStatus::Active->value,
                'is_active' => $store->isActive(),
            ]),
        ]);
    }

    /**
     * Update the store profile.
     */
    public function update(Request $request): RedirectResponse
    {
        $store = Store::current();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'legal_name' => ['nullable', 'string', 'max:200'],
            'email' => ['required', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address_line1' => ['nullable', 'string', 'max:200'],
            'address_line2' => ['nullable', 'string', 'max:200'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:30'],
            'country' => ['nullable', 'string', 'max:100'],
            'logo_id' => ['nullable'],
            'favicon_id' => ['nullable'],
            'tax_number' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:1000'],
            'website_url' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', Rule::enum(StoreStatus::class)],
        ]);

        if (! empty($validated['status'])) {
            $validated['status'] = StoreStatus::from($validated['status']);
        } else {
            $validated['status'] = $store->status ?? StoreStatus::Active;
        }

        if ($request->has('logo_id')) {
            $validated['logo_id'] = $request->input('logo_id') ?: null;
        }

        if ($request->has('favicon_id')) {
            $validated['favicon_id'] = $request->input('favicon_id') ?: null;
        }

        $store->update($validated);
        Store::clearCache();

        return redirect()->back()->with('success', 'Store profile and brand details updated successfully.');
    }
}

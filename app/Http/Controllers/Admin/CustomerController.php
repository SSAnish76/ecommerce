<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\Address\AddressType;
use App\Enums\Customer\CustomerStatus;
use App\Enums\Order\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Customer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    /**
     * Display a paginated listing of customers with search and status filters.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $status = $request->string('status')->trim()->value();

        $customers = Customer::query()
            ->withCount('orders')
            ->withSum(['orders as total_spent' => function (Builder $query): void {
                $query->where('status', '!=', OrderStatus::Cancelled->value);
            }], 'total')
            ->with(['addresses' => function ($query): void {
                $query->where('is_default', true);
            }])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $q) use ($search): void {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($status !== '', function (Builder $query) use ($status): void {
                $query->where('status', $status);
            })
            ->latest('created_at')
            ->paginate(15)
            ->withQueryString();

        $totalCustomers = Customer::count();
        $activeCustomers = Customer::where('status', CustomerStatus::Active->value)->count();
        $inactiveCustomers = Customer::where('status', CustomerStatus::Inactive->value)->count();

        return Inertia::render('Admin/Customers', [
            'customers' => $customers,
            'metrics' => [
                'total_customers' => $totalCustomers,
                'active_customers' => $activeCustomers,
                'inactive_customers' => $inactiveCustomers,
            ],
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'statuses' => CustomerStatus::options(),
        ]);
    }

    /**
     * Store a new customer and optional primary address.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:customers,email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['nullable', 'string', Password::defaults()],
            'status' => ['required', 'string', Rule::enum(CustomerStatus::class)],
            'address_line_1' => ['nullable', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:30'],
            'country' => ['nullable', 'string', 'max:100'],
        ]);

        $password = ! empty($validated['password'])
            ? Hash::make($validated['password'])
            : Hash::make(Str::random(16));

        DB::transaction(function () use ($validated, $password): void {
            $customer = Customer::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'password' => $password,
                'status' => $validated['status'],
            ]);

            if (! empty($validated['address_line_1'])) {
                $customer->addresses()->create([
                    'type' => AddressType::Shipping->value,
                    'name' => $validated['name'],
                    'phone' => $validated['phone'] ?? null,
                    'address_line_1' => $validated['address_line_1'],
                    'address_line_2' => $validated['address_line_2'] ?? null,
                    'city' => $validated['city'] ?? '',
                    'state' => $validated['state'] ?? null,
                    'postal_code' => $validated['postal_code'] ?? '',
                    'country' => $validated['country'] ?? 'United States',
                    'is_default' => true,
                ]);
            }
        });

        return redirect()->route('admin.customers.index')->with('success', 'Customer account created successfully.');
    }

    /**
     * Display customer detail page with address list, order history, and spend metrics.
     */
    public function show(Customer $customer): Response
    {
        $customer->load([
            'addresses' => function ($query): void {
                $query->orderByDesc('is_default')->latest();
            },
        ]);

        $orders = $customer->orders()
            ->with(['items'])
            ->latest('created_at')
            ->paginate(10)
            ->withQueryString();

        $totalSpent = (float) $customer->orders()
            ->where('status', '!=', OrderStatus::Cancelled->value)
            ->sum('total');

        $totalOrdersCount = $customer->orders()->count();
        $completedOrdersCount = $customer->orders()->where('status', OrderStatus::Completed->value)->count();
        $pendingOrdersCount = $customer->orders()->whereIn('status', [OrderStatus::Pending->value, OrderStatus::Processing->value])->count();
        $cancelledOrdersCount = $customer->orders()->where('status', OrderStatus::Cancelled->value)->count();

        return Inertia::render('Admin/Customers/Show', [
            'customer' => $customer,
            'orders' => $orders,
            'metrics' => [
                'total_spent' => $totalSpent,
                'total_orders' => $totalOrdersCount,
                'completed_orders' => $completedOrdersCount,
                'pending_orders' => $pendingOrdersCount,
                'cancelled_orders' => $cancelledOrdersCount,
            ],
            'addressTypes' => AddressType::options(),
            'customerStatuses' => CustomerStatus::options(),
        ]);
    }

    /**
     * Update customer profile information.
     */
    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('customers', 'email')->ignore($customer->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'status' => ['required', 'string', Rule::enum(CustomerStatus::class)],
            'password' => ['nullable', 'string', Password::defaults()],
        ]);

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'status' => $validated['status'],
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $customer->update($updateData);

        return redirect()->back()->with('success', 'Customer profile updated successfully.');
    }

    /**
     * Remove the specified customer account.
     */
    public function destroy(Customer $customer): RedirectResponse
    {
        $customerName = $customer->name;
        $customer->delete();

        return redirect()->route('admin.customers.index')->with('success', "Customer '{$customerName}' has been removed.");
    }

    /**
     * Toggle customer active / inactive status.
     */
    public function toggleStatus(Customer $customer): RedirectResponse
    {
        $newStatus = $customer->status === CustomerStatus::Active
            ? CustomerStatus::Inactive
            : CustomerStatus::Active;

        $customer->update(['status' => $newStatus]);

        return redirect()->back()->with('success', "Customer status updated to {$newStatus->label()}.");
    }

    /**
     * Store a new address for the customer.
     */
    public function storeAddress(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', Rule::enum(AddressType::class)],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['required', 'string', 'max:30'],
            'country' => ['required', 'string', 'max:100'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        $isDefault = (bool) ($validated['is_default'] ?? false);

        DB::transaction(function () use ($customer, $validated, $isDefault): void {
            if ($isDefault || $customer->addresses()->count() === 0) {
                $customer->addresses()->update(['is_default' => false]);
                $validated['is_default'] = true;
            }

            $customer->addresses()->create($validated);
        });

        return redirect()->back()->with('success', 'Customer address added successfully.');
    }

    /**
     * Update an existing address belonging to the customer.
     */
    public function updateAddress(Request $request, Customer $customer, Address $address): RedirectResponse
    {
        if ($address->customer_id !== $customer->id) {
            abort(404, 'Address does not belong to this customer.');
        }

        $validated = $request->validate([
            'type' => ['required', 'string', Rule::enum(AddressType::class)],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['required', 'string', 'max:30'],
            'country' => ['required', 'string', 'max:100'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        $isDefault = (bool) ($validated['is_default'] ?? false);

        DB::transaction(function () use ($customer, $address, $validated, $isDefault): void {
            if ($isDefault) {
                $customer->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
            }

            $address->update($validated);
        });

        return redirect()->back()->with('success', 'Customer address updated successfully.');
    }

    /**
     * Delete an address belonging to the customer.
     */
    public function destroyAddress(Customer $customer, Address $address): RedirectResponse
    {
        if ($address->customer_id !== $customer->id) {
            abort(404, 'Address does not belong to this customer.');
        }

        $wasDefault = $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $nextAddress = $customer->addresses()->first();
            if ($nextAddress) {
                $nextAddress->update(['is_default' => true]);
            }
        }

        return redirect()->back()->with('success', 'Address deleted successfully.');
    }

    /**
     * Set a specific address as the default for the customer.
     */
    public function setDefaultAddress(Customer $customer, Address $address): RedirectResponse
    {
        if ($address->customer_id !== $customer->id) {
            abort(404, 'Address does not belong to this customer.');
        }

        DB::transaction(function () use ($customer, $address): void {
            $customer->addresses()->update(['is_default' => false]);
            $address->update(['is_default' => true]);
        });

        return redirect()->back()->with('success', 'Default address set successfully.');
    }
}


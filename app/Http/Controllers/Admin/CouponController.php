<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\Coupon\CouponApplyTo;
use App\Enums\Coupon\CouponType;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Collection;
use App\Models\Coupon;
use App\Models\Product;
use App\Services\CouponService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CouponController extends Controller
{
    public function __construct(
        protected CouponService $couponService
    ) {}

    /**
     * Display a listing of coupons with analytics, search and filters.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $status = $request->string('status')->trim()->value();
        $type = $request->string('type')->trim()->value();
        $appliesTo = $request->string('applies_to')->trim()->value();

        $query = Coupon::query()
            ->with([
                'products:id,name,sku,retail_price,sale_price',
                'categories:id,name',
                'collections:id,name',
            ])
            ->withCount('usages')
            ->when($search !== '', function (Builder $q) use ($search): void {
                $q->where(function (Builder $sub) use ($search): void {
                    $sub->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($type !== '', function (Builder $q) use ($type): void {
                $q->where('type', $type);
            })
            ->when($appliesTo !== '', function (Builder $q) use ($appliesTo): void {
                $q->where('applies_to', $appliesTo);
            })
            ->when($status !== '', function (Builder $q) use ($status): void {
                $now = Carbon::now();
                if ($status === 'active') {
                    $q->where('is_active', true)
                        ->where(function (Builder $sub) use ($now): void {
                            $sub->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
                        })
                        ->where(function (Builder $sub) use ($now): void {
                            $sub->whereNull('expires_at')->orWhere('expires_at', '>=', $now);
                        })
                        ->where(function (Builder $sub): void {
                            $sub->whereNull('usage_limit')->orWhereColumn('times_used', '<', 'usage_limit');
                        });
                } elseif ($status === 'inactive') {
                    $q->where('is_active', false);
                } elseif ($status === 'expired') {
                    $q->whereNotNull('expires_at')->where('expires_at', '<', $now);
                } elseif ($status === 'scheduled') {
                    $q->whereNotNull('starts_at')->where('starts_at', '>', $now);
                } elseif ($status === 'exhausted') {
                    $q->whereNotNull('usage_limit')->whereColumn('times_used', '>=', 'usage_limit');
                }
            });

        $coupons = $query->latest()->paginate(15)->withQueryString();

        // Form selection options
        $productOptions = Product::query()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'retail_price', 'sale_price', 'category_id']);

        $categoryOptions = Category::query()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        $collectionOptions = Collection::query()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Admin/Coupons', [
            'coupons' => $coupons,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'type' => $type,
                'applies_to' => $appliesTo,
            ],
            'options' => [
                'products' => $productOptions,
                'categories' => $categoryOptions,
                'collections' => $collectionOptions,
                'types' => CouponType::options(),
                'applies_to' => CouponApplyTo::options(),
            ],
        ]);
    }

    /**
     * Store a newly created coupon in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:coupons,code'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'type' => ['required', Rule::in(CouponType::values())],
            'value' => [
                'required',
                'numeric',
                'min:0.01',
                function ($attribute, $val, $fail) use ($request): void {
                    if ($request->input('type') === 'percentage' && (float) $val > 100) {
                        $fail('Percentage discount cannot exceed 100%.');
                    }
                },
            ],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'],
            'max_discount_amount' => ['nullable', 'numeric', 'min:0'],
            'applies_to' => ['required', Rule::in(CouponApplyTo::values())],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['string', 'exists:products,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['string', 'exists:categories,id'],
            'collection_ids' => ['nullable', 'array'],
            'collection_ids.*' => ['string', 'exists:collections,id'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'usage_limit_per_customer' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $code = strtoupper(trim($validated['code']));

        $coupon = Coupon::create([
            'code' => $code,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'value' => $validated['value'],
            'min_order_amount' => $validated['min_order_amount'] ?? null,
            'max_discount_amount' => $validated['max_discount_amount'] ?? null,
            'applies_to' => $validated['applies_to'],
            'usage_limit' => $validated['usage_limit'] ?? null,
            'usage_limit_per_customer' => $validated['usage_limit_per_customer'] ?? 1,
            'times_used' => 0,
            'starts_at' => ! empty($validated['starts_at']) ? Carbon::parse($validated['starts_at']) : null,
            'expires_at' => ! empty($validated['expires_at']) ? Carbon::parse($validated['expires_at']) : null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        // Sync relationships based on applies_to
        $this->syncCouponRelations($coupon, $validated);

        return redirect()->back()->with('success', "Coupon '{$coupon->code}' created successfully.");
    }

    /**
     * Update the specified coupon in storage.
     */
    public function update(Request $request, Coupon $coupon): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('coupons', 'code')->ignore($coupon->id)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'type' => ['required', Rule::in(CouponType::values())],
            'value' => [
                'required',
                'numeric',
                'min:0.01',
                function ($attribute, $val, $fail) use ($request): void {
                    if ($request->input('type') === 'percentage' && (float) $val > 100) {
                        $fail('Percentage discount cannot exceed 100%.');
                    }
                },
            ],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'],
            'max_discount_amount' => ['nullable', 'numeric', 'min:0'],
            'applies_to' => ['required', Rule::in(CouponApplyTo::values())],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['string', 'exists:products,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['string', 'exists:categories,id'],
            'collection_ids' => ['nullable', 'array'],
            'collection_ids.*' => ['string', 'exists:collections,id'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'usage_limit_per_customer' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $code = strtoupper(trim($validated['code']));

        $coupon->update([
            'code' => $code,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'value' => $validated['value'],
            'min_order_amount' => $validated['min_order_amount'] ?? null,
            'max_discount_amount' => $validated['max_discount_amount'] ?? null,
            'applies_to' => $validated['applies_to'],
            'usage_limit' => $validated['usage_limit'] ?? null,
            'usage_limit_per_customer' => $validated['usage_limit_per_customer'] ?? $coupon->usage_limit_per_customer,
            'starts_at' => ! empty($validated['starts_at']) ? Carbon::parse($validated['starts_at']) : null,
            'expires_at' => ! empty($validated['expires_at']) ? Carbon::parse($validated['expires_at']) : null,
            'is_active' => $validated['is_active'] ?? $coupon->is_active,
        ]);

        // Sync relationships
        $this->syncCouponRelations($coupon, $validated);

        return redirect()->back()->with('success', "Coupon '{$coupon->code}' updated successfully.");
    }

    /**
     * Remove the specified coupon from storage.
     */
    public function destroy(Coupon $coupon): RedirectResponse
    {
        $code = $coupon->code;
        $coupon->delete();

        return redirect()->back()->with('success', "Coupon '{$code}' deleted successfully.");
    }

    /**
     * Toggle coupon active status.
     */
    public function toggleStatus(Coupon $coupon): RedirectResponse
    {
        $coupon->update(['is_active' => ! $coupon->is_active]);

        $statusStr = $coupon->is_active ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "Coupon '{$coupon->code}' has been {$statusStr}.");
    }


    /**
     * Helper to sync relationships based on applies_to setting.
     *
     * @param  array<string, mixed>  $data
     */
    protected function syncCouponRelations(Coupon $coupon, array $data): void
    {
        $appliesTo = $data['applies_to'] ?? CouponApplyTo::All->value;

        if ($appliesTo === CouponApplyTo::Products->value || $appliesTo === CouponApplyTo::Products) {
            $coupon->products()->sync($data['product_ids'] ?? []);
            $coupon->categories()->detach();
            $coupon->collections()->detach();
        } elseif ($appliesTo === CouponApplyTo::Categories->value || $appliesTo === CouponApplyTo::Categories) {
            $coupon->categories()->sync($data['category_ids'] ?? []);
            $coupon->products()->detach();
            $coupon->collections()->detach();
        } elseif ($appliesTo === CouponApplyTo::Collections->value || $appliesTo === CouponApplyTo::Collections) {
            $coupon->collections()->sync($data['collection_ids'] ?? []);
            $coupon->products()->detach();
            $coupon->categories()->detach();
        } else {
            // All
            $coupon->products()->detach();
            $coupon->categories()->detach();
            $coupon->collections()->detach();
        }
    }
}

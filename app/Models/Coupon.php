<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Coupon\CouponApplyTo;
use App\Enums\Coupon\CouponType;
use Database\Factories\CouponFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Coupon extends Model
{
    /** @use HasFactory<CouponFactory> */
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'code',
        'name',
        'description',
        'type',
        'value',
        'min_order_amount',
        'max_discount_amount',
        'applies_to',
        'usage_limit',
        'usage_limit_per_customer',
        'times_used',
        'starts_at',
        'expires_at',
        'is_active',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'status_badge',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => CouponType::class,
            'applies_to' => CouponApplyTo::class,
            'value' => 'decimal:2',
            'min_order_amount' => 'decimal:2',
            'max_discount_amount' => 'decimal:2',
            'usage_limit' => 'integer',
            'usage_limit_per_customer' => 'integer',
            'times_used' => 'integer',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Associated products when applies_to is 'products'.
     *
     * @return BelongsToMany<Product, $this>
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'coupon_product', 'coupon_id', 'product_id');
    }

    /**
     * Associated categories when applies_to is 'categories'.
     *
     * @return BelongsToMany<Category, $this>
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'coupon_category', 'coupon_id', 'category_id');
    }

    /**
     * Associated collections when applies_to is 'collections'.
     *
     * @return BelongsToMany<Collection, $this>
     */
    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(Collection::class, 'coupon_collection', 'coupon_id', 'collection_id');
    }

    /**
     * Historical usages / redemptions of this coupon.
     *
     * @return HasMany<CouponUsage, $this>
     */
    public function usages(): HasMany
    {
        return $this->hasMany(CouponUsage::class);
    }

    /**
     * Dynamic attribute providing high-level status badge.
     */
    public function getStatusBadgeAttribute(): string
    {
        if (! $this->is_active) {
            return 'inactive';
        }

        $now = Carbon::now();

        if ($this->starts_at && $now->lt($this->starts_at)) {
            return 'scheduled';
        }

        if ($this->expires_at && $now->gt($this->expires_at)) {
            return 'expired';
        }

        if ($this->usage_limit !== null && $this->times_used >= $this->usage_limit) {
            return 'exhausted';
        }

        return 'active';
    }

    /**
     * Check if coupon has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && Carbon::now()->gt($this->expires_at);
    }

    /**
     * Check if coupon is scheduled for future.
     */
    public function isScheduled(): bool
    {
        return $this->starts_at !== null && Carbon::now()->lt($this->starts_at);
    }

    /**
     * Check if global usage limit is reached.
     */
    public function hasReachedLimit(): bool
    {
        return $this->usage_limit !== null && $this->times_used >= $this->usage_limit;
    }

    /**
     * Check if a specific customer has reached their limit.
     */
    public function hasCustomerReachedLimit(?string $customerEmail): bool
    {
        if (empty($customerEmail) || $this->usage_limit_per_customer === null) {
            return false;
        }

        $count = $this->usages()->where('customer_email', strtolower(trim($customerEmail)))->count();

        return $count >= $this->usage_limit_per_customer;
    }

    /**
     * Validate coupon eligibility for an order and return detailed result.
     *
     * @param  array<int, array{product_id: string, price: float, quantity: int, category_id?: ?string}>  $items
     * @return array{valid: bool, reason?: string, discount?: float}
     */
    public function validateForOrder(float $subtotal, array $items = [], ?string $customerEmail = null): array
    {
        if (! $this->is_active) {
            return ['valid' => false, 'reason' => "Coupon '{$this->code}' is currently inactive."];
        }

        if ($this->isScheduled()) {
            return ['valid' => false, 'reason' => "Coupon '{$this->code}' is not active yet. Starts on {$this->starts_at?->format('M d, Y')}."];
        }

        if ($this->isExpired()) {
            return ['valid' => false, 'reason' => "Coupon '{$this->code}' expired on {$this->expires_at?->format('M d, Y')}."];
        }

        if ($this->hasReachedLimit()) {
            return ['valid' => false, 'reason' => "Coupon '{$this->code}' usage limit has been reached."];
        }

        if ($customerEmail && $this->hasCustomerReachedLimit($customerEmail)) {
            return ['valid' => false, 'reason' => "You have already used coupon '{$this->code}' the maximum allowed number of times."];
        }

        if ($this->min_order_amount !== null && $subtotal < (float) $this->min_order_amount) {
            return ['valid' => false, 'reason' => "Minimum order value of ".number_format((float) $this->min_order_amount, 2)." required for coupon '{$this->code}'."];
        }

        // Check product/category/collection scoping if items are provided
        if (! empty($items) && $this->applies_to !== CouponApplyTo::All) {
            $applicableSubtotal = $this->calculateApplicableSubtotal($items);
            if ($applicableSubtotal <= 0) {
                return ['valid' => false, 'reason' => "Coupon '{$this->code}' does not apply to the selected items in your cart."];
            }
        }

        $discount = $this->calculateDiscount($subtotal, $items);

        return [
            'valid' => true,
            'discount' => $discount,
        ];
    }

    /**
     * Calculate applicable subtotal for the items based on coupon scope.
     *
     * @param  array<int, array{product_id: string, price: float, quantity: int, category_id?: ?string}>  $items
     */
    public function calculateApplicableSubtotal(array $items): float
    {
        if ($this->applies_to === CouponApplyTo::All) {
            return array_reduce($items, fn ($sum, $it) => $sum + ((float) $it['price'] * (int) $it['quantity']), 0.0);
        }

        $applicableProductIds = [];

        if ($this->applies_to === CouponApplyTo::Products) {
            $applicableProductIds = $this->products()->pluck('products.id')->all();
        } elseif ($this->applies_to === CouponApplyTo::Categories) {
            $catIds = $this->categories()->pluck('categories.id')->all();
            $applicableProductIds = Product::whereIn('category_id', $catIds)->pluck('id')->all();
        } elseif ($this->applies_to === CouponApplyTo::Collections) {
            $colIds = $this->collections()->pluck('collections.id')->all();
            $applicableProductIds = Product::whereHas('collections', fn ($q) => $q->whereIn('collections.id', $colIds))->pluck('id')->all();
        }

        $applicableSubtotal = 0.0;
        foreach ($items as $item) {
            if (in_array($item['product_id'], $applicableProductIds, true)) {
                $applicableSubtotal += (float) $item['price'] * (int) $item['quantity'];
            }
        }

        return $applicableSubtotal;
    }

    /**
     * Calculate discount amount.
     *
     * @param  array<int, array{product_id: string, price: float, quantity: int, category_id?: ?string}>  $items
     */
    public function calculateDiscount(float $subtotal, array $items = []): float
    {
        $eligibleBase = ! empty($items) && $this->applies_to !== CouponApplyTo::All
            ? $this->calculateApplicableSubtotal($items)
            : $subtotal;

        if ($eligibleBase <= 0) {
            return 0.0;
        }

        $discount = 0.0;

        if ($this->type === CouponType::Percentage) {
            $percent = (float) $this->value;
            $discount = round(($eligibleBase * $percent) / 100, 2);

            if ($this->max_discount_amount !== null && (float) $this->max_discount_amount > 0) {
                $discount = min($discount, (float) $this->max_discount_amount);
            }
        } else {
            // Fixed amount
            $discount = min((float) $this->value, $eligibleBase);
        }

        return round(max(0.0, $discount), 2);
    }

    /**
     * Scope a query to only include active coupons.
     *
     * @param  Builder<Coupon>  $query
     * @return Builder<Coupon>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include currently valid coupons.
     *
     * @param  Builder<Coupon>  $query
     * @return Builder<Coupon>
     */
    public function scopeCurrentlyValid(Builder $query): Builder
    {
        $now = Carbon::now();

        return $query->where('is_active', true)
            ->where(function (Builder $q) use ($now): void {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function (Builder $q) use ($now): void {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', $now);
            })
            ->where(function (Builder $q): void {
                $q->whereNull('usage_limit')->orWhereColumn('times_used', '<', 'usage_limit');
            });
    }
}

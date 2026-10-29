<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Product\DiscountType;
use App\Enums\Product\LocationAvailabilityType;
use App\Enums\Product\ProductStatus;
use App\Enums\Product\StockVisibility;
use App\Models\Customer;
use App\Models\Wishlist;
use App\Traits\FindsBySlugOrId;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use FindsBySlugOrId, HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
        'sku',
        'short_description',
        'description',
        'specifications',
        'brand_id',
        'category_id',
        'mrp',
        'retail_price',
        'sale_price',
        'discount_type',
        'discount_value',
        'stock_quantity',
        'low_stock_threshold',
        'stock_visibility',
        'has_variants',
        'status',
        'location_availability_type',
        'delivery_radius_km',
        'return_policy',
        'refund_policy',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'specifications' => 'array',
            'mrp' => 'decimal:2',
            'retail_price' => 'decimal:2',
            'sale_price' => 'decimal:2',
            'discount_type' => DiscountType::class,
            'discount_value' => 'decimal:2',
            'stock_quantity' => 'integer',
            'low_stock_threshold' => 'integer',
            'has_variants' => 'boolean',
            'delivery_radius_km' => 'decimal:2',
            'status' => ProductStatus::class,
            'stock_visibility' => StockVisibility::class,
            'location_availability_type' => LocationAvailabilityType::class,
        ];
    }

    /**
     * Get the brand associated with this product.
     *
     * @return BelongsTo<Brand, $this>
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * Get the category associated with this product.
     *
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Get all product gallery images.
     *
     * @return HasMany<ProductImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    /**
     * Get primary featured image.
     *
     * @return HasOne<ProductImage, $this>
     */
    public function primaryImage(): HasOne
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    /**
     * Get all product variants.
     *
     * @return HasMany<ProductVariant, $this>
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /**
     * Get attributes assigned to this product.
     *
     * @return BelongsToMany<Attribute, $this>
     */
    public function attributes(): BelongsToMany
    {
        return $this->belongsToMany(Attribute::class, 'product_attributes')
            ->withPivot('sort_order')
            ->orderByPivot('sort_order')
            ->withTimestamps();
    }

    /**
     * Get specific attribute values enabled for this product.
     *
     * @return BelongsToMany<AttributeValue, $this>
     */
    public function attributeValues(): BelongsToMany
    {
        return $this->belongsToMany(AttributeValue::class, 'product_attribute_values')
            ->withPivot('attribute_id')
            ->withTimestamps();
    }

    /**
     * Collections this product belongs to.
     *
     * @return BelongsToMany<Collection, $this>
     */
    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(Collection::class, 'collection_product', 'product_id', 'collection_id');
    }

    /**
     * Coupons specifically applicable to this product.
     *
     * @return BelongsToMany<Coupon, $this>
     */
    public function coupons(): BelongsToMany
    {
        return $this->belongsToMany(Coupon::class, 'coupon_product', 'product_id', 'coupon_id');
    }

    /**
     * Scope a query to only include active products.
     *
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', ProductStatus::Active->value);
    }

    /**
     * Determine if product has active status.
     */
    public function isActive(): bool
    {
        $status = $this->status instanceof ProductStatus
            ? $this->status
            : ProductStatus::tryFrom((string) $this->status);

        return $status?->isActive() ?? false;
    }

    /**
     * Determine if product is purchasable by customers.
     */
    public function isPurchasable(): bool
    {
        $status = $this->status instanceof ProductStatus
            ? $this->status
            : ProductStatus::tryFrom((string) $this->status);

        return ($status?->isPurchasable() ?? false) && ! $this->shouldHideWhenOutOfStock();
    }

    /**
     * Scope a query to products with low stock.
     *
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    public function scopeLowStock(Builder $query): Builder
    {
        return $query->where('stock_quantity', '>', 0)
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold');
    }

    /**
     * Scope a query to out of stock products.
     *
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    public function scopeOutOfStock(Builder $query): Builder
    {
        return $query->where('stock_quantity', '<=', 0);
    }

    /**
     * Scope query to products visible in the catalog storefront based on Out-of-Stock Catalog Visibility.
     *
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    public function scopeCatalogVisible(Builder $query): Builder
    {
        $globalSetting = Setting::get('out_of_stock_visibility', StockVisibility::Badge->value);
        $globalIsHide = $globalSetting === StockVisibility::Hide->value;

        return $query->where(function (Builder $q) use ($globalIsHide): void {
            if ($globalIsHide) {
                $q->where('stock_visibility', StockVisibility::Backorder->value)
                    ->orWhere(function (Builder $sub): void {
                        $sub->where('stock_visibility', '!=', StockVisibility::Hide->value)
                            ->where(function (Builder $sq): void {
                                $sq->where('stock_quantity', '>', 0)
                                    ->orWhereHas('variants', fn (Builder $vq) => $vq->where('stock_quantity', '>', 0));
                            });
                    });
            } else {
                $q->where('stock_visibility', '!=', StockVisibility::Hide->value)
                    ->orWhere(function (Builder $sub): void {
                        $sub->where('stock_quantity', '>', 0)
                            ->orWhereHas('variants', fn (Builder $vq) => $vq->where('stock_quantity', '>', 0));
                    });
            }
        });
    }

    /**
     * Determine the effective stock visibility policy for this product.
     */
    public function effectiveStockVisibility(): StockVisibility
    {
        $globalSetting = Setting::get('out_of_stock_visibility');
        $globalVisibility = is_string($globalSetting) ? StockVisibility::tryFrom($globalSetting) : null;

        if ($this->stock_visibility instanceof StockVisibility) {
            if ($this->stock_visibility === StockVisibility::Backorder) {
                return StockVisibility::Backorder;
            }
            if ($this->stock_visibility === StockVisibility::Hide) {
                return StockVisibility::Hide;
            }
            if ($globalVisibility && $globalVisibility !== StockVisibility::Badge) {
                return $globalVisibility;
            }

            return $this->stock_visibility;
        }

        if (is_string($this->stock_visibility) && $enum = StockVisibility::tryFrom($this->stock_visibility)) {
            if ($enum === StockVisibility::Backorder || $enum === StockVisibility::Hide) {
                return $enum;
            }
            if ($globalVisibility && $globalVisibility !== StockVisibility::Badge) {
                return $globalVisibility;
            }

            return $enum;
        }

        return $globalVisibility ?? StockVisibility::Badge;
    }

    /**
     * Determine if backorders are allowed for this product.
     */
    public function allowsBackorder(): bool
    {
        return $this->effectiveStockVisibility() === StockVisibility::Backorder;
    }

    /**
     * Determine if this product should be hidden from catalog when out of stock.
     */
    public function shouldHideWhenOutOfStock(): bool
    {
        return $this->effectiveStockVisibility() === StockVisibility::Hide && $this->isOutOfStock();
    }

    /**
     * Calculate effective selling price.
     */
    public function effectivePrice(): float
    {
        if ($this->sale_price !== null && (float) $this->sale_price > 0) {
            return (float) $this->sale_price;
        }

        return (float) $this->retail_price;
    }

    /**
     * Check if product is low stock.
     */
    public function isLowStock(): bool
    {
        return $this->stock_quantity > 0 && $this->stock_quantity <= $this->low_stock_threshold;
    }

    /**
     * Check if product is out of stock.
     */
    public function isOutOfStock(): bool
    {
        if ($this->has_variants) {
            if ($this->relationLoaded('variants')) {
                return $this->variants->isNotEmpty()
                    && $this->variants->every(fn (ProductVariant $v): bool => (int) $v->stock_quantity <= 0);
            }

            return $this->variants()->exists()
                && ! $this->variants()->where('stock_quantity', '>', 0)->exists();
        }

        return (int) $this->stock_quantity <= 0;
    }

    /**
     * Get user-friendly formatted discount label string for front-end.
     * E.g.: "15% OFF", "₹100 OFF", or null if no discount.
     */
    public function discountLabel(?string $currencySymbol = null): ?string
    {
        $value = (float) $this->discount_value;

        if ($value > 0) {
            $formatted = $value == (int) $value ? (string) (int) $value : (string) round($value, 2);

            return $this->discount_type === DiscountType::Fixed
                ? ($currencySymbol ? "{$currencySymbol}{$formatted} OFF" : "{$formatted} OFF")
                : "{$formatted}% OFF";
        }

        $mrp = (float) $this->mrp;
        $effectivePrice = $this->effectivePrice();

        if ($mrp > $effectivePrice && $mrp > 0) {
            $percentage = round((($mrp - $effectivePrice) / $mrp) * 100);

            return $percentage > 0 ? "{$percentage}% OFF" : null;
        }

        return null;
    }

    /**
     * Resolve flipped map of product IDs that are in the customer's wishlist.
     *
     * @param  iterable<Product>  $products
     * @return array<string, int|string>
     */
    public static function resolveWishlistProductIds(iterable $products, ?Customer $customer = null): array
    {
        if (! $customer) {
            return [];
        }

        $ids = collect($products)->pluck('id')->filter()->all();
        if ($ids === []) {
            return [];
        }

        return Wishlist::where('customer_id', $customer->id)
            ->whereIn('product_id', $ids)
            ->pluck('product_id')
            ->flip()
            ->all();
    }

    /**
     * Scope a query to eager load all relations required for toSummaryArray() to prevent N+1 queries.
     *
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    public function scopeWithSummaryRelations(Builder $query): Builder
    {
        return $query->with([
            'brand:id,name,slug',
            'category:id,name,slug',
            'primaryImage.media',
            'variants' => fn ($q) => $q->active()->select([
                'id',
                'product_id',
                'name',
                'sku',
                'price',
                'sale_price',
                'stock_quantity',
                'is_active',
                'attributes',
            ]),
        ]);
    }

    /**
     * Batch eager load missing summary relations on an iterable/collection of products to prevent N+1 queries.
     *
     * @param  iterable<Product>  $products
     */
    public static function loadMissingSummaryRelations(iterable $products): void
    {
        $models = collect($products)->filter(fn ($item): bool => $item instanceof Product)->values()->all();
        if ($models === []) {
            return;
        }

        $collection = new \Illuminate\Database\Eloquent\Collection($models);

        $collection->loadMissing([
            'brand:id,name,slug',
            'category:id,name,slug',
            'primaryImage.media',
            'variants' => fn ($q) => $q->active()->select([
                'id',
                'product_id',
                'name',
                'sku',
                'price',
                'sale_price',
                'stock_quantity',
                'is_active',
                'attributes',
            ]),
        ]);
    }

    /**
     * Format product summary for catalog listings, search, and user views.
     *
     * @return array<string, mixed>
     */
    public function toSummaryArray(bool $isWishlist = false): array
    {
        $simpleVariants = [];
        if ($this->has_variants) {
            if (! $this->relationLoaded('variants')) {
                $this->load(['variants' => fn ($q) => $q->active()->select([
                    'id',
                    'product_id',
                    'name',
                    'sku',
                    'price',
                    'sale_price',
                    'stock_quantity',
                    'is_active',
                    'attributes',
                ])]);
            }

            $simpleVariants = $this->variants
                ->filter(fn (ProductVariant $v): bool => (bool) $v->is_active)
                ->map(fn (ProductVariant $v): array => [
                    'id' => $v->id,
                    'name' => $v->name,
                    'sku' => $v->sku,
                    'price' => (float) $v->price,
                    'sale_price' => $v->sale_price !== null ? (float) $v->sale_price : null,
                    'effective_price' => $v->effectivePrice(),
                    'stock_quantity' => (int) $v->stock_quantity,
                    'is_in_stock' => $v->stock_quantity > 0,
                    'attributes' => $v->attributes,
                ])->values()->all();
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'sku' => $this->sku,
            'short_description' => $this->short_description,
            'brand' => $this->brand ? [
                'id' => $this->brand->id,
                'name' => $this->brand->name,
                'slug' => $this->brand->slug,
            ] : null,
            'category' => $this->category ? [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ] : null,
            'mrp' => (float) $this->mrp,
            'retail_price' => (float) $this->retail_price,
            'sale_price' => $this->sale_price !== null ? (float) $this->sale_price : null,
            'effective_price' => $this->effectivePrice(),
            'discount_label' => $this->discountLabel(),
            'has_variants' => (bool) $this->has_variants,
            'variants' => $simpleVariants,
            'stock_quantity' => (int) $this->stock_quantity,
            'is_in_stock' => $this->has_variants ? ! $this->isOutOfStock() : $this->stock_quantity > 0,
            'stock_visibility' => $this->effectiveStockVisibility()->value,
            'allows_backorder' => $this->allowsBackorder(),
            'is_wishlist' => $isWishlist,
            'primary_image' => $this->primaryImage?->media?->url,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}

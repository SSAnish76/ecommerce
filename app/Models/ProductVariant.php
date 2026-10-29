<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ProductVariantFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ProductVariant extends Model
{
    /** @use HasFactory<ProductVariantFactory> */
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'product_id',
        'sku',
        'name',
        'attributes',
        'mrp',
        'price',
        'sale_price',
        'stock_quantity',
        'low_stock_threshold',
        'is_active',
        'image_path',
        'media_id',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'image_url',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attributes' => 'array',
            'mrp' => 'decimal:2',
            'price' => 'decimal:2',
            'sale_price' => 'decimal:2',
            'stock_quantity' => 'integer',
            'low_stock_threshold' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get parent product.
     *
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the associated media file for this variant.
     *
     * @return BelongsTo<MediaFile, $this>
     */
    public function media(): BelongsTo
    {
        return $this->belongsTo(MediaFile::class, 'media_id');
    }

    /**
     * Get normalized relational attribute values.
     *
     * @return BelongsToMany<AttributeValue, $this>
     */
    public function attributeValues(): BelongsToMany
    {
        return $this->belongsToMany(AttributeValue::class, 'product_variant_attribute_values')
            ->withTimestamps();
    }

    /**
     * Get effective variant image URL.
     */
    public function getImageUrlAttribute(): ?string
    {
        if ($this->relationLoaded('media')) {
            return $this->media?->url;
        }

        if (! empty($this->media_id)) {
            return MediaFile::find($this->media_id)?->url;
        }

        if (! empty($this->image_path)) {
            return $this->image_path;
        }

        return null;
    }

    /**
     * Get the full display name combining the parent product name and this variant name.
     */
    public function displayName(Product $product): string
    {
        return "{$product->name} - {$this->name}";
    }

    /**
     * Calculate effective selling price.
     */
    public function effectivePrice(): float
    {
        if ($this->sale_price !== null && (float) $this->sale_price > 0) {
            return (float) $this->sale_price;
        }

        return (float) $this->price;
    }

    /**
     * Scope a query to only include active variants.
     *
     * @param  Builder<ProductVariant>  $query
     * @return Builder<ProductVariant>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Determine if variant is low stock.
     */
    public function isLowStock(): bool
    {
        return $this->stock_quantity > 0 && $this->stock_quantity <= $this->low_stock_threshold;
    }

    /**
     * Determine if variant is out of stock.
     */
    public function isOutOfStock(): bool
    {
        return $this->stock_quantity <= 0;
    }

    /**
     * Determine if backorders are allowed for this variant.
     */
    public function allowsBackorder(): bool
    {
        return $this->product?->allowsBackorder() ?? false;
    }

    /**
     * Determine if variant is active and available.
     */
    public function isActive(): bool
    {
        return (bool) $this->is_active && ($this->product?->isActive() ?? true);
    }

    /**
     * Determine if variant is purchasable by customers.
     */
    public function isPurchasable(): bool
    {
        return (bool) $this->is_active && ($this->product?->isPurchasable() ?? true);
    }
}

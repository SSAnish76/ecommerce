<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Collection\CollectionType;
use Database\Factories\CollectionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Collection extends Model
{
    /** @use HasFactory<CollectionFactory> */
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
        'type',
        'description',
        'image_id',
        'is_active',
        'sort_order',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'image_url',
    ];

    /**
     * Get the collection image media file.
     *
     * @return BelongsTo<MediaFile, $this>
     */
    public function image(): BelongsTo
    {
        return $this->belongsTo(MediaFile::class, 'image_id');
    }

    /**
     * Dynamic accessor for collection image URL.
     */
    public function getImageUrlAttribute(): ?string
    {
        if ($this->relationLoaded('image')) {
            return $this->image?->url;
        }

        if (! empty($this->image_id)) {
            return MediaFile::find($this->image_id)?->url;
        }

        return null;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => CollectionType::class,
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Products assigned to this collection (when type is product).
     *
     * @return BelongsToMany<Product, $this>
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'collection_product', 'collection_id', 'product_id')
            ->withPivot('sort_order')
            ->orderByPivot('sort_order');
    }

    /**
     * Brands assigned to this collection (when type is brand).
     *
     * @return BelongsToMany<Brand, $this>
     */
    public function brands(): BelongsToMany
    {
        return $this->belongsToMany(Brand::class, 'collection_brand', 'collection_id', 'brand_id')
            ->withPivot('sort_order')
            ->orderByPivot('sort_order');
    }

    /**
     * Categories assigned to this collection (when type is category).
     *
     * @return BelongsToMany<Category, $this>
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'collection_category', 'collection_id', 'category_id')
            ->withPivot('sort_order')
            ->orderByPivot('sort_order');
    }

    /**
     * Coupons applying to this collection.
     *
     * @return BelongsToMany<Coupon, $this>
     */
    public function coupons(): BelongsToMany
    {
        return $this->belongsToMany(Coupon::class, 'coupon_collection', 'collection_id', 'coupon_id');
    }

    /**
     * Scope a query to only include active collections.
     *
     * @param  Builder<Collection>  $query
     * @return Builder<Collection>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}

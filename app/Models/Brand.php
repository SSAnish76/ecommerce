<?php

declare(strict_types=1);

namespace App\Models;

use App\Traits\FindsBySlugOrId;
use Database\Factories\BrandFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brand extends Model
{
    /** @use HasFactory<BrandFactory> */
    use FindsBySlugOrId, HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
        'description',
        'logo_id',
        'is_active',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'logo_url',
    ];

    /**
     * Get the brand logo media file.
     *
     * @return BelongsTo<MediaFile, $this>
     */
    public function logo(): BelongsTo
    {
        return $this->belongsTo(MediaFile::class, 'logo_id');
    }

    /**
     * Dynamic accessor for logo URL.
     */
    public function getLogoUrlAttribute(): ?string
    {
        if ($this->relationLoaded('logo')) {
            return $this->logo?->url;
        }

        if (! empty($this->logo_id)) {
            return MediaFile::find($this->logo_id)?->url;
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
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get products belonging to this brand.
     *
     * @return HasMany<Product, $this>
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Collections this brand belongs to.
     *
     * @return BelongsToMany<Collection, $this>
     */
    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(Collection::class, 'collection_brand', 'brand_id', 'collection_id');
    }

    /**
     * Scope a query to only include active brands.
     *
     * @param  Builder<Brand>  $query
     * @return Builder<Brand>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Check if brand is currently active.
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }
}

<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductImage extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'product_id',
        'media_id',
        'alt_text',
        'is_primary',
        'sort_order',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'url',
    ];

    /**
     * Get the media file for this product image.
     *
     * @return BelongsTo<MediaFile, $this>
     */
    public function media(): BelongsTo
    {
        return $this->belongsTo(MediaFile::class, 'media_id');
    }

    /**
     * Dynamic accessor for image URL.
     */
    public function getUrlAttribute(): ?string
    {
        if ($this->relationLoaded('media')) {
            return $this->media?->url;
        }

        if (! empty($this->media_id)) {
            return MediaFile::find($this->media_id)?->url;
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
            'is_primary' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Get the product that owns this image.
     *
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

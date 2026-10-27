<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'customer_id',
        'product_id',
        'product_variant_id',
        'quantity',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'unit_price',
        'subtotal',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    /**
     * Customer who owns this cart item.
     *
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Referenced product.
     *
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Referenced product variant if any.
     *
     * @return BelongsTo<ProductVariant, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    /**
     * Calculate unit effective price.
     */
    public function getUnitPriceAttribute(): float
    {
        if ($this->relationLoaded('variant') && $this->variant) {
            return $this->variant->effectivePrice();
        }

        if ($this->product_variant_id) {
            $variant = $this->variant ?: ProductVariant::find($this->product_variant_id);
            if ($variant) {
                return $variant->effectivePrice();
            }
        }

        if ($this->relationLoaded('product') && $this->product) {
            return $this->product->effectivePrice();
        }

        $product = $this->product ?: Product::find($this->product_id);

        return $product ? $product->effectivePrice() : 0.0;
    }

    /**
     * Calculate line item subtotal.
     */
    public function getSubtotalAttribute(): float
    {
        return round($this->unit_price * (int) $this->quantity, 2);
    }
}

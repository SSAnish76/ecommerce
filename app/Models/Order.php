<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Order\OrderStatus;
use App\Enums\Order\PaymentMethod;
use App\Enums\Order\PaymentStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'customer_id',
        'order_number',
        'customer_name',
        'customer_email',
        'customer_phone',
        'shipping_address',
        'subtotal',
        'coupon_code',
        'discount_amount',
        'tax',
        'shipping_fee',
        'total',
        'total_amount',
        'status',
        'payment_method',
        'payment_status',
        'notes',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'total_amount',
    ];

    /**
     * Mutator to alias total_amount to total.
     */
    public function setTotalAmountAttribute(mixed $value): void
    {
        $this->attributes['total'] = $value;
    }

    /**
     * Accessor to alias total to total_amount.
     */
    public function getTotalAmountAttribute(): float
    {
        return (float) ($this->attributes['total'] ?? 0);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax' => 'decimal:2',
            'shipping_fee' => 'decimal:2',
            'total' => 'decimal:2',
            'status' => OrderStatus::class,
            'payment_method' => PaymentMethod::class,
            'payment_status' => PaymentStatus::class,
        ];
    }

    /**
     * Get customer who placed this order.
     *
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get line items in this order.
     *
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Coupon used in this order.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo<Coupon, $this>
     */
    public function coupon(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Coupon::class, 'coupon_code', 'code');
    }

    /**
     * Coupon usage record for this order.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne<CouponUsage, $this>
     */
    public function couponUsage(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(CouponUsage::class);
    }

    /**
     * Determine if order is cancelled.
     */
    public function isCancelled(): bool
    {
        return $this->status === OrderStatus::Cancelled || $this->status === OrderStatus::Cancelled->value;
    }

    /**
     * Determine if order is completed.
     */
    public function isCompleted(): bool
    {
        return $this->status === OrderStatus::Completed || $this->status === OrderStatus::Completed->value;
    }
}

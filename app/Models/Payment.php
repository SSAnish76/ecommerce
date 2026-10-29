<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Order\PaymentStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'order_id',
        'customer_id',
        'transaction_id',
        'gateway',
        'amount',
        'currency',
        'status',
        'type',
        'payload',
        'error_message',
        'paid_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'status' => PaymentStatus::class,
            'payload' => 'array',
            'paid_at' => 'datetime',
        ];
    }

    /**
     * Get the associated order.
     *
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the customer who made this payment.
     *
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Determine whether the payment was successfully settled.
     */
    public function isPaid(): bool
    {
        return $this->status === PaymentStatus::Paid;
    }

    /**
     * Determine whether the payment is pending.
     */
    public function isPending(): bool
    {
        return $this->status === PaymentStatus::Pending;
    }

    /**
     * Determine whether the payment has failed.
     */
    public function isFailed(): bool
    {
        return $this->status === PaymentStatus::Failed;
    }

    /**
     * Determine whether the payment was refunded.
     */
    public function isRefunded(): bool
    {
        return $this->status === PaymentStatus::Refunded;
    }

    /**
     * Mark the payment transaction as successfully completed.
     *
     * @param array<string, mixed> $payload
     */
    public function markAsPaid(?string $transactionId = null, array $payload = []): self
    {
        $this->update([
            'status' => PaymentStatus::Paid,
            'transaction_id' => $transactionId ?? $this->transaction_id,
            'payload' => ! empty($payload) ? array_merge($this->payload ?? [], $payload) : $this->payload,
            'paid_at' => now(),
            'error_message' => null,
        ]);

        $this->order?->update([
            'payment_status' => PaymentStatus::Paid,
        ]);

        return $this;
    }

    /**
     * Mark the payment transaction as failed.
     *
     * @param array<string, mixed> $payload
     */
    public function markAsFailed(string $errorMessage, array $payload = []): self
    {
        $this->update([
            'status' => PaymentStatus::Failed,
            'error_message' => $errorMessage,
            'payload' => ! empty($payload) ? array_merge($this->payload ?? [], $payload) : $this->payload,
        ]);

        $this->order?->update([
            'payment_status' => PaymentStatus::Failed,
        ]);

        return $this;
    }

    /**
     * Mark the payment transaction as refunded.
     *
     * @param array<string, mixed> $payload
     */
    public function markAsRefunded(?string $transactionId = null, array $payload = []): self
    {
        $this->update([
            'status' => PaymentStatus::Refunded,
            'transaction_id' => $transactionId ?? $this->transaction_id,
            'payload' => ! empty($payload) ? array_merge($this->payload ?? [], $payload) : $this->payload,
        ]);

        $this->order?->update([
            'payment_status' => PaymentStatus::Refunded,
        ]);

        return $this;
    }
}

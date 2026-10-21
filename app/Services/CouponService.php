<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use Illuminate\Support\Carbon;

class CouponService
{
    /**
     * Validate coupon code for given cart items and subtotal.
     *
     * @param  array<int, array{product_id: string, price: float, quantity: int, category_id?: ?string}>  $items
     * @return array{valid: bool, coupon?: Coupon, discount: float, message: string}
     */
    public function validate(string $code, float $subtotal, array $items = [], ?string $customerEmail = null): array
    {
        $normalizedCode = strtoupper(trim($code));

        if ($normalizedCode === '') {
            return [
                'valid' => false,
                'discount' => 0.0,
                'message' => 'Please provide a valid coupon code.',
            ];
        }

        /** @var Coupon|null $coupon */
        $coupon = Coupon::where('code', $normalizedCode)->first();

        if (! $coupon) {
            return [
                'valid' => false,
                'discount' => 0.0,
                'message' => "Coupon '{$normalizedCode}' not found.",
            ];
        }

        $result = $coupon->validateForOrder($subtotal, $items, $customerEmail);

        if (! $result['valid']) {
            return [
                'valid' => false,
                'coupon' => $coupon,
                'discount' => 0.0,
                'message' => $result['reason'] ?? 'Coupon is not eligible for this order.',
            ];
        }

        $discount = (float) ($result['discount'] ?? 0.0);

        return [
            'valid' => true,
            'coupon' => $coupon,
            'discount' => $discount,
            'message' => "Coupon '{$coupon->code}' applied successfully! Savings: ".number_format($discount, 2),
        ];
    }

    /**
     * Record coupon redemption on an order.
     */
    public function recordUsage(Coupon $coupon, Order $order, float $discountAmount, string $customerEmail): CouponUsage
    {
        $coupon->increment('times_used');

        return CouponUsage::create([
            'coupon_id' => $coupon->id,
            'order_id' => $order->id,
            'customer_email' => strtolower(trim($customerEmail)),
            'discount_amount' => $discountAmount,
            'used_at' => Carbon::now(),
        ]);
    }
}

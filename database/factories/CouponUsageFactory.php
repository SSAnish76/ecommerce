<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Coupon;
use App\Models\CouponUsage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CouponUsage>
 */
class CouponUsageFactory extends Factory
{
    protected $model = CouponUsage::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'coupon_id' => Coupon::factory(),
            'order_id' => null,
            'customer_email' => fake()->safeEmail(),
            'discount_amount' => fake()->randomFloat(2, 5, 50),
            'used_at' => now(),
        ];
    }
}

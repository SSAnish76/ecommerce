<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Coupon\CouponApplyTo;
use App\Enums\Coupon\CouponType;
use App\Models\Coupon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Coupon>
 */
class CouponFactory extends Factory
{
    protected $model = Coupon::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->bothify('COUPON-####-????')),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'type' => CouponType::Percentage,
            'value' => fake()->randomFloat(2, 5, 30),
            'min_order_amount' => 100.00,
            'max_discount_amount' => 50.00,
            'applies_to' => CouponApplyTo::All,
            'usage_limit' => 100,
            'usage_limit_per_customer' => 1,
            'times_used' => 0,
            'starts_at' => now(),
            'expires_at' => now()->addMonth(),
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the coupon is a fixed amount discount.
     */
    public function fixed(float $amount = 20.00): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => CouponType::Fixed,
            'value' => $amount,
            'max_discount_amount' => null,
        ]);
    }

    /**
     * Indicate that the coupon is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the coupon is expired.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'starts_at' => now()->subMonth(),
            'expires_at' => now()->subDay(),
        ]);
    }
}

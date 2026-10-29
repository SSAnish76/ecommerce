<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Order\PaymentStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'customer_id' => Customer::factory(),
            'transaction_id' => 'tx_'.fake()->uuid(),
            'gateway' => fake()->randomElement(['stripe', 'paypal', 'razorpay', 'cod']),
            'amount' => fake()->randomFloat(2, 10, 500),
            'currency' => 'USD',
            'status' => PaymentStatus::Paid,
            'type' => 'charge',
            'payload' => ['mock' => true],
            'paid_at' => now(),
        ];
    }
}

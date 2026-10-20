<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $size = fake()->randomElement(['S', 'M', 'L', 'XL']);
        $color = fake()->safeColorName();

        return [
            'product_id' => Product::factory(),
            'sku' => strtoupper(fake()->unique()->bothify('VAR-????-####')),
            'name' => "Size: {$size} / Color: ".ucfirst($color),
            'attributes' => [
                'Size' => $size,
                'Color' => ucfirst($color),
            ],
            'mrp' => 120.00,
            'price' => 99.00,
            'sale_price' => 89.00,
            'stock_quantity' => fake()->numberBetween(5, 50),
            'low_stock_threshold' => 5,
            'is_active' => true,
            'image_path' => null,
        ];
    }
}

<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Product\LocationAvailabilityType;
use App\Enums\Product\ProductStatus;
use App\Enums\Product\StockVisibility;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);
        $mrp = fake()->randomFloat(2, 50, 500);
        $retailPrice = round($mrp * 0.9, 2);
        $hasSale = fake()->boolean(40);
        $salePrice = $hasSale ? round($retailPrice * 0.85, 2) : null;
        $discount = $salePrice ? round((($mrp - $salePrice) / $mrp) * 100, 2) : null;

        return [
            'name' => ucwords($name),
            'slug' => Str::slug($name).'-'.fake()->unique()->numerify('####'),
            'sku' => strtoupper(fake()->unique()->bothify('PROD-????-####')),
            'short_description' => fake()->sentence(),
            'description' => fake()->paragraphs(3, true),
            'specifications' => [
                'Material' => fake()->word(),
                'Warranty' => '1 Year Official',
                'Country of Origin' => 'India',
            ],
            'brand_id' => Brand::factory(),
            'category_id' => Category::factory(),
            'mrp' => $mrp,
            'retail_price' => $retailPrice,
            'sale_price' => $salePrice,
            'discount_percentage' => $discount,
            'stock_quantity' => fake()->numberBetween(0, 150),
            'low_stock_threshold' => 10,
            'stock_visibility' => StockVisibility::Badge,
            'has_variants' => false,
            'status' => ProductStatus::Active,
            'is_featured' => fake()->boolean(20),
            'location_availability_type' => LocationAvailabilityType::All,
            'delivery_radius_km' => null,
            'return_policy' => '10-day return policy for unused products in original packaging.',
            'refund_policy' => '100% refund processed within 3-5 business days upon item receipt.',
        ];
    }
}

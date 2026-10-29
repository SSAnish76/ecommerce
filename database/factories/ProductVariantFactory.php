<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    /**
     * Configure the factory.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (ProductVariant $variant): void {
            if ($variant->attributes && $variant->product) {
                foreach ($variant->attributes as $attrName => $attrValue) {
                    $attr = Attribute::firstOrCreate(
                        ['name' => $attrName],
                        ['code' => Str::slug($attrName), 'type' => 'button', 'is_active' => true]
                    );

                    $val = AttributeValue::firstOrCreate(
                        ['attribute_id' => $attr->id, 'value' => (string) $attrValue],
                        ['is_active' => true]
                    );

                    $variant->product->attributes()->syncWithoutDetaching([$attr->id]);
                    $variant->product->attributeValues()->syncWithoutDetaching([$val->id => ['attribute_id' => $attr->id]]);
                    $variant->attributeValues()->syncWithoutDetaching([$val->id]);
                }
            }
        });
    }

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

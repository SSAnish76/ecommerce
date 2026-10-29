<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Collection\CollectionType;
use App\Models\Collection;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Collection>
 */
class CollectionFactory extends Factory
{
    protected $model = Collection::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'name' => ucwords($name),
            'slug' => Str::slug($name),
            'description' => fake()->sentence(),
            'type' => CollectionType::Product,
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the collection is of brand type.
     */
    public function brandType(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => CollectionType::Brand,
        ]);
    }

    /**
     * Indicate that the collection is of category type.
     */
    public function categoryType(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => CollectionType::Category,
        ]);
    }

    /**
     * Indicate that the collection is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}

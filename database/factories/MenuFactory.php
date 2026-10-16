<?php

namespace Database\Factories;

use App\Enums\Menu\MenuStatus;
use App\Models\Menu;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Menu>
 */
class MenuFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $slug = fake()->unique()->slug(2);

        return [
            'slug' => $slug,
            'parent_slug' => null,
            'name' => fake()->words(2, true),
            'description' => fake()->sentence(),
            'href' => '/admin/' . $slug,
            'icon' => 'layout-dashboard',
            'sort_order' => 0,
            'status' => MenuStatus::Active,
            'is_crud' => false,
            'is_import_export' => false,
        ];
    }

    /**
     * Indicate that the menu supports CRUD operations.
     */
    public function crud(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_crud' => true,
        ]);
    }

    /**
     * Indicate that the menu supports import and export.
     */
    public function importExport(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_import_export' => true,
        ]);
    }

    /**
     * Indicate the parent menu for this menu item.
     */
    public function childOf(Menu $parent): static
    {
        return $this->state(fn (array $attributes) => [
            'parent_slug' => $parent->slug,
        ]);
    }
}

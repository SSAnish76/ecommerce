<?php

namespace Database\Factories;

use App\Models\Menu;
use App\Models\Role;
use App\Models\RolePermission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RolePermission>
 */
class RolePermissionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'role_id' => Role::factory(),
            'menu_slug' => Menu::factory(),
            'can_view' => true,
            'can_create' => false,
            'can_update' => false,
            'can_delete' => false,
            'can_import' => false,
            'can_export' => false,
        ];
    }

    /**
     * Indicate that the permission grant includes full access.
     */
    public function fullAccess(): static
    {
        return $this->state(fn (array $attributes) => [
            'can_view' => true,
            'can_create' => true,
            'can_update' => true,
            'can_delete' => true,
            'can_import' => true,
            'can_export' => true,
        ]);
    }
}

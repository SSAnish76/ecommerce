<?php

namespace Database\Seeders;

use App\Enums\User\UserStatus;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Ensure Super Admin exists and has the Super Admin role
        $superAdminRole = Role::where('name', 'Super Admin')->first();

        $adminUser = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'status' => UserStatus::Active,
            ]
        );

        if ($superAdminRole && ! $adminUser->roles()->where('roles.id', $superAdminRole->id)->exists()) {
            $adminUser->roles()->attach($superAdminRole->id);
        }

        // 2. Create demo users for other roles if they do not exist
        $managerRole = Role::where('name', 'Manager')->first();
        if ($managerRole) {
            $manager = User::firstOrCreate(
                ['email' => 'manager@example.com'],
                [
                    'name' => 'Store Operations Manager',
                    'password' => Hash::make('password'),
                    'status' => UserStatus::Active,
                ]
            );

            if (! $manager->roles()->where('roles.id', $managerRole->id)->exists()) {
                $manager->roles()->attach($managerRole->id);
            }
        }

        $editorRole = Role::where('name', 'Editor')->first();
        if ($editorRole) {
            $editor = User::firstOrCreate(
                ['email' => 'editor@example.com'],
                [
                    'name' => 'Catalog Content Editor',
                    'password' => Hash::make('password'),
                    'status' => UserStatus::Active,
                ]
            );

            if (! $editor->roles()->where('roles.id', $editorRole->id)->exists()) {
                $editor->roles()->attach($editorRole->id);
            }
        }

        // 3. Create sample accounts if less than 5 non-admin users
        if (User::where('email', '!=', 'admin@example.com')->count() < 5) {
            User::factory(3)->create();
        }
    }
}

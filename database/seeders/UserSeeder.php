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
        // 1. Create standard demo accounts for defined roles
        $roles = Role::whereIn('name', ['Super Admin', 'Manager', 'Editor'])->get()->keyBy('name');

        $demoUsers = [
            [
                'email' => 'admin@example.com',
                'name' => 'Admin User',
                'role' => 'Super Admin',
            ],
            [
                'email' => 'manager@example.com',
                'name' => 'Store Operations Manager',
                'role' => 'Manager',
            ],
            [
                'email' => 'editor@example.com',
                'name' => 'Catalog Content Editor',
                'role' => 'Editor',
            ],
        ];

        foreach ($demoUsers as $demo) {
            $role = $roles->get($demo['role']);
            if (! $role && $demo['role'] !== 'Super Admin') {
                continue;
            }

            $user = User::firstOrCreate(
                ['email' => $demo['email']],
                [
                    'name' => $demo['name'],
                    'password' => Hash::make('password'),
                    'status' => UserStatus::Active,
                    'role_id' => $role?->id,
                ]
            );

            if ($role && $user->role_id !== $role->id) {
                $user->update(['role_id' => $role->id]);
            }
        }

        // 2. Create sample accounts if less than 5 non-admin users
        if (User::where('email', '!=', 'admin@example.com')->count() < 5) {
            User::factory(3)->create();
        }
    }
}

<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\Store\StoreStatus;
use App\Models\Store;
use Illuminate\Database\Seeder;

class StoreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $appName = (string) config('app.name', 'E-Commerce Store');

        Store::updateOrCreate(
            ['email' => 'support@store.com'],
            [
                'name' => $appName,
                'legal_name' => $appName.' Inc.',
                'phone' => '+1 (800) 555-0199',
                'address_line1' => '100 Commerce Boulevard, Suite 400',
                'city' => 'New York',
                'state' => 'NY',
                'postal_code' => '10001',
                'country' => 'United States',
                'currency' => 'USD',
                'timezone' => 'UTC',
                'tax_number' => 'US-EIN-987654321',
                'description' => 'Flagship modern e-commerce storefront providing seamless shopping experiences.',
                'website_url' => 'https://store.example.com',
                'status' => StoreStatus::Active,
            ]
        );
    }
}

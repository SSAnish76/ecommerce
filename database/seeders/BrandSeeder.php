<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Brand;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BrandSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $brands = [
            ['name' => 'Apple', 'description' => 'Premium technology hardware and software solutions.'],
            ['name' => 'Samsung', 'description' => 'Global innovator in consumer electronics and smart devices.'],
            ['name' => 'Sony', 'description' => 'World leader in audio, visual, and entertainment hardware.'],
            ['name' => 'Nike', 'description' => 'Leading sportswear, athletic footwear, and apparel brand.'],
            ['name' => 'Philips', 'description' => 'Personal care, grooming, and domestic electrical appliances.'],
            ['name' => 'IKEA', 'description' => 'Affordable and minimalist modern home furnishing products.'],
        ];

        foreach ($brands as $b) {
            Brand::updateOrCreate(
                ['slug' => Str::slug($b['name'])],
                [
                    'name' => $b['name'],
                    'description' => $b['description'],
                    'is_active' => true,
                ]
            );
        }
    }
}

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
            ['name' => 'Apple', 'website' => 'https://apple.com', 'description' => 'Premium technology hardware and software solutions.'],
            ['name' => 'Samsung', 'website' => 'https://samsung.com', 'description' => 'Global innovator in consumer electronics and smart devices.'],
            ['name' => 'Sony', 'website' => 'https://sony.com', 'description' => 'World leader in audio, visual, and entertainment hardware.'],
            ['name' => 'Nike', 'website' => 'https://nike.com', 'description' => 'Leading sportswear, athletic footwear, and apparel brand.'],
            ['name' => 'Philips', 'website' => 'https://philips.com', 'description' => 'Personal care, grooming, and domestic electrical appliances.'],
            ['name' => 'IKEA', 'website' => 'https://ikea.com', 'description' => 'Affordable and minimalist modern home furnishing products.'],
        ];

        foreach ($brands as $index => $b) {
            Brand::updateOrCreate(
                ['slug' => Str::slug($b['name'])],
                [
                    'name' => $b['name'],
                    'website' => $b['website'],
                    'description' => $b['description'],
                    'is_active' => true,
                    'sort_order' => $index + 1,
                ]
            );
        }
    }
}

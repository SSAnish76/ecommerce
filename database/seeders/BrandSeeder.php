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
            ['name' => 'Dell', 'description' => 'Industry-leading performance laptops, monitors, workstations, and business computing.'],
            ['name' => 'Lenovo', 'description' => 'Global innovation leader in personal computers, ThinkPad workstations, and Legion gaming rigs.'],
            ['name' => 'HP', 'description' => 'Next-generation personal computers, Spectre convertibles, and versatile professional hardware.'],
            ['name' => 'ASUS', 'description' => 'Pioneering creator of cutting-edge ROG gaming laptops, Zenbook ultrabooks, and tech accessories.'],
            ['name' => 'Google', 'description' => 'Next-generation Android smartphones, Pixel devices, and integrated Google AI hardware.'],
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

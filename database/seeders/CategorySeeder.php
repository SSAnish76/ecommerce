<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $hierarchy = [
            'Consumer Electronics' => [
                'Smartphones & Accessories',
                'Laptops & Computers',
                'Audio & Headphones',
            ],
            'Fashion & Apparel' => [
                'Men\'s Wear',
                'Women\'s Fashion',
                'Footwear & Sneakers',
            ],
            'Home & Living' => [
                'Furniture & Storage',
                'Kitchen & Dining',
                'Smart Lighting',
            ],
        ];

        $sortOrder = 1;

        foreach ($hierarchy as $parentName => $children) {
            $parent = Category::updateOrCreate(
                ['slug' => Str::slug($parentName)],
                [
                    'parent_id' => null,
                    'name' => $parentName,
                    'description' => "Explore our curated collection of {$parentName}.",
                    'is_active' => true,
                    'sort_order' => $sortOrder++,
                ]
            );

            $childSort = 1;
            foreach ($children as $childName) {
                Category::updateOrCreate(
                    ['slug' => Str::slug($childName)],
                    [
                        'parent_id' => $parent->id,
                        'name' => $childName,
                        'description' => "Subcategory for {$childName} under {$parentName}.",
                        'is_active' => true,
                        'sort_order' => $childSort++,
                    ]
                );
            }
        }
    }
}

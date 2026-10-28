<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Attribute;
use App\Models\AttributeValue;
use Illuminate\Database\Seeder;

class AttributeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $attributes = [
            [
                'name' => 'Color',
                'code' => 'color',
                'type' => 'color',
                'description' => 'Color finishes and palettes with visual color swatches',
                'sort_order' => 1,
                'values' => [
                    ['value' => 'Midnight Black', 'label' => 'Midnight Black', 'color_code' => '#0f172a', 'sort_order' => 1],
                    ['value' => 'Titanium Silver', 'label' => 'Titanium Silver', 'color_code' => '#94a3b8', 'sort_order' => 2],
                    ['value' => 'Ocean Blue', 'label' => 'Ocean Blue', 'color_code' => '#2563eb', 'sort_order' => 3],
                    ['value' => 'Crimson Red', 'label' => 'Crimson Red', 'color_code' => '#dc2626', 'sort_order' => 4],
                    ['value' => 'Forest Green', 'label' => 'Forest Green', 'color_code' => '#16a34a', 'sort_order' => 5],
                    ['value' => 'Alpine White', 'label' => 'Alpine White', 'color_code' => '#ffffff', 'sort_order' => 6],
                    ['value' => 'Space Black', 'label' => 'Space Black', 'color_code' => '#1c1c1e', 'sort_order' => 7],
                    ['value' => 'Natural Titanium', 'label' => 'Natural Titanium', 'color_code' => '#9a968f', 'sort_order' => 8],
                    ['value' => 'Desert Titanium', 'label' => 'Desert Titanium', 'color_code' => '#c2b29d', 'sort_order' => 9],
                    ['value' => 'Obsidian', 'label' => 'Obsidian Black', 'color_code' => '#1f2326', 'sort_order' => 10],
                    ['value' => 'Porcelain', 'label' => 'Porcelain White', 'color_code' => '#f2f3f5', 'sort_order' => 11],
                ],
            ],
            [
                'name' => 'Size',
                'code' => 'size',
                'type' => 'button',
                'description' => 'Standard apparel and footwear sizing designations',
                'sort_order' => 2,
                'values' => [
                    ['value' => 'XS', 'label' => 'Extra Small (XS)', 'color_code' => null, 'sort_order' => 1],
                    ['value' => 'S', 'label' => 'Small (S)', 'color_code' => null, 'sort_order' => 2],
                    ['value' => 'M', 'label' => 'Medium (M)', 'color_code' => null, 'sort_order' => 3],
                    ['value' => 'L', 'label' => 'Large (L)', 'color_code' => null, 'sort_order' => 4],
                    ['value' => 'XL', 'label' => 'Extra Large (XL)', 'color_code' => null, 'sort_order' => 5],
                    ['value' => 'XXL', 'label' => 'Double Extra Large (XXL)', 'color_code' => null, 'sort_order' => 6],
                    ['value' => 'US 9', 'label' => 'US 9 (42.5 EU)', 'color_code' => null, 'sort_order' => 7],
                    ['value' => 'US 10', 'label' => 'US 10 (44 EU)', 'color_code' => null, 'sort_order' => 8],
                    ['value' => 'US 11', 'label' => 'US 11 (45 EU)', 'color_code' => null, 'sort_order' => 9],
                ],
            ],
            [
                'name' => 'RAM',
                'code' => 'ram',
                'type' => 'button',
                'description' => 'Random Access Memory hardware configurations',
                'sort_order' => 3,
                'values' => [
                    ['value' => '8GB', 'label' => '8GB Unified Memory / RAM', 'color_code' => null, 'sort_order' => 1],
                    ['value' => '12GB', 'label' => '12GB High-Speed LPDDR5X', 'color_code' => null, 'sort_order' => 2],
                    ['value' => '16GB', 'label' => '16GB High-Speed Memory', 'color_code' => null, 'sort_order' => 3],
                    ['value' => '24GB', 'label' => '24GB High-Speed Memory', 'color_code' => null, 'sort_order' => 4],
                    ['value' => '32GB', 'label' => '32GB Pro High-Speed Memory', 'color_code' => null, 'sort_order' => 5],
                    ['value' => '36GB', 'label' => '36GB Unified Pro Memory', 'color_code' => null, 'sort_order' => 6],
                    ['value' => '48GB', 'label' => '48GB Unified Max Memory', 'color_code' => null, 'sort_order' => 7],
                    ['value' => '64GB', 'label' => '64GB Extreme Workstation RAM', 'color_code' => null, 'sort_order' => 8],
                ],
            ],
            [
                'name' => 'Storage',
                'code' => 'storage',
                'type' => 'button',
                'description' => 'Internal solid state storage capacities',
                'sort_order' => 4,
                'values' => [
                    ['value' => '128GB', 'label' => '128GB NVMe SSD / Storage', 'color_code' => null, 'sort_order' => 1],
                    ['value' => '256GB', 'label' => '256GB NVMe SSD / Storage', 'color_code' => null, 'sort_order' => 2],
                    ['value' => '512GB', 'label' => '512GB High-Speed SSD', 'color_code' => null, 'sort_order' => 3],
                    ['value' => '1TB', 'label' => '1TB Ultra High-Speed SSD', 'color_code' => null, 'sort_order' => 4],
                    ['value' => '2TB', 'label' => '2TB Pro PCIe 4.0 SSD', 'color_code' => null, 'sort_order' => 5],
                ],
            ],
            [
                'name' => 'Processor',
                'code' => 'processor',
                'type' => 'button',
                'description' => 'Processor architecture and performance tier',
                'sort_order' => 5,
                'values' => [
                    ['value' => 'Apple M3 Pro', 'label' => 'Apple M3 Pro (11-Core CPU, 14-Core GPU)', 'color_code' => null, 'sort_order' => 1],
                    ['value' => 'Apple M3 Max', 'label' => 'Apple M3 Max (14-Core CPU, 30-Core GPU)', 'color_code' => null, 'sort_order' => 2],
                    ['value' => 'Intel Core Ultra 7 155H', 'label' => 'Intel Core Ultra 7 155H (16 Cores, up to 4.8 GHz)', 'color_code' => null, 'sort_order' => 3],
                    ['value' => 'Intel Core Ultra 9 185H', 'label' => 'Intel Core Ultra 9 185H (16 Cores, up to 5.1 GHz)', 'color_code' => null, 'sort_order' => 4],
                    ['value' => 'Intel Core i7-14700HX', 'label' => 'Intel Core i7-14700HX (20 Cores, 28 Threads)', 'color_code' => null, 'sort_order' => 5],
                    ['value' => 'Intel Core i9-14900HX', 'label' => 'Intel Core i9-14900HX (24 Cores, 32 Threads)', 'color_code' => null, 'sort_order' => 6],
                    ['value' => 'AMD Ryzen 7 8845HS', 'label' => 'AMD Ryzen 7 8845HS (8 Cores, 16 Threads, Ryzen AI)', 'color_code' => null, 'sort_order' => 7],
                    ['value' => 'AMD Ryzen 9 8945HS', 'label' => 'AMD Ryzen 9 8945HS (8 Cores, 16 Threads, Ryzen AI)', 'color_code' => null, 'sort_order' => 8],
                ],
            ],
        ];

        foreach ($attributes as $attrData) {
            $values = $attrData['values'];
            unset($attrData['values']);

            $attribute = Attribute::updateOrCreate(
                ['code' => $attrData['code']],
                $attrData
            );

            foreach ($values as $valData) {
                AttributeValue::updateOrCreate(
                    [
                        'attribute_id' => $attribute->id,
                        'value' => $valData['value'],
                    ],
                    $valData
                );
            }
        }
    }
}

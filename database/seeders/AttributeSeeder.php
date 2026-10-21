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
                ],
            ],
            [
                'name' => 'RAM',
                'code' => 'ram',
                'type' => 'button',
                'description' => 'Random Access Memory hardware configurations',
                'sort_order' => 3,
                'values' => [
                    ['value' => '8GB', 'label' => '8GB Unified Memory', 'color_code' => null, 'sort_order' => 1],
                    ['value' => '16GB', 'label' => '16GB Unified Memory', 'color_code' => null, 'sort_order' => 2],
                    ['value' => '24GB', 'label' => '24GB High-Speed RAM', 'color_code' => null, 'sort_order' => 3],
                    ['value' => '32GB', 'label' => '32GB Pro Memory', 'color_code' => null, 'sort_order' => 4],
                    ['value' => '64GB', 'label' => '64GB Extreme Workstation RAM', 'color_code' => null, 'sort_order' => 5],
                ],
            ],
            [
                'name' => 'Storage',
                'code' => 'storage',
                'type' => 'button',
                'description' => 'Internal solid state storage capacities',
                'sort_order' => 4,
                'values' => [
                    ['value' => '128GB', 'label' => '128GB NVMe SSD', 'color_code' => null, 'sort_order' => 1],
                    ['value' => '256GB', 'label' => '256GB NVMe SSD', 'color_code' => null, 'sort_order' => 2],
                    ['value' => '512GB', 'label' => '512GB High-Speed SSD', 'color_code' => null, 'sort_order' => 3],
                    ['value' => '1TB', 'label' => '1TB Ultra SSD', 'color_code' => null, 'sort_order' => 4],
                    ['value' => '2TB', 'label' => '2TB Pro PCIe 4.0 SSD', 'color_code' => null, 'sort_order' => 5],
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

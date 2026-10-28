<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\Product\DiscountType;
use App\Enums\Product\LocationAvailabilityType;
use App\Enums\Product\ProductStatus;
use App\Enums\Product\StockVisibility;
use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Database\Seeders\Concerns\SeedsProductMedia;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    use SeedsProductMedia;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Ensure prerequisite base catalog seeders have run if executed in isolation
        if (Brand::count() === 0 || Attribute::count() === 0 || Category::count() === 0) {
            $this->call([
                BrandSeeder::class,
                CategorySeeder::class,
                AttributeSeeder::class,
            ]);
        }

        // 2. Remove legacy duplicate placeholder product if present
        $legacyIphone = Product::where('sku', 'APL-IP16PM-256')->first();
        if ($legacyIphone) {
            $legacyIphone->variants()->delete();
            $legacyIphone->images()->delete();
            $legacyIphone->delete();
        }

        // 2. Seed Computers and Mobile Phones
        $this->call([
            ComputerProductSeeder::class,
            MobilePhoneProductSeeder::class,
        ]);

        // 3. Audio & Footwear Catalog Products
        $sony = Brand::where('name', 'Sony')->first();
        $nike = Brand::where('name', 'Nike')->first();

        $audio = Category::where('name', 'Audio & Headphones')->first();
        $shoes = Category::where('name', 'Footwear & Sneakers')->first();

        // Sony WH-1000XM5
        $sonyHeadphones = Product::updateOrCreate(
            ['sku' => 'SNY-WH1000XM5-BLK'],
            [
                'name' => 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
                'slug' => 'sony-wh-1000xm5-wireless-headphones',
                'short_description' => 'Industry-leading noise cancellation powered by two processors and 8 microphones.',
                'description' => 'Engineered to perfection with High-Resolution Audio support, crystal clear hands-free calling, and 30-hour battery life.',
                'specifications' => [
                    'Noise Cancellation' => 'Dual Processor V1 + HD QN1',
                    'Battery Life' => '30 hours (ANC on)',
                    'Charging' => 'USB-PD 3 min charge for 3 hours playback',
                    'Weight' => '250g',
                ],
                'brand_id' => $sony?->id,
                'category_id' => $audio?->id,
                'mrp' => 399.99,
                'retail_price' => 349.99,
                'sale_price' => 299.99,
                'discount_type' => DiscountType::Percentage,
                'discount_value' => 25.00,
                'stock_quantity' => 28,
                'low_stock_threshold' => 8,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => false,
                'status' => ProductStatus::Active,
                'location_availability_type' => LocationAvailabilityType::All,
                'return_policy' => '7-day replacement warranty for manufacturing defects.',
                'refund_policy' => 'Full refund available if returned unopened.',
            ]
        );

        $sonyMedia = $this->ensureProductMedia(
            filename: 'sony-wh-1000xm5.jpg',
            title: 'Sony WH-1000XM5',
            brandName: 'Sony',
            hexBg: '#1e293b'
        );

        ProductImage::updateOrCreate(
            ['product_id' => $sonyHeadphones->id, 'sort_order' => 1],
            ['media_id' => $sonyMedia->id, 'alt_text' => 'Sony WH-1000XM5 Headphones', 'is_primary' => true]
        );

        // Nike Air Max Alpha Trainer 5
        $attrSize = Attribute::where('code', 'size')->first();

        $nikeShoes = Product::updateOrCreate(
            ['sku' => 'NKE-AMALPHA-TR5'],
            [
                'name' => 'Nike Air Max Alpha Trainer 5',
                'slug' => 'nike-air-max-alpha-trainer-5',
                'short_description' => 'Maximum cushioning, flat wide base for heavy lifting and explosive workouts.',
                'description' => 'Tough mesh and robust eyestays let your foot breathe while standing up to the rigors of heavy daily gym workouts.',
                'specifications' => [
                    'Upper' => 'Breathable engineered mesh',
                    'Midsole' => 'Max Air heel cushion',
                    'Outsole' => 'High-abrasion rubber tread',
                ],
                'brand_id' => $nike?->id,
                'category_id' => $shoes?->id,
                'mrp' => 95.00,
                'retail_price' => 85.00,
                'sale_price' => null,
                'discount_value' => null,
                'stock_quantity' => 5,
                'low_stock_threshold' => 10,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => true,
                'status' => ProductStatus::Active,
                'location_availability_type' => LocationAvailabilityType::Radius,
                'delivery_radius_km' => 25.00,
                'return_policy' => '30-day wear-test guarantee.',
                'refund_policy' => 'Free returns and 100% money back.',
            ]
        );

        $nikeMedia = $this->ensureProductMedia(
            filename: 'nike-air-max-alpha.jpg',
            title: 'Nike Air Max Alpha',
            brandName: 'Nike',
            hexBg: '#dc2626'
        );

        ProductImage::updateOrCreate(
            ['product_id' => $nikeShoes->id, 'sort_order' => 1],
            ['media_id' => $nikeMedia->id, 'alt_text' => 'Nike Air Max Red Shoes', 'is_primary' => true]
        );

        // Sync shoe size attributes
        if ($attrSize) {
            $nikeShoes->attributes()->sync([$attrSize->id => ['sort_order' => 1]]);
        }

        $shoeSizes = [
            'US 9' => 2,
            'US 10' => 2,
            'US 11' => 1,
        ];

        $shoeAttrValueSync = [];
        $totalShoeStock = 0;

        foreach ($shoeSizes as $size => $stock) {
            $valModel = AttributeValue::where('attribute_id', $attrSize?->id)
                ->where('value', $size)
                ->first();

            if ($valModel && $attrSize) {
                $shoeAttrValueSync[$valModel->id] = ['attribute_id' => $attrSize->id];
            }

            $variant = ProductVariant::updateOrCreate(
                ['sku' => 'NKE-AMALPHA-'.str_replace(' ', '', $size)],
                [
                    'product_id' => $nikeShoes->id,
                    'name' => "Nike Air Max Alpha - {$size}",
                    'attributes' => ['Size' => $size],
                    'mrp' => 95.00,
                    'price' => 85.00,
                    'sale_price' => null,
                    'stock_quantity' => $stock,
                    'low_stock_threshold' => 5,
                    'is_active' => true,
                    'media_id' => $nikeMedia->id,
                    'image_path' => $nikeMedia->url,
                ]
            );

            if ($valModel) {
                $variant->attributeValues()->sync([$valModel->id]);
            }

            $totalShoeStock += $stock;
        }

        $nikeShoes->attributeValues()->sync($shoeAttrValueSync);
        $nikeShoes->update(['stock_quantity' => $totalShoeStock]);
    }
}

<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\Product\LocationAvailabilityType;
use App\Enums\Product\ProductStatus;
use App\Enums\Product\StockVisibility;
use App\Models\Brand;
use App\Models\Category;
use App\Models\MediaFile;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $apple = Brand::where('name', 'Apple')->first();
        $samsung = Brand::where('name', 'Samsung')->first();
        $sony = Brand::where('name', 'Sony')->first();
        $nike = Brand::where('name', 'Nike')->first();

        $smartphones = Category::where('name', 'Smartphones & Accessories')->first();
        $audio = Category::where('name', 'Audio & Headphones')->first();
        $shoes = Category::where('name', 'Footwear & Sneakers')->first();

        // 1. iPhone 16 Pro Max
        $iphone = Product::updateOrCreate(
            ['sku' => 'APL-IP16PM-256'],
            [
                'name' => 'Apple iPhone 16 Pro Max 256GB',
                'slug' => 'apple-iphone-16-pro-max-256gb',
                'short_description' => 'The ultimate iPhone with Titanium frame and A18 Pro Bionic chipset.',
                'description' => 'Experience next-generation photography with 48MP Fusion Camera, Apple Intelligence built-in, and 4K 120 fps Dolby Vision video recording.',
                'specifications' => [
                    'Display' => '6.9-inch Super Retina XDR OLED 120Hz',
                    'Processor' => 'Apple A18 Pro (3nm)',
                    'Storage' => '256GB NVMe',
                    'Battery Life' => 'Up to 33 hours video playback',
                    'Warranty' => '1 Year Apple Worldwide Warranty',
                ],
                'brand_id' => $apple?->id,
                'category_id' => $smartphones?->id,
                'mrp' => 1449.00,
                'retail_price' => 1399.00,
                'sale_price' => 1349.00,
                'discount_percentage' => 6.90,
                'stock_quantity' => 45,
                'low_stock_threshold' => 10,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => true,
                'status' => ProductStatus::Active,
                'is_featured' => true,
                'location_availability_type' => LocationAvailabilityType::All,
                'return_policy' => '15-day hassle-free replacement or return for sealed devices.',
                'refund_policy' => 'Refund processed to original payment method within 5 working days.',
            ]
        );

        $iphoneMedia = MediaFile::firstOrCreate(
            ['filename' => 'iphone-16-pro-max.jpg'],
            [
                'disk' => 'public',
                'directory' => 'media/products',
                'original_name' => 'iphone-16-pro-max.jpg',
                'mime_type' => 'image/jpeg',
                'extension' => 'jpg',
                'size' => 102400,
                'collection' => 'products',
            ]
        );

        ProductImage::updateOrCreate(
            ['product_id' => $iphone->id, 'sort_order' => 1],
            ['media_id' => $iphoneMedia->id, 'alt_text' => 'iPhone 16 Pro Max Natural Titanium', 'is_primary' => true]
        );

        // iPhone Variants
        $colors = ['Natural Titanium', 'Black Titanium', 'Desert Titanium'];
        foreach ($colors as $c) {
            ProductVariant::updateOrCreate(
                ['sku' => 'APL-IP16PM-'.strtoupper(substr(Str::slug($c), 0, 3))],
                [
                    'product_id' => $iphone->id,
                    'name' => "iPhone 16 Pro Max - {$c}",
                    'attributes' => ['Color' => $c, 'Storage' => '256GB'],
                    'mrp' => 1449.00,
                    'price' => 1399.00,
                    'sale_price' => 1349.00,
                    'stock_quantity' => 15,
                    'low_stock_threshold' => 5,
                    'is_active' => true,
                ]
            );
        }

        // 2. Sony WH-1000XM5
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
                'discount_percentage' => 25.00,
                'stock_quantity' => 28,
                'low_stock_threshold' => 8,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => false,
                'status' => ProductStatus::Active,
                'is_featured' => true,
                'location_availability_type' => LocationAvailabilityType::All,
                'return_policy' => '7-day replacement warranty for manufacturing defects.',
                'refund_policy' => 'Full refund available if returned unopened.',
            ]
        );

        $sonyMedia = MediaFile::firstOrCreate(
            ['filename' => 'sony-wh-1000xm5.jpg'],
            [
                'disk' => 'public',
                'directory' => 'media/products',
                'original_name' => 'sony-wh-1000xm5.jpg',
                'mime_type' => 'image/jpeg',
                'extension' => 'jpg',
                'size' => 102400,
                'collection' => 'products',
            ]
        );

        ProductImage::updateOrCreate(
            ['product_id' => $sonyHeadphones->id, 'sort_order' => 1],
            ['media_id' => $sonyMedia->id, 'alt_text' => 'Sony WH-1000XM5 Headphones', 'is_primary' => true]
        );

        // 3. Nike Air Max Alpha
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
                'discount_percentage' => null,
                'stock_quantity' => 4, // low stock!
                'low_stock_threshold' => 10,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => true,
                'status' => ProductStatus::Active,
                'is_featured' => false,
                'location_availability_type' => LocationAvailabilityType::Radius,
                'delivery_radius_km' => 25.00,
                'return_policy' => '30-day wear-test guarantee.',
                'refund_policy' => 'Free returns and 100% money back.',
            ]
        );

        $nikeMedia = MediaFile::firstOrCreate(
            ['filename' => 'nike-air-max-alpha.jpg'],
            [
                'disk' => 'public',
                'directory' => 'media/products',
                'original_name' => 'nike-air-max-alpha.jpg',
                'mime_type' => 'image/jpeg',
                'extension' => 'jpg',
                'size' => 102400,
                'collection' => 'products',
            ]
        );

        ProductImage::updateOrCreate(
            ['product_id' => $nikeShoes->id, 'sort_order' => 1],
            ['media_id' => $nikeMedia->id, 'alt_text' => 'Nike Air Max Red Shoes', 'is_primary' => true]
        );

        // Shoe variants (Sizes)
        foreach (['US 9', 'US 10', 'US 11'] as $size) {
            ProductVariant::updateOrCreate(
                ['sku' => 'NKE-AMALPHA-'.str_replace(' ', '', $size)],
                [
                    'product_id' => $nikeShoes->id,
                    'name' => "Nike Air Max Alpha - {$size}",
                    'attributes' => ['Size' => $size, 'Color' => 'Gym Red / Black'],
                    'mrp' => 95.00,
                    'price' => 85.00,
                    'sale_price' => null,
                    'stock_quantity' => $size === 'US 11' ? 1 : 2,
                    'low_stock_threshold' => 5,
                    'is_active' => true,
                ]
            );
        }
    }
}

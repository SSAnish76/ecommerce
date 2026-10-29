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

class ComputerProductSeeder extends Seeder
{
    use SeedsProductMedia;

    /**
     * Run the database seeds for computer and laptop products.
     */
    public function run(): void
    {
        $category = Category::where('name', 'Laptops & Computers')->first();
        if (! $category) {
            $parent = Category::firstOrCreate(
                ['slug' => 'consumer-electronics'],
                ['name' => 'Consumer Electronics', 'is_active' => true, 'sort_order' => 1]
            );

            $category = Category::firstOrCreate(
                ['slug' => 'laptops-computers'],
                [
                    'parent_id' => $parent->id,
                    'name' => 'Laptops & Computers',
                    'description' => 'High performance laptops, gaming ultrabooks, and desktop workstations.',
                    'is_active' => true,
                    'sort_order' => 2,
                ]
            );
        }

        $brands = [
            'Apple' => Brand::firstOrCreate(['slug' => 'apple'], ['name' => 'Apple', 'is_active' => true]),
            'Dell' => Brand::firstOrCreate(['slug' => 'dell'], ['name' => 'Dell', 'is_active' => true]),
            'Lenovo' => Brand::firstOrCreate(['slug' => 'lenovo'], ['name' => 'Lenovo', 'is_active' => true]),
            'ASUS' => Brand::firstOrCreate(['slug' => 'asus'], ['name' => 'ASUS', 'is_active' => true]),
        ];

        // Ensure Computer Attributes exist
        $attrProcessor = Attribute::where('code', 'processor')->first();
        $attrRam = Attribute::where('code', 'ram')->first();
        $attrStorage = Attribute::where('code', 'storage')->first();

        // 1. Apple MacBook Pro 16"
        $this->seedProduct(
            category: $category,
            brand: $brands['Apple'],
            productData: [
                'name' => 'Apple MacBook Pro 16" (M3 Max / Pro)',
                'slug' => 'apple-macbook-pro-16-m3',
                'sku' => 'APL-MBP16-M3',
                'short_description' => 'The ultimate pro laptop with Liquid Retina XDR display, M3 Pro or M3 Max chip, and up to 22 hours of battery life.',
                'description' => "MacBook Pro blasts forward with M3 Pro and M3 Max, radically advanced chips that drive enormous performance and capabilities for demanding workflows. Featuring best-in-class Liquid Retina XDR display with 1600 nits peak HDR brightness, hardware-accelerated ray tracing, studio-quality three-mic array, and a versatile array of pro connectivity ports including MagSafe 3, HDMI 2.1, and three Thunderbolt 4 ports.",
                'specifications' => [
                    'Display' => '16.2-inch Liquid Retina XDR (3456 x 2234), 120Hz ProMotion, 1600 nits HDR peak',
                    'Battery Life' => 'Up to 22 hours Apple TV movie playback, 100Wh lithium-polymer battery',
                    'Memory Bandwidth' => 'Up to 300GB/s unified memory bandwidth',
                    'Ports' => '3x Thunderbolt 4 (USB-C), HDMI 2.1, SDXC card slot, MagSafe 3, 3.5mm headphone jack',
                    'Audio' => 'Six-speaker sound system with force-cancelling woofers, Dolby Atmos Spatial Audio',
                    'Operating System' => 'macOS Sonoma',
                    'Weight' => '2.14 kg (4.71 lbs)',
                    'Warranty' => '1 Year Limited Apple Worldwide Warranty + 90 Days Complimentary Tech Support',
                ],
                'mrp' => 2899.00,
                'retail_price' => 2699.00,
                'sale_price' => 2549.00,
                'discount_type' => DiscountType::Percentage,
                'discount_value' => 5.56,
                'low_stock_threshold' => 5,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => true,
                'status' => ProductStatus::Active,
                'location_availability_type' => LocationAvailabilityType::All,
                'return_policy' => '14-day Apple return policy in original packaging.',
                'refund_policy' => 'Full refund within 5 business days upon inspection.',
            ],
            imageFilenames: [
                'apple-macbook-pro-16-space-black.jpg' => '#1e293b',
                'apple-macbook-pro-16-keyboard.jpg' => '#0f172a',
            ],
            attributesToSync: [$attrProcessor, $attrRam, $attrStorage],
            variants: [
                [
                    'sku' => 'APL-MBP16-M3P-36-512',
                    'name' => 'MacBook Pro 16" - M3 Pro / 36GB / 512GB',
                    'attributes' => [
                        'Processor' => 'Apple M3 Pro',
                        'RAM' => '36GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 2899.00,
                    'price' => 2699.00,
                    'sale_price' => 2549.00,
                    'stock_quantity' => 14,
                    'low_stock_threshold' => 5,
                    'image' => 'apple-macbook-pro-16-space-black.jpg',
                ],
                [
                    'sku' => 'APL-MBP16-M3P-36-1TB',
                    'name' => 'MacBook Pro 16" - M3 Pro / 36GB / 1TB',
                    'attributes' => [
                        'Processor' => 'Apple M3 Pro',
                        'RAM' => '36GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 3099.00,
                    'price' => 2899.00,
                    'sale_price' => 2749.00,
                    'stock_quantity' => 12,
                    'low_stock_threshold' => 5,
                    'image' => 'apple-macbook-pro-16-space-black.jpg',
                ],
                [
                    'sku' => 'APL-MBP16-M3M-36-1TB',
                    'name' => 'MacBook Pro 16" - M3 Max / 36GB / 1TB',
                    'attributes' => [
                        'Processor' => 'Apple M3 Max',
                        'RAM' => '36GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 3699.00,
                    'price' => 3499.00,
                    'sale_price' => 3349.00,
                    'stock_quantity' => 8,
                    'low_stock_threshold' => 5,
                    'image' => 'apple-macbook-pro-16-space-black.jpg',
                ],
                [
                    'sku' => 'APL-MBP16-M3M-48-1TB',
                    'name' => 'MacBook Pro 16" - M3 Max / 48GB / 1TB',
                    'attributes' => [
                        'Processor' => 'Apple M3 Max',
                        'RAM' => '48GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 4099.00,
                    'price' => 3899.00,
                    'sale_price' => 3699.00,
                    'stock_quantity' => 6,
                    'low_stock_threshold' => 5,
                    'image' => 'apple-macbook-pro-16-space-black.jpg',
                ],
                [
                    'sku' => 'APL-MBP16-M3M-64-2TB',
                    'name' => 'MacBook Pro 16" - M3 Max / 64GB / 2TB',
                    'attributes' => [
                        'Processor' => 'Apple M3 Max',
                        'RAM' => '64GB',
                        'Storage' => '2TB',
                    ],
                    'mrp' => 4699.00,
                    'price' => 4499.00,
                    'sale_price' => 4299.00,
                    'stock_quantity' => 4, // low stock testing
                    'low_stock_threshold' => 5,
                    'image' => 'apple-macbook-pro-16-space-black.jpg',
                ],
            ]
        );

        // 2. Dell XPS 16 (9640)
        $this->seedProduct(
            category: $category,
            brand: $brands['Dell'],
            productData: [
                'name' => 'Dell XPS 16 (9640) OLED Touch Laptop',
                'slug' => 'dell-xps-16-9640-oled-touch-laptop',
                'sku' => 'DEL-XPS16-9640',
                'short_description' => 'Flagship creative powerhouse with 16.3" 4K+ OLED InfinityEdge display, Intel Core Ultra CPUs, and NVIDIA GeForce RTX graphics.',
                'description' => "Crafted with CNC machined aluminum and Gorilla Glass 3, the Dell XPS 16 combines high performance with iconic minimalist design. Powered by Intel Core Ultra processors featuring dedicated Intel AI Boost NPUs and NVIDIA GeForce RTX 40-Series graphics. Features a capacitive touch function row, invisible seamless glass haptic touchpad, and Quad-speaker audio.",
                'specifications' => [
                    'Display' => '16.3-inch 4K+ (3840 x 2400) OLED InfinityEdge Touch, 400 nits, 100% DCI-P3',
                    'Graphics' => 'NVIDIA GeForce RTX 4070 Laptop GPU 8GB GDDR6 (60W)',
                    'Keyboard' => 'Zero-lattice backlit keyboard with fingerprint reader & Copilot key',
                    'Battery' => '6-Cell 99.5Wh Integrated Battery with ExpressCharge',
                    'Ports' => '3x Thunderbolt 4 (Type-C) with DP 2.1 & PD, MicroSDXC v6.0, 3.5mm combo jack',
                    'Wireless' => 'Intel Killer Wi-Fi 7 BE1750 (2x2) + Bluetooth 5.4',
                    'Operating System' => 'Windows 11 Pro 64-bit',
                    'Weight' => '2.13 kg (4.70 lbs)',
                    'Warranty' => '1 Year Premium Support with Onsite Service',
                ],
                'mrp' => 2299.00,
                'retail_price' => 2149.00,
                'sale_price' => 1999.00,
                'discount_type' => DiscountType::Percentage,
                'discount_value' => 6.98,
                'low_stock_threshold' => 5,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => true,
                'status' => ProductStatus::Active,
                'location_availability_type' => LocationAvailabilityType::All,
                'return_policy' => '30-day Dell hassle-free return guarantee.',
                'refund_policy' => '100% money back to original payment method.',
            ],
            imageFilenames: [
                'dell-xps-16-platinum.jpg' => '#334155',
                'dell-xps-16-keyboard.jpg' => '#1e293b',
            ],
            attributesToSync: [$attrProcessor, $attrRam, $attrStorage],
            variants: [
                [
                    'sku' => 'DEL-XPS16-U7-16-512',
                    'name' => 'Dell XPS 16 - Core Ultra 7 / 16GB / 512GB',
                    'attributes' => [
                        'Processor' => 'Intel Core Ultra 7 155H',
                        'RAM' => '16GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 2299.00,
                    'price' => 2149.00,
                    'sale_price' => 1999.00,
                    'stock_quantity' => 18,
                    'low_stock_threshold' => 5,
                    'image' => 'dell-xps-16-platinum.jpg',
                ],
                [
                    'sku' => 'DEL-XPS16-U7-32-1TB',
                    'name' => 'Dell XPS 16 - Core Ultra 7 / 32GB / 1TB',
                    'attributes' => [
                        'Processor' => 'Intel Core Ultra 7 155H',
                        'RAM' => '32GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 2649.00,
                    'price' => 2499.00,
                    'sale_price' => 2349.00,
                    'stock_quantity' => 14,
                    'low_stock_threshold' => 5,
                    'image' => 'dell-xps-16-platinum.jpg',
                ],
                [
                    'sku' => 'DEL-XPS16-U9-32-1TB',
                    'name' => 'Dell XPS 16 - Core Ultra 9 / 32GB / 1TB',
                    'attributes' => [
                        'Processor' => 'Intel Core Ultra 9 185H',
                        'RAM' => '32GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 2999.00,
                    'price' => 2849.00,
                    'sale_price' => 2699.00,
                    'stock_quantity' => 9,
                    'low_stock_threshold' => 5,
                    'image' => 'dell-xps-16-platinum.jpg',
                ],
                [
                    'sku' => 'DEL-XPS16-U9-64-2TB',
                    'name' => 'Dell XPS 16 - Core Ultra 9 / 64GB / 2TB',
                    'attributes' => [
                        'Processor' => 'Intel Core Ultra 9 185H',
                        'RAM' => '64GB',
                        'Storage' => '2TB',
                    ],
                    'mrp' => 3599.00,
                    'price' => 3399.00,
                    'sale_price' => 3199.00,
                    'stock_quantity' => 5,
                    'low_stock_threshold' => 5,
                    'image' => 'dell-xps-16-platinum.jpg',
                ],
            ]
        );

        // 3. Lenovo Legion Pro 7i Gen 9
        $this->seedProduct(
            category: $category,
            brand: $brands['Lenovo'],
            productData: [
                'name' => 'Lenovo Legion Pro 7i Gen 9 (16" Intel) Gaming Laptop',
                'slug' => 'lenovo-legion-pro-7i-gen-9-gaming-laptop',
                'sku' => 'LNV-LEGION-PRO7I',
                'short_description' => 'Esports-ready gaming laptop powered by 14th Gen Intel Core HX processors, NVIDIA GeForce RTX 4080/4090, and AI Legion Coldfront vapor chamber.',
                'description' => "Dominate the competition with the world's most powerful AI-tuned gaming laptop. Armed with Intel Core 14th Gen HX processors, full-power 175W NVIDIA RTX graphics, and Lenovo Legion AI Engine+ with LA-2 chip. The 16-inch 240Hz PureSight Gaming display with 100% DCI-P3 delivers unmatched visual clarity.",
                'specifications' => [
                    'Display' => '16" WQXGA (2560 x 1600) IPS, 240Hz, 100% DCI-P3, 500 nits, Dolby Vision, G-SYNC',
                    'Graphics' => 'NVIDIA GeForce RTX 4080 12GB GDDR6 (175W Maximum TGP)',
                    'Cooling' => 'Legion Coldfront Vapor Chamber with dual 3D fan blades',
                    'Keyboard' => 'Per-Key RGB Legion TrueStrike Keyboard with 100% anti-ghosting',
                    'Battery' => '99.9Wh battery with Super Rapid Charge Pro (330W GaN AC adapter)',
                    'Audio' => '2x 2W Harman Super Linear Speaker System with Nahimic 3D Audio',
                    'Operating System' => 'Windows 11 Home',
                    'Weight' => '2.62 kg (5.78 lbs)',
                    'Warranty' => '2 Year Legion Ultimate Support warranty with 24/7 gamer technician access',
                ],
                'mrp' => 2399.00,
                'retail_price' => 2249.00,
                'sale_price' => 2099.00,
                'discount_type' => DiscountType::Percentage,
                'discount_value' => 6.67,
                'low_stock_threshold' => 5,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => true,
                'status' => ProductStatus::Active,
                'location_availability_type' => LocationAvailabilityType::All,
                'return_policy' => '30-day standard return period.',
                'refund_policy' => 'Fast refund upon product check.',
            ],
            imageFilenames: [
                'lenovo-legion-pro-7i-onyx.jpg' => '#090d16',
                'lenovo-legion-pro-7i-rear.jpg' => '#1e1b4b',
            ],
            attributesToSync: [$attrProcessor, $attrRam, $attrStorage],
            variants: [
                [
                    'sku' => 'LNV-PRO7I-I7-16-1TB',
                    'name' => 'Legion Pro 7i - Core i7 / 16GB / 1TB',
                    'attributes' => [
                        'Processor' => 'Intel Core i7-14700HX',
                        'RAM' => '16GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 2399.00,
                    'price' => 2249.00,
                    'sale_price' => 2099.00,
                    'stock_quantity' => 15,
                    'low_stock_threshold' => 5,
                    'image' => 'lenovo-legion-pro-7i-onyx.jpg',
                ],
                [
                    'sku' => 'LNV-PRO7I-I7-32-1TB',
                    'name' => 'Legion Pro 7i - Core i7 / 32GB / 1TB',
                    'attributes' => [
                        'Processor' => 'Intel Core i7-14700HX',
                        'RAM' => '32GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 2599.00,
                    'price' => 2449.00,
                    'sale_price' => 2299.00,
                    'stock_quantity' => 11,
                    'low_stock_threshold' => 5,
                    'image' => 'lenovo-legion-pro-7i-onyx.jpg',
                ],
                [
                    'sku' => 'LNV-PRO7I-I9-32-1TB',
                    'name' => 'Legion Pro 7i - Core i9 / 32GB / 1TB',
                    'attributes' => [
                        'Processor' => 'Intel Core i9-14900HX',
                        'RAM' => '32GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 2899.00,
                    'price' => 2749.00,
                    'sale_price' => 2599.00,
                    'stock_quantity' => 8,
                    'low_stock_threshold' => 5,
                    'image' => 'lenovo-legion-pro-7i-onyx.jpg',
                ],
                [
                    'sku' => 'LNV-PRO7I-I9-64-2TB',
                    'name' => 'Legion Pro 7i - Core i9 / 64GB / 2TB',
                    'attributes' => [
                        'Processor' => 'Intel Core i9-14900HX',
                        'RAM' => '64GB',
                        'Storage' => '2TB',
                    ],
                    'mrp' => 3449.00,
                    'price' => 3249.00,
                    'sale_price' => 3049.00,
                    'stock_quantity' => 3, // low stock testing
                    'low_stock_threshold' => 5,
                    'image' => 'lenovo-legion-pro-7i-onyx.jpg',
                ],
            ]
        );

        // 4. ASUS ROG Zephyrus G14 (2024) OLED
        $this->seedProduct(
            category: $category,
            brand: $brands['ASUS'],
            productData: [
                'name' => 'ASUS ROG Zephyrus G14 (2024) OLED Gaming Ultrabook',
                'slug' => 'asus-rog-zephyrus-g14-2024-oled',
                'sku' => 'ASU-ROG-G14-OLED',
                'short_description' => 'Ultraportable 14" OLED gaming powerhouse with AMD Ryzen 8000 Hawk Point processors, RTX 4070 graphics, and sleek aluminum unibody.',
                'description' => "Redefining thin-and-light gaming: the 2024 ROG Zephyrus G14 weighs just 1.50 kg and measures 1.59 cm thin. Featuring ROG Nebula OLED 3K 120Hz display with 0.2ms response time, AMD Ryzen 8000 Series AI processors, and Slash Lighting LED lid. High-efficiency tri-fan thermal system ensures whisper-quiet operation under heavy load.",
                'specifications' => [
                    'Display' => '14.0-inch 3K (2880 x 1800) OLED 16:10, 120Hz, 0.2ms response, 100% DCI-P3, G-SYNC',
                    'Graphics' => 'NVIDIA GeForce RTX 4070 8GB GDDR6 (90W TGP with Dynamic Boost)',
                    'Chassis' => 'CNC-machined unibody aluminum with customizable Slash Lighting lid',
                    'Audio' => '4-speaker system (dual force-canceling woofers) with Dolby Atmos and Smart Amp',
                    'Battery' => '73Wh battery with 100W USB Type-C fast charge support',
                    'Ports' => '1x Type-C USB4 40Gbps, 1x USB 3.2 Gen 2 Type-C (DP/PD), 2x USB 3.2 Gen 2 Type-A, HDMI 2.1, MicroSD',
                    'Operating System' => 'Windows 11 Home',
                    'Weight' => '1.50 kg (3.31 lbs)',
                    'Warranty' => '1 Year ASUS Global Warranty with Accidental Damage Protection',
                ],
                'mrp' => 1699.00,
                'retail_price' => 1599.00,
                'sale_price' => 1479.00,
                'discount_type' => DiscountType::Percentage,
                'discount_value' => 7.50,
                'low_stock_threshold' => 5,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => true,
                'status' => ProductStatus::Active,
                'location_availability_type' => LocationAvailabilityType::All,
                'return_policy' => '15-day return policy for sealed hardware.',
                'refund_policy' => 'Standard refund to bank within 5 days.',
            ],
            imageFilenames: [
                'asus-rog-zephyrus-g14-eclipse-gray.jpg' => '#172554',
                'asus-rog-zephyrus-g14-slash-light.jpg' => '#1e1b4b',
            ],
            attributesToSync: [$attrProcessor, $attrRam, $attrStorage],
            variants: [
                [
                    'sku' => 'ASU-G14-R7-16-512',
                    'name' => 'ROG Zephyrus G14 - Ryzen 7 / 16GB / 512GB',
                    'attributes' => [
                        'Processor' => 'AMD Ryzen 7 8845HS',
                        'RAM' => '16GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 1699.00,
                    'price' => 1599.00,
                    'sale_price' => 1479.00,
                    'stock_quantity' => 16,
                    'low_stock_threshold' => 5,
                    'image' => 'asus-rog-zephyrus-g14-eclipse-gray.jpg',
                ],
                [
                    'sku' => 'ASU-G14-R7-16-1TB',
                    'name' => 'ROG Zephyrus G14 - Ryzen 7 / 16GB / 1TB',
                    'attributes' => [
                        'Processor' => 'AMD Ryzen 7 8845HS',
                        'RAM' => '16GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 1849.00,
                    'price' => 1749.00,
                    'sale_price' => 1619.00,
                    'stock_quantity' => 12,
                    'low_stock_threshold' => 5,
                    'image' => 'asus-rog-zephyrus-g14-eclipse-gray.jpg',
                ],
                [
                    'sku' => 'ASU-G14-R9-32-1TB',
                    'name' => 'ROG Zephyrus G14 - Ryzen 9 / 32GB / 1TB',
                    'attributes' => [
                        'Processor' => 'AMD Ryzen 9 8945HS',
                        'RAM' => '32GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 2199.00,
                    'price' => 2099.00,
                    'sale_price' => 1949.00,
                    'stock_quantity' => 8,
                    'low_stock_threshold' => 5,
                    'image' => 'asus-rog-zephyrus-g14-eclipse-gray.jpg',
                ],
                [
                    'sku' => 'ASU-G14-R9-32-2TB',
                    'name' => 'ROG Zephyrus G14 - Ryzen 9 / 32GB / 2TB',
                    'attributes' => [
                        'Processor' => 'AMD Ryzen 9 8945HS',
                        'RAM' => '32GB',
                        'Storage' => '2TB',
                    ],
                    'mrp' => 2449.00,
                    'price' => 2349.00,
                    'sale_price' => 2179.00,
                    'stock_quantity' => 5,
                    'low_stock_threshold' => 5,
                    'image' => 'asus-rog-zephyrus-g14-eclipse-gray.jpg',
                ],
            ]
        );
    }

}

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

class MobilePhoneProductSeeder extends Seeder
{
    use SeedsProductMedia;

    /**
     * Run the database seeds for smartphone and mobile products.
     */
    public function run(): void
    {
        $category = Category::where('name', 'Smartphones & Accessories')->first();
        if (! $category) {
            $parent = Category::firstOrCreate(
                ['slug' => 'consumer-electronics'],
                ['name' => 'Consumer Electronics', 'is_active' => true, 'sort_order' => 1]
            );

            $category = Category::firstOrCreate(
                ['slug' => 'smartphones-accessories'],
                [
                    'parent_id' => $parent->id,
                    'name' => 'Smartphones & Accessories',
                    'description' => 'Flagship 5G smartphones, foldables, and premium accessories.',
                    'is_active' => true,
                    'sort_order' => 1,
                ]
            );
        }

        $brands = [
            'Samsung' => Brand::firstOrCreate(['slug' => 'samsung'], ['name' => 'Samsung', 'is_active' => true]),
            'Apple' => Brand::firstOrCreate(['slug' => 'apple'], ['name' => 'Apple', 'is_active' => true]),
            'Google' => Brand::firstOrCreate(['slug' => 'google'], ['name' => 'Google', 'is_active' => true]),
        ];

        // Ensure Mobile Phone Attributes exist
        $attrColor = Attribute::where('code', 'color')->first();
        $attrRam = Attribute::where('code', 'ram')->first();
        $attrStorage = Attribute::where('code', 'storage')->first();

        // 1. Samsung Galaxy S24 Ultra 5G
        $this->seedProduct(
            category: $category,
            brand: $brands['Samsung'],
            productData: [
                'name' => 'Samsung Galaxy S24 Ultra 5G',
                'slug' => 'samsung-galaxy-s24-ultra-5g',
                'sku' => 'SAM-S24U-5G',
                'short_description' => 'The ultimate Galaxy AI flagship featuring a 200MP camera, built-in S Pen, Titanium frame, and flat 6.8" 2600-nit Dynamic AMOLED 2X display.',
                'description' => "Welcome to the era of mobile AI. With Samsung Galaxy S24 Ultra in your hands, you can unleash whole new levels of creativity, productivity, and possibility. Featuring an aerospace-grade titanium shield, flat 6.8-inch Dynamic AMOLED 2X screen with Corning Gorilla Armor anti-reflective glass, and the legendary 200MP Quad Telephoto camera system.",
                'specifications' => [
                    'Display' => '6.8-inch Dynamic AMOLED 2X, Quad HD+ (3120 x 1440), 1-120Hz LTPO, 2600 nits peak',
                    'Processor' => 'Qualcomm Snapdragon 8 Gen 3 for Galaxy (4nm Octa-core)',
                    'Main Cameras' => '200MP Wide (OIS) + 50MP 5x Telephoto (OIS) + 10MP 3x Telephoto (OIS) + 12MP Ultra-Wide',
                    'Front Camera' => '12MP Dual Pixel AF with 4K 60fps video recording',
                    'Battery' => '5,000 mAh with 45W Fast Charging (65% in 30 mins) & Wireless PowerShare',
                    'Durability' => 'IP68 water and dust resistance, Grade 2 Titanium frame',
                    'Stylus' => 'Integrated low-latency Bluetooth S Pen with Air Command',
                    'AI Features' => 'Circle to Search, Live Translate, Note Assist, ProVisual Engine Generative Edit',
                    'Operating System' => 'Android 14 with One UI 6.1 (7 Generations of OS Upgrades)',
                    'Weight' => '232 g (8.18 oz)',
                    'Warranty' => '1 Year Samsung Authorized Warranty with Concierge Support',
                ],
                'mrp' => 1349.99,
                'retail_price' => 1299.99,
                'sale_price' => 1199.99,
                'discount_type' => DiscountType::Percentage,
                'discount_value' => 7.69,
                'low_stock_threshold' => 5,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => true,
                'status' => ProductStatus::Active,
                'location_availability_type' => LocationAvailabilityType::All,
                'return_policy' => '15-day return or replacement for undamaged devices.',
                'refund_policy' => 'Full refund credited within 3-5 banking days.',
            ],
            imageFilenames: [
                'samsung-s24-ultra-titanium.jpg' => '#1e293b',
                'samsung-s24-ultra-spen.jpg' => '#0f172a',
            ],
            attributesToSync: [$attrColor, $attrRam, $attrStorage],
            variants: [
                [
                    'sku' => 'SAM-S24U-SIL-12-256',
                    'name' => 'Galaxy S24 Ultra - Titanium Silver / 12GB / 256GB',
                    'attributes' => [
                        'Color' => 'Titanium Silver',
                        'RAM' => '12GB',
                        'Storage' => '256GB',
                    ],
                    'mrp' => 1349.99,
                    'price' => 1299.99,
                    'sale_price' => 1199.99,
                    'stock_quantity' => 22,
                    'low_stock_threshold' => 5,
                    'image' => 'samsung-s24-ultra-titanium.jpg',
                ],
                [
                    'sku' => 'SAM-S24U-SIL-12-512',
                    'name' => 'Galaxy S24 Ultra - Titanium Silver / 12GB / 512GB',
                    'attributes' => [
                        'Color' => 'Titanium Silver',
                        'RAM' => '12GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 1469.99,
                    'price' => 1419.99,
                    'sale_price' => 1319.99,
                    'stock_quantity' => 15,
                    'low_stock_threshold' => 5,
                    'image' => 'samsung-s24-ultra-titanium.jpg',
                ],
                [
                    'sku' => 'SAM-S24U-BLK-12-256',
                    'name' => 'Galaxy S24 Ultra - Midnight Black / 12GB / 256GB',
                    'attributes' => [
                        'Color' => 'Midnight Black',
                        'RAM' => '12GB',
                        'Storage' => '256GB',
                    ],
                    'mrp' => 1349.99,
                    'price' => 1299.99,
                    'sale_price' => 1199.99,
                    'stock_quantity' => 25,
                    'low_stock_threshold' => 5,
                    'image' => 'samsung-s24-ultra-titanium.jpg',
                ],
                [
                    'sku' => 'SAM-S24U-BLK-12-512',
                    'name' => 'Galaxy S24 Ultra - Midnight Black / 12GB / 512GB',
                    'attributes' => [
                        'Color' => 'Midnight Black',
                        'RAM' => '12GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 1469.99,
                    'price' => 1419.99,
                    'sale_price' => 1319.99,
                    'stock_quantity' => 18,
                    'low_stock_threshold' => 5,
                    'image' => 'samsung-s24-ultra-titanium.jpg',
                ],
                [
                    'sku' => 'SAM-S24U-BLK-16-1TB',
                    'name' => 'Galaxy S24 Ultra - Midnight Black / 16GB / 1TB',
                    'attributes' => [
                        'Color' => 'Midnight Black',
                        'RAM' => '16GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 1719.99,
                    'price' => 1659.99,
                    'sale_price' => 1549.99,
                    'stock_quantity' => 5, // low stock testing
                    'low_stock_threshold' => 5,
                    'image' => 'samsung-s24-ultra-titanium.jpg',
                ],
                [
                    'sku' => 'SAM-S24U-BLU-12-256',
                    'name' => 'Galaxy S24 Ultra - Ocean Blue / 12GB / 256GB',
                    'attributes' => [
                        'Color' => 'Ocean Blue',
                        'RAM' => '12GB',
                        'Storage' => '256GB',
                    ],
                    'mrp' => 1349.99,
                    'price' => 1299.99,
                    'sale_price' => 1199.99,
                    'stock_quantity' => 14,
                    'low_stock_threshold' => 5,
                    'image' => 'samsung-s24-ultra-titanium.jpg',
                ],
                [
                    'sku' => 'SAM-S24U-BLU-12-512',
                    'name' => 'Galaxy S24 Ultra - Ocean Blue / 12GB / 512GB',
                    'attributes' => [
                        'Color' => 'Ocean Blue',
                        'RAM' => '12GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 1469.99,
                    'price' => 1419.99,
                    'sale_price' => 1319.99,
                    'stock_quantity' => 8,
                    'low_stock_threshold' => 5,
                    'image' => 'samsung-s24-ultra-titanium.jpg',
                ],
            ]
        );

        // 2. Apple iPhone 16 Pro Max
        $this->seedProduct(
            category: $category,
            brand: $brands['Apple'],
            productData: [
                'name' => 'Apple iPhone 16 Pro Max 5G',
                'slug' => 'apple-iphone-16-pro-max-5g',
                'sku' => 'APL-IP16PM',
                'short_description' => 'Forged in titanium with industry-leading A18 Pro chip, 48MP Fusion camera with 4K 120 fps Dolby Vision, and dedicated Camera Control button.',
                'description' => "iPhone 16 Pro Max. Featuring a stunning titanium design with thinner borders, a larger 6.9-inch Super Retina XDR display, and Ceramic Shield front that is 2x tougher than any smartphone glass. Powered by the A18 Pro chip designed for Apple Intelligence, and featuring an advanced camera system with 5x Telephoto and 48MP Ultra Wide lenses.",
                'specifications' => [
                    'Display' => '6.9-inch Super Retina XDR OLED (2868 x 1320), ProMotion 120Hz, 2000 nits outdoor peak',
                    'Processor' => 'Apple A18 Pro (6-core CPU, 6-core GPU, 16-core Neural Engine)',
                    'Cameras' => '48MP Fusion (2nd gen sensor-shift OIS) + 48MP Ultra Wide + 12MP 5x Telephoto',
                    'Video' => '4K 120 fps Dolby Vision recording, Studio-quality 4-mic array, Spatial Audio',
                    'Controls' => 'Tactile Camera Control sapphire crystal switch with haptic feedback',
                    'Battery' => 'Up to 33 hours video playback, MagSafe wireless fast charging up to 25W',
                    'Durability' => 'Grade 5 Titanium frame, Textured matte glass back, IP68 water resistance',
                    'Operating System' => 'iOS 18 with Apple Intelligence built-in',
                    'Weight' => '227 g (8.01 oz)',
                    'Warranty' => '1 Year Apple Limited Warranty + AppleCare+ eligible',
                ],
                'mrp' => 1299.00,
                'retail_price' => 1199.00,
                'sale_price' => 1149.00,
                'discount_type' => DiscountType::Percentage,
                'discount_value' => 4.17,
                'low_stock_threshold' => 5,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => true,
                'status' => ProductStatus::Active,
                'location_availability_type' => LocationAvailabilityType::All,
                'return_policy' => '14-day Apple official return policy.',
                'refund_policy' => 'Instant refund upon warehouse verification.',
            ],
            imageFilenames: [
                'apple-iphone-16-pro-max-natural.jpg' => '#334155',
                'apple-iphone-16-pro-max-camera.jpg' => '#0f172a',
            ],
            attributesToSync: [$attrColor, $attrRam, $attrStorage],
            variants: [
                [
                    'sku' => 'APL-IP16PM-NAT-8-256',
                    'name' => 'iPhone 16 Pro Max - Natural Titanium / 8GB / 256GB',
                    'attributes' => [
                        'Color' => 'Natural Titanium',
                        'RAM' => '8GB',
                        'Storage' => '256GB',
                    ],
                    'mrp' => 1299.00,
                    'price' => 1199.00,
                    'sale_price' => 1149.00,
                    'stock_quantity' => 24,
                    'low_stock_threshold' => 5,
                    'image' => 'apple-iphone-16-pro-max-natural.jpg',
                ],
                [
                    'sku' => 'APL-IP16PM-NAT-8-512',
                    'name' => 'iPhone 16 Pro Max - Natural Titanium / 8GB / 512GB',
                    'attributes' => [
                        'Color' => 'Natural Titanium',
                        'RAM' => '8GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 1499.00,
                    'price' => 1399.00,
                    'sale_price' => 1349.00,
                    'stock_quantity' => 18,
                    'low_stock_threshold' => 5,
                    'image' => 'apple-iphone-16-pro-max-natural.jpg',
                ],
                [
                    'sku' => 'APL-IP16PM-NAT-8-1TB',
                    'name' => 'iPhone 16 Pro Max - Natural Titanium / 8GB / 1TB',
                    'attributes' => [
                        'Color' => 'Natural Titanium',
                        'RAM' => '8GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 1699.00,
                    'price' => 1599.00,
                    'sale_price' => 1549.00,
                    'stock_quantity' => 9,
                    'low_stock_threshold' => 5,
                    'image' => 'apple-iphone-16-pro-max-natural.jpg',
                ],
                [
                    'sku' => 'APL-IP16PM-BLK-8-256',
                    'name' => 'iPhone 16 Pro Max - Space Black / 8GB / 256GB',
                    'attributes' => [
                        'Color' => 'Space Black',
                        'RAM' => '8GB',
                        'Storage' => '256GB',
                    ],
                    'mrp' => 1299.00,
                    'price' => 1199.00,
                    'sale_price' => 1149.00,
                    'stock_quantity' => 26,
                    'low_stock_threshold' => 5,
                    'image' => 'apple-iphone-16-pro-max-natural.jpg',
                ],
                [
                    'sku' => 'APL-IP16PM-BLK-8-512',
                    'name' => 'iPhone 16 Pro Max - Space Black / 8GB / 512GB',
                    'attributes' => [
                        'Color' => 'Space Black',
                        'RAM' => '8GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 1499.00,
                    'price' => 1399.00,
                    'sale_price' => 1349.00,
                    'stock_quantity' => 16,
                    'low_stock_threshold' => 5,
                    'image' => 'apple-iphone-16-pro-max-natural.jpg',
                ],
                [
                    'sku' => 'APL-IP16PM-BLK-8-1TB',
                    'name' => 'iPhone 16 Pro Max - Space Black / 8GB / 1TB',
                    'attributes' => [
                        'Color' => 'Space Black',
                        'RAM' => '8GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 1699.00,
                    'price' => 1599.00,
                    'sale_price' => 1549.00,
                    'stock_quantity' => 7,
                    'low_stock_threshold' => 5,
                    'image' => 'apple-iphone-16-pro-max-natural.jpg',
                ],
                [
                    'sku' => 'APL-IP16PM-DES-8-256',
                    'name' => 'iPhone 16 Pro Max - Desert Titanium / 8GB / 256GB',
                    'attributes' => [
                        'Color' => 'Desert Titanium',
                        'RAM' => '8GB',
                        'Storage' => '256GB',
                    ],
                    'mrp' => 1299.00,
                    'price' => 1199.00,
                    'sale_price' => 1149.00,
                    'stock_quantity' => 20,
                    'low_stock_threshold' => 5,
                    'image' => 'apple-iphone-16-pro-max-natural.jpg',
                ],
                [
                    'sku' => 'APL-IP16PM-DES-8-512',
                    'name' => 'iPhone 16 Pro Max - Desert Titanium / 8GB / 512GB',
                    'attributes' => [
                        'Color' => 'Desert Titanium',
                        'RAM' => '8GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 1499.00,
                    'price' => 1399.00,
                    'sale_price' => 1349.00,
                    'stock_quantity' => 12,
                    'low_stock_threshold' => 5,
                    'image' => 'apple-iphone-16-pro-max-natural.jpg',
                ],
                [
                    'sku' => 'APL-IP16PM-DES-8-1TB',
                    'name' => 'iPhone 16 Pro Max - Desert Titanium / 8GB / 1TB',
                    'attributes' => [
                        'Color' => 'Desert Titanium',
                        'RAM' => '8GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 1699.00,
                    'price' => 1599.00,
                    'sale_price' => 1549.00,
                    'stock_quantity' => 4, // low stock testing
                    'low_stock_threshold' => 5,
                    'image' => 'apple-iphone-16-pro-max-natural.jpg',
                ],
            ]
        );

        // 3. Google Pixel 9 Pro 5G
        $this->seedProduct(
            category: $category,
            brand: $brands['Google'],
            productData: [
                'name' => 'Google Pixel 9 Pro 5G',
                'slug' => 'google-pixel-9-pro-5g',
                'sku' => 'GGL-PIX9PRO-5G',
                'short_description' => 'The most powerful Pixel yet with Google Tensor G4, pro triple rear camera system with 30x Super Res Zoom, and Gemini AI built in.',
                'description' => "Engineered by Google, Pixel 9 Pro brings you extraordinary smartphone performance with 16GB of high-speed RAM, the revolutionary Google Tensor G4 silicon, and a brilliant 6.3-inch Super Actua display reaching an industry-leading 3000 nits. Includes 7 full years of Android OS and Feature Drop updates.",
                'specifications' => [
                    'Display' => '6.3-inch Super Actua LTPO OLED (1280 x 2856), 1-120Hz, 3000 nits peak, Victus 2',
                    'Processor' => 'Google Tensor G4 with Titan M2 security coprocessor',
                    'Cameras' => '50MP Octa PD Wide + 48MP Quad PD Ultrawide with Macro + 48MP 5x Telephoto (30x Super Res Zoom)',
                    'Front Camera' => '42MP Dual PD Selfie with ultra-wide 103-degree field of view',
                    'Battery' => '4,700 mAh, 24+ hour battery life, 27W wired fast charge & Fast wireless charging',
                    'AI Features' => 'Gemini Live, Add Me, Best Take, Audio Magic Eraser, Pixel Studio generative design',
                    'Security' => '7 years of OS, security, and Pixel Feature Drop updates',
                    'Durability' => 'IP68 water and dust resistance, Polished metal frame with satin glass back',
                    'Operating System' => 'Android 14 (Upgradeable to latest Android version)',
                    'Weight' => '199 g (7.02 oz)',
                    'Warranty' => '2 Year Google Official Hardware Warranty',
                ],
                'mrp' => 1099.00,
                'retail_price' => 999.00,
                'sale_price' => 899.00,
                'discount_type' => DiscountType::Percentage,
                'discount_value' => 10.01,
                'low_stock_threshold' => 5,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => true,
                'status' => ProductStatus::Active,
                'location_availability_type' => LocationAvailabilityType::All,
                'return_policy' => '15-day return policy for unopened items.',
                'refund_policy' => '100% refund processed within 5 business days.',
            ],
            imageFilenames: [
                'google-pixel-9-pro-obsidian.jpg' => '#1e293b',
                'google-pixel-9-pro-camera-bar.jpg' => '#0f172a',
            ],
            attributesToSync: [$attrColor, $attrRam, $attrStorage],
            variants: [
                [
                    'sku' => 'GGL-PIX9P-OBS-16-128',
                    'name' => 'Pixel 9 Pro - Obsidian / 16GB / 128GB',
                    'attributes' => [
                        'Color' => 'Obsidian',
                        'RAM' => '16GB',
                        'Storage' => '128GB',
                    ],
                    'mrp' => 1099.00,
                    'price' => 999.00,
                    'sale_price' => 899.00,
                    'stock_quantity' => 20,
                    'low_stock_threshold' => 5,
                    'image' => 'google-pixel-9-pro-obsidian.jpg',
                ],
                [
                    'sku' => 'GGL-PIX9P-OBS-16-256',
                    'name' => 'Pixel 9 Pro - Obsidian / 16GB / 256GB',
                    'attributes' => [
                        'Color' => 'Obsidian',
                        'RAM' => '16GB',
                        'Storage' => '256GB',
                    ],
                    'mrp' => 1199.00,
                    'price' => 1099.00,
                    'sale_price' => 999.00,
                    'stock_quantity' => 16,
                    'low_stock_threshold' => 5,
                    'image' => 'google-pixel-9-pro-obsidian.jpg',
                ],
                [
                    'sku' => 'GGL-PIX9P-OBS-16-512',
                    'name' => 'Pixel 9 Pro - Obsidian / 16GB / 512GB',
                    'attributes' => [
                        'Color' => 'Obsidian',
                        'RAM' => '16GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 1319.00,
                    'price' => 1219.00,
                    'sale_price' => 1119.00,
                    'stock_quantity' => 10,
                    'low_stock_threshold' => 5,
                    'image' => 'google-pixel-9-pro-obsidian.jpg',
                ],
                [
                    'sku' => 'GGL-PIX9P-POR-16-128',
                    'name' => 'Pixel 9 Pro - Porcelain / 16GB / 128GB',
                    'attributes' => [
                        'Color' => 'Porcelain',
                        'RAM' => '16GB',
                        'Storage' => '128GB',
                    ],
                    'mrp' => 1099.00,
                    'price' => 999.00,
                    'sale_price' => 899.00,
                    'stock_quantity' => 18,
                    'low_stock_threshold' => 5,
                    'image' => 'google-pixel-9-pro-obsidian.jpg',
                ],
                [
                    'sku' => 'GGL-PIX9P-POR-16-256',
                    'name' => 'Pixel 9 Pro - Porcelain / 16GB / 256GB',
                    'attributes' => [
                        'Color' => 'Porcelain',
                        'RAM' => '16GB',
                        'Storage' => '256GB',
                    ],
                    'mrp' => 1199.00,
                    'price' => 1099.00,
                    'sale_price' => 999.00,
                    'stock_quantity' => 14,
                    'low_stock_threshold' => 5,
                    'image' => 'google-pixel-9-pro-obsidian.jpg',
                ],
                [
                    'sku' => 'GGL-PIX9P-POR-16-512',
                    'name' => 'Pixel 9 Pro - Porcelain / 16GB / 512GB',
                    'attributes' => [
                        'Color' => 'Porcelain',
                        'RAM' => '16GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 1319.00,
                    'price' => 1219.00,
                    'sale_price' => 1119.00,
                    'stock_quantity' => 6,
                    'low_stock_threshold' => 5,
                    'image' => 'google-pixel-9-pro-obsidian.jpg',
                ],
            ]
        );

        // 4. Samsung Galaxy Z Fold 6
        $this->seedProduct(
            category: $category,
            brand: $brands['Samsung'],
            productData: [
                'name' => 'Samsung Galaxy Z Fold 6 5G',
                'slug' => 'samsung-galaxy-z-fold-6-5g',
                'sku' => 'SAM-ZFOLD6-5G',
                'short_description' => 'Next-gen foldable smartphone with dual AMOLED screens, Snapdragon 8 Gen 3, enhanced Armor Aluminum hinge, and Galaxy AI multi-window productivity.',
                'description' => "Thinner, lighter, and more durable than ever before. Samsung Galaxy Z Fold 6 offers a pocket-sized 6.3-inch phone when folded that unfolds into an expansive 7.6-inch tablet-grade Dynamic AMOLED 2X display. Equipped with dual-rail FlexHinge, S Pen compatibility, and immersive Multi-Active Window multitasking.",
                'specifications' => [
                    'Main Display' => '7.6-inch Dynamic AMOLED 2X Foldable (2160 x 1856), 1-120Hz adaptive, 2600 nits peak',
                    'Cover Display' => '6.3-inch Dynamic AMOLED 2X (2376 x 968), 120Hz adaptive, 2600 nits, Gorilla Glass Victus 2',
                    'Processor' => 'Qualcomm Snapdragon 8 Gen 3 for Galaxy (4nm)',
                    'Cameras' => '50MP Wide (Dual Pixel AF, OIS) + 12MP Ultra-Wide + 10MP 3x Telephoto (OIS)',
                    'Under-Display Camera' => '4MP Under Display Camera for uninterrupted full-screen viewing',
                    'Battery' => '4,400 mAh dual battery with 25W Fast Charge and Fast Wireless Charging 2.0',
                    'Durability' => 'IP48 water resistance rating, Enhanced Armor Aluminum frame and hinge housing',
                    'Operating System' => 'Android 14 with One UI 6.1.1 (7 Years of security & OS updates)',
                    'Weight' => '239 g (8.43 oz)',
                    'Warranty' => '1 Year Samsung Care+ Complimentary accidental damage cover included',
                ],
                'mrp' => 1999.99,
                'retail_price' => 1899.99,
                'sale_price' => 1749.99,
                'discount_type' => DiscountType::Percentage,
                'discount_value' => 7.89,
                'low_stock_threshold' => 5,
                'stock_visibility' => StockVisibility::Badge,
                'has_variants' => true,
                'status' => ProductStatus::Active,
                'location_availability_type' => LocationAvailabilityType::All,
                'return_policy' => '15-day return policy.',
                'refund_policy' => 'Direct refund upon inspection.',
            ],
            imageFilenames: [
                'samsung-galaxy-z-fold-6-silver.jpg' => '#334155',
                'samsung-galaxy-z-fold-6-unfolded.jpg' => '#1e1b4b',
            ],
            attributesToSync: [$attrColor, $attrRam, $attrStorage],
            variants: [
                [
                    'sku' => 'SAM-ZF6-SIL-12-256',
                    'name' => 'Galaxy Z Fold 6 - Titanium Silver / 12GB / 256GB',
                    'attributes' => [
                        'Color' => 'Titanium Silver',
                        'RAM' => '12GB',
                        'Storage' => '256GB',
                    ],
                    'mrp' => 1999.99,
                    'price' => 1899.99,
                    'sale_price' => 1749.99,
                    'stock_quantity' => 12,
                    'low_stock_threshold' => 5,
                    'image' => 'samsung-galaxy-z-fold-6-silver.jpg',
                ],
                [
                    'sku' => 'SAM-ZF6-SIL-12-512',
                    'name' => 'Galaxy Z Fold 6 - Titanium Silver / 12GB / 512GB',
                    'attributes' => [
                        'Color' => 'Titanium Silver',
                        'RAM' => '12GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 2119.99,
                    'price' => 2019.99,
                    'sale_price' => 1869.99,
                    'stock_quantity' => 9,
                    'low_stock_threshold' => 5,
                    'image' => 'samsung-galaxy-z-fold-6-silver.jpg',
                ],
                [
                    'sku' => 'SAM-ZF6-BLK-12-256',
                    'name' => 'Galaxy Z Fold 6 - Midnight Black / 12GB / 256GB',
                    'attributes' => [
                        'Color' => 'Midnight Black',
                        'RAM' => '12GB',
                        'Storage' => '256GB',
                    ],
                    'mrp' => 1999.99,
                    'price' => 1899.99,
                    'sale_price' => 1749.99,
                    'stock_quantity' => 15,
                    'low_stock_threshold' => 5,
                    'image' => 'samsung-galaxy-z-fold-6-silver.jpg',
                ],
                [
                    'sku' => 'SAM-ZF6-BLK-12-512',
                    'name' => 'Galaxy Z Fold 6 - Midnight Black / 12GB / 512GB',
                    'attributes' => [
                        'Color' => 'Midnight Black',
                        'RAM' => '12GB',
                        'Storage' => '512GB',
                    ],
                    'mrp' => 2119.99,
                    'price' => 2019.99,
                    'sale_price' => 1869.99,
                    'stock_quantity' => 10,
                    'low_stock_threshold' => 5,
                    'image' => 'samsung-galaxy-z-fold-6-silver.jpg',
                ],
                [
                    'sku' => 'SAM-ZF6-BLK-12-1TB',
                    'name' => 'Galaxy Z Fold 6 - Midnight Black / 12GB / 1TB',
                    'attributes' => [
                        'Color' => 'Midnight Black',
                        'RAM' => '12GB',
                        'Storage' => '1TB',
                    ],
                    'mrp' => 2359.99,
                    'price' => 2259.99,
                    'sale_price' => 2099.99,
                    'stock_quantity' => 4, // low stock testing
                    'low_stock_threshold' => 5,
                    'image' => 'samsung-galaxy-z-fold-6-silver.jpg',
                ],
            ]
        );
    }
}

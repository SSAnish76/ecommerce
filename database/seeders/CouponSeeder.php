<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\Coupon\CouponApplyTo;
use App\Enums\Coupon\CouponType;
use App\Models\Category;
use App\Models\Collection;
use App\Models\Coupon;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class CouponSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create or ensure standard collections exist across all types
        $trendingCollection = Collection::updateOrCreate(
            ['slug' => 'trending'],
            [
                'name' => 'Trending Now',
                'type' => \App\Enums\Collection\CollectionType::Product,
                'description' => 'Fast-moving, popular catalog items',
                'is_active' => true,
            ]
        );

        $discountedCollection = Collection::updateOrCreate(
            ['slug' => 'special-deals'],
            [
                'name' => 'Special Deals',
                'type' => \App\Enums\Collection\CollectionType::Product,
                'description' => 'Exclusive seasonal discounted items',
                'is_active' => true,
            ]
        );

        $brandCollection = Collection::updateOrCreate(
            ['slug' => 'featured-brands'],
            [
                'name' => 'Featured Flagship Brands',
                'type' => \App\Enums\Collection\CollectionType::Brand,
                'description' => 'Handpicked premium brand partners and manufacturers',
                'is_active' => true,
            ]
        );

        $categoryCollection = Collection::updateOrCreate(
            ['slug' => 'top-categories'],
            [
                'name' => 'Explore Top Categories',
                'type' => \App\Enums\Collection\CollectionType::Category,
                'description' => 'Core shopping departments and curated taxonomy',
                'is_active' => true,
            ]
        );

        // Attach random products to product collections
        $products = Product::limit(10)->get();
        if ($products->isNotEmpty()) {
            $trendingCollection->products()->syncWithoutDetaching($products->take(5)->pluck('id'));
            $discountedCollection->products()->syncWithoutDetaching($products->skip(3)->take(4)->pluck('id'));
        }

        // Attach brands to brand collection
        $brands = \App\Models\Brand::limit(4)->get();
        if ($brands->isNotEmpty()) {
            $brandCollection->brands()->syncWithoutDetaching($brands->pluck('id'));
        }

        // Attach categories to category collection
        $categories = Category::limit(4)->get();
        if ($categories->isNotEmpty()) {
            $categoryCollection->categories()->syncWithoutDetaching($categories->pluck('id'));
        }

        $firstCategory = Category::first();
        $sampleProducts = Product::limit(3)->get();

        // 2. Create rich variety of sample coupons
        $now = Carbon::now();

        // A. Storewide Percentage Coupon
        $coupon1 = Coupon::updateOrCreate(
            ['code' => 'WELCOME10'],
            [
                'name' => 'New Customer Welcome',
                'description' => '10% discount across the entire catalog on orders of 250 or more.',
                'type' => CouponType::Percentage,
                'value' => 10.00,
                'min_order_amount' => 250.00,
                'max_discount_amount' => 100.00,
                'applies_to' => CouponApplyTo::All,
                'usage_limit' => 500,
                'usage_limit_per_customer' => 1,
                'times_used' => 12,
                'starts_at' => $now->copy()->subDays(5),
                'expires_at' => $now->copy()->addDays(90),
                'is_active' => true,
            ]
        );

        // B. Storewide Fixed Amount Coupon
        $coupon2 = Coupon::updateOrCreate(
            ['code' => 'SAVE50'],
            [
                'name' => 'Instant Savings $50 Off',
                'description' => 'Flat $50 deduction on cart orders over $300.',
                'type' => CouponType::Fixed,
                'value' => 50.00,
                'min_order_amount' => 300.00,
                'max_discount_amount' => null,
                'applies_to' => CouponApplyTo::All,
                'usage_limit' => 200,
                'usage_limit_per_customer' => 2,
                'times_used' => 38,
                'starts_at' => $now->copy()->subDays(2),
                'expires_at' => $now->copy()->addDays(45),
                'is_active' => true,
            ]
        );

        // C. Category-Specific Coupon
        $coupon3 = Coupon::updateOrCreate(
            ['code' => 'CAT20'],
            [
                'name' => 'Category Super Sale',
                'description' => '20% off eligible products in featured category.',
                'type' => CouponType::Percentage,
                'value' => 20.00,
                'min_order_amount' => 100.00,
                'max_discount_amount' => 150.00,
                'applies_to' => CouponApplyTo::Categories,
                'usage_limit' => 100,
                'usage_limit_per_customer' => 1,
                'times_used' => 5,
                'starts_at' => $now->copy()->subDays(1),
                'expires_at' => $now->copy()->addDays(30),
                'is_active' => true,
            ]
        );
        if ($firstCategory) {
            $coupon3->categories()->syncWithoutDetaching([$firstCategory->id]);
        }

        // D. Collection-Specific Coupon
        $coupon4 = Coupon::updateOrCreate(
            ['code' => 'TRENDING15'],
            [
                'name' => 'Trending Collection 15% Off',
                'description' => 'Special promotion for items in the Trending Now collection.',
                'type' => CouponType::Percentage,
                'value' => 15.00,
                'min_order_amount' => 0.00,
                'max_discount_amount' => 75.00,
                'applies_to' => CouponApplyTo::Collections,
                'usage_limit' => 300,
                'usage_limit_per_customer' => 1,
                'times_used' => 21,
                'starts_at' => $now->copy()->subDays(3),
                'expires_at' => $now->copy()->addDays(60),
                'is_active' => true,
            ]
        );
        $coupon4->collections()->syncWithoutDetaching([$trendingCollection->id]);

        // E. Specific Products Coupon
        if ($sampleProducts->isNotEmpty()) {
            $coupon5 = Coupon::updateOrCreate(
                ['code' => 'VIPPROMO'],
                [
                    'name' => 'Exclusive Selected Products Discount',
                    'description' => 'Flat $30 discount on designated flagship items.',
                    'type' => CouponType::Fixed,
                    'value' => 30.00,
                    'min_order_amount' => 50.00,
                    'max_discount_amount' => null,
                    'applies_to' => CouponApplyTo::Products,
                    'usage_limit' => 50,
                    'usage_limit_per_customer' => 1,
                    'times_used' => 9,
                    'starts_at' => $now->copy()->subDays(10),
                    'expires_at' => $now->copy()->addDays(20),
                    'is_active' => true,
                ]
            );
            $coupon5->products()->syncWithoutDetaching($sampleProducts->pluck('id'));
        }

        // F. Expired Coupon (For visual status testing)
        Coupon::updateOrCreate(
            ['code' => 'PAST2025'],
            [
                'name' => 'Last Season Clearance',
                'description' => 'Expired campaign voucher.',
                'type' => CouponType::Percentage,
                'value' => 30.00,
                'min_order_amount' => 50.00,
                'max_discount_amount' => 100.00,
                'applies_to' => CouponApplyTo::All,
                'usage_limit' => 50,
                'usage_limit_per_customer' => 1,
                'times_used' => 50,
                'starts_at' => $now->copy()->subMonths(2),
                'expires_at' => $now->copy()->subMonth(),
                'is_active' => true,
            ]
        );

        // G. Future Scheduled Coupon
        Coupon::updateOrCreate(
            ['code' => 'BLACKFRIDAY'],
            [
                'name' => 'Black Friday Early Access',
                'description' => 'Upcoming holiday special countdown.',
                'type' => CouponType::Percentage,
                'value' => 40.00,
                'min_order_amount' => 200.00,
                'max_discount_amount' => 300.00,
                'applies_to' => CouponApplyTo::All,
                'usage_limit' => 1000,
                'usage_limit_per_customer' => 1,
                'times_used' => 0,
                'starts_at' => $now->copy()->addDays(14),
                'expires_at' => $now->copy()->addDays(21),
                'is_active' => true,
            ]
        );
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Attribute;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Database\Seeders\AttributeSeeder;
use Database\Seeders\BrandSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\ComputerProductSeeder;
use Database\Seeders\MobilePhoneProductSeeder;
use Database\Seeders\ProductSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComputerAndMobilePhoneSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(BrandSeeder::class);
        $this->seed(CategorySeeder::class);
        $this->seed(AttributeSeeder::class);
    }

    /**
     * Test computer products are seeded with processor, ram, and storage variants.
     */
    public function test_computer_products_seeded_with_valid_variants_and_relationships(): void
    {
        $this->seed(ComputerProductSeeder::class);

        $macbook = Product::where('sku', 'APL-MBP16-M3')->with(['variants.attributeValues', 'attributes', 'attributeValues', 'brand', 'category'])->first();
        $this->assertNotNull($macbook);
        $this->assertSame('Apple', $macbook->brand->name);
        $this->assertSame('Laptops & Computers', $macbook->category->name);
        $this->assertTrue($macbook->has_variants);
        $this->assertCount(5, $macbook->variants);
        $this->assertGreaterThan(0, $macbook->stock_quantity);

        // Verify attributes
        $attributeCodes = $macbook->attributes->pluck('code')->all();
        $this->assertContains('processor', $attributeCodes);
        $this->assertContains('ram', $attributeCodes);
        $this->assertContains('storage', $attributeCodes);

        // Verify variant consistency
        foreach ($macbook->variants as $variant) {
            $this->assertNotEmpty($variant->sku);
            $this->assertNotNull($variant->attributes);
            $this->assertArrayHasKey('Processor', $variant->attributes);
            $this->assertArrayHasKey('RAM', $variant->attributes);
            $this->assertArrayHasKey('Storage', $variant->attributes);
            $this->assertGreaterThan(0, $variant->price);
            $this->assertGreaterThan(0, $variant->stock_quantity);
            $this->assertNotEmpty($variant->attributeValues);
        }

        // Verify other computer brands
        $this->assertDatabaseHas('products', ['sku' => 'DEL-XPS16-9640']);
        $this->assertDatabaseHas('products', ['sku' => 'LNV-LEGION-PRO7I']);
        $this->assertDatabaseHas('products', ['sku' => 'ASU-ROG-G14-OLED']);
    }

    /**
     * Test mobile phone products are seeded with color, ram, and storage variants.
     */
    public function test_mobile_phone_products_seeded_with_valid_variants_and_relationships(): void
    {
        $this->seed(MobilePhoneProductSeeder::class);

        $s24 = Product::where('sku', 'SAM-S24U-5G')->with(['variants.attributeValues', 'attributes', 'attributeValues', 'brand', 'category'])->first();
        $this->assertNotNull($s24);
        $this->assertSame('Samsung', $s24->brand->name);
        $this->assertSame('Smartphones & Accessories', $s24->category->name);
        $this->assertTrue($s24->has_variants);
        $this->assertCount(7, $s24->variants);
        $this->assertSame((int) $s24->variants()->sum('stock_quantity'), (int) $s24->stock_quantity);

        // Verify attributes
        $attributeCodes = $s24->attributes->pluck('code')->all();
        $this->assertContains('color', $attributeCodes);
        $this->assertContains('ram', $attributeCodes);
        $this->assertContains('storage', $attributeCodes);

        // Verify variant data
        foreach ($s24->variants as $variant) {
            $this->assertNotEmpty($variant->sku);
            $this->assertNotNull($variant->attributes);
            $this->assertArrayHasKey('Color', $variant->attributes);
            $this->assertArrayHasKey('RAM', $variant->attributes);
            $this->assertArrayHasKey('Storage', $variant->attributes);
            $this->assertGreaterThan(0, $variant->price);
            $this->assertGreaterThan(0, $variant->stock_quantity);
            $this->assertNotEmpty($variant->attributeValues);
        }

        // Verify other phones
        $this->assertDatabaseHas('products', ['sku' => 'APL-IP16PM']);
        $this->assertDatabaseHas('products', ['sku' => 'GGL-PIX9PRO-5G']);
        $this->assertDatabaseHas('products', ['sku' => 'SAM-ZFOLD6-5G']);
    }

    /**
     * Test seeders are completely idempotent and safe to run multiple times without duplicating SKUs.
     */
    public function test_product_seeder_is_idempotent(): void
    {
        $this->seed(ProductSeeder::class);
        $firstCount = Product::count();
        $firstVariantCount = ProductVariant::count();

        // Seed again
        $this->seed(ProductSeeder::class);
        $secondCount = Product::count();
        $secondVariantCount = ProductVariant::count();

        $this->assertSame($firstCount, $secondCount);
        $this->assertSame($firstVariantCount, $secondVariantCount);

        // Ensure no duplicate SKUs
        $duplicateSkus = ProductVariant::select('sku')
            ->groupBy('sku')
            ->havingRaw('count(*) > 1')
            ->pluck('sku');
        $this->assertEmpty($duplicateSkus);
    }

    /**
     * Test user product API returns full variant and attribute details for customer frontend.
     */
    public function test_user_product_api_returns_variants_and_attributes(): void
    {
        $this->seed(ProductSeeder::class);

        $response = $this->getJson(route('api.user.products.show', 'apple-macbook-pro-16-m3'));
        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.sku', 'APL-MBP16-M3');

        $data = $response->json('data');
        $this->assertNotEmpty($data['variants']);
        $this->assertNotEmpty($data['attributes']);
        $this->assertNotEmpty($data['images']);
    }

    /**
     * Test customer product detail shop page renders with variants.
     */
    public function test_shop_detail_page_loads_with_variants(): void
    {
        $this->seed(ProductSeeder::class);

        $product = Product::where('sku', 'SAM-S24U-5G')->firstOrFail();

        $response = $this->get(route('shop.product', $product));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Shop/ProductDetail')
            ->has('product.variants', 7)
            ->has('product.attributes', 3)
        );
    }
}

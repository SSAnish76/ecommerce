<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\MediaFile;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CatalogManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->adminUser = User::where('email', 'admin@example.com')->firstOrFail();
    }

    public function test_admin_can_view_brands_index(): void
    {
        Brand::factory()->count(3)->create();

        $response = $this->actingAs($this->adminUser)->get('/admin/brands');

        $response->assertStatus(200);
    }

    public function test_admin_can_create_brand(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/admin/brands', [
            'name' => 'Logitech',
            'description' => 'Computer peripherals and gaming hardware',
            'is_active' => true,
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('brands', ['name' => 'Logitech', 'slug' => 'logitech']);
    }

    public function test_admin_can_view_categories_index(): void
    {
        Category::factory()->count(3)->create();

        $response = $this->actingAs($this->adminUser)->get('/admin/categories');

        $response->assertStatus(200);
    }

    public function test_admin_can_create_category_and_subcategory(): void
    {
        $parent = Category::factory()->create(['name' => 'Computers']);

        $response = $this->actingAs($this->adminUser)->post('/admin/categories', [
            'parent_id' => $parent->id,
            'name' => 'Laptops',
            'description' => 'Portable computers',
            'is_active' => true,
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('categories', [
            'name' => 'Laptops',
            'parent_id' => $parent->id,
        ]);
    }

    public function test_admin_can_view_products_index_and_create_page(): void
    {
        Product::factory()->count(2)->create();

        $indexRes = $this->actingAs($this->adminUser)->get('/admin/products');
        $indexRes->assertStatus(200);

        $createRes = $this->actingAs($this->adminUser)->get('/admin/products/create');
        $createRes->assertStatus(200);
    }

    public function test_admin_can_create_product_with_variants_and_images(): void
    {
        $brand = Brand::factory()->create();
        $category = Category::factory()->create();
        $media = MediaFile::factory()->create();

        $response = $this->actingAs($this->adminUser)->post('/admin/products', [
            'name' => 'Mechanical Gaming Keyboard',
            'sku' => 'KEY-MECH-RGB',
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'mrp' => 149.99,
            'retail_price' => 129.99,
            'sale_price' => 99.99,
            'discount_type' => 'percentage',
            'discount_value' => 33.33,
            'stock_quantity' => 50,
            'low_stock_threshold' => 10,
            'has_variants' => true,
            'status' => 'active',
            'images' => [
                ['media_id' => $media->id, 'alt_text' => 'Keyboard Front', 'is_primary' => true],
            ],
            'variants' => [
                ['sku' => 'KEY-MECH-RED', 'name' => 'Red Switch', 'price' => 99.99, 'stock_quantity' => 25],
                ['sku' => 'KEY-MECH-BLU', 'name' => 'Blue Switch', 'price' => 99.99, 'stock_quantity' => 25],
            ],
        ]);

        $response->assertRedirect('/admin/products');
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('products', [
            'sku' => 'KEY-MECH-RGB',
            'discount_type' => 'percentage',
        ]);
        $this->assertDatabaseHas('product_images', ['alt_text' => 'Keyboard Front', 'is_primary' => true]);
        $this->assertDatabaseHas('product_variants', ['sku' => 'KEY-MECH-RED']);
    }

    public function test_admin_can_create_product_with_fixed_discount_type(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/admin/products', [
            'name' => 'Fixed Discount Wireless Mouse',
            'sku' => 'MOUSE-WL-FIXED',
            'mrp' => 80.00,
            'retail_price' => 60.00,
            'discount_type' => 'fixed',
            'discount_value' => 20.00,
            'stock_quantity' => 30,
            'low_stock_threshold' => 5,
            'status' => 'active',
        ]);

        $response->assertRedirect('/admin/products');
        $this->assertDatabaseHas('products', [
            'sku' => 'MOUSE-WL-FIXED',
            'discount_type' => 'fixed',
            'discount_value' => 20.00,
        ]);
    }

    public function test_admin_can_view_inventory_and_update_stock(): void
    {
        $simpleProduct = Product::factory()->create([
            'stock_quantity' => 20,
            'has_variants' => false,
        ]);

        $productWithVariants = Product::factory()->create([
            'stock_quantity' => 10,
            'has_variants' => true,
        ]);

        $variant = ProductVariant::factory()->create([
            'product_id' => $productWithVariants->id,
            'stock_quantity' => 10,
            'low_stock_threshold' => 3,
        ]);

        $indexRes = $this->actingAs($this->adminUser)->get('/admin/inventory');
        $indexRes->assertStatus(200);

        // Simple product without variants can be updated directly
        $updateRes = $this->actingAs($this->adminUser)->put("/admin/inventory/product/{$simpleProduct->id}", [
            'stock_quantity' => 45,
            'low_stock_threshold' => 8,
        ]);

        $updateRes->assertSessionHas('success');
        $this->assertDatabaseHas('products', [
            'id' => $simpleProduct->id,
            'stock_quantity' => 45,
            'low_stock_threshold' => 8,
        ]);

        // Product with variants CANNOT be updated directly
        $blockedRes = $this->actingAs($this->adminUser)->put("/admin/inventory/product/{$productWithVariants->id}", [
            'stock_quantity' => 99,
            'low_stock_threshold' => 8,
        ]);
        $blockedRes->assertSessionHas('error');
        $this->assertDatabaseMissing('products', [
            'id' => $productWithVariants->id,
            'stock_quantity' => 99,
        ]);

        // Variant stock update works and automatically updates parent product's stock_quantity
        $variantRes = $this->actingAs($this->adminUser)->put("/admin/inventory/variant/{$variant->id}", [
            'stock_quantity' => 25,
            'low_stock_threshold' => 4,
        ]);

        $variantRes->assertSessionHas('success');
        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock_quantity' => 25,
            'low_stock_threshold' => 4,
        ]);

        // Verify parent product was auto-calculated to 25
        $this->assertDatabaseHas('products', [
            'id' => $productWithVariants->id,
            'stock_quantity' => 25,
        ]);

        // Batch update test for both simple product and variant
        $batchRes = $this->actingAs($this->adminUser)->post('/admin/inventory/batch-update', [
            'items' => [
                ['id' => $simpleProduct->id, 'type' => 'product', 'stock_quantity' => 50],
                ['id' => $variant->id, 'type' => 'variant', 'stock_quantity' => 30],
            ],
        ]);
        $batchRes->assertSessionHas('success');
        $this->assertDatabaseHas('products', ['id' => $simpleProduct->id, 'stock_quantity' => 50]);
        $this->assertDatabaseHas('product_variants', ['id' => $variant->id, 'stock_quantity' => 30]);
        $this->assertDatabaseHas('products', ['id' => $productWithVariants->id, 'stock_quantity' => 30]);
    }

    public function test_admin_can_create_brand_with_uploaded_file(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('brand-logo.png');

        // Step 1: Upload via media endpoint (same as Store file upload)
        $uploadRes = $this->actingAs($this->adminUser)->postJson('/admin/media/upload', [
            'file' => $file,
            'collection' => 'brands',
        ]);
        $uploadRes->assertStatus(201);
        $mediaId = $uploadRes->json('data.id');

        // Step 2: Pass logo_id when creating brand
        $response = $this->actingAs($this->adminUser)->post('/admin/brands', [
            'name' => 'Uploaded Brand',
            'logo_id' => $mediaId,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $brand = Brand::where('name', 'Uploaded Brand')->first();
        $this->assertNotNull($brand);
        $this->assertEquals($mediaId, $brand->logo_id);
        $this->assertNotNull($brand->logo);
        $this->assertNotNull($brand->logo_url);
    }

    public function test_admin_can_create_category_with_uploaded_file(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('category-banner.jpg');

        // Step 1: Upload via media endpoint
        $uploadRes = $this->actingAs($this->adminUser)->postJson('/admin/media/upload', [
            'file' => $file,
            'collection' => 'categories',
        ]);
        $uploadRes->assertStatus(201);
        $mediaId = $uploadRes->json('data.id');

        // Step 2: Pass image_id when creating category
        $response = $this->actingAs($this->adminUser)->post('/admin/categories', [
            'name' => 'Uploaded Category',
            'image_id' => $mediaId,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $category = Category::where('name', 'Uploaded Category')->first();
        $this->assertNotNull($category);
        $this->assertEquals($mediaId, $category->image_id);
        $this->assertNotNull($category->image);
        $this->assertNotNull($category->image_url);
    }

    public function test_admin_can_create_product_with_uploaded_images(): void
    {
        Storage::fake('public');

        $brand = Brand::factory()->create();
        $category = Category::factory()->create();
        $file1 = UploadedFile::fake()->image('gallery1.png');
        $file2 = UploadedFile::fake()->image('gallery2.png');

        // Step 1: Upload files via media endpoint
        $upload1 = $this->actingAs($this->adminUser)->postJson('/admin/media/upload', [
            'file' => $file1,
            'collection' => 'products',
        ]);
        $upload1->assertStatus(201);
        $media1Id = $upload1->json('data.id');

        $upload2 = $this->actingAs($this->adminUser)->postJson('/admin/media/upload', [
            'file' => $file2,
            'collection' => 'products',
        ]);
        $upload2->assertStatus(201);
        $media2Id = $upload2->json('data.id');

        // Step 2: Pass images with media_id when creating product
        $response = $this->actingAs($this->adminUser)->post('/admin/products', [
            'name' => 'Uploaded Product',
            'sku' => 'UPLOAD-PROD-01',
            'brand_id' => $brand->id,
            'category_id' => $category->id,
            'mrp' => 99.00,
            'retail_price' => 79.00,
            'stock_quantity' => 15,
            'low_stock_threshold' => 3,
            'images' => [
                ['media_id' => $media1Id, 'alt_text' => 'Front view', 'is_primary' => true],
                ['media_id' => $media2Id, 'alt_text' => 'Back view', 'is_primary' => false],
            ],
        ]);

        $response->assertRedirect('/admin/products');
        $response->assertSessionHas('success');

        $product = Product::with('images.media')->where('sku', 'UPLOAD-PROD-01')->first();
        $this->assertNotNull($product);
        $this->assertCount(2, $product->images);
        $this->assertEquals($media1Id, $product->images[0]->media_id);
        $this->assertNotNull($product->images[0]->media);
        $this->assertNotNull($product->images[0]->url);
        $this->assertTrue($product->images->where('is_primary', true)->count() >= 1);
    }

    public function test_product_cannot_have_selling_price_greater_than_mrp(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/admin/products', [
            'name' => 'Invalid Price Product',
            'sku' => 'INVALID-PRICE-01',
            'mrp' => 400.00,
            'retail_price' => 401.00,
            'stock_quantity' => 10,
            'low_stock_threshold' => 2,
        ]);

        $response->assertSessionHasErrors(['retail_price']);
    }

    public function test_product_cannot_have_sale_price_greater_than_selling_price(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/admin/products', [
            'name' => 'Invalid Sale Price Product',
            'sku' => 'INVALID-SALE-01',
            'mrp' => 400.00,
            'retail_price' => 350.00,
            'sale_price' => 380.00,
            'stock_quantity' => 10,
            'low_stock_threshold' => 2,
        ]);

        $response->assertSessionHasErrors(['sale_price']);
    }
}

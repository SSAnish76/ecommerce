<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Collection;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollectionTest extends TestCase
{
    use RefreshDatabase;

    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->adminUser = User::where('email', 'admin@example.com')->firstOrFail();
    }

    public function test_admin_can_view_collections_index(): void
    {
        Collection::create([
            'name' => 'Trending Items',
            'slug' => 'trending-items',
            'description' => 'Top selling items',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)->get('/admin/collections');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Collections')
            ->has('collections.data', 1)
        );
    }

    public function test_admin_can_create_collection_with_products(): void
    {
        $products = Product::factory()->count(2)->create();

        $response = $this->actingAs($this->adminUser)->post('/admin/collections', [
            'name' => 'Summer Clearance',
            'type' => 'product',
            'description' => 'Seasonal clearance inventory',
            'is_active' => true,
            'sort_order' => 1,
            'product_ids' => $products->pluck('id')->all(),
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('collections', [
            'name' => 'Summer Clearance',
            'slug' => 'summer-clearance',
            'type' => 'product',
            'is_active' => true,
        ]);

        $collection = Collection::where('slug', 'summer-clearance')->firstOrFail();
        $this->assertCount(2, $collection->products);
    }

    public function test_admin_can_create_brand_collection_with_brands(): void
    {
        $brands = \App\Models\Brand::factory()->count(3)->create();

        $response = $this->actingAs($this->adminUser)->post('/admin/collections', [
            'name' => 'Luxury Brands',
            'type' => 'brand',
            'description' => 'Top luxury fashion brands',
            'is_active' => true,
            'brand_ids' => $brands->pluck('id')->all(),
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('collections', [
            'name' => 'Luxury Brands',
            'slug' => 'luxury-brands',
            'type' => 'brand',
        ]);

        $collection = Collection::where('slug', 'luxury-brands')->firstOrFail();
        $this->assertCount(3, $collection->brands);
    }

    public function test_admin_can_create_category_collection_with_categories(): void
    {
        $categories = \App\Models\Category::factory()->count(2)->create();

        $response = $this->actingAs($this->adminUser)->post('/admin/collections', [
            'name' => 'Trending Categories',
            'type' => 'category',
            'description' => 'Popular categories this season',
            'is_active' => true,
            'category_ids' => $categories->pluck('id')->all(),
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('collections', [
            'name' => 'Trending Categories',
            'slug' => 'trending-categories',
            'type' => 'category',
        ]);

        $collection = Collection::where('slug', 'trending-categories')->firstOrFail();
        $this->assertCount(2, $collection->categories);
    }

    public function test_admin_can_update_collection_and_sync_products(): void
    {
        $collection = Collection::create([
            'name' => 'Old Collection',
            'slug' => 'old-collection',
            'is_active' => true,
        ]);

        $product = Product::factory()->create();

        $response = $this->actingAs($this->adminUser)->put("/admin/collections/{$collection->id}", [
            'name' => 'Updated Collection',
            'slug' => 'updated-collection',
            'description' => 'Updated description',
            'is_active' => false,
            'product_ids' => [$product->id],
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('collections', [
            'id' => $collection->id,
            'name' => 'Updated Collection',
            'slug' => 'updated-collection',
            'is_active' => false,
        ]);

        $this->assertTrue($collection->fresh()->products->contains('id', $product->id));
    }

    public function test_admin_can_toggle_collection_status(): void
    {
        $collection = Collection::create([
            'name' => 'Toggle Collection',
            'slug' => 'toggle-collection',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)->patch("/admin/collections/{$collection->id}/toggle-status");

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('collections', [
            'id' => $collection->id,
            'is_active' => false,
        ]);
    }

    public function test_admin_can_delete_collection(): void
    {
        $collection = Collection::create([
            'name' => 'To Delete',
            'slug' => 'to-delete',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)->delete("/admin/collections/{$collection->id}");

        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('collections', ['id' => $collection->id]);
    }
}

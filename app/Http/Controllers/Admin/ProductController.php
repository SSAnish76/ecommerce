<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\Product\LocationAvailabilityType;
use App\Enums\Product\ProductStatus;
use App\Enums\Product\StockVisibility;
use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\MediaFile;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    /**
     * Display a listing of products with rich filtering.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $status = $request->string('status')->trim()->value();
        $brandId = $request->query('brand_id');
        $categoryId = $request->query('category_id');
        $stockFilter = $request->string('stock')->trim()->value();

        $products = Product::query()
            ->with([
                'brand:id,name',
                'category:id,name',
                'primaryImage.media',
            ])
            ->withCount('variants')
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $q) use ($search): void {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                });
            })
            ->when($status !== '', function (Builder $query) use ($status): void {
                $query->where('status', $status);
            })
            ->when($brandId !== null && $brandId !== '', function (Builder $query) use ($brandId): void {
                $query->where('brand_id', $brandId);
            })
            ->when($categoryId !== null && $categoryId !== '', function (Builder $query) use ($categoryId): void {
                $query->where('category_id', $categoryId);
            })
            ->when($stockFilter !== '', function (Builder $query) use ($stockFilter): void {
                if ($stockFilter === 'low') {
                    $query->lowStock();
                } elseif ($stockFilter === 'out') {
                    $query->outOfStock();
                } elseif ($stockFilter === 'in') {
                    $query->where('stock_quantity', '>', 0);
                }
            })
            ->latest()
            ->paginate(12)
            ->withQueryString();

        $brands = Brand::query()->active()->orderBy('name')->get(['id', 'name']);
        $categories = Category::query()->active()->with('parent:id,name')->orderBy('name')->get(['id', 'name', 'parent_id']);

        return Inertia::render('Admin/Products/Index', [
            'products' => $products,
            'brands' => $brands,
            'categories' => $categories,
            'statuses' => ProductStatus::options(),
            'filters' => [
                'search' => $search,
                'status' => $status,
                'brand_id' => $brandId,
                'category_id' => $categoryId,
                'stock' => $stockFilter,
            ],
        ]);
    }

    /**
     * Show the form for creating a new product.
     */
    public function create(): Response
    {
        $brands = Brand::query()->active()->orderBy('name')->get(['id', 'name']);
        $categories = Category::query()->active()->with('parent:id,name')->orderBy('name')->get(['id', 'name', 'parent_id']);

        return Inertia::render('Admin/Products/CreateOrEdit', [
            'product' => null,
            'brands' => $brands,
            'categories' => $categories,
            'statuses' => ProductStatus::options(),
            'stockVisibilities' => StockVisibility::options(),
            'locationTypes' => LocationAvailabilityType::options(),
        ]);
    }

    /**
     * Store a newly created product in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:products,slug'],
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'specifications' => ['nullable', 'array'],
            'brand_id' => ['nullable', 'string', 'exists:brands,id'],
            'category_id' => ['nullable', 'string', 'exists:categories,id'],
            'mrp' => ['required', 'numeric', 'min:0'],
            'retail_price' => ['required', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'discount_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
            'stock_visibility' => ['nullable', 'string', Rule::enum(StockVisibility::class)],
            'has_variants' => ['boolean'],
            'status' => ['nullable', 'string', Rule::enum(ProductStatus::class)],
            'location_availability_type' => ['nullable', 'string', Rule::enum(LocationAvailabilityType::class)],
            'delivery_radius_km' => ['nullable', 'numeric', 'min:0'],
            'return_policy' => ['nullable', 'string'],
            'refund_policy' => ['nullable', 'string'],
            // Images array
            'images' => ['nullable', 'array'],
            'images.*.image_path' => ['nullable', 'string', 'max:2048'],
            'images.*.image_url' => ['nullable', 'string', 'max:2048'],
            'images.*.url' => ['nullable', 'string', 'max:2048'],
            'images.*.media_id' => ['nullable'],
            'images.*.image_id' => ['nullable'],
            'images.*.alt_text' => ['nullable', 'string', 'max:255'],
            'images.*.is_primary' => ['boolean'],
            // Variants array
            'variants' => ['nullable', 'array'],
            'variants.*.sku' => ['required', 'string', 'distinct'],
            'variants.*.name' => ['required', 'string'],
            'variants.*.attributes' => ['nullable', 'array'],
            'variants.*.price' => ['required', 'numeric', 'min:0'],
            'variants.*.mrp' => ['nullable', 'numeric', 'min:0'],
            'variants.*.sale_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.stock_quantity' => ['required', 'integer', 'min:0'],
            'variants.*.low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'variants.*.is_active' => ['boolean'],
        ]);

        $slug = ! empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);
        $originalSlug = $slug;
        $counter = 1;
        while (Product::where('slug', $slug)->exists()) {
            $slug = "{$originalSlug}-{$counter}";
            $counter++;
        }

        /** @var list<array{media_id: string, alt_text?: ?string, is_primary?: bool}> $processedImages */
        $processedImages = [];

        if (! empty($validated['images'])) {
            foreach ($validated['images'] as $img) {
                $mediaId = $img['media_id'] ?? ($img['image_id'] ?? null);

                if (! $mediaId && ! empty($img['image_path'] ?? ($img['image_url'] ?? ($img['url'] ?? null)))) {
                    $rawUrl = (string) ($img['image_path'] ?? ($img['image_url'] ?? ($img['url'] ?? '')));
                    $filename = basename(parse_url($rawUrl, PHP_URL_PATH) ?: 'image.jpg');
                    $mediaFile = MediaFile::firstOrCreate(
                        ['filename' => $filename],
                        [
                            'disk' => 'public',
                            'directory' => 'media',
                            'original_name' => $filename,
                            'mime_type' => 'image/jpeg',
                            'extension' => pathinfo($filename, PATHINFO_EXTENSION) ?: 'jpg',
                            'size' => 1024,
                            'collection' => 'products',
                        ]
                    );
                    $mediaId = $mediaFile->id;
                }

                if ($mediaId !== null) {
                    $processedImages[] = [
                        'media_id' => (string) $mediaId,
                        'alt_text' => $img['alt_text'] ?? null,
                        'is_primary' => ! empty($img['is_primary']),
                    ];
                }
            }
        }

        // Ensure at least one image is primary if images exist
        if (count($processedImages) > 0 && ! collect($processedImages)->contains('is_primary', true)) {
            $processedImages[0]['is_primary'] = true;
        }

        DB::transaction(function () use ($validated, $slug, $processedImages): void {
            $product = Product::create([
                'name' => $validated['name'],
                'slug' => $slug,
                'sku' => strtoupper($validated['sku']),
                'short_description' => $validated['short_description'] ?? null,
                'description' => $validated['description'] ?? null,
                'specifications' => $validated['specifications'] ?? null,
                'brand_id' => $validated['brand_id'] ?? null,
                'category_id' => $validated['category_id'] ?? null,
                'mrp' => $validated['mrp'],
                'retail_price' => $validated['retail_price'],
                'sale_price' => $validated['sale_price'] ?? null,
                'discount_percentage' => $validated['discount_percentage'] ?? null,
                'stock_quantity' => $validated['stock_quantity'],
                'low_stock_threshold' => $validated['low_stock_threshold'],
                'stock_visibility' => $validated['stock_visibility'] ?? StockVisibility::Badge->value,
                'has_variants' => $validated['has_variants'] ?? false,
                'status' => $validated['status'] ?? ProductStatus::Active->value,
                'location_availability_type' => $validated['location_availability_type'] ?? LocationAvailabilityType::All->value,
                'delivery_radius_km' => $validated['delivery_radius_km'] ?? null,
                'return_policy' => $validated['return_policy'] ?? null,
                'refund_policy' => $validated['refund_policy'] ?? null,
            ]);

            // Save gallery images
            foreach ($processedImages as $idx => $img) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'media_id' => $img['media_id'],
                    'alt_text' => $img['alt_text'] ?? $product->name,
                    'is_primary' => $img['is_primary'] ?? ($idx === 0),
                    'sort_order' => $idx + 1,
                ]);
            }

            // Save variants if product has variants
            if (! empty($validated['has_variants']) && ! empty($validated['variants'])) {
                foreach ($validated['variants'] as $v) {
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'sku' => strtoupper($v['sku']),
                        'name' => $v['name'],
                        'attributes' => $v['attributes'] ?? null,
                        'price' => $v['price'],
                        'mrp' => $v['mrp'] ?? null,
                        'sale_price' => $v['sale_price'] ?? null,
                        'stock_quantity' => $v['stock_quantity'],
                        'low_stock_threshold' => $v['low_stock_threshold'] ?? 5,
                        'is_active' => $v['is_active'] ?? true,
                    ]);
                }
            }
        });

        return redirect()->route('admin.products.index')->with('success', "Product '{$validated['name']}' created successfully.");
    }

    /**
     * Show the form for editing the specified product.
     */
    public function edit(Product $product): Response
    {
        $product->load(['images.media', 'variants', 'brand:id,name', 'category:id,name']);

        $brands = Brand::query()->active()->orderBy('name')->get(['id', 'name']);
        $categories = Category::query()->active()->with('parent:id,name')->orderBy('name')->get(['id', 'name', 'parent_id']);

        return Inertia::render('Admin/Products/CreateOrEdit', [
            'product' => $product,
            'brands' => $brands,
            'categories' => $categories,
            'statuses' => ProductStatus::options(),
            'stockVisibilities' => StockVisibility::options(),
            'locationTypes' => LocationAvailabilityType::options(),
        ]);
    }

    /**
     * Update the specified product in storage.
     */
    public function update(Request $request, Product $product): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('products', 'slug')->ignore($product->id)],
            'sku' => ['required', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($product->id)],
            'short_description' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'specifications' => ['nullable', 'array'],
            'brand_id' => ['nullable', 'string', 'exists:brands,id'],
            'category_id' => ['nullable', 'string', 'exists:categories,id'],
            'mrp' => ['required', 'numeric', 'min:0'],
            'retail_price' => ['required', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'discount_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
            'stock_visibility' => ['nullable', 'string', Rule::enum(StockVisibility::class)],
            'has_variants' => ['boolean'],
            'status' => ['nullable', 'string', Rule::enum(ProductStatus::class)],
            'location_availability_type' => ['nullable', 'string', Rule::enum(LocationAvailabilityType::class)],
            'delivery_radius_km' => ['nullable', 'numeric', 'min:0'],
            'return_policy' => ['nullable', 'string'],
            'refund_policy' => ['nullable', 'string'],
            // Images array
            'images' => ['nullable', 'array'],
            'images.*.image_path' => ['nullable', 'string', 'max:2048'],
            'images.*.image_url' => ['nullable', 'string', 'max:2048'],
            'images.*.url' => ['nullable', 'string', 'max:2048'],
            'images.*.media_id' => ['nullable'],
            'images.*.image_id' => ['nullable'],
            'images.*.alt_text' => ['nullable', 'string', 'max:255'],
            'images.*.is_primary' => ['boolean'],
            // Variants array
            'variants' => ['nullable', 'array'],
            'variants.*.sku' => ['required', 'string'],
            'variants.*.name' => ['required', 'string'],
            'variants.*.attributes' => ['nullable', 'array'],
            'variants.*.price' => ['required', 'numeric', 'min:0'],
            'variants.*.mrp' => ['nullable', 'numeric', 'min:0'],
            'variants.*.sale_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.stock_quantity' => ['required', 'integer', 'min:0'],
            'variants.*.low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'variants.*.is_active' => ['boolean'],
        ]);

        $slug = ! empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);

        $syncImages = array_key_exists('images', $validated);
        /** @var list<array{media_id: string, alt_text?: ?string, is_primary?: bool}> $processedImages */
        $processedImages = [];

        if (! empty($validated['images'])) {
            foreach ($validated['images'] as $img) {
                $mediaId = $img['media_id'] ?? ($img['image_id'] ?? null);

                if (! $mediaId && ! empty($img['image_path'] ?? ($img['image_url'] ?? ($img['url'] ?? null)))) {
                    $rawUrl = (string) ($img['image_path'] ?? ($img['image_url'] ?? ($img['url'] ?? '')));
                    $filename = basename(parse_url($rawUrl, PHP_URL_PATH) ?: 'image.jpg');
                    $mediaFile = MediaFile::firstOrCreate(
                        ['filename' => $filename],
                        [
                            'disk' => 'public',
                            'directory' => 'media',
                            'original_name' => $filename,
                            'mime_type' => 'image/jpeg',
                            'extension' => pathinfo($filename, PATHINFO_EXTENSION) ?: 'jpg',
                            'size' => 1024,
                            'collection' => 'products',
                        ]
                    );
                    $mediaId = $mediaFile->id;
                }

                if ($mediaId !== null) {
                    $processedImages[] = [
                        'media_id' => (string) $mediaId,
                        'alt_text' => $img['alt_text'] ?? null,
                        'is_primary' => ! empty($img['is_primary']),
                    ];
                }
            }
        }

        if (count($processedImages) > 0 && ! collect($processedImages)->contains('is_primary', true)) {
            $processedImages[0]['is_primary'] = true;
        }

        DB::transaction(function () use ($validated, $slug, $product, $syncImages, $processedImages): void {
            $product->update([
                'name' => $validated['name'],
                'slug' => $slug,
                'sku' => strtoupper($validated['sku']),
                'short_description' => $validated['short_description'] ?? null,
                'description' => $validated['description'] ?? null,
                'specifications' => $validated['specifications'] ?? null,
                'brand_id' => $validated['brand_id'] ?? null,
                'category_id' => $validated['category_id'] ?? null,
                'mrp' => $validated['mrp'],
                'retail_price' => $validated['retail_price'],
                'sale_price' => $validated['sale_price'] ?? null,
                'discount_percentage' => $validated['discount_percentage'] ?? null,
                'stock_quantity' => $validated['stock_quantity'],
                'low_stock_threshold' => $validated['low_stock_threshold'],
                'stock_visibility' => $validated['stock_visibility'] ?? $product->stock_visibility->value,
                'has_variants' => $validated['has_variants'] ?? false,
                'status' => $validated['status'] ?? $product->status->value,
                'location_availability_type' => $validated['location_availability_type'] ?? $product->location_availability_type->value,
                'delivery_radius_km' => $validated['delivery_radius_km'] ?? null,
                'return_policy' => $validated['return_policy'] ?? null,
                'refund_policy' => $validated['refund_policy'] ?? null,
            ]);

            // Sync images if provided
            if ($syncImages) {
                $product->images()->delete();
                foreach ($processedImages as $idx => $img) {
                    ProductImage::create([
                        'product_id' => $product->id,
                        'media_id' => $img['media_id'],
                        'alt_text' => $img['alt_text'] ?? $product->name,
                        'is_primary' => $img['is_primary'] ?? ($idx === 0),
                        'sort_order' => $idx + 1,
                    ]);
                }
            }

            // Sync variants if provided
            if (! empty($validated['has_variants']) && isset($validated['variants'])) {
                $product->variants()->delete();
                foreach ($validated['variants'] as $v) {
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'sku' => strtoupper($v['sku']),
                        'name' => $v['name'],
                        'attributes' => $v['attributes'] ?? null,
                        'price' => $v['price'],
                        'mrp' => $v['mrp'] ?? null,
                        'sale_price' => $v['sale_price'] ?? null,
                        'stock_quantity' => $v['stock_quantity'],
                        'low_stock_threshold' => $v['low_stock_threshold'] ?? 5,
                        'is_active' => $v['is_active'] ?? true,
                    ]);
                }
            } elseif (empty($validated['has_variants'])) {
                $product->variants()->delete();
            }
        });

        return redirect()->route('admin.products.index')->with('success', "Product '{$product->name}' updated successfully.");
    }

    /**
     * Remove the specified product from storage.
     */
    public function destroy(Product $product): RedirectResponse
    {
        $productName = $product->name;
        $product->delete();

        return redirect()->route('admin.products.index')->with('success', "Product '{$productName}' deleted successfully.");
    }

    /**
     * Toggle product active status.
     */
    public function toggleStatus(Product $product): RedirectResponse
    {
        $newStatus = $product->status === ProductStatus::Active
            ? ProductStatus::Inactive
            : ProductStatus::Active;

        $product->update(['status' => $newStatus]);

        return redirect()->back()->with('success', "Product '{$product->name}' status changed to {$newStatus->label()}.");
    }
}

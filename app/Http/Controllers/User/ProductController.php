<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Collection;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Wishlist;
use Exception;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * Display a listing of active products with search, filtering, and sorting.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Product::query()
                ->active()
                ->catalogVisible()
                ->with([
                    'brand:id,name,slug',
                    'category:id,name,slug',
                    'primaryImage.media',
                ]);

            // Category filter (by ID or Slug)
            if ($categoryId = $request->input('category_id')) {
                $query->where('category_id', $categoryId);
            } elseif ($categorySlug = $request->input('category')) {
                $category = Category::where('slug', $categorySlug)->first();
                if ($category) {
                    // Include child categories if any
                    $categoryIds = Category::where('parent_id', $category->id)->pluck('id')->push($category->id);
                    $query->whereIn('category_id', $categoryIds);
                }
            }

            // Brand filter (by ID or Slug)
            if ($brandId = $request->input('brand_id')) {
                $query->where('brand_id', $brandId);
            } elseif ($brandSlug = $request->input('brand')) {
                $brand = Brand::where('slug', $brandSlug)->first();
                if ($brand) {
                    $query->where('brand_id', $brand->id);
                }
            }

            // Collection filter (by ID or Slug)
            if ($collectionId = $request->input('collection_id')) {
                $query->whereHas('collections', fn($q) => $q->where('collections.id', $collectionId));
            } elseif ($collectionSlug = $request->input('collection')) {
                $query->whereHas('collections', fn($q) => $q->where('collections.slug', $collectionSlug));
            }

            // Price range filter
            if ($minPrice = $request->input('min_price')) {
                $query->where(function (Builder $q) use ($minPrice): void {
                    $q->where(function (Builder $sq) use ($minPrice): void {
                        $sq->whereNotNull('sale_price')->where('sale_price', '>=', (float) $minPrice);
                    })->orWhere(function (Builder $sq) use ($minPrice): void {
                        $sq->whereNull('sale_price')->where('retail_price', '>=', (float) $minPrice);
                    });
                });
            }

            if ($maxPrice = $request->input('max_price')) {
                $query->where(function (Builder $q) use ($maxPrice): void {
                    $q->where(function (Builder $sq) use ($maxPrice): void {
                        $sq->whereNotNull('sale_price')->where('sale_price', '<=', (float) $maxPrice);
                    })->orWhere(function (Builder $sq) use ($maxPrice): void {
                        $sq->whereNull('sale_price')->where('retail_price', '<=', (float) $maxPrice);
                    });
                });
            }

            // In stock filter
            if ($request->boolean('in_stock')) {
                $query->where('stock_quantity', '>', 0);
            }

            // Featured filter
            if ($request->boolean('featured')) {
                $query->where('is_featured', true);
            }

            // Search by name / sku / barcode
            if ($search = $request->input('q')) {
                $term = trim((string) $search);
                $query->where(function (Builder $q) use ($term): void {
                    $q->where('name', 'like', "%{$term}%")
                        ->orWhere('sku', 'like', "%{$term}%")
                        ->orWhere('barcode', 'like', "%{$term}%")
                        ->orWhere('short_description', 'like', "%{$term}%");
                });
            }

            // Sorting
            $sort = $request->input('sort', 'latest');
            match ($sort) {
                'price_asc' => $query->orderByRaw('COALESCE(sale_price, retail_price) ASC'),
                'price_desc' => $query->orderByRaw('COALESCE(sale_price, retail_price) DESC'),
                'name_asc' => $query->orderBy('name', 'asc'),
                'name_desc' => $query->orderBy('name', 'desc'),
                'popular' => $query->orderBy('sales_count', 'desc'),
                'rating' => $query->orderBy('rating_cache', 'desc'),
                default => $query->latest(),
            };

            $perPage = $this->resolvePerPage($request);
            $paginator = $query->paginate($perPage);

            /** @var Customer|null $customer */
            $customer = $request->user('sanctum') ?? $request->user();
            $wishlistProductIds = $customer
                ? Wishlist::where('customer_id', $customer->id)
                    ->whereIn('product_id', collect($paginator->items())->pluck('id'))
                    ->pluck('product_id')
                    ->flip()
                    ->all()
                : [];

            $items = array_map(
                fn (Product $product) => $this->formatProductSummary($product, isset($wishlistProductIds[$product->id])),
                $paginator->items()
            );

            return $this->paginatedResponse($paginator, $items, 'Products retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Display the specified product detail by ID or Slug.
     */
    public function show(string $slugOrId, Request $request): JsonResponse
    {
        try {
            $query = Product::query()
                ->active()
                ->catalogVisible()
                ->with([
                    'brand:id,name,slug',
                    'category:id,name,slug',
                    'images.media',
                    'attributes' => function ($q): void {
                        $q->active()->with(['values' => fn($vq) => $vq->active()->orderBy('sort_order')]);
                    },
                    'attributeValues',
                    'variants' => function ($q): void {
                        $q->active()->with(['media', 'attributeValues']);
                    },
                ]);

            $product = $query->whereSlugOrId($slugOrId)->first();

            if (! $product || $product->shouldHideWhenOutOfStock()) {
                return $this->returnError(null, 'Product not found or unavailable.');
            }

            /** @var Customer|null $customer */
            $customer = $request->user('sanctum') ?? $request->user();
            $isWishlist = $customer
                ? Wishlist::where('customer_id', $customer->id)->where('product_id', $product->id)->exists()
                : false;

            return $this->returnSuccess($this->formatProductDetail($product, $isWishlist), 'Product details retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Get related products for the specified product.
     */
    public function related(string $slugOrId, Request $request): JsonResponse
    {
        try {
            $product = Product::whereSlugOrId($slugOrId)->first();

            if (! $product) {
                return $this->returnError(null, 'Product not found.');
            }

            $relatedProducts = Product::query()
                ->active()
                ->catalogVisible()
                ->where('id', '!=', $product->id)
                ->where(function (Builder $q) use ($product): void {
                    if ($product->category_id) {
                        $q->where('category_id', $product->category_id);
                    }
                    if ($product->brand_id) {
                        $q->orWhere('brand_id', $product->brand_id);
                    }
                })
                ->with(['brand:id,name,slug', 'category:id,name,slug', 'primaryImage.media'])
                ->limit(6)
                ->get();

            /** @var Customer|null $customer */
            $customer = $request->user('sanctum') ?? $request->user();
            $wishlistProductIds = $customer
                ? Wishlist::where('customer_id', $customer->id)
                    ->whereIn('product_id', $relatedProducts->pluck('id'))
                    ->pluck('product_id')
                    ->flip()
                    ->all()
                : [];

            $items = $relatedProducts->map(
                fn (Product $p) => $this->formatProductSummary($p, isset($wishlistProductIds[$p->id]))
            );

            return $this->returnSuccess($items, 'Related products retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Format product summary for listings.
     *
     * @return array<string, mixed>
     */
    protected function formatProductSummary(Product $product, bool $isWishlist = false): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'sku' => $product->sku,
            'short_description' => $product->short_description,
            'brand' => $product->brand ? [
                'id' => $product->brand->id,
                'name' => $product->brand->name,
                'slug' => $product->brand->slug,
            ] : null,
            'category' => $product->category ? [
                'id' => $product->category->id,
                'name' => $product->category->name,
                'slug' => $product->category->slug,
            ] : null,
            'mrp' => (float) $product->mrp,
            'retail_price' => (float) $product->retail_price,
            'sale_price' => $product->sale_price !== null ? (float) $product->sale_price : null,
            'effective_price' => $product->effectivePrice(),
            'discount_label' => $product->discountLabel(),
            'has_variants' => (bool) $product->has_variants,
            'stock_quantity' => (int) $product->stock_quantity,
            'is_in_stock' => $product->stock_quantity > 0,
            'stock_visibility' => $product->effectiveStockVisibility()->value,
            'allows_backorder' => $product->allowsBackorder(),
            'is_wishlist' => $isWishlist,
            'in_wishlist' => $isWishlist,
            'primary_image' => $product->primaryImage?->media?->url,
            'created_at' => $product->created_at?->toISOString(),
        ];
    }

    /**
     * Format full product detail including variants and attributes.
     *
     * @return array<string, mixed>
     */
    protected function formatProductDetail(Product $product, bool $isWishlist = false): array
    {
        $galleryImages = $product->images->map(fn($img) => [
            'id' => $img->id,
            'url' => $img->media?->url,
            'is_primary' => (bool) $img->is_primary,
            'sort_order' => (int) $img->sort_order,
        ]);

        $variants = $product->variants->map(fn($variant) => [
            'id' => $variant->id,
            'name' => $variant->name,
            'sku' => $variant->sku,
            'attributes' => $variant->attributes,
            'mrp' => (float) $variant->mrp,
            'price' => (float) $variant->price,
            'sale_price' => $variant->sale_price !== null ? (float) $variant->sale_price : null,
            'effective_price' => $variant->effectivePrice(),
            'stock_quantity' => (int) $variant->stock_quantity,
            'is_in_stock' => $variant->stock_quantity > 0,
            'image_url' => $variant->image_url,
        ]);

        return array_merge($this->formatProductSummary($product, $isWishlist), [
            'description' => $product->description,
            'specifications' => $product->specifications,
            'return_policy' => $product->return_policy,
            'refund_policy' => $product->refund_policy,
            'delivery_radius_km' => $product->delivery_radius_km !== null ? (float) $product->delivery_radius_km : null,
            'images' => $galleryImages,
            'variants' => $variants,
            'attributes' => $product->attributes->map(fn($attr) => [
                'id' => $attr->id,
                'name' => $attr->name,
                'code' => $attr->code,
                'type' => $attr->type?->value ?? (string) $attr->type,
                'values' => $attr->values->map(fn($v) => [
                    'id' => $v->id,
                    'value' => $v->value,
                    'color_code' => $v->color_code,
                ]),
            ]),
        ]);
    }
}

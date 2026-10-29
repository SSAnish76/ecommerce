<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * Display a listing of active products with search, filtering, and sorting.
     */
    public function index(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
            $query = Product::query()
                ->active()
                ->catalogVisible()
                ->withSummaryRelations();

            // Category filter (by ID or Slug)
            if ($categoryId = $request->input('category_id')) {
                $query->where('category_id', $categoryId);
            } elseif ($categorySlug = $request->input('category')) {
                $category = Category::where('slug', $categorySlug)->first();
                if ($category) {
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
                $query->whereHas('collections', fn ($q) => $q->where('collections.id', $collectionId));
            } elseif ($collectionSlug = $request->input('collection')) {
                $query->whereHas('collections', fn ($q) => $q->where('collections.slug', $collectionSlug));
            }

            // Price range filter
            if ($minPrice = $request->input('min_price')) {
                $minVal = (float) $minPrice;
                $query->where(function (Builder $q) use ($minVal): void {
                    $q->where(fn (Builder $sq) => $sq->whereNotNull('sale_price')->where('sale_price', '>=', $minVal))
                        ->orWhere(fn (Builder $sq) => $sq->whereNull('sale_price')->where('retail_price', '>=', $minVal));
                });
            }

            if ($maxPrice = $request->input('max_price')) {
                $maxVal = (float) $maxPrice;
                $query->where(function (Builder $q) use ($maxVal): void {
                    $q->where(fn (Builder $sq) => $sq->whereNotNull('sale_price')->where('sale_price', '<=', $maxVal))
                        ->orWhere(fn (Builder $sq) => $sq->whereNull('sale_price')->where('retail_price', '<=', $maxVal));
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

            // Search by name / sku / barcode / description
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
            $items = Product::formatSummaries($paginator->items(), $customer);

            return $this->paginatedResponse($paginator, $items, 'Products retrieved successfully.');
        });
    }

    /**
     * Display the specified product detail by ID or Slug.
     */
    public function show(string $slugOrId, Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($slugOrId, $request): JsonResponse {
            $query = Product::query()
                ->active()
                ->catalogVisible()
                ->with([
                    'brand:id,name,slug',
                    'category:id,name,slug',
                    'images.media',
                    'attributes' => function ($q): void {
                        $q->active()->with(['values' => fn ($vq) => $vq->active()->orderBy('sort_order')]);
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
            $isWishlist = $customer ? $customer->wishlists()->where('product_id', $product->id)->exists() : false;

            return $this->returnSuccess($this->formatProductDetail($product, $isWishlist), 'Product details retrieved successfully.');
        });
    }

    /**
     * Get related products for the specified product.
     */
    public function related(string $slugOrId, Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($slugOrId, $request): JsonResponse {
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
                ->withSummaryRelations()
                ->limit(6)
                ->get();

            /** @var Customer|null $customer */
            $customer = $request->user('sanctum') ?? $request->user();
            $items = Product::formatSummaries($relatedProducts, $customer);

            return $this->returnSuccess($items, 'Related products retrieved successfully.');
        });
    }

    /**
     * Format full product detail including variants and attributes for frontend consumption.
     *
     * @return array<string, mixed>
     */
    protected function formatProductDetail(Product $product, bool $isWishlist = false): array
    {
        $galleryImages = $product->images->map(fn ($img): array => [
            'id' => $img->id,
            'url' => $img->media?->url,
            'is_primary' => (bool) $img->is_primary,
            'sort_order' => (int) $img->sort_order,
        ]);

        $allowsBackorder = $product->allowsBackorder();

        // 1. Clean variants list - only variants with stock or allowing backorders based on stock policy
        $variants = $product->variants
            ->filter(function ($variant) use ($allowsBackorder): bool {
                if (! (bool) $variant->is_active) {
                    return false;
                }

                return $variant->stock_quantity > 0 || $allowsBackorder;
            })
            ->map(function ($variant): array {
                $attrs = $variant->getAttribute('attributes');
                if (is_string($attrs)) {
                    $attrs = json_decode($attrs, true);
                }

                return [
                    'id' => $variant->id,
                    'name' => $variant->name,
                    'sku' => $variant->sku,
                    'mrp' => (float) $variant->mrp,
                    'price' => (float) $variant->price,
                    'sale_price' => $variant->sale_price !== null ? (float) $variant->sale_price : null,
                    'effective_price' => $variant->effectivePrice(),
                    'stock_quantity' => (int) $variant->stock_quantity,
                    'is_in_stock' => $variant->stock_quantity > 0,
                    'image_url' => $variant->image_url,
                    'attributes' => is_array($attrs) ? $attrs : [],
                ];
            })->values();

        // 2. Clean and simple attributes list (options for frontend buttons)
        $attributes = [];

        if ($product->attributes->isNotEmpty()) {
            $productValIds = $product->relationLoaded('attributeValues')
                ? $product->attributeValues->pluck('id')->flip()->all()
                : [];

            // Values present across this product's variants
            $variantValuesMap = [];
            foreach ($variants as $v) {
                foreach ($v['attributes'] as $val) {
                    $variantValuesMap[(string) $val] = true;
                }
            }

            foreach ($product->attributes as $attr) {
                // Only include values that actually belong to this specific product or its variants
                $values = $attr->values
                    ->filter(function ($v) use ($productValIds, $variantValuesMap): bool {
                        if (! empty($productValIds)) {
                            return isset($productValIds[$v->id]);
                        }
                        if (! empty($variantValuesMap)) {
                            return isset($variantValuesMap[(string) $v->value]);
                        }

                        return false;
                    })
                    ->values()
                    ->map(fn ($v): array => [
                        'id' => $v->id,
                        'value' => $v->value,
                        'color_code' => $v->color_code,
                    ])->all();

                if (! empty($values)) {
                    $attributes[] = [
                        'name' => $attr->name,
                        'type' => $attr->type?->value ?? (string) $attr->type,
                        'values' => $values,
                    ];
                }
            }
        } else {
            // Fallback: extract attributes directly from variants if no relational attributes
            $grouped = [];
            foreach ($variants as $v) {
                foreach ($v['attributes'] as $name => $val) {
                    $grouped[$name][$val] = true;
                }
            }
            foreach ($grouped as $name => $vals) {
                $attributes[] = [
                    'name' => (string) $name,
                    'type' => 'button',
                    'values' => collect(array_keys($vals))->map(fn ($val): array => [
                        'id' => (string) $val,
                        'value' => (string) $val,
                        'color_code' => null,
                    ])->all(),
                ];
            }
        }

        return array_merge($product->toSummaryArray($isWishlist), [
            'description' => $product->description,
            'specifications' => $product->specifications,
            'return_policy' => $product->return_policy,
            'refund_policy' => $product->refund_policy,
            'delivery_radius_km' => $product->delivery_radius_km !== null ? (float) $product->delivery_radius_km : null,
            'images' => $galleryImages,
            'variants' => $variants,
            'attributes' => $attributes,
        ]);
    }
}

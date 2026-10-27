<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Exception;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Search products with filtering, facets, and pagination.
     */
    public function search(Request $request)
    {
        try {
            $keyword = $request->string('q')->trim()->value();
            $perPage = min(max($request->integer('per_page', 15), 1), 60);

            if ($keyword === '') {
                return $this->returnError('Search query parameter [q] is required.', 'Search query parameter [q] is required.');
            }

            $query = Product::query()
                ->active()
                ->where(function (Builder $q) use ($keyword): void {
                    $q->where('name', 'like', "%{$keyword}%")
                        ->orWhere('sku', 'like', "%{$keyword}%")
                        ->orWhere('short_description', 'like', "%{$keyword}%")
                        ->orWhere('description', 'like', "%{$keyword}%");
                })
                ->with([
                    'brand:id,name,slug',
                    'category:id,name,slug',
                    'primaryImage.media',
                ]);

            // Category filter
            if ($categoryId = $request->input('category_id')) {
                $query->where('category_id', $categoryId);
            }

            // Brand filter
            if ($brandId = $request->input('brand_id')) {
                $query->where('brand_id', $brandId);
            }

            // Price range
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

            // In Stock
            if ($request->boolean('in_stock')) {
                $query->where('stock_quantity', '>', 0);
            }

            // Sorting
            $sortBy = $request->input('sort_by', 'relevance');
            match ($sortBy) {
                'price_asc' => $query->orderByRaw('COALESCE(sale_price, retail_price) ASC'),
                'price_desc' => $query->orderByRaw('COALESCE(sale_price, retail_price) DESC'),
                'name_asc' => $query->orderBy('name', 'asc'),
                'name_desc' => $query->orderBy('name', 'desc'),
                'latest' => $query->orderBy('created_at', 'desc'),
                default => $query->orderBy('created_at', 'desc'),
            };

            $paginator = $query->paginate($perPage);

            $items = array_map(function (Product $product) {
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
                    'retail_price' => (float) $product->retail_price,
                    'sale_price' => $product->sale_price !== null ? (float) $product->sale_price : null,
                    'effective_price' => $product->effectivePrice(),
                    'stock_quantity' => (int) $product->stock_quantity,
                    'is_in_stock' => $product->stock_quantity > 0,
                    'primary_image' => $product->primaryImage?->media?->url,
                ];
            }, $paginator->items());

            return $this->paginatedResponse($paginator, $items, 'Search results retrieved.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Fast search suggestions (autocomplete) for search input dropdowns.
     */
    public function suggestions(Request $request)
    {
        try {
            $keyword = $request->string('q')->trim()->value();

            if (mb_strlen($keyword) < 1) {
                return $this->returnSuccess([
                    'products' => [],
                    'categories' => [],
                    'brands' => [],
                ], 'Search suggestions retrieved.');
            }

            $products = Product::query()
                ->active()
                ->where('name', 'like', "%{$keyword}%")
                ->with('primaryImage.media')
                ->limit(6)
                ->get(['id', 'name', 'slug', 'retail_price', 'sale_price'])
                ->map(fn (Product $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'slug' => $p->slug,
                    'price' => $p->effectivePrice(),
                    'image' => $p->primaryImage?->media?->url,
                ]);

            $categories = Category::query()
                ->active()
                ->where('name', 'like', "%{$keyword}%")
                ->limit(4)
                ->get(['id', 'name', 'slug'])
                ->map(fn (Category $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'slug' => $c->slug,
                ]);

            $brands = Brand::query()
                ->active()
                ->where('name', 'like', "%{$keyword}%")
                ->limit(4)
                ->get(['id', 'name', 'slug'])
                ->map(fn (Brand $b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'slug' => $b->slug,
                ]);

            $data = [
                'products' => $products,
                'categories' => $categories,
                'brands' => $brands,
            ];

            return $this->returnSuccess($data, 'Search suggestions retrieved.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }
}

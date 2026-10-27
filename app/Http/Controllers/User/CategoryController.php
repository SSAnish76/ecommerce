<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    /**
     * Display a listing of active categories (as tree or flat list).
     */
    public function index(Request $request)
    {
        try {
            $asTree = $request->boolean('tree', false);

            if ($asTree) {
                $categories = Category::query()
                    ->active()
                    ->root()
                    ->with(['image', 'children' => fn ($q) => $q->active()->with(['image', 'children'])])
                    ->withCount(['products' => fn ($q) => $q->active()])
                    ->orderBy('sort_order')
                    ->get();

                $data = $categories->map(fn (Category $category) => $this->formatCategoryTree($category));

                return $this->returnSuccess($data, 'Category tree retrieved successfully.');
            }

            $categories = Category::query()
                ->active()
                ->with('image')
                ->withCount(['products' => fn ($q) => $q->active()])
                ->orderBy('sort_order')
                ->get();

            $data = $categories->map(fn (Category $category) => $this->formatCategoryFlat($category));

            return $this->returnSuccess($data, 'Categories retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Display the specified category and its active products.
     */
    public function show(string $slugOrId, Request $request)
    {
        try {
            $query = Category::query()
                ->active()
                ->with(['image', 'parent', 'children' => fn ($q) => $q->active()->with('image')])
                ->withCount(['products' => fn ($q) => $q->active()]);

            $category = Str::isUuid($slugOrId)
                ? $query->where('id', $slugOrId)->first()
                : $query->where('slug', $slugOrId)->first();

            if (! $category) {
                return $this->returnError('Category not found or inactive.', 'Category not found or inactive.', 404);
            }

            $perPage = min(max($request->integer('per_page', 12), 1), 60);

            // Include child category products
            $allCategoryIds = Category::where('parent_id', $category->id)->pluck('id')->push($category->id);

            $productsPaginator = Product::query()
                ->active()
                ->whereIn('category_id', $allCategoryIds)
                ->with(['brand:id,name,slug', 'category:id,name,slug', 'primaryImage.media'])
                ->latest()
                ->paginate($perPage);

            $products = array_map(function (Product $product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'sku' => $product->sku,
                    'mrp' => (float) $product->mrp,
                    'retail_price' => (float) $product->retail_price,
                    'sale_price' => $product->sale_price !== null ? (float) $product->sale_price : null,
                    'effective_price' => $product->effectivePrice(),
                    'stock_quantity' => (int) $product->stock_quantity,
                    'is_in_stock' => $product->stock_quantity > 0,
                    'primary_image' => $product->primaryImage?->media?->url,
                ];
            }, $productsPaginator->items());

            $data = [
                'category' => $this->formatCategoryFlat($category),
                'parent' => $category->parent ? $this->formatCategoryFlat($category->parent) : null,
                'children' => $category->children->map(fn ($c) => $this->formatCategoryFlat($c)),
                'products' => [
                    'data' => $products,
                    'pagination' => [
                        'total' => $productsPaginator->total(),
                        'per_page' => $productsPaginator->perPage(),
                        'current_page' => $productsPaginator->currentPage(),
                        'last_page' => $productsPaginator->lastPage(),
                    ],
                ],
            ];

            return $this->returnSuccess($data, 'Category details retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Format category flat item.
     *
     * @return array<string, mixed>
     */
    protected function formatCategoryFlat(Category $category): array
    {
        return [
            'id' => $category->id,
            'parent_id' => $category->parent_id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'image_url' => $category->image_url,
            'sort_order' => (int) $category->sort_order,
            'products_count' => (int) ($category->products_count ?? 0),
        ];
    }

    /**
     * Format nested category tree.
     *
     * @return array<string, mixed>
     */
    protected function formatCategoryTree(Category $category): array
    {
        $data = $this->formatCategoryFlat($category);
        $data['children'] = $category->children->map(fn (Category $child) => $this->formatCategoryTree($child))->values();

        return $data;
    }
}

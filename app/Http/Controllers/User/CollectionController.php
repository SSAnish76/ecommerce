<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Wishlist;
use Exception;
use Illuminate\Http\Request;

class CollectionController extends Controller
{
    /**
     * Display a listing of active collections.
     */
    public function index()
    {
        try {
            $collections = Collection::query()
                ->active()
                ->with('image')
                ->latest()
                ->get();

            $data = $collections->map(function (Collection $collection) {
                return [
                    'id' => $collection->id,
                    'name' => $collection->name,
                    'slug' => $collection->slug,
                    'type' => $collection->type->value ?? (string) $collection->type,
                    'description' => $collection->description,
                    'image_url' => $collection->image_url,
                ];
            });

            return $this->returnSuccess($data, 'Collections retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Display the specified collection and its assigned items.
     */
    public function show(string $slugOrId, Request $request)
    {
        try {
            $query = Collection::query()->active()->with('image');

            $collection = $query->whereSlugOrId($slugOrId)->first();

            if (! $collection) {
                return $this->returnError(null, 'Collection not found or inactive.');
            }

            $type = $collection->type->value ?? (string) $collection->type;
            $itemsData = [];

            if ($type === 'product') {
                $perPage = $this->resolvePerPage($request);

                $productsPaginator = $collection->products()
                    ->active()
                    ->catalogVisible()
                    ->withSummaryRelations()
                    ->paginate($perPage);

                Product::loadMissingSummaryRelations($productsPaginator->items());

                /** @var Customer|null $customer */
                $customer = $request->user('sanctum') ?? $request->user();
                $wishlistProductIds = Product::resolveWishlistProductIds($productsPaginator->items(), $customer);

                $products = array_map(
                    fn (Product $product) => $product->toSummaryArray(isset($wishlistProductIds[$product->id])),
                    $productsPaginator->items()
                );

                $itemsData = [
                    'type' => 'products',
                    'data' => $products,
                    'pagination' => $this->paginationMeta($productsPaginator),
                ];
            } elseif ($type === 'brand') {
                $brands = $collection->brands()->active()->with('logo')->get();
                $itemsData = [
                    'type' => 'brands',
                    'data' => $brands,
                ];
            } elseif ($type === 'category') {
                $categories = $collection->categories()->active()->with('image')->get();
                $itemsData = [
                    'type' => 'categories',
                    'data' => $categories,
                ];
            } else {
                $itemsData = [
                    'type' => 'custom',
                    'data' => $collection->custom_items ?? [],
                ];
            }

            $data = [
                'collection' => [
                    'id' => $collection->id,
                    'name' => $collection->name,
                    'slug' => $collection->slug,
                    'type' => $type,
                    'description' => $collection->description,
                    'image_url' => $collection->image_url,
                ],
                'items' => $itemsData,
            ];

            return $this->returnSuccess($data, 'Collection details retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\Customer;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CollectionController extends Controller
{
    /**
     * Display a listing of active collections.
     */
    public function index(): JsonResponse
    {
        return $this->safeCall(function (): JsonResponse {
            $collections = Collection::query()
                ->active()
                ->with('image')
                ->latest()
                ->get();

            $data = $collections->map(fn (Collection $collection): array => [
                'id' => $collection->id,
                'name' => $collection->name,
                'slug' => $collection->slug,
                'type' => $collection->type->value ?? (string) $collection->type,
                'description' => $collection->description,
                'image_url' => $collection->image_url,
            ]);

            return $this->returnSuccess($data, 'Collections retrieved successfully.');
        });
    }

    /**
     * Display the specified collection and its assigned items.
     */
    public function show(string $slugOrId, Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($slugOrId, $request): JsonResponse {
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

                /** @var Customer|null $customer */
                $customer = $request->user('sanctum') ?? $request->user();
                $products = Product::formatSummaries($productsPaginator->items(), $customer);

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
        });
    }
}

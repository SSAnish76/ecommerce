<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Controllers\User\Concerns\HandlesUserPagination;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Wishlist;
use Exception;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    use HandlesUserPagination;

    /**
     * Display a listing of products in customer wishlist.
     */
    public function index(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $query = Wishlist::query()
                ->where('customer_id', $customer->id)
                ->with([
                    'product' => function ($q): void {
                        $q->active()->with(['brand:id,name,slug', 'category:id,name,slug', 'primaryImage.media']);
                    },
                ])
                ->latest();

            return $this->paginateAndFormat(
                $query,
                $request,
                fn (Wishlist $wishlist) => $this->formatWishlistItem($wishlist),
                message: 'Wishlist retrieved successfully.'
            );
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Add a product to customer wishlist.
     */
    public function store(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $validated = $request->validate([
                'product_id' => ['required', 'string', 'exists:products,id'],
            ]);

            $product = Product::active()->where('id', $validated['product_id'])->first();
            if (! $product) {
                return $this->returnError('Product not found or unavailable.', 'Product not found or unavailable.', 404);
            }

            $wishlist = Wishlist::firstOrCreate([
                'customer_id' => $customer->id,
                'product_id' => $product->id,
            ]);

            $data = [
                'in_wishlist' => true,
                'wishlist_id' => $wishlist->id,
                'product_id' => $product->id,
            ];

            return $this->returnSuccess($data, 'Product added to wishlist.', 201);
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Remove a product from customer wishlist by product ID.
     */
    public function destroy(string $productId, Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $deleted = Wishlist::where('customer_id', $customer->id)
                ->where(function ($q) use ($productId): void {
                    $q->where('product_id', $productId)->orWhere('id', $productId);
                })
                ->delete();

            if ($deleted === 0) {
                return $this->returnError('Product was not in your wishlist.', 'Product was not in your wishlist.', 404);
            }

            $data = [
                'in_wishlist' => false,
                'product_id' => $productId,
            ];

            return $this->returnSuccess($data, 'Product removed from wishlist.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Toggle product wishlist status (add if missing, remove if present).
     */
    public function toggle(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $validated = $request->validate([
                'product_id' => ['required', 'string', 'exists:products,id'],
            ]);

            $existing = Wishlist::where('customer_id', $customer->id)
                ->where('product_id', $validated['product_id'])
                ->first();

            if ($existing) {
                $existing->delete();

                $data = [
                    'in_wishlist' => false,
                    'product_id' => $validated['product_id'],
                ];

                return $this->returnSuccess($data, 'Product removed from wishlist.');
            }

            $product = Product::active()->where('id', $validated['product_id'])->first();
            if (! $product) {
                return $this->returnError('Product not found or unavailable.', 'Product not found or unavailable.', 404);
            }

            $created = Wishlist::create([
                'customer_id' => $customer->id,
                'product_id' => $product->id,
            ]);

            $data = [
                'in_wishlist' => true,
                'wishlist_id' => $created->id,
                'product_id' => $product->id,
            ];

            return $this->returnSuccess($data, 'Product added to wishlist.', 201);
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Check if a product is in customer wishlist.
     */
    public function check(string $productId, Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $exists = Wishlist::where('customer_id', $customer->id)
                ->where('product_id', $productId)
                ->exists();

            $data = [
                'in_wishlist' => $exists,
                'product_id' => $productId,
            ];

            return $this->returnSuccess($data, 'Wishlist status checked.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Format wishlist item for customer listings.
     *
     * @return array<string, mixed>|null
     */
    protected function formatWishlistItem(Wishlist $wishlist): ?array
    {
        $product = $wishlist->product;
        if (! $product) {
            return null;
        }

        return [
            'wishlist_id' => $wishlist->id,
            'added_at' => $wishlist->created_at?->toISOString(),
            'product' => [
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
            ],
        ];
    }
}


<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use Exception;
use Illuminate\Http\Request;

class CartController extends Controller
{
    /**
     * Display customer shopping cart items with pricing and totals.
     */
    public function index(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $cartData = $this->buildCartData($customer->id);

            return $this->returnSuccess($cartData, 'Cart retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Add an item to customer shopping cart.
     */
    public function store(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $validated = $request->validate([
                'product_id' => ['required', 'string', 'exists:products,id'],
                'product_variant_id' => ['nullable', 'string', 'exists:product_variants,id'],
                'quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            ]);

            $productId = $validated['product_id'];
            $variantId = $validated['product_variant_id'] ?? null;
            $qtyToAdd = (int) $validated['quantity'];

            /** @var Product|null $product */
            $product = Product::active()->where('id', $productId)->first();
            if (!$product) {
                return $this->returnError(null, 'Selected product is not available.', 404);
            }

            if ($variantId !== null) {
                /** @var ProductVariant|null $variant */
                $variant = ProductVariant::active()
                    ->where('id', $variantId)
                    ->where('product_id', $product->id)
                    ->first();

                if (!$variant) {
                    return $this->returnError(
                        null,
                        'Selected variant is not valid for this product or unavailable.'
                    );
                }

                $availableStock = (int) $variant->stock_quantity;
                $itemName = "{$product->name} - {$variant->name}";
            } else {
                $variant = null;
                $availableStock = (int) $product->stock_quantity;
                $itemName = $product->name;
            }

            // Find existing cart item for same product and variant
            $cartItem = CartItem::where('customer_id', $customer->id)
                ->where('product_id', $productId)
                ->when($variantId !== null, fn($q) => $q->where('product_variant_id', $variantId))
                ->when($variantId === null, fn($q) => $q->whereNull('product_variant_id'))
                ->first();

            $targetQuantity = $cartItem ? ($cartItem->quantity + $qtyToAdd) : $qtyToAdd;

            if ($targetQuantity > $availableStock) {
                return $this->returnError(
                    null,
                    "Insufficient stock for '{$itemName}'. Only {$availableStock} available."
                );
            }

            if ($cartItem) {
                $cartItem->update(['quantity' => $targetQuantity]);
            } else {
                $cartItem = CartItem::create([
                    'customer_id' => $customer->id,
                    'product_id' => $productId,
                    'product_variant_id' => $variantId,
                    'quantity' => $targetQuantity,
                ]);
            }

            $cartData = $this->buildCartData($customer->id);

            $data = [
                'item_added' => [
                    'id' => $cartItem->id,
                    'product_id' => $cartItem->product_id,
                    'product_variant_id' => $cartItem->product_variant_id,
                    'quantity' => $cartItem->quantity,
                ],
                'cart' => $cartData,
            ];

            return $this->returnSuccess($data, 'Item added to cart.', 201);
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Update cart item quantity.
     */
    public function update(string $id, Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $validated = $request->validate([
                'quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            ]);

            /** @var CartItem|null $cartItem */
            $cartItem = CartItem::where('customer_id', $customer->id)->where('id', $id)->first();
            if (!$cartItem) {
                return $this->returnError(null, 'Cart item not found.', 404);
            }

            $newQty = (int) $validated['quantity'];

            // Check stock
            if ($cartItem->product_variant_id) {
                $variant = ProductVariant::active()->where('id', $cartItem->product_variant_id)->first();
                if (!$variant || $variant->stock_quantity < $newQty) {
                    $stock = $variant ? $variant->stock_quantity : 0;

                    return $this->returnError(
                        null,
                        "Insufficient stock for variant. Only {$stock} available."
                    );
                }
            } else {
                $product = Product::active()->where('id', $cartItem->product_id)->first();
                if (!$product || $product->stock_quantity < $newQty) {
                    $stock = $product ? $product->stock_quantity : 0;

                    return $this->returnError(
                        null,
                        "Insufficient stock for product. Only {$stock} available."
                    );
                }
            }

            $cartItem->update(['quantity' => $newQty]);

            $cartData = $this->buildCartData($customer->id);

            return $this->returnSuccess($cartData, 'Cart item quantity updated.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Remove a single item from customer shopping cart.
     */
    public function destroy(string $id, Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $cartItem = CartItem::where('customer_id', $customer->id)->where('id', $id)->first();
            if (!$cartItem) {
                return $this->returnError(null, 'Cart item not found.', 404);
            }

            $cartItem->delete();

            $cartData = $this->buildCartData($customer->id);

            return $this->returnSuccess($cartData, 'Item removed from cart.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Clear all items from customer shopping cart.
     */
    public function clear(Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            CartItem::where('customer_id', $customer->id)->delete();

            $data = [
                'items' => [],
                'summary' => [
                    'total_items_count' => 0,
                    'total_quantity' => 0,
                    'subtotal' => 0.0,
                ],
            ];

            return $this->returnSuccess($data, 'Cart cleared successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Build rich cart data structure with real-time pricing and stock checks.
     *
     * @return array<string, mixed>
     */
    protected function buildCartData(string $customerId): array
    {
        $items = CartItem::query()
            ->where('customer_id', $customerId)
            ->with([
                'product' => function ($q): void {
                    $q->with(['brand:id,name,slug', 'category:id,name,slug', 'primaryImage.media']);
                },
                'variant' => function ($q): void {
                    $q->with('media');
                },
            ])
            ->latest()
            ->get();

        $formattedItems = [];
        $subtotal = 0.0;
        $totalQuantity = 0;

        foreach ($items as $item) {
            $product = $item->product;
            if (!$product) {
                continue;
            }

            $variant = $item->variant;
            $qty = (int) $item->quantity;

            if ($variant) {
                $unitPrice = $variant->effectivePrice();
                $name = "{$product->name} - {$variant->name}";
                $sku = $variant->sku;
                $imageUrl = $variant->image_url ?: $product->primaryImage?->media?->url;
                $availableStock = (int) $variant->stock_quantity;
                $attributes = $variant->attributes;
            } else {
                $unitPrice = $product->effectivePrice();
                $name = $product->name;
                $sku = $product->sku;
                $imageUrl = $product->primaryImage?->media?->url;
                $availableStock = (int) $product->stock_quantity;
                $attributes = null;
            }

            $lineTotal = round($unitPrice * $qty, 2);
            $subtotal += $lineTotal;
            $totalQuantity += $qty;

            $formattedItems[] = [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_variant_id' => $item->product_variant_id,
                'name' => $name,
                'sku' => $sku,
                'image_url' => $imageUrl,
                'attributes' => $attributes,
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
                'available_stock' => $availableStock,
                'is_in_stock' => $availableStock >= $qty,
            ];
        }

        return [
            'items' => $formattedItems,
            'summary' => [
                'total_items_count' => count($formattedItems),
                'total_quantity' => $totalQuantity,
                'subtotal' => round($subtotal, 2),
            ],
        ];
    }
}

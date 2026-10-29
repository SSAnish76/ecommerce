<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Enums\Product\StockVisibility;
use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    /**
     * Display customer shopping cart items with pricing and totals.
     */
    public function index(Request $request): JsonResponse
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
    public function store(Request $request): JsonResponse
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $validated = $request->validate([
                'product_id' => ['required', 'string', 'exists:products,id'],
                'product_variant_id' => [
                    'nullable',
                    'string',
                    Rule::exists('product_variants', 'id')->where(
                        fn ($query) => $query->where('product_id', $request->input('product_id'))
                    ),
                ],
                'quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            ], [
                'product_variant_id.exists' => 'Selected variant is not valid for this product or unavailable.',
            ]);

            $productId = $validated['product_id'];
            $variantId = $validated['product_variant_id'] ?? null;
            $qtyToAdd = (int) $validated['quantity'];

            /** @var Product|null $product */
            $product = Product::active()->find($productId);
            if (! $product) {
                return $this->returnError(null, 'Selected product is not available.');
            }

            if ($product->shouldHideWhenOutOfStock()) {
                return $this->returnError(null, 'Selected product is out of stock and unavailable.');
            }

            $hasVariants = (bool) ($product->has_variants || $product->variants()->exists());

            if ($hasVariants && empty($variantId)) {
                return $this->returnError(
                    null,
                    'This product has variants. Please select a variant to add to cart.'
                );
            }

            if (! $hasVariants && ! empty($variantId)) {
                return $this->returnError(
                    null,
                    'This product does not have variants. Variant ID should not be provided.'
                );
            }

            if ($variantId !== null) {
                /** @var ProductVariant|null $variant */
                $variant = ProductVariant::active()
                    ->where('id', $variantId)
                    ->where('product_id', $product->id)
                    ->first();

                if (! $variant) {
                    return $this->returnError(
                        null,
                        'Selected variant is not valid for this product or unavailable.'
                    );
                }

                $availableStock = (int) $variant->stock_quantity;
                $itemName = $variant->displayName($product);
            } else {
                $availableStock = (int) $product->stock_quantity;
                $itemName = $product->name;
            }

            // Find existing cart item for same product and variant
            $cartItem = CartItem::where('customer_id', $customer->id)
                ->where('product_id', $productId)
                ->where('product_variant_id', $variantId)
                ->first();

            $targetQuantity = $cartItem ? ($cartItem->quantity + $qtyToAdd) : $qtyToAdd;

            // Stock validation based on Out-of-Stock Catalog Visibility
            $effectiveVisibility = $product->effectiveStockVisibility();

            if ($effectiveVisibility === StockVisibility::Hide && $availableStock <= 0) {
                return $this->returnError(
                    null,
                    "Product '{$itemName}' is currently out of stock and unavailable."
                );
            }

            if ($effectiveVisibility !== StockVisibility::Backorder && $targetQuantity > $availableStock) {
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

            return $this->returnSuccess([
                'item_added' => [
                    'id' => $cartItem->id,
                    'product_id' => $cartItem->product_id,
                    'product_variant_id' => $cartItem->product_variant_id,
                    'quantity' => $cartItem->quantity,
                ],
                'cart' => $cartData,
            ], 'Item added to cart.', 201);
        } catch (ValidationException $e) {
            return $this->returnError($e->errors(), 'Validation failed.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Update cart item quantity.
     */
    public function update(string $id, Request $request): JsonResponse
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $validated = $request->validate([
                'quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            ]);

            /** @var CartItem|null $cartItem */
            $cartItem = CartItem::where('customer_id', $customer->id)
                ->with(['variant', 'product'])
                ->find($id);

            if (! $cartItem) {
                return $this->returnError(null, 'Cart item not found.');
            }

            $newQty = (int) $validated['quantity'];
            $product = $cartItem->product;
            $effectiveVisibility = $product?->effectiveStockVisibility() ?? StockVisibility::Badge;

            // Check stock using preloaded relationships
            if ($cartItem->product_variant_id) {
                $variant = $cartItem->variant;
                if (! $variant || ! $variant->isActive()) {
                    return $this->returnError(
                        null,
                        'Selected variant is no longer available.'
                    );
                }

                $stock = (int) $variant->stock_quantity;
                $itemName = $variant->displayName($product);

                if ($effectiveVisibility === StockVisibility::Hide && $stock <= 0) {
                    return $this->returnError(
                        null,
                        "Variant '{$itemName}' is currently out of stock and unavailable."
                    );
                }

                if ($effectiveVisibility !== StockVisibility::Backorder && $stock < $newQty) {
                    return $this->returnError(
                        null,
                        "Insufficient stock for variant. Only {$stock} available."
                    );
                }
            } else {
                if (! $product || ! $product->isActive()) {
                    return $this->returnError(
                        null,
                        'Selected product is no longer available.'
                    );
                }

                $stock = (int) $product->stock_quantity;
                $itemName = $product->name;

                if ($effectiveVisibility === StockVisibility::Hide && $stock <= 0) {
                    return $this->returnError(
                        null,
                        "Product '{$itemName}' is currently out of stock and unavailable."
                    );
                }

                if ($effectiveVisibility !== StockVisibility::Backorder && $stock < $newQty) {
                    return $this->returnError(
                        null,
                        "Insufficient stock for product. Only {$stock} available."
                    );
                }
            }

            $cartItem->update(['quantity' => $newQty]);

            $cartData = $this->buildCartData($customer->id);

            return $this->returnSuccess($cartData, 'Cart item quantity updated.');
        } catch (ValidationException $e) {
            return $this->returnError($e->errors(), 'Validation failed.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Remove a single item from customer shopping cart.
     */
    public function destroy(string $id, Request $request): JsonResponse
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $deleted = CartItem::where('customer_id', $customer->id)->where('id', $id)->delete();
            if (! $deleted) {
                return $this->returnError(null, 'Cart item not found.');
            }

            $cartData = $this->buildCartData($customer->id);

            return $this->returnSuccess($cartData, 'Item removed from cart.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Clear all items from customer shopping cart.
     */
    public function clear(Request $request): JsonResponse
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
                'product.primaryImage.media',
                'variant.media',
            ])
            ->latest()
            ->get();

        $formattedItems = [];
        $subtotal = 0.0;
        $totalQuantity = 0;

        foreach ($items as $item) {
            $product = $item->product;
            if (! $product) {
                continue;
            }

            $variant = $item->variant;
            $qty = (int) $item->quantity;

            if ($variant) {
                $unitPrice = $variant->effectivePrice();
                $name = $variant->displayName($product);
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

            $effectiveVisibility = $product->effectiveStockVisibility();
            $allowsBackorder = $effectiveVisibility === StockVisibility::Backorder;
            $hasStock = $availableStock >= $qty;
            $isBackorder = ! $hasStock && $allowsBackorder;

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
                'is_in_stock' => $hasStock,
                'allows_backorder' => $allowsBackorder,
                'is_backorder' => $isBackorder,
                'stock_visibility' => $effectiveVisibility->value,
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

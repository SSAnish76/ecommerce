<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Events\Order\OrderPlaced;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Services\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ShopController extends Controller
{
    public function __construct(
        protected CouponService $couponService
    ) {}
    /**
     * Display the dynamic customer product detail page with reactive variant selection.
     */
    public function show(Product $product): Response
    {
        // Ensure active
        if ($product->status->value !== 'active') {
            abort(404, 'Product not found or unavailable.');
        }

        $product->load([
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

        // Related recommendations from same category or brand
        $relatedProducts = Product::query()
            ->active()
            ->where('id', '!=', $product->id)
            ->when($product->category_id, fn ($q) => $q->where('category_id', $product->category_id))
            ->with(['primaryImage.media', 'brand:id,name'])
            ->limit(4)
            ->get();

        return Inertia::render('Shop/ProductDetail', [
            'product' => $product,
            'relatedProducts' => $relatedProducts,
        ]);
    }

    /**
     * Process checkout and place order with atomic inventory deduction.
     */
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_email' => ['required', 'email', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:50'],
            'shipping_address' => ['required', 'string', 'max:1000'],
            'payment_method' => ['required', 'string', 'in:cod,card,wire'],
            'notes' => ['nullable', 'string', 'max:500'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'string', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'string', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        try {
            $order = DB::transaction(function () use ($validated): Order {
                $subtotal = 0.0;
                $processedItems = [];

                foreach ($validated['items'] as $itemData) {
                    $qty = (int) $itemData['quantity'];
                    $variantId = $itemData['product_variant_id'] ?? null;

                    if ($variantId !== null) {
                        /** @var ProductVariant|null $variant */
                        $variant = ProductVariant::where('id', $variantId)
                            ->lockForUpdate()
                            ->with('product')
                            ->first();

                        if (! $variant || ! $variant->is_active) {
                            throw new \RuntimeException('Selected product variant is no longer active or available.');
                        }

                        $allowsBackorder = $variant->product?->allowsBackorder() ?? false;
                        if (! $allowsBackorder && $variant->stock_quantity < $qty) {
                            throw new \RuntimeException("Insufficient stock for '{$variant->name}'. Only {$variant->stock_quantity} available.");
                        }

                        // Atomic stock decrement
                        $variant->decrement('stock_quantity', $qty);

                        // Also decrement parent product stock
                        if ($variant->product) {
                            $parentProduct = Product::where('id', $variant->product->id)->lockForUpdate()->first();
                            if ($parentProduct) {
                                $parentProduct->decrement('stock_quantity', min($parentProduct->stock_quantity, $qty));
                            }
                        }

                        $unitPrice = $variant->effectivePrice();
                        $lineSubtotal = round($unitPrice * $qty, 2);
                        $subtotal += $lineSubtotal;

                        $processedItems[] = [
                            'product_id' => $variant->product_id,
                            'product_variant_id' => $variant->id,
                            'product_name' => $variant->product ? $variant->product->name : $variant->name,
                            'variant_name' => $variant->name,
                            'sku' => $variant->sku,
                            'price' => $unitPrice,
                            'quantity' => $qty,
                            'subtotal' => $lineSubtotal,
                            'attributes' => $variant->attributes,
                            'image_url' => $variant->image_url,
                        ];
                    } else {
                        // Standard product without variant
                        /** @var Product|null $product */
                        $product = Product::where('id', $itemData['product_id'])->lockForUpdate()->first();

                        if (! $product || $product->status->value !== 'active') {
                            throw new \RuntimeException('Product is no longer available.');
                        }

                        $allowsBackorder = $product->allowsBackorder();
                        if (! $allowsBackorder && $product->stock_quantity < $qty) {
                            throw new \RuntimeException("Insufficient stock for '{$product->name}'. Only {$product->stock_quantity} available.");
                        }

                        $product->decrement('stock_quantity', $qty);
                        $unitPrice = $product->effectivePrice();
                        $lineSubtotal = round($unitPrice * $qty, 2);
                        $subtotal += $lineSubtotal;

                        $primaryImg = $product->images()->where('is_primary', true)->with('media')->first();

                        $processedItems[] = [
                            'product_id' => $product->id,
                            'product_variant_id' => null,
                            'product_name' => $product->name,
                            'variant_name' => null,
                            'sku' => $product->sku,
                            'price' => $unitPrice,
                            'quantity' => $qty,
                            'subtotal' => $lineSubtotal,
                            'attributes' => null,
                            'image_url' => $primaryImg?->media?->url,
                        ];
                    }
                }

                // Coupon Discount Processing
                $couponCode = ! empty($validated['coupon_code']) ? strtoupper(trim($validated['coupon_code'])) : null;
                $discountAmount = 0.0;
                $applicableCoupon = null;

                if ($couponCode !== null) {
                    $couponResult = $this->couponService->validate(
                        $couponCode,
                        $subtotal,
                        $processedItems,
                        $validated['customer_email']
                    );

                    if (! $couponResult['valid']) {
                        throw new \RuntimeException($couponResult['message']);
                    }

                    $discountAmount = $couponResult['discount'];
                    $applicableCoupon = $couponResult['coupon'] ?? null;
                }

                $tax = 0.0;
                $shippingFee = 0.0;
                $total = round(max(0.0, $subtotal - $discountAmount) + $tax + $shippingFee, 2);

                $orderNumber = Order::generateOrderNumber();

                $order = Order::create([
                    'order_number' => $orderNumber,
                    'customer_name' => $validated['customer_name'],
                    'customer_email' => $validated['customer_email'],
                    'customer_phone' => $validated['customer_phone'] ?? null,
                    'shipping_address' => $validated['shipping_address'],
                    'subtotal' => $subtotal,
                    'coupon_code' => $couponCode,
                    'discount_amount' => $discountAmount,
                    'tax' => $tax,
                    'shipping_fee' => $shippingFee,
                    'total' => $total,
                    'status' => 'pending',
                    'payment_method' => $validated['payment_method'],
                    'payment_status' => 'pending',
                    'notes' => $validated['notes'] ?? null,
                ]);

                foreach ($processedItems as $item) {
                    $item['order_id'] = $order->id;
                    OrderItem::create($item);
                }

                if ($applicableCoupon !== null && $discountAmount > 0) {
                    $this->couponService->recordUsage($applicableCoupon, $order, $discountAmount, $validated['customer_email']);
                }

                return $order->load('items');
            });

            // Dispatch order placed event for customer and admin notifications
            OrderPlaced::dispatch([
                'order_number' => $order->order_number,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
                'total' => $order->total,
                'currency' => (string) Setting::get('currency_symbol', '$'),
                'items' => $order->items->map(fn (OrderItem $item) => [
                    'name' => $item->product_name ?? 'Product',
                    'quantity' => (int) $item->quantity,
                    'price' => (float) $item->price,
                ])->values()->all(),
                'payment_method' => is_string($order->payment_method) ? $order->payment_method : $order->payment_method?->value,
                'shipping_address' => $order->shipping_address,
            ]);

            return response()->json([
                'success' => true,
                'order' => $order,
                'message' => "Order #{$order->order_number} placed successfully!",
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Validate coupon code for storefront checkout.
     */
    public function validateCoupon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'items' => ['nullable', 'array'],
            'customer_email' => ['nullable', 'email'],
        ]);

        $result = $this->couponService->validate(
            $validated['code'],
            (float) $validated['subtotal'],
            $validated['items'] ?? [],
            $validated['customer_email'] ?? null
        );

        return response()->json([
            'success' => $result['valid'],
            'discount' => $result['discount'],
            'message' => $result['message'],
            'coupon' => $result['valid'] && isset($result['coupon']) ? [
                'code' => $result['coupon']->code,
                'name' => $result['coupon']->name,
                'type' => $result['coupon']->type->value,
                'value' => $result['coupon']->value,
            ] : null,
        ], $result['valid'] ? 200 : 422);
    }
}

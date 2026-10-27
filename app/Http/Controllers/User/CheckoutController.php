<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Enums\Order\OrderStatus;
use App\Enums\Order\PaymentMethod;
use App\Enums\Order\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Mail\Order\OrderPlacedAdminMail;
use App\Mail\Order\OrderPlacedCustomerMail;
use App\Models\Address;
use App\Models\CartItem;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Services\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CheckoutController extends Controller
{
    public function __construct(
        protected CouponService $couponService
    ) {}

    /**
     * Preview checkout summary, item calculations, and applicable coupon discount.
     */
    public function summary(Request $request)
    {
        /** @var Customer|null $customer */
        $customer = $request->user();

        $validated = $request->validate([
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'address_id' => ['nullable', 'string', 'exists:addresses,id'],
            'use_cart' => ['nullable', 'boolean'],
            'items' => ['nullable', 'array'],
            'items.*.product_id' => ['required_with:items', 'string', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'string', 'exists:product_variants,id'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],
        ]);

        try {
            $itemsPayload = $this->resolveCheckoutItems($customer, $validated);

            $subtotal = 0.0;
            $itemsSummary = [];
            $couponItems = [];

            foreach ($itemsPayload as $itemData) {
                $qty = (int) $itemData['quantity'];
                $variantId = $itemData['product_variant_id'] ?? null;

                if ($variantId !== null) {
                    /** @var ProductVariant|null $variant */
                    $variant = ProductVariant::where('id', $variantId)->with(['product', 'media'])->first();
                    if (! $variant || ! $variant->is_active) {
                        return $this->returnError(
                            'One or more selected items are no longer active.',
                            'One or more selected items are no longer active.'
                        );
                    }

                    $unitPrice = $variant->effectivePrice();
                    $lineTotal = round($unitPrice * $qty, 2);
                    $subtotal += $lineTotal;

                    $itemsSummary[] = [
                        'product_id' => $variant->product_id,
                        'product_variant_id' => $variant->id,
                        'name' => "{$variant->product?->name} - {$variant->name}",
                        'sku' => $variant->sku,
                        'unit_price' => $unitPrice,
                        'quantity' => $qty,
                        'subtotal' => $lineTotal,
                        'available_stock' => $variant->stock_quantity,
                        'is_in_stock' => $variant->stock_quantity >= $qty,
                        'image_url' => $variant->image_url ?: $variant->product?->primaryImage?->media?->url,
                    ];

                    $couponItems[] = [
                        'product_id' => $variant->product_id,
                        'price' => $unitPrice,
                        'quantity' => $qty,
                        'category_id' => $variant->product?->category_id,
                    ];
                } else {
                    /** @var Product|null $product */
                    $product = Product::where('id', $itemData['product_id'])->with('primaryImage.media')->first();
                    if (! $product || $product->status->value !== 'active') {
                        return $this->returnError(
                            'One or more selected products are no longer active.',
                            'One or more selected products are no longer active.'
                        );
                    }

                    $unitPrice = $product->effectivePrice();
                    $lineTotal = round($unitPrice * $qty, 2);
                    $subtotal += $lineTotal;

                    $itemsSummary[] = [
                        'product_id' => $product->id,
                        'product_variant_id' => null,
                        'name' => $product->name,
                        'sku' => $product->sku,
                        'unit_price' => $unitPrice,
                        'quantity' => $qty,
                        'subtotal' => $lineTotal,
                        'available_stock' => $product->stock_quantity,
                        'is_in_stock' => $product->stock_quantity >= $qty,
                        'image_url' => $product->primaryImage?->media?->url,
                    ];

                    $couponItems[] = [
                        'product_id' => $product->id,
                        'price' => $unitPrice,
                        'quantity' => $qty,
                        'category_id' => $product->category_id,
                    ];
                }
            }

            // Coupon Calculation
            $couponCode = ! empty($validated['coupon_code']) ? strtoupper(trim($validated['coupon_code'])) : null;
            $discountAmount = 0.0;
            $couponInfo = null;

            if ($couponCode !== null) {
                $couponResult = $this->couponService->validate(
                    $couponCode,
                    $subtotal,
                    $couponItems,
                    $customer?->email
                );

                if ($couponResult['valid']) {
                    $discountAmount = $couponResult['discount'];
                    $couponInfo = [
                        'code' => $couponResult['coupon']?->code ?? $couponCode,
                        'name' => $couponResult['coupon']?->name ?? $couponCode,
                        'discount' => $discountAmount,
                        'message' => $couponResult['message'],
                    ];
                } else {
                    return $this->returnError($couponResult['message'], $couponResult['message']);
                }
            }

            $tax = 0.0;
            $shippingFee = 0.0;
            $total = round(max(0.0, $subtotal - $discountAmount) + $tax + $shippingFee, 2);

            // Address preview
            $shippingAddress = null;
            if (! empty($validated['address_id']) && $customer) {
                $addr = Address::where('customer_id', $customer->id)->where('id', $validated['address_id'])->first();
                $shippingAddress = $addr?->formatted_address;
            } elseif ($customer) {
                $defaultAddr = Address::where('customer_id', $customer->id)->where('is_default', true)->first();
                $shippingAddress = $defaultAddr?->formatted_address;
            }

            $data = [
                'items' => $itemsSummary,
                'shipping_address' => $shippingAddress,
                'totals' => [
                    'subtotal' => round($subtotal, 2),
                    'discount_amount' => $discountAmount,
                    'tax' => $tax,
                    'shipping_fee' => $shippingFee,
                    'total' => $total,
                ],
                'coupon' => $couponInfo,
            ];

            return $this->returnSuccess($data, 'Checkout summary calculated successfully.');
        } catch (\Throwable $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Validate coupon code for storefront checkout.
     */
    public function validateCoupon(Request $request)
    {
        try {
            $validated = $request->validate([
                'code' => ['required', 'string'],
                'subtotal' => ['required', 'numeric', 'min:0'],
                'items' => ['nullable', 'array'],
            ]);

            $customer = $request->user();

            $result = $this->couponService->validate(
                $validated['code'],
                (float) $validated['subtotal'],
                $validated['items'] ?? [],
                $customer?->email
            );

            if (! $result['valid']) {
                return $this->returnError($result['message'], $result['message']);
            }

            $data = [
                'code' => $result['coupon']?->code ?? strtoupper(trim($validated['code'])),
                'discount' => $result['discount'],
                'type' => $result['coupon']?->type?->value ?? (string) ($result['coupon']?->type ?? 'fixed'),
                'value' => (float) ($result['coupon']?->value ?? 0),
            ];

            return $this->returnSuccess($data, $result['message']);
        } catch (\Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Process checkout, deduct stock atomically, create order and order items.
     */
    public function checkout(Request $request)
    {
        /** @var Customer|null $customer */
        $customer = $request->user();

        $validated = $request->validate([
            'customer_name' => ['nullable', 'string', 'max:255'],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:50'],
            'address_id' => ['nullable', 'string', 'exists:addresses,id'],
            'shipping_address' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
            'notes' => ['nullable', 'string', 'max:500'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'use_cart' => ['nullable', 'boolean'],
            'items' => ['nullable', 'array'],
            'items.*.product_id' => ['required_with:items', 'string', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'string', 'exists:product_variants,id'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],
        ]);

        // Resolve customer details
        $customerName = $validated['customer_name'] ?? $customer?->name;
        $customerEmail = $validated['customer_email'] ?? $customer?->email;
        $customerPhone = $validated['customer_phone'] ?? $customer?->phone;

        if (empty($customerName) || empty($customerEmail)) {
            return $this->returnError('Customer name and email are required for checkout.', 'Customer name and email are required for checkout.');
        }

        // Resolve shipping address
        $shippingAddress = $validated['shipping_address'] ?? null;
        if (empty($shippingAddress) && ! empty($validated['address_id']) && $customer) {
            $addr = Address::where('customer_id', $customer->id)->where('id', $validated['address_id'])->first();
            $shippingAddress = $addr?->formatted_address;
        } elseif (empty($shippingAddress) && $customer) {
            $defaultAddr = Address::where('customer_id', $customer->id)->where('is_default', true)->first();
            $shippingAddress = $defaultAddr?->formatted_address;
        }

        if (empty($shippingAddress)) {
            return $this->returnError('A valid shipping address is required.', 'A valid shipping address is required.');
        }

        try {
            $rawItems = $this->resolveCheckoutItems($customer, $validated);

            $order = DB::transaction(function () use ($rawItems, $validated, $customerName, $customerEmail, $customerPhone, $shippingAddress, $customer): Order {
                $subtotal = 0.0;
                $processedItems = [];

                foreach ($rawItems as $itemData) {
                    $qty = (int) $itemData['quantity'];
                    $variantId = $itemData['product_variant_id'] ?? null;

                    if ($variantId !== null) {
                        /** @var ProductVariant|null $variant */
                        $variant = ProductVariant::where('id', $variantId)
                            ->lockForUpdate()
                            ->with('product')
                            ->first();

                        if (! $variant || ! $variant->is_active) {
                            throw new \RuntimeException("Variant '{$variantId}' is no longer active or available.");
                        }

                        if ($variant->stock_quantity < $qty) {
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
                        /** @var Product|null $product */
                        $product = Product::where('id', $itemData['product_id'])->lockForUpdate()->first();

                        if (! $product || $product->status->value !== 'active') {
                            throw new \RuntimeException('Product is no longer available.');
                        }

                        if ($product->stock_quantity < $qty) {
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
                        $customerEmail
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

                $orderNumber = 'ORD-'.strtoupper(Str::random(8));

                $order = Order::create([
                    'customer_id' => $customer?->id,
                    'order_number' => $orderNumber,
                    'customer_name' => $customerName,
                    'customer_email' => $customerEmail,
                    'customer_phone' => $customerPhone,
                    'shipping_address' => $shippingAddress,
                    'subtotal' => $subtotal,
                    'coupon_code' => $couponCode,
                    'discount_amount' => $discountAmount,
                    'tax' => $tax,
                    'shipping_fee' => $shippingFee,
                    'total' => $total,
                    'status' => OrderStatus::Pending->value,
                    'payment_method' => $validated['payment_method'],
                    'payment_status' => PaymentStatus::Pending->value,
                    'notes' => $validated['notes'] ?? null,
                ]);

                foreach ($processedItems as $item) {
                    $item['order_id'] = $order->id;
                    OrderItem::create($item);
                }

                if ($applicableCoupon !== null && $discountAmount > 0) {
                    $this->couponService->recordUsage($applicableCoupon, $order, $discountAmount, $customerEmail);
                }

                // If customer checked out with cart items, clear the cart
                if ($customer && ($validated['use_cart'] ?? false || empty($validated['items']))) {
                    CartItem::where('customer_id', $customer->id)->delete();
                }

                return $order->load('items');
            });

            // Dispatch customer and admin notifications safely
            try {
                Mail::to($order->customer_email)->send(new OrderPlacedCustomerMail([
                    'order_number' => $order->order_number,
                    'customer_name' => $order->customer_name,
                    'total' => $order->total,
                ]));
            } catch (\Throwable $e) {
                Log::info("Customer order confirmation mail failed: {$e->getMessage()}");
            }

            try {
                $adminEmail = Setting::get('admin_notification_email', 'admin@example.com');
                Mail::to($adminEmail)->send(new OrderPlacedAdminMail([
                    'order_number' => $order->order_number,
                    'customer_name' => $order->customer_name,
                    'total' => $order->total,
                ]));
            } catch (\Throwable $e) {
                Log::info("Admin order alert mail failed: {$e->getMessage()}");
            }

            $data = [
                'order' => $order,
            ];

            return $this->returnSuccess($data, "Order #{$order->order_number} placed successfully!", 201);
        } catch (\Throwable $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Resolve items from explicit request payload or customer cart.
     *
     * @param  array<string, mixed>  $validated
     * @return array<int, array{product_id: string, product_variant_id: ?string, quantity: int}>
     */
    protected function resolveCheckoutItems(?Customer $customer, array $validated): array
    {
        if (! empty($validated['items'])) {
            return $validated['items'];
        }

        if ($customer && ($validated['use_cart'] ?? true)) {
            $cartItems = CartItem::where('customer_id', $customer->id)->get();
            if ($cartItems->isEmpty()) {
                throw new \RuntimeException('Your shopping cart is currently empty.');
            }

            return $cartItems->map(fn (CartItem $c) => [
                'product_id' => $c->product_id,
                'product_variant_id' => $c->product_variant_id,
                'quantity' => $c->quantity,
            ])->all();
        }

        throw new \RuntimeException('No items provided for checkout.');
    }
}

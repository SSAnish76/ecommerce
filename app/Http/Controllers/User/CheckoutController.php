<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Enums\Address\AddressType;
use App\Enums\Order\OrderStatus;
use App\Enums\Order\PaymentMethod;
use App\Enums\Order\PaymentStatus;
use App\Events\Order\OrderPlaced;
use App\Http\Controllers\Controller;
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
use Illuminate\Validation\Rule;

class CheckoutController extends Controller
{
    public function __construct(
        protected CouponService $couponService
    ) {}

    /**
     * Preview checkout summary, item calculations, and applicable coupon discount.
     */
    public function summary(Request $request): JsonResponse
    {
        /** @var Customer|null $customer */
        $customer = $request->user();

        $validated = $request->validate([
            'shipping_address_id' => ['nullable', 'string', 'exists:addresses,id'],
            'shipping_address' => ['nullable'],
            'billing_address_id' => ['nullable', 'string', 'exists:addresses,id'],
            'billing_address' => ['nullable'],
            'billing_same_as_shipping' => ['nullable', 'boolean'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
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

            // Customer and address preview
            $shippingInput = $validated['shipping_address'] ?? ($request->filled('address_line_1') ? $request->only(['name', 'phone', 'address_line_1', 'address_line_2', 'city', 'state', 'postal_code', 'country']) : null);
            $shippingAddress = $this->resolveAddress($shippingInput, $validated['shipping_address_id'] ?? null, $customer, AddressType::Shipping);

            $billingSameAsShipping = (bool) ($validated['billing_same_as_shipping'] ?? true);
            $billingInput = $validated['billing_address'] ?? null;
            $billingAddressId = $validated['billing_address_id'] ?? null;

            if ($billingSameAsShipping && empty($billingAddressId) && empty($billingInput)) {
                $billingAddress = $shippingAddress;
            } else {
                $billingAddress = $this->resolveAddress($billingInput, $billingAddressId, $customer, AddressType::Billing) ?? $shippingAddress;
            }

            $data = [
                'items' => $itemsSummary,
                'shipping_address' => $shippingAddress,
                'billing_address' => $billingAddress,
                'billing_same_as_shipping' => $billingSameAsShipping,
                'customer' => $customer ? [
                    'name' => $customer->name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                ] : null,
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
    public function validateCoupon(Request $request): JsonResponse
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
        } catch (\Throwable $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Process checkout, deduct stock atomically, create order and order items.
     */
    public function checkout(Request $request): JsonResponse
    {
        /** @var Customer|null $customer */
        $customer = $request->user();

        if (! $customer) {
            return $this->returnError('Customer must be logged in to checkout.', 'Customer must be logged in to checkout.', 401);
        }

        $validated = $request->validate([
            'shipping_address_id' => ['nullable', 'string', 'exists:addresses,id'],
            'shipping_address' => ['nullable'],
            'billing_address_id' => ['nullable', 'string', 'exists:addresses,id'],
            'billing_address' => ['nullable'],
            'billing_same_as_shipping' => ['nullable', 'boolean'],
            'save_address' => ['nullable', 'boolean'],
            'save_billing_address' => ['nullable', 'boolean'],
            'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
            'notes' => ['nullable', 'string', 'max:500'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'use_cart' => ['nullable', 'boolean'],
            'items' => ['nullable', 'array'],
            'items.*.product_id' => ['required_with:items', 'string', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'string', 'exists:product_variants,id'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],
        ]);

        $customerName = $customer->name;
        $customerEmail = $customer->email;
        $customerPhone = $customer->phone;

        // Resolve shipping address
        $shippingInput = $validated['shipping_address'] ?? ($request->filled('address_line_1') ? $request->only(['name', 'phone', 'address_line_1', 'address_line_2', 'city', 'state', 'postal_code', 'country']) : null);
        $shippingAddress = $this->resolveAddress($shippingInput, $validated['shipping_address_id'] ?? null, $customer, AddressType::Shipping);

        if (empty($shippingAddress)) {
            return $this->returnError('A valid shipping address is required.', 'A valid shipping address is required.');
        }

        // Save phone to customer profile if provided and customer does not yet have one
        if (empty($customerPhone) && is_array($shippingInput) && ! empty($shippingInput['phone'])) {
            $customerPhone = $shippingInput['phone'];
            $customer->update(['phone' => $customerPhone]);
        }

        // Save shipping address for future use if requested
        if (! empty($validated['save_address']) && empty($validated['shipping_address_id']) && ! empty($shippingInput)) {
            $this->saveAddressForCustomer($customer, $shippingInput, AddressType::Shipping);
        }

        // Resolve billing address
        $billingSameAsShipping = (bool) ($validated['billing_same_as_shipping'] ?? true);
        $billingInput = $validated['billing_address'] ?? null;
        $billingAddressId = $validated['billing_address_id'] ?? null;

        if ($billingSameAsShipping && empty($billingAddressId) && empty($billingInput)) {
            $billingAddress = $shippingAddress;
        } else {
            $billingAddress = $this->resolveAddress($billingInput, $billingAddressId, $customer, AddressType::Billing) ?? $shippingAddress;
        }

        // Save billing address for future use if requested
        if (! empty($validated['save_billing_address']) && empty($billingAddressId) && ! empty($billingInput)) {
            $this->saveAddressForCustomer($customer, $billingInput, AddressType::Billing);
        }

        try {
            $rawItems = $this->resolveCheckoutItems($customer, $validated);

            $order = DB::transaction(function () use ($rawItems, $validated, $customerName, $customerEmail, $customerPhone, $shippingAddress, $billingAddress, $customer): Order {
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

                $orderNumber = Order::generateOrderNumber();

                $order = Order::create([
                    'customer_id' => $customer->id,
                    'order_number' => $orderNumber,
                    'customer_name' => $customerName,
                    'customer_email' => $customerEmail,
                    'customer_phone' => $customerPhone,
                    'shipping_address' => $shippingAddress,
                    'billing_address' => $billingAddress,
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
                if ($validated['use_cart'] ?? false || empty($validated['items'])) {
                    CartItem::where('customer_id', $customer->id)->delete();
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
                'billing_address' => $order->billing_address,
            ]);

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

    /**
     * Resolve a formatted address string from explicit data, address ID, or customer's saved address.
     */
    protected function resolveAddress(mixed $addressData, ?string $addressId, ?Customer $customer, AddressType $type = AddressType::Shipping): ?string
    {
        // 1. If an address ID is provided, fetch from customer's saved addresses
        if ($addressId && $customer) {
            $saved = Address::where('customer_id', $customer->id)->find($addressId);
            if ($saved) {
                return $saved->formatted_address;
            }
        }

        // 2. If address data (string or array) is provided, format it
        if (! empty($addressData)) {
            return $this->formatAddress($addressData, $customer);
        }

        // 3. Fallback to customer's default address for the type (or general default)
        if ($customer) {
            $default = Address::where('customer_id', $customer->id)
                ->where(fn ($q) => $q->where('type', $type)->orWhere('is_default', true))
                ->orderBy('is_default', 'desc')
                ->first();

            return $default?->formatted_address;
        }

        return null;
    }

    /**
     * Format a string or array address payload into a unified string.
     */
    protected function formatAddress(mixed $addressData, ?Customer $customer = null): ?string
    {
        if (empty($addressData)) {
            return null;
        }

        if (is_string($addressData)) {
            return trim($addressData);
        }

        if (is_array($addressData)) {
            $parts = array_filter([
                $addressData['name'] ?? $customer?->name,
                ! empty($addressData['phone'] ?? $customer?->phone) ? 'Tel: ' . ($addressData['phone'] ?? $customer?->phone) : null,
                $addressData['address_line_1'] ?? $addressData['address'] ?? null,
                $addressData['address_line_2'] ?? null,
                trim(($addressData['city'] ?? '') . ', ' . ($addressData['state'] ?? '') . ' ' . ($addressData['postal_code'] ?? $addressData['zip'] ?? '')),
                $addressData['country'] ?? null,
            ]);

            return implode(', ', $parts);
        }

        return null;
    }

    /**
     * Save an address for future use by the customer.
     */
    protected function saveAddressForCustomer(
        Customer $customer,
        mixed $addressInput,
        AddressType $type = AddressType::Shipping,
        bool $makeDefault = false
    ): ?Address {
        if (empty($addressInput)) {
            return null;
        }

        $isStructured = is_array($addressInput);
        $name = $isStructured ? ($addressInput['name'] ?? $customer->name) : $customer->name;
        $phone = $isStructured ? ($addressInput['phone'] ?? $customer->phone) : $customer->phone;
        $line1 = $isStructured ? ($addressInput['address_line_1'] ?? $addressInput['address'] ?? '') : (string) $addressInput;
        $line2 = $isStructured ? ($addressInput['address_line_2'] ?? null) : null;
        $city = $isStructured ? ($addressInput['city'] ?? '') : '';
        $state = $isStructured ? ($addressInput['state'] ?? null) : null;
        $postalCode = $isStructured ? ($addressInput['postal_code'] ?? $addressInput['zip'] ?? '00000') : '00000';
        $country = $isStructured ? ($addressInput['country'] ?? 'United States') : 'United States';

        if (! $isStructured && str_contains($line1, ',')) {
            $segments = array_map('trim', explode(',', $line1));
            if (count($segments) >= 3) {
                $city = $segments[count($segments) - 2];
                $country = $segments[count($segments) - 1];
            }
        }

        if (empty($city)) {
            $city = 'City';
        }

        $hasAddresses = Address::where('customer_id', $customer->id)->exists();
        $isDefault = $makeDefault || ! $hasAddresses;

        if ($isDefault) {
            Address::where('customer_id', $customer->id)
                ->where('type', $type)
                ->update(['is_default' => false]);
        }

        return Address::create([
            'customer_id' => $customer->id,
            'type' => $type,
            'name' => $name,
            'phone' => $phone,
            'address_line_1' => $line1,
            'address_line_2' => $line2,
            'city' => $city,
            'state' => $state,
            'postal_code' => $postalCode,
            'country' => $country,
            'is_default' => $isDefault,
        ]);
    }
}

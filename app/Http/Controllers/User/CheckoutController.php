<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Enums\Address\AddressType;
use App\Enums\Order\OrderStatus;
use App\Enums\Order\PaymentStatus;
use App\Events\Order\OrderPlaced;
use App\Facades\PaymentGateway;
use App\Facades\Shipping;
use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Services\CouponService;
use App\Services\Shipping\DTOs\ShippingRateResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use RuntimeException;
use Throwable;

class CheckoutController extends Controller
{
    public function __construct(
        protected CouponService $couponService,
    ) {}

    /**
     * Preview checkout summary, item calculations, available shipping rates, and applicable coupon discount.
     */
    public function summary(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
            /** @var Customer|null $customer */
            $customer = $request->user();
            $validated = $request->validate($this->checkoutRules(false, $customer));

            $itemsPayload = $this->resolveCheckoutItems($customer, $validated);

            $variantIds = array_values(array_filter(array_column($itemsPayload, 'product_variant_id')));
            $productIds = array_values(array_unique(array_column($itemsPayload, 'product_id')));

            $variants = ! empty($variantIds)
                ? ProductVariant::whereIn('id', $variantIds)->with(['product.primaryImage.media', 'media'])->get()->keyBy('id')
                : collect();

            $allProductIds = array_values(array_unique(array_merge(
                $productIds,
                $variants->pluck('product_id')->filter()->all()
            )));

            $products = ! empty($allProductIds)
                ? Product::whereIn('id', $allProductIds)->with('primaryImage.media')->get()->keyBy('id')
                : collect();

            $subtotal = 0.0;
            $itemsSummary = [];
            $couponItems = [];

            foreach ($itemsPayload as $itemData) {
                $qty = (int) $itemData['quantity'];
                $variantId = $itemData['product_variant_id'] ?? null;

                if ($variantId !== null) {
                    /** @var ProductVariant|null $variant */
                    $variant = $variants->get($variantId);
                    $parentProduct = $variant ? $products->get($variant->product_id) : null;

                    if (! $variant || ! $variant->isActive() || ! $parentProduct || ! $parentProduct->isActive()) {
                        return $this->returnError(null, 'One or more selected items are no longer active.');
                    }

                    $unitPrice = $variant->effectivePrice();
                    $lineTotal = round($unitPrice * $qty, 2);
                    $subtotal += $lineTotal;

                    $itemsSummary[] = [
                        'product_id' => $variant->product_id,
                        'product_variant_id' => $variant->id,
                        'name' => $variant->displayName($parentProduct),
                        'sku' => $variant->sku,
                        'unit_price' => $unitPrice,
                        'quantity' => $qty,
                        'subtotal' => $lineTotal,
                        'available_stock' => $variant->stock_quantity,
                        'is_in_stock' => $variant->stock_quantity >= $qty,
                        'image_url' => $variant->image_url ?: $parentProduct->primaryImage?->media?->url,
                    ];

                    $couponItems[] = [
                        'product_id' => $variant->product_id,
                        'price' => $unitPrice,
                        'quantity' => $qty,
                        'category_id' => $parentProduct->category_id,
                    ];
                } else {
                    /** @var Product|null $product */
                    $product = $products->get($itemData['product_id']);
                    if (! $product || ! $product->isActive()) {
                        return $this->returnError(null, 'One or more selected products are no longer active.');
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

            [$discountAmount, , $couponInfo] = $this->applyCoupon(
                $validated['coupon_code'] ?? null,
                $subtotal,
                $couponItems,
                $customer?->email
            );

            [$shippingAddress, $billingAddress, $shippingInput] = $this->resolveCheckoutAddresses($request, $validated, $customer);

            // Calculate dynamic shipping options using ShippingManager
            $destinationAddress = $this->resolveDestinationAddressModel($validated, $shippingInput, $customer);
            $shippingQuotes = Shipping::calculateRates([
                'subtotal' => $subtotal,
                'items' => $itemsSummary,
            ], $destinationAddress);

            $availableShippingMethods = [];
            foreach ($shippingQuotes as $carrierKey => $quote) {
                $availableShippingMethods[] = [
                    'carrier' => $carrierKey,
                    'service_name' => $quote->serviceName,
                    'cost' => $quote->cost,
                    'estimated_days' => $quote->estimatedDays,
                    'currency' => $quote->currency,
                    'available' => $quote->available,
                ];
            }

            // Determine selected shipping fee
            $requestedMethod = $validated['shipping_method'] ?? null;
            $selectedRate = null;

            if ($requestedMethod && isset($shippingQuotes[$requestedMethod])) {
                $selectedRate = $shippingQuotes[$requestedMethod];
            } else {
                // Default to free_shipping if available, or flat_rate, or first available quote
                $selectedRate = $shippingQuotes['free_shipping'] ?? $shippingQuotes['flat_rate'] ?? (reset($shippingQuotes) ?: null);
            }

            $shippingFee = $selectedRate instanceof ShippingRateResult ? $selectedRate->cost : 0.0;
            $selectedCarrier = $selectedRate instanceof ShippingRateResult ? $selectedRate->carrier : ($requestedMethod ?? 'flat_rate');

            $tax = 0.0;
            $total = round(max(0.0, $subtotal - $discountAmount) + $tax + $shippingFee, 2);

            return $this->returnSuccess([
                'items' => $itemsSummary,
                'shipping_address' => $shippingAddress,
                'billing_address' => $billingAddress,
                'billing_same_as_shipping' => (bool) ($validated['billing_same_as_shipping'] ?? true),
                'customer' => $customer ? [
                    'name' => $customer->name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                ] : null,
                'available_shipping_methods' => $availableShippingMethods,
                'selected_shipping_method' => $selectedCarrier,
                'available_payment_methods' => PaymentGateway::forCheckout(),
                'totals' => [
                    'subtotal' => round($subtotal, 2),
                    'discount_amount' => $discountAmount,
                    'tax' => $tax,
                    'shipping_fee' => $shippingFee,
                    'total' => $total,
                ],
                'coupon' => $couponInfo,
            ], 'Checkout summary calculated successfully.');
        });
    }


    /**
     * Get real-time shipping rate quotes from all enabled shipping carriers.
     */
    public function getShippingRates(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
            /** @var Customer|null $customer */
            $customer = $request->user();
            $validated = $request->validate([
                'shipping_address_id' => ['nullable', 'string'],
                'shipping_address' => ['nullable'],
                'subtotal' => ['nullable', 'numeric', 'min:0'],
                'items' => ['nullable', 'array'],
            ]);

            $subtotal = (float) ($validated['subtotal'] ?? 0);
            $destinationAddress = $this->resolveDestinationAddressModel($validated, $validated['shipping_address'] ?? null, $customer);

            $rates = Shipping::calculateRates([
                'subtotal' => $subtotal,
                'items' => $validated['items'] ?? [],
            ], $destinationAddress);

            $results = [];
            foreach ($rates as $carrierKey => $rate) {
                $results[] = [
                    'carrier' => $carrierKey,
                    'service_name' => $rate->serviceName,
                    'cost' => $rate->cost,
                    'estimated_days' => $rate->estimatedDays,
                    'currency' => $rate->currency,
                    'available' => $rate->available,
                ];
            }

            return $this->returnSuccess([
                'rates' => $results,
            ], 'Shipping rates calculated successfully.');
        });
    }

    /**
     * Validate coupon code for storefront checkout.
     */
    public function validateCoupon(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
            $validated = $request->validate([
                'code' => ['required', 'string'],
                'subtotal' => ['required', 'numeric', 'min:0'],
                'items' => ['nullable', 'array'],
            ]);

            $result = $this->couponService->validate(
                $validated['code'],
                (float) $validated['subtotal'],
                $validated['items'] ?? [],
                $request->user()?->email
            );

            if (! $result['valid']) {
                return $this->returnError(null, $result['message']);
            }

            return $this->returnSuccess([
                'code' => $result['coupon']?->code ?? strtoupper(trim($validated['code'])),
                'discount' => $result['discount'],
                'type' => $result['coupon']?->type?->value ?? (string) ($result['coupon']?->type ?? 'fixed'),
                'value' => (float) ($result['coupon']?->value ?? 0),
            ], $result['message']);
        });
    }

    /**
     * Process checkout, deduct stock atomically, create order and payment transaction record.
     */
    public function checkout(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
            /** @var Customer|null $customer */
            $customer = $request->user();

            if (! $customer) {
                return $this->returnError(null, 'Customer must be logged in to checkout.', 401);
            }

            $validated = $request->validate($this->checkoutRules(true, $customer));

            [$shippingAddress, $billingAddress, $shippingInput, $billingInput] = $this->resolveCheckoutAddresses($request, $validated, $customer);

            if (empty($shippingAddress)) {
                return $this->returnError(null, 'A valid shipping address is required.');
            }

            $this->handleAddressPersistence($customer, $validated, $shippingInput, $billingInput);

            $rawItems = $this->resolveCheckoutItems($customer, $validated);

            // Resolve Shipping Method & Rate
            $shippingMethod = $validated['shipping_method'] ?? 'flat_rate';
            $destinationAddress = $this->resolveDestinationAddressModel($validated, $shippingInput, $customer);

            $carrierInstance = Shipping::has($shippingMethod)
                ? Shipping::carrier($shippingMethod)
                : Shipping::carrier('flat_rate');

            // 1. Create Order inside database transaction
            $order = DB::transaction(function () use ($rawItems, $validated, $shippingAddress, $billingAddress, $customer, $carrierInstance, $destinationAddress): Order {
                $variantIds = array_values(array_filter(array_column($rawItems, 'product_variant_id')));
                $productIds = array_values(array_unique(array_column($rawItems, 'product_id')));

                $variants = ! empty($variantIds)
                    ? ProductVariant::whereIn('id', $variantIds)->lockForUpdate()->with('product')->get()->keyBy('id')
                    : collect();

                $allProductIds = array_values(array_unique(array_merge(
                    $productIds,
                    $variants->pluck('product_id')->filter()->all()
                )));

                $products = ! empty($allProductIds)
                    ? Product::whereIn('id', $allProductIds)->lockForUpdate()->with('primaryImage.media')->get()->keyBy('id')
                    : collect();

                $subtotal = 0.0;
                $processedItems = [];

                foreach ($rawItems as $itemData) {
                    $qty = (int) $itemData['quantity'];
                    $variantId = $itemData['product_variant_id'] ?? null;

                    if ($variantId !== null) {
                        /** @var ProductVariant|null $variant */
                        $variant = $variants->get($variantId);
                        $parentProduct = $variant ? $products->get($variant->product_id) : null;

                        if (! $variant || ! $variant->isActive() || ! $parentProduct || ! $parentProduct->isActive()) {
                            throw new RuntimeException("Variant '{$variantId}' is no longer active or available.");
                        }

                        $allowsBackorder = $parentProduct->allowsBackorder();
                        if (! $allowsBackorder && $variant->stock_quantity < $qty) {
                            throw new RuntimeException("Insufficient stock for '{$variant->name}'. Only {$variant->stock_quantity} available.");
                        }

                        // Atomic stock decrement
                        $variant->decrement('stock_quantity', $qty);
                        $parentProduct->decrement('stock_quantity', min($parentProduct->stock_quantity, $qty));

                        $unitPrice = $variant->effectivePrice();
                        $lineSubtotal = round($unitPrice * $qty, 2);
                        $subtotal += $lineSubtotal;

                        $processedItems[] = [
                            'product_id' => $variant->product_id,
                            'product_variant_id' => $variant->id,
                            'product_name' => $parentProduct->name,
                            'variant_name' => $variant->name,
                            'sku' => $variant->sku,
                            'price' => $unitPrice,
                            'quantity' => $qty,
                            'subtotal' => $lineSubtotal,
                            'attributes' => $variant->attributes,
                            'image_url' => $variant->image_url ?: $parentProduct->primaryImage?->media?->url,
                            'category_id' => $parentProduct->category_id,
                        ];
                    } else {
                        /** @var Product|null $product */
                        $product = $products->get($itemData['product_id']);

                        if (! $product || ! $product->isActive()) {
                            throw new RuntimeException('Product is no longer available.');
                        }

                        $allowsBackorder = $product->allowsBackorder();
                        if (! $allowsBackorder && $product->stock_quantity < $qty) {
                            throw new RuntimeException("Insufficient stock for '{$product->name}'. Only {$product->stock_quantity} available.");
                        }

                        $product->decrement('stock_quantity', $qty);

                        $unitPrice = $product->effectivePrice();
                        $lineSubtotal = round($unitPrice * $qty, 2);
                        $subtotal += $lineSubtotal;

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
                            'image_url' => $product->primaryImage?->media?->url,
                            'category_id' => $product->category_id,
                        ];
                    }
                }

                [$discountAmount, $applicableCoupon] = $this->applyCoupon(
                    $validated['coupon_code'] ?? null,
                    $subtotal,
                    $processedItems,
                    $customer->email
                );

                // Calculate shipping cost
                $shippingRateQuote = $carrierInstance->calculateRate(['subtotal' => $subtotal], $destinationAddress);
                $shippingFee = $shippingRateQuote->available ? $shippingRateQuote->cost : 0.0;

                $tax = 0.0;
                $total = round(max(0.0, $subtotal - $discountAmount) + $tax + $shippingFee, 2);

                $paymentMethod = $validated['payment_method'];

                $order = Order::create([
                    'customer_id' => $customer->id,
                    'order_number' => Order::generateOrderNumber(),
                    'customer_name' => $customer->name,
                    'customer_email' => $customer->email,
                    'customer_phone' => $customer->phone,
                    'shipping_address' => $shippingAddress,
                    'billing_address' => $billingAddress,
                    'subtotal' => $subtotal,
                    'coupon_code' => ! empty($validated['coupon_code']) ? strtoupper(trim($validated['coupon_code'])) : null,
                    'discount_amount' => $discountAmount,
                    'tax' => $tax,
                    'shipping_fee' => $shippingFee,
                    'shipping_carrier' => $carrierInstance->name(),
                    'shipping_method' => $shippingRateQuote->serviceName,
                    'total' => $total,
                    'status' => OrderStatus::Pending->value,
                    'payment_method' => $paymentMethod,
                    'payment_status' => PaymentStatus::Pending->value,
                    'notes' => $validated['notes'] ?? null,
                ]);

                foreach ($processedItems as $item) {
                    unset($item['category_id']);
                    $item['order_id'] = $order->id;
                    OrderItem::create($item);
                }

                if ($applicableCoupon !== null && $discountAmount > 0) {
                    $this->couponService->recordUsage($applicableCoupon, $order, $discountAmount, $customer->email);
                }

                if ($validated['use_cart'] ?? false || empty($validated['items'])) {
                    CartItem::where('customer_id', $customer->id)->delete();
                }

                return $order->load('items');
            });

            // 2. Book carrier shipment & tracking
            try {
                $shipmentBooking = $carrierInstance->createShipment($order);
                if ($shipmentBooking->success) {
                    $order->update([
                        'tracking_number' => $shipmentBooking->trackingNumber,
                        'shipping_label_url' => $shipmentBooking->labelUrl,
                    ]);
                }
            } catch (Throwable) {
                // Non-blocking for immediate order placement
            }

            // 3. Process payment through PaymentGatewayManager and record transaction in separate payments table
            $paymentMethod = is_string($order->payment_method) ? $order->payment_method : $order->payment_method?->value;
            $gateway = PaymentGateway::gateway($paymentMethod);

            $paymentResult = $gateway->charge($order, $request->all());

            /** @var Payment $payment */
            $payment = Payment::create([
                'order_id' => $order->id,
                'customer_id' => $customer->id,
                'transaction_id' => $paymentResult->transactionId,
                'gateway' => $paymentMethod,
                'amount' => $order->total,
                'currency' => (string) Setting::get('currency_code', 'USD'),
                'status' => $paymentResult->status === 'paid' ? PaymentStatus::Paid : PaymentStatus::Pending,
                'type' => 'charge',
                'payload' => $paymentResult->data,
                'error_message' => ! $paymentResult->success ? $paymentResult->message : null,
                'paid_at' => $paymentResult->status === 'paid' ? now() : null,
            ]);

            if ($paymentResult->success && $paymentResult->status === 'paid') {
                $order->update(['payment_status' => PaymentStatus::Paid]);
            }

            // Dispatch order placed event for customer and admin notifications
            OrderPlaced::dispatch([
                'order_number' => $order->order_number,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
                'total' => $order->total,
                'currency' => (string) Setting::get('currency_symbol', '$'),
                'items' => $order->items->map(fn (OrderItem $item): array => [
                    'name' => $item->product_name ?? 'Product',
                    'quantity' => (int) $item->quantity,
                    'price' => (float) $item->price,
                ])->values()->all(),
                'payment_method' => $paymentMethod,
                'shipping_address' => $order->shipping_address,
                'billing_address' => $order->billing_address,
            ]);

            return $this->returnSuccess([
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status instanceof OrderStatus ? $order->status->value : (string) $order->status,
                'total' => (float) $order->total,
                'payment_method' => $paymentMethod,
                'payment_status' => $order->payment_status instanceof PaymentStatus ? $order->payment_status->value : (string) $order->payment_status,
                'payment_url' => $paymentResult->redirectUrl,
                'redirect_url' => $paymentResult->redirectUrl,
            ], "Order #{$order->order_number} placed successfully!", 201);
        });
    }

    /**
     * Verify payment transaction status after external redirect/popup completion.
     */
    public function verifyPayment(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
            $validated = $request->validate([
                'gateway' => ['required', 'string'],
                'transaction_id' => ['nullable', 'string'],
                'payment_reference' => ['nullable', 'string'],
                'order_id' => ['nullable', 'string'],
            ]);

            $txId = $validated['transaction_id'] ?? $validated['payment_reference'] ?? $validated['order_id'] ?? null;
            if (! $txId) {
                return $this->returnError(null, 'Transaction ID or payment reference is required.');
            }

            $gateway = PaymentGateway::gateway($validated['gateway']);
            $result = $gateway->verifyPayment($txId, $request->all());

            if (! $result->success) {
                return $this->returnError(null, $result->message ?? 'Payment verification failed.');
            }

            // Find matching transaction record
            $payment = Payment::where('transaction_id', $txId)
                ->orWhere('id', $txId)
                ->when(! empty($validated['order_id']), fn ($q) => $q->orWhere('order_id', $validated['order_id']))
                ->first();

            if ($payment) {
                $payment->markAsPaid($result->transactionId, $result->data);
            }

            return $this->returnSuccess([
                'payment' => $payment,
                'verified' => true,
            ], 'Payment verified successfully.');
        });
    }

    /**
     * Handle incoming asynchronous payment webhook notifications.
     */
    public function handleWebhook(Request $request, string $gateway): JsonResponse
    {
        return $this->safeCall(function () use ($request, $gateway): JsonResponse {
            if (! PaymentGateway::has($gateway)) {
                return $this->returnError(null, "Gateway [{$gateway}] is not registered.", 404);
            }

            $gatewayInstance = PaymentGateway::gateway($gateway);
            $result = $gatewayInstance->handleWebhook($request->all(), $request->headers->all());

            if ($result->transactionId) {
                $payment = Payment::where('transaction_id', $result->transactionId)->first();
                if ($payment && $result->success && $result->status === 'paid') {
                    $payment->markAsPaid($result->transactionId, $result->data);
                } elseif ($payment && $result->status === 'refunded') {
                    $payment->markAsRefunded($result->transactionId, $result->data);
                } elseif ($payment && ! $result->success) {
                    $payment->markAsFailed($result->message ?? 'Webhook indicated payment failure', $result->data);
                }
            }

            return response()->json([
                'received' => true,
                'status' => $result->status,
            ]);
        });
    }

    /**
     * Get shared validation rules for checkout operations.
     *
     * @return array<string, mixed>
     */
    protected function checkoutRules(bool $isCheckout = false, ?Customer $customer = null): array
    {
        $addressRule = $customer
            ? Rule::exists('addresses', 'id')->where('customer_id', $customer->id)
            : 'exists:addresses,id';

        $rules = [
            'shipping_address_id' => ['nullable', 'string', $addressRule],
            'shipping_address' => ['nullable'],
            'billing_address_id' => ['nullable', 'string', $addressRule],
            'billing_address' => ['nullable'],
            'billing_same_as_shipping' => ['nullable', 'boolean'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'shipping_method' => ['nullable', 'string', 'max:50'],
            'use_cart' => ['nullable', 'boolean'],
            'items' => ['nullable', 'array'],
            'items.*.product_id' => ['required_with:items', 'string', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'string', 'exists:product_variants,id'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],
        ];

        if ($isCheckout) {
            $rules['save_address'] = ['nullable', 'boolean'];
            $rules['save_billing_address'] = ['nullable', 'boolean'];
            $rules['payment_method'] = ['required', 'string'];
            $rules['notes'] = ['nullable', 'string', 'max:500'];
        }

        return $rules;
    }

    /**
     * Resolve destination Address model instance for shipping calculations.
     *
     * @param array<string, mixed> $validated
     */
    protected function resolveDestinationAddressModel(array $validated, mixed $shippingInput, ?Customer $customer): ?Address
    {
        if (! empty($validated['shipping_address_id']) && $customer) {
            /** @var Address|null $saved */
            $saved = $customer->addresses()->find($validated['shipping_address_id']);
            if ($saved) {
                return $saved;
            }
        }

        if (is_array($shippingInput)) {
            return new Address([
                'name' => $shippingInput['name'] ?? $customer?->name,
                'phone' => $shippingInput['phone'] ?? $customer?->phone,
                'address_line_1' => $shippingInput['address_line_1'] ?? $shippingInput['address'] ?? '',
                'address_line_2' => $shippingInput['address_line_2'] ?? null,
                'city' => $shippingInput['city'] ?? '',
                'state' => $shippingInput['state'] ?? '',
                'postal_code' => $shippingInput['postal_code'] ?? $shippingInput['zip'] ?? '00000',
                'country' => $shippingInput['country'] ?? 'US',
            ]);
        }

        return null;
    }

    /**
     * Resolve shipping and billing addresses for checkout.
     *
     * @param  array<string, mixed>  $validated
     * @return array{0: ?string, 1: ?string, 2: mixed, 3: mixed}
     */
    protected function resolveCheckoutAddresses(Request $request, array $validated, ?Customer $customer): array
    {
        $shippingInput = $validated['shipping_address'] ?? ($request->filled('address_line_1') ? $request->only(['name', 'phone', 'address_line_1', 'address_line_2', 'city', 'state', 'postal_code', 'country']) : null);
        $shipping = $this->resolveAddress($shippingInput, $validated['shipping_address_id'] ?? null, $customer, AddressType::Shipping);

        $sameAsShipping = (bool) ($validated['billing_same_as_shipping'] ?? true);
        $billingInput = $validated['billing_address'] ?? null;
        $billingId = $validated['billing_address_id'] ?? null;

        $billing = ($sameAsShipping && empty($billingId) && empty($billingInput))
            ? $shipping
            : ($this->resolveAddress($billingInput, $billingId, $customer, AddressType::Billing) ?? $shipping);

        return [$shipping, $billing, $shippingInput, $billingInput];
    }

    /**
     * Persist customer phone and requested saved addresses.
     *
     * @param  array<string, mixed>  $validated
     */
    protected function handleAddressPersistence(Customer $customer, array $validated, mixed $shippingInput, mixed $billingInput): void
    {
        if (empty($customer->phone) && is_array($shippingInput) && ! empty($shippingInput['phone'])) {
            $customer->update(['phone' => $shippingInput['phone']]);
        }

        if (! empty($validated['save_address']) && empty($validated['shipping_address_id']) && ! empty($shippingInput)) {
            $this->saveAddressForCustomer($customer, $shippingInput, AddressType::Shipping);
        }

        if (! empty($validated['save_billing_address']) && empty($validated['billing_address_id']) && ! empty($billingInput)) {
            $this->saveAddressForCustomer($customer, $billingInput, AddressType::Billing);
        }
    }

    /**
     * Apply and calculate coupon savings.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array{0: float, 1: ?Coupon, 2: ?array<string, mixed>}
     */
    protected function applyCoupon(?string $code, float $subtotal, array $items, ?string $email): array
    {
        if (empty($code)) {
            return [0.0, null, null];
        }

        $code = strtoupper(trim($code));
        $result = $this->couponService->validate($code, $subtotal, $items, $email);

        if (! $result['valid']) {
            throw new RuntimeException($result['message']);
        }

        $discount = (float) $result['discount'];
        $coupon = $result['coupon'] ?? null;

        $info = [
            'code' => $coupon?->code ?? $code,
            'name' => $coupon?->name ?? $code,
            'discount' => $discount,
            'message' => $result['message'],
        ];

        return [$discount, $coupon, $info];
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
                throw new RuntimeException('Your shopping cart is currently empty.');
            }

            return $cartItems->map(fn (CartItem $c): array => [
                'product_id' => $c->product_id,
                'product_variant_id' => $c->product_variant_id,
                'quantity' => $c->quantity,
            ])->all();
        }

        throw new RuntimeException('No items provided for checkout.');
    }

    /**
     * Resolve a formatted address string from explicit data, address ID, or customer's saved address.
     */
    protected function resolveAddress(mixed $addressData, ?string $addressId, ?Customer $customer, AddressType $type = AddressType::Shipping): ?string
    {
        if ($addressId && $customer) {
            $saved = $customer->addresses()->find($addressId);
            if ($saved) {
                return $saved->formatted_address;
            }
        }

        if (! empty($addressData)) {
            return $this->formatAddress($addressData, $customer);
        }

        if ($customer) {
            $default = $customer->addresses()
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
                ! empty($addressData['phone'] ?? $customer?->phone) ? 'Tel: '.($addressData['phone'] ?? $customer?->phone) : null,
                $addressData['address_line_1'] ?? $addressData['address'] ?? null,
                $addressData['address_line_2'] ?? null,
                trim(($addressData['city'] ?? '').', '.($addressData['state'] ?? '').' '.($addressData['postal_code'] ?? '')),
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

        $data = is_array($addressInput) ? $addressInput : ['address_line_1' => (string) $addressInput];
        $line1 = $data['address_line_1'] ?? $data['address'] ?? '';
        $city = $data['city'] ?? '';
        $country = $data['country'] ?? 'United States';
        $postalCode = $data['postal_code'] ?? $data['zip'] ?? null;

        if (! is_array($addressInput) && str_contains($line1, ',')) {
            $segments = array_map('trim', explode(',', $line1));
            if (count($segments) >= 3) {
                $city = $segments[count($segments) - 2];
                $country = $segments[count($segments) - 1];
                $parts = explode(' ', trim($country));
                if (count($parts) >= 2) {
                    $postalCode = end($parts);
                }
            }
        }

        $isDefault = $makeDefault || ! $customer->addresses()->exists();

        if ($isDefault) {
            $customer->addresses()->where('type', $type)->update(['is_default' => false]);
        }

        return $customer->addresses()->create([
            'type' => $type,
            'name' => $data['name'] ?? $customer->name,
            'phone' => $data['phone'] ?? $customer->phone,
            'address_line_1' => $line1,
            'address_line_2' => $data['address_line_2'] ?? null,
            'city' => $city ?: 'City',
            'state' => $data['state'] ?? null,
            'postal_code' => $postalCode ?: '00000',
            'country' => $country,
            'is_default' => $isDefault,
        ]);
    }
}

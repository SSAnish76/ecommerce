<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Enums\Order\OrderStatus;
use App\Enums\Order\PaymentStatus;
use App\Events\Order\OrderCancelled;
use App\Facades\PaymentGateway;
use App\Facades\Shipping;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    /**
     * Display a listing of orders placed by the authenticated customer.
     */
    public function index(Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($request): JsonResponse {
            /** @var Customer $customer */
            $customer = $request->user();

            $validated = $request->validate([
                'status' => ['nullable', Rule::enum(OrderStatus::class)],
                'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            ]);

            $query = Order::query()
                ->where(function (Builder $q) use ($customer): void {
                    $q->where('customer_id', $customer->id)
                        ->orWhere('customer_email', $customer->email);
                })
                ->with(['items:id,order_id,product_name,quantity,price,image_url'])
                ->withCount('items')
                ->latest();

            if (! empty($validated['status'])) {
                $statusValue = $validated['status'] instanceof OrderStatus
                    ? $validated['status']->value
                    : (string) $validated['status'];
                $query->where('status', $statusValue);
            }

            return $this->paginateAndFormat(
                $query,
                $request,
                fn (Order $order): array => $this->formatOrderSummary($order),
                message: 'Orders retrieved successfully.'
            );
        });
    }

    /**
     * Display the specified order details with all items.
     */
    public function show(string $orderNumberOrId, Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($orderNumberOrId, $request): JsonResponse {
            /** @var Customer $customer */
            $customer = $request->user();

            $query = Order::query()->with([
                'items:id,order_id,product_id,product_variant_id,product_name,variant_name,sku,price,quantity,subtotal,attributes,image_url',
                'items.product:id,name,slug',
                'items.variant:id,name,sku',
                'payments' => fn ($q) => $q->latest(),
            ]);

            $order = $query->whereSlugOrId($orderNumberOrId, 'order_number')->first();

            if (! $order) {
                return $this->returnError(null, 'Order not found.');
            }

            // Authorization check
            if ($order->customer_id !== $customer->id && strtolower((string) $order->customer_email) !== strtolower((string) $customer->email)) {
                return $this->returnError(null, 'Unauthorized to view this order.', 403);
            }

            $data = [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
                'shipping_address' => $order->shipping_address,
                'billing_address' => $order->billing_address ?? $order->shipping_address,
                'status' => $order->status instanceof OrderStatus ? $order->status->value : (string) $order->status,
                'payment_method' => $order->payment_method?->value ?? $order->payment_method,
                'payment_status' => $order->payment_status?->value ?? $order->payment_status,
                'shipping_carrier' => $order->shipping_carrier,
                'shipping_method' => $order->shipping_method,
                'tracking_number' => $order->tracking_number,
                'shipping_label_url' => $order->shipping_label_url,
                'coupon_code' => $order->coupon_code,
                'subtotal' => (float) $order->subtotal,
                'discount_amount' => (float) $order->discount_amount,
                'tax' => (float) $order->tax,
                'shipping_fee' => (float) $order->shipping_fee,
                'total' => (float) $order->total,
                'notes' => $order->notes,
                'created_at' => $order->created_at?->toISOString(),
                'updated_at' => $order->updated_at?->toISOString(),
                'items' => $order->items->map(fn ($item): array => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_variant_id' => $item->product_variant_id,
                    'product_name' => $item->product_name,
                    'variant_name' => $item->variant_name,
                    'sku' => $item->sku,
                    'price' => (float) $item->price,
                    'quantity' => (int) $item->quantity,
                    'subtotal' => (float) $item->subtotal,
                    'attributes' => $item->attributes,
                    'image_url' => $item->image_url,
                ]),
                'payments' => $order->payments->map(fn (Payment $payment): array => [
                    'id' => $payment->id,
                    'transaction_id' => $payment->transaction_id,
                    'gateway' => $payment->gateway,
                    'amount' => (float) $payment->amount,
                    'currency' => $payment->currency,
                    'status' => $payment->status instanceof PaymentStatus ? $payment->status->value : (string) $payment->status,
                    'type' => $payment->type,
                    'paid_at' => $payment->paid_at?->toISOString(),
                    'created_at' => $payment->created_at?->toISOString(),
                ]),
            ];

            return $this->returnSuccess($data, 'Order details retrieved successfully.');
        });
    }

    /**
     * Get live or carrier tracking information for an order.
     */
    public function trackShipment(string $orderNumberOrId, Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($orderNumberOrId, $request): JsonResponse {
            /** @var Customer $customer */
            $customer = $request->user();

            $order = Order::query()
                ->whereSlugOrId($orderNumberOrId, 'order_number')
                ->first();

            if (! $order) {
                return $this->returnError(null, 'Order not found.');
            }

            if ($order->customer_id !== $customer->id && strtolower((string) $order->customer_email) !== strtolower((string) $customer->email)) {
                return $this->returnError(null, 'Unauthorized to track this order.', 403);
            }

            if (empty($order->tracking_number)) {
                return $this->returnSuccess([
                    'order_number' => $order->order_number,
                    'shipping_carrier' => $order->shipping_carrier,
                    'tracking_number' => null,
                    'status' => 'pending_dispatch',
                    'status_description' => 'Shipment tracking number has not been generated yet. Your order is being prepared.',
                    'events' => [],
                ], 'Tracking not yet available.');
            }

            $carrierCode = $order->shipping_carrier ?: 'flat_rate';
            $carrier = Shipping::carrier($carrierCode);
            $tracking = $carrier->track($order->tracking_number);

            return $this->returnSuccess([
                'order_number' => $order->order_number,
                'shipping_carrier' => $carrierCode,
                'carrier_label' => $carrier->label(),
                'tracking_number' => $tracking['tracking_number'] ?? $order->tracking_number,
                'status' => $tracking['status'] ?? 'in_transit',
                'status_description' => $tracking['status_description'] ?? 'Package is in transit with carrier.',
                'estimated_delivery' => $tracking['estimated_delivery'] ?? null,
                'checkpoints' => $tracking['checkpoints'] ?? [],
            ], 'Tracking information retrieved successfully.');
        });
    }

    /**
     * Cancel an eligible customer order and restore reserved product stock.
     */
    public function cancel(string $orderNumberOrId, Request $request): JsonResponse
    {
        return $this->safeCall(function () use ($orderNumberOrId, $request): JsonResponse {
            /** @var Customer $customer */
            $customer = $request->user();

            if (! (bool) Setting::get('allow_customer_cancellation', true)) {
                return $this->returnError(null, 'Customer order cancellation is currently disabled by the store.');
            }

            $order = Order::with(['items:id,order_id,product_id,product_variant_id,quantity', 'payments'])
                ->whereSlugOrId($orderNumberOrId, 'order_number')
                ->first();

            if (! $order) {
                return $this->returnError(null, 'Order not found.');
            }

            // Authorization check
            if ($order->customer_id !== $customer->id && strtolower((string) $order->customer_email) !== strtolower((string) $customer->email)) {
                return $this->returnError(null, 'Unauthorized to cancel this order.', 403);
            }

            if ($order->isCancelled()) {
                return $this->returnError(null, 'This order has already been cancelled.');
            }

            if (! $order->isCancellable()) {
                $statusVal = $order->status instanceof OrderStatus ? $order->status->value : (string) $order->status;

                return $this->returnError(
                    null,
                    "Order cannot be cancelled in '{$statusVal}' status."
                );
            }

            $reason = (string) $request->input('reason', 'Cancelled by customer');

            DB::transaction(function () use ($order, $reason): void {
                $variantIds = $order->items->pluck('product_variant_id')->filter()->unique()->values()->all();
                $productIds = $order->items->pluck('product_id')->filter()->unique()->values()->all();

                $variants = ! empty($variantIds)
                    ? ProductVariant::whereIn('id', $variantIds)->lockForUpdate()->get()->keyBy('id')
                    : collect();

                $products = ! empty($productIds)
                    ? Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id')
                    : collect();

                // Restore inventory in batch
                foreach ($order->items as $item) {
                    $qty = (int) $item->quantity;

                    if ($item->product_variant_id && isset($variants[$item->product_variant_id])) {
                        $variants[$item->product_variant_id]->increment('stock_quantity', $qty);
                    }

                    if ($item->product_id && isset($products[$item->product_id])) {
                        $products[$item->product_id]->increment('stock_quantity', $qty);
                    }
                }

                $order->update([
                    'status' => OrderStatus::Cancelled,
                    'notes' => trim(($order->notes ? "{$order->notes}\n" : '')."Cancellation Reason: {$reason}"),
                ]);

                // Refund payment if already paid
                $paidPayment = $order->payments()->where('status', PaymentStatus::Paid->value)->latest()->first();
                if ($paidPayment && $order->payment_method) {
                    try {
                        $method = is_string($order->payment_method) ? $order->payment_method : $order->payment_method?->value;
                        $gateway = PaymentGateway::gateway((string) $method);
                        $refundResult = $gateway->refund(
                            $order,
                            (float) $order->total,
                            $reason
                        );

                        if ($refundResult->success) {
                            Payment::create([
                                'order_id' => $order->id,
                                'customer_id' => $order->customer_id,
                                'transaction_id' => $refundResult->transactionId ?? 'ref_'.uniqid(),
                                'gateway' => (string) $method,
                                'amount' => (float) $order->total,
                                'currency' => (string) Setting::get('currency_code', 'USD'),
                                'status' => PaymentStatus::Refunded,
                                'type' => 'refund',
                                'payload' => $refundResult->data,
                                'paid_at' => now(),
                            ]);

                            $order->update(['payment_status' => PaymentStatus::Refunded]);
                        }
                    } catch (\Throwable $e) {
                        Log::warning('Refund failed during order cancellation: '.$e->getMessage());
                    }
                }

                // Cancel carrier shipment if tracking number is present
                if (! empty($order->tracking_number) && ! empty($order->shipping_carrier)) {
                    try {
                        Shipping::carrier((string) $order->shipping_carrier)->cancelShipment($order->tracking_number);
                    } catch (\Throwable $e) {
                        Log::warning('Carrier shipment cancellation failed: '.$e->getMessage());
                    }
                }
            });

            // Dispatch cancellation event for customer and admin notifications
            OrderCancelled::dispatch([
                'order_number' => $order->order_number,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
                'total' => $order->total,
                'refund_status' => is_string($order->payment_status) ? $order->payment_status : $order->payment_status?->value,
            ], $reason);

            $data = [
                'order_number' => $order->order_number,
                'status' => OrderStatus::Cancelled->value,
                'status_label' => OrderStatus::Cancelled->label(),
            ];

            return $this->returnSuccess($data, 'Order has been successfully cancelled and inventory restored.');
        });
    }

    /**
     * Format order summary for listings.
     *
     * @return array<string, mixed>
     */
    protected function formatOrderSummary(Order $order): array
    {
        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'created_at' => $order->created_at?->toISOString(),
            'status' => $order->status instanceof OrderStatus ? $order->status->value : (string) $order->status,
            'status_label' => $order->status instanceof OrderStatus ? $order->status->label() : null,
            'payment_method' => $order->payment_method?->value ?? $order->payment_method,
            'payment_status' => $order->payment_status?->value ?? $order->payment_status,
            'items_count' => (int) ($order->items_count ?? $order->items->count()),
            'subtotal' => (float) $order->subtotal,
            'discount_amount' => (float) $order->discount_amount,
            'tax' => (float) $order->tax,
            'shipping_fee' => (float) $order->shipping_fee,
            'total' => (float) $order->total,
            'preview_items' => $order->items->take(2)->map(fn ($item): array => [
                'name' => $item->product_name,
                'quantity' => $item->quantity,
                'price' => (float) $item->price,
                'image_url' => $item->image_url,
            ]),
        ];
    }
}

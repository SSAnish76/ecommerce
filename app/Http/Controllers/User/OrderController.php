<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Enums\Order\OrderStatus;
use App\Events\Order\OrderCancelled;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use Exception;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /**
     * Display a listing of orders placed by the authenticated customer.
     */
    public function index(Request $request)
    {
        try {
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
                ->with(['items'])
                ->latest();

            // Optional status filter
            if (! empty($validated['status'])) {
                $statusValue = $validated['status'] instanceof OrderStatus
                    ? $validated['status']->value
                    : (string) $validated['status'];
                $query->where('status', $statusValue);
            }

            return $this->paginateAndFormat(
                $query,
                $request,
                fn (Order $order) => $this->formatOrderSummary($order),
                message: 'Orders retrieved successfully.'
            );
        } catch (ValidationException $e) {
            return $this->returnError($e->errors(), 'Validation failed.', 422);
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Get list of available order statuses and labels.
     */
    public function statuses()
    {
        $statuses = array_map(fn (OrderStatus $status) => [
            'value' => $status->value,
            'label' => $status->label(),
        ], OrderStatus::cases());

        return $this->returnSuccess($statuses, 'Order statuses retrieved successfully.');
    }

    /**
     * Display the specified order details with all items.
     */
    public function show(string $orderNumberOrId, Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $query = Order::query()->with([
                'items.product:id,name,slug',
                'items.variant:id,name,sku',
            ]);

            $order = $query->whereSlugOrId($orderNumberOrId, 'order_number')->first();

            if (! $order) {
                return $this->returnError(null, 'Order not found.', 404);
            }

            // Authorization check
            if ($order->customer_id !== $customer->id && strtolower($order->customer_email) !== strtolower($customer->email)) {
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
                'status_label' => $order->status instanceof OrderStatus ? $order->status->label() : null,
                'payment_method' => $order->payment_method?->value ?? $order->payment_method,
                'payment_status' => $order->payment_status?->value ?? $order->payment_status,
                'coupon_code' => $order->coupon_code,
                'subtotal' => (float) $order->subtotal,
                'discount_amount' => (float) $order->discount_amount,
                'tax' => (float) $order->tax,
                'shipping_fee' => (float) $order->shipping_fee,
                'total' => (float) $order->total,
                'notes' => $order->notes,
                'created_at' => $order->created_at?->toISOString(),
                'updated_at' => $order->updated_at?->toISOString(),
                'items' => $order->items->map(fn ($item) => [
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
            ];

            return $this->returnSuccess($data, 'Order details retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }

    /**
     * Cancel an eligible customer order and restore reserved product stock.
     */
    public function cancel(string $orderNumberOrId, Request $request)
    {
        try {
            /** @var Customer $customer */
            $customer = $request->user();

            $order = Order::with('items')->whereSlugOrId($orderNumberOrId, 'order_number')->first();

            if (! $order) {
                return $this->returnError(null, 'Order not found.', 404);
            }

            // Authorization check
            if ($order->customer_id !== $customer->id && strtolower($order->customer_email) !== strtolower($customer->email)) {
                return $this->returnError(null, 'Unauthorized to cancel this order.', 403);
            }

            if ($order->isCancelled() || $order->status === OrderStatus::Cancelled || $order->status === OrderStatus::Cancelled->value) {
                return $this->returnError(null, 'This order has already been cancelled.');
            }

            $cancellableStatuses = [OrderStatus::Pending, OrderStatus::Processing];
            $isCancellable = in_array($order->status, $cancellableStatuses, true)
                || in_array($order->status, [OrderStatus::Pending->value, OrderStatus::Processing->value], true);

            if (! $isCancellable) {
                $statusVal = $order->status instanceof OrderStatus ? $order->status->value : (string) $order->status;
                return $this->returnError(
                    null,
                    "Order cannot be cancelled in '{$statusVal}' status.",
                    422
                );
            }

            $reason = $request->input('reason', 'Cancelled by customer');

            DB::transaction(function () use ($order, $reason): void {
                // Restore inventory
                foreach ($order->items as $item) {
                    $qty = (int) $item->quantity;

                    if ($item->product_variant_id) {
                        $variant = ProductVariant::where('id', $item->product_variant_id)->lockForUpdate()->first();
                        if ($variant) {
                            $variant->increment('stock_quantity', $qty);
                        }
                    }

                    if ($item->product_id) {
                        $product = Product::where('id', $item->product_id)->lockForUpdate()->first();
                        if ($product) {
                            $product->increment('stock_quantity', $qty);
                        }
                    }
                }

                $order->update([
                    'status' => OrderStatus::Cancelled,
                    'notes' => trim(($order->notes ? "{$order->notes}\n" : '') . "Cancellation Reason: {$reason}"),
                ]);
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
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
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
            'items_count' => $order->items->count(),
            'subtotal' => (float) $order->subtotal,
            'discount_amount' => (float) $order->discount_amount,
            'tax' => (float) $order->tax,
            'shipping_fee' => (float) $order->shipping_fee,
            'total' => (float) $order->total,
            'preview_items' => $order->items->take(2)->map(fn ($item) => [
                'name' => $item->product_name,
                'quantity' => $item->quantity,
                'price' => (float) $item->price,
                'image_url' => $item->image_url,
            ]),
        ];
    }
}


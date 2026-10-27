<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use Exception;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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
            $perPage = min(max($request->integer('per_page', 10), 1), 50);

            $query = Order::query()
                ->where(function (Builder $q) use ($customer): void {
                    $q->where('customer_id', $customer->id)
                        ->orWhere('customer_email', $customer->email);
                })
                ->with(['items'])
                ->latest();

            // Optional status filter
            if ($status = $request->string('status')->trim()->value()) {
                $query->where('status', $status);
            }

            $paginator = $query->paginate($perPage);

            $items = array_map(function (Order $order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'created_at' => $order->created_at?->toISOString(),
                    'status' => $order->status,
                    'payment_method' => $order->payment_method,
                    'payment_status' => $order->payment_status,
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
            }, $paginator->items());

            return $this->paginatedResponse($paginator, $items, 'Orders retrieved successfully.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
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

            $order = Str::isUuid($orderNumberOrId)
                ? $query->where('id', $orderNumberOrId)->first()
                : $query->where('order_number', $orderNumberOrId)->first();

            if (! $order) {
                return $this->returnError('Order not found.', 'Order not found.', 404);
            }

            // Authorization check
            if ($order->customer_id !== $customer->id && strtolower($order->customer_email) !== strtolower($customer->email)) {
                return $this->returnError('Unauthorized to view this order.', 'Unauthorized to view this order.', 403);
            }

            $data = [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
                'shipping_address' => $order->shipping_address,
                'status' => $order->status,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
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

            $order = Str::isUuid($orderNumberOrId)
                ? Order::where('id', $orderNumberOrId)->with('items')->first()
                : Order::where('order_number', $orderNumberOrId)->with('items')->first();

            if (! $order) {
                return $this->returnError('Order not found.', 'Order not found.', 404);
            }

            // Authorization check
            if ($order->customer_id !== $customer->id && strtolower($order->customer_email) !== strtolower($customer->email)) {
                return $this->returnError('Unauthorized to cancel this order.', 'Unauthorized to cancel this order.', 403);
            }

            if ($order->status === 'cancelled') {
                return $this->returnError('This order has already been cancelled.', 'This order has already been cancelled.', 422);
            }

            if (! in_array($order->status, ['pending', 'processing'], true)) {
                return $this->returnError(
                    "Order cannot be cancelled in '{$order->status}' status.",
                    "Order cannot be cancelled in '{$order->status}' status.",
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
                    'status' => 'cancelled',
                    'notes' => trim(($order->notes ? "{$order->notes}\n" : '') . "Cancellation Reason: {$reason}"),
                ]);
            });

            $data = [
                'order_number' => $order->order_number,
                'status' => 'cancelled',
            ];

            return $this->returnSuccess($data, 'Order has been successfully cancelled and inventory restored.');
        } catch (Exception $e) {
            return $this->returnError($e->getMessage());
        }
    }
}

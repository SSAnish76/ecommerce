<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\Order\OrderStatusUpdatedMail;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    /**
     * Display a listing of orders with status filtering and customer search.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $status = $request->string('status')->trim()->value();

        $orders = Order::query()
            ->with(['items.product', 'items.variant.media'])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $q) use ($search): void {
                    $q->where('order_number', 'like', "%{$search}%")
                        ->orWhere('customer_name', 'like', "%{$search}%")
                        ->orWhere('customer_email', 'like', "%{$search}%")
                        ->orWhere('customer_phone', 'like', "%{$search}%");
                });
            })
            ->when($status !== '', function (Builder $query) use ($status): void {
                $query->where('status', $status);
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $totalRevenue = (float) Order::where('status', '!=', 'cancelled')->sum('total');
        $totalOrders = Order::count();
        $pendingOrders = Order::where('status', 'pending')->count();
        $processingOrders = Order::where('status', 'processing')->count();
        $completedOrders = Order::where('status', 'completed')->count();
        $cancelledOrders = Order::where('status', 'cancelled')->count();

        return Inertia::render('Admin/Orders', [
            'orders' => $orders,
            'metrics' => [
                'total_revenue' => $totalRevenue,
                'total_orders' => $totalOrders,
                'pending_orders' => $pendingOrders,
                'processing_orders' => $processingOrders,
                'completed_orders' => $completedOrders,
                'cancelled_orders' => $cancelledOrders,
            ],
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'statuses' => [
                ['value' => 'pending', 'label' => 'Pending Payment / Verification'],
                ['value' => 'processing', 'label' => 'Processing & Packing'],
                ['value' => 'completed', 'label' => 'Completed & Delivered'],
                ['value' => 'cancelled', 'label' => 'Cancelled & Restocked'],
            ],
        ]);
    }

    /**
     * Update order status with atomic inventory restoration if cancelled.
     */
    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pending,processing,completed,cancelled'],
        ]);

        $previousStatus = $order->status instanceof \App\Enums\Order\OrderStatus ? $order->status->value : (string) $order->status;
        $newStatus = $validated['status'];

        if ($previousStatus === $newStatus) {
            return redirect()->back()->with('info', 'Order status remained unchanged.');
        }

        DB::transaction(function () use ($order, $previousStatus, $newStatus): void {
            // If cancelling: restock variants and parent products
            if ($newStatus === 'cancelled' && $previousStatus !== 'cancelled') {
                foreach ($order->items as $item) {
                    if ($item->product_variant_id) {
                        $variant = ProductVariant::find($item->product_variant_id);
                        if ($variant) {
                            $variant->increment('stock_quantity', $item->quantity);
                        }
                    }

                    if ($item->product_id) {
                        $product = Product::find($item->product_id);
                        if ($product) {
                            $product->increment('stock_quantity', $item->quantity);
                        }
                    }
                }
            }

            // If reactivating a cancelled order: re-deduct stock
            if ($previousStatus === 'cancelled' && $newStatus !== 'cancelled') {
                foreach ($order->items as $item) {
                    if ($item->product_variant_id) {
                        $variant = ProductVariant::find($item->product_variant_id);
                        if ($variant) {
                            $variant->decrement('stock_quantity', min($variant->stock_quantity, $item->quantity));
                        }
                    }

                    if ($item->product_id) {
                        $product = Product::find($item->product_id);
                        if ($product) {
                            $product->decrement('stock_quantity', min($product->stock_quantity, $item->quantity));
                        }
                    }
                }
            }

            $order->update(['status' => $newStatus]);
        });

        // Attempt customer notification
        try {
            Mail::to($order->customer_email)->send(new OrderStatusUpdatedMail(
                [
                    'order_number' => $order->order_number,
                    'customer_name' => $order->customer_name,
                    'total' => $order->total,
                ],
                $newStatus
            ));
        } catch (\Throwable $e) {
            Log::info("Could not dispatch OrderStatusUpdatedMail: {$e->getMessage()}");
        }

        return redirect()->back()->with('success', "Order #{$order->order_number} status updated to " . ucfirst($newStatus) . '.');
    }
}

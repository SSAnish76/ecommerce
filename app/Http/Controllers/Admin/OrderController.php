<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\Order\OrderStatus;
use App\Enums\Order\PaymentStatus;
use App\Events\Order\OrderCancelled;
use App\Events\Order\OrderStatusUpdated;
use App\Facades\PaymentGateway;
use App\Facades\Shipping;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
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
            ->with(['items.product', 'items.variant'])
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
            ->latest('created_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Orders', [
            'orders' => $orders,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'statuses' => OrderStatus::options(),
        ]);
    }

    /**
     * Display a dedicated order detail view page.
     */
    public function show(Order $order): Response
    {
        $order->load([
            'items.product.primaryImage.media',
            'items.variant',
            'customer.addresses',
            'payments' => function ($query): void {
                $query->latest('created_at');
            },
            'coupon',
        ]);

        $paidAmount = (float) $order->payments()
            ->where('status', PaymentStatus::Paid->value)
            ->sum('amount');

        $refundedAmount = (float) $order->payments()
            ->where('type', 'refund')
            ->sum('amount');

        $refundableAmount = max(0, $paidAmount - $refundedAmount);
        if ($refundableAmount <= 0 && $order->payment_status === PaymentStatus::Paid) {
            $refundableAmount = (float) $order->total;
        }

        return Inertia::render('Admin/Orders/Show', [
            'order' => $order,
            'statuses' => OrderStatus::options(),
            'paymentStatuses' => PaymentStatus::options(),
            'paymentSummary' => [
                'paid_amount' => $paidAmount,
                'refunded_amount' => $refundedAmount,
                'refundable_amount' => $refundableAmount,
                'is_paid' => $order->payment_status === PaymentStatus::Paid,
                'is_refunded' => $order->payment_status === PaymentStatus::Refunded,
            ],
        ]);
    }

    /**
     * Update order status with atomic inventory restoration if cancelled or reactivated.
     */
    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::enum(OrderStatus::class)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $previousStatus = $order->status instanceof OrderStatus ? $order->status->value : (string) $order->status;
        $newStatus = $validated['status'];

        if ($previousStatus === $newStatus) {
            return redirect()->back()->with('info', 'Order status remained unchanged.');
        }

        DB::transaction(function () use ($order, $previousStatus, $newStatus, $validated): void {
            // If cancelling: restock variants and parent products
            if ($newStatus === OrderStatus::Cancelled->value && $previousStatus !== OrderStatus::Cancelled->value) {
                $this->restoreOrderStock($order);
            }

            // If reactivating a cancelled order: re-deduct stock
            if ($previousStatus === OrderStatus::Cancelled->value && $newStatus !== OrderStatus::Cancelled->value) {
                $this->deductOrderStock($order);
            }

            $updateData = ['status' => $newStatus];
            if (! empty($validated['notes'])) {
                $updateData['notes'] = trim(($order->notes ? "{$order->notes}\n" : '').$validated['notes']);
            }

            $order->update($updateData);
        });

        // Dispatch status update or cancellation event for notifications
        if ($newStatus === OrderStatus::Cancelled->value) {
            OrderCancelled::dispatch([
                'order_number' => $order->order_number,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
                'total' => $order->total,
                'refund_status' => is_string($order->payment_status) ? $order->payment_status : $order->payment_status?->value,
            ], $validated['notes'] ?? 'Cancelled by administrator');
        } else {
            OrderStatusUpdated::dispatch(
                [
                    'order_number' => $order->order_number,
                    'customer_name' => $order->customer_name,
                    'customer_email' => $order->customer_email,
                    'customer_phone' => $order->customer_phone,
                    'customer_id' => $order->customer_id,
                    'total' => $order->total,
                    'tracking_number' => $order->tracking_number ?? null,
                    'notes' => $order->notes ?? null,
                ],
                $previousStatus,
                $newStatus,
            );
        }

        return redirect()->back()->with('success', "Order #{$order->order_number} status updated to ".ucfirst($newStatus).'.');
    }

    /**
     * Cancel an order with stock restoration, reason tracking, and optional automated refund.
     */
    public function cancel(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
            'process_refund' => ['nullable', 'boolean'],
            'refund_amount' => ['nullable', 'numeric', 'min:0.01', "max:{$order->total}"],
        ]);

        if ($order->isCancelled()) {
            return redirect()->back()->with('error', 'This order is already cancelled.');
        }

        $reason = $validated['reason'] ?? 'Cancelled by store administrator';
        $shouldRefund = (bool) ($validated['process_refund'] ?? false);

        DB::transaction(function () use ($order, $reason, $shouldRefund, $validated): void {
            $this->restoreOrderStock($order);

            $order->update([
                'status' => OrderStatus::Cancelled,
                'notes' => trim(($order->notes ? "{$order->notes}\n" : '')."Cancellation Reason: {$reason}"),
            ]);

            // Attempt refund if requested and order has payment settled
            if ($shouldRefund && $order->payment_status === PaymentStatus::Paid) {
                $refundAmount = isset($validated['refund_amount']) ? (float) $validated['refund_amount'] : (float) $order->total;
                $this->executeRefund($order, $refundAmount, $reason);
            }

            // Cancel carrier shipment if tracking number is present
            if (! empty($order->tracking_number) && ! empty($order->shipping_carrier)) {
                try {
                    Shipping::carrier((string) $order->shipping_carrier)->cancelShipment($order->tracking_number);
                } catch (\Throwable $e) {
                    Log::warning('Carrier shipment cancellation failed during admin order cancel: '.$e->getMessage());
                }
            }
        });

        OrderCancelled::dispatch([
            'order_number' => $order->order_number,
            'customer_name' => $order->customer_name,
            'customer_email' => $order->customer_email,
            'customer_phone' => $order->customer_phone,
            'total' => $order->total,
            'refund_status' => is_string($order->payment_status) ? $order->payment_status : $order->payment_status?->value,
        ], $reason);

        return redirect()->back()->with('success', "Order #{$order->order_number} has been cancelled and inventory restocked.");
    }

    /**
     * Process an admin-initiated refund for the order.
     */
    public function refund(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['nullable', 'numeric', 'min:0.01', "max:{$order->total}"],
            'reason' => ['nullable', 'string', 'max:500'],
            'mark_cancelled' => ['nullable', 'boolean'],
        ]);

        $refundAmount = isset($validated['amount']) ? (float) $validated['amount'] : (float) $order->total;
        $reason = $validated['reason'] ?? 'Refund processed by store administrator';
        $markCancelled = (bool) ($validated['mark_cancelled'] ?? false);

        DB::transaction(function () use ($order, $refundAmount, $reason, $markCancelled): void {
            $this->executeRefund($order, $refundAmount, $reason);

            if ($markCancelled && ! $order->isCancelled()) {
                $this->restoreOrderStock($order);
                $order->update([
                    'status' => OrderStatus::Cancelled,
                    'notes' => trim(($order->notes ? "{$order->notes}\n" : '')."Cancelled upon refund: {$reason}"),
                ]);

                OrderCancelled::dispatch([
                    'order_number' => $order->order_number,
                    'customer_name' => $order->customer_name,
                    'customer_email' => $order->customer_email,
                    'customer_phone' => $order->customer_phone,
                    'total' => $order->total,
                    'refund_status' => PaymentStatus::Refunded->value,
                ], $reason);
            }
        });

        $currency = (string) Setting::get('currency_symbol', '$');

        return redirect()->back()->with('success', "Refund of {$currency}".number_format($refundAmount, 2).' was recorded and processed successfully.');
    }

    /**
     * Internal helper to execute refund via registered payment gateway and record payment ledger.
     */
    protected function executeRefund(Order $order, float $amount, string $reason): void
    {
        $method = is_string($order->payment_method) ? $order->payment_method : $order->payment_method?->value;
        $transactionId = 'ref_'.uniqid();
        $payload = ['reason' => $reason, 'initiated_by' => 'admin'];

        if ($method && PaymentGateway::has((string) $method)) {
            try {
                $gateway = PaymentGateway::gateway((string) $method);
                $refundResult = $gateway->refund($order, $amount, $reason);
                if ($refundResult->success) {
                    $transactionId = $refundResult->transactionId ?? $transactionId;
                    $payload = array_merge($payload, (array) $refundResult->data);
                }
            } catch (\Throwable $e) {
                Log::warning('Gateway automated refund encountered exception: '.$e->getMessage().'. Falling back to ledger recording.');
            }
        }

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $order->customer_id,
            'transaction_id' => $transactionId,
            'gateway' => (string) ($method ?? 'manual'),
            'amount' => $amount,
            'currency' => (string) Setting::get('currency_code', 'USD'),
            'status' => PaymentStatus::Refunded,
            'type' => 'refund',
            'payload' => $payload,
            'paid_at' => now(),
        ]);

        $order->update(['payment_status' => PaymentStatus::Refunded]);
    }

    /**
     * Restore line item stock back into products and variants.
     */
    protected function restoreOrderStock(Order $order): void
    {
        foreach ($order->items as $item) {
            if ($item->product_variant_id) {
                $variant = ProductVariant::find($item->product_variant_id);
                if ($variant) {
                    $variant->increment('stock_quantity', (int) $item->quantity);
                }
            }

            if ($item->product_id) {
                $product = Product::find($item->product_id);
                if ($product) {
                    $product->increment('stock_quantity', (int) $item->quantity);
                }
            }
        }
    }

    /**
     * Re-deduct line item stock when an order is reactivated from cancelled state.
     */
    protected function deductOrderStock(Order $order): void
    {
        foreach ($order->items as $item) {
            if ($item->product_variant_id) {
                $variant = ProductVariant::find($item->product_variant_id);
                if ($variant) {
                    $variant->decrement('stock_quantity', min($variant->stock_quantity, (int) $item->quantity));
                }
            }

            if ($item->product_id) {
                $product = Product::find($item->product_id);
                if ($product) {
                    $product->decrement('stock_quantity', min($product->stock_quantity, (int) $item->quantity));
                }
            }
        }
    }
}

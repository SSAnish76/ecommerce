<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    /**
     * Display warehouse inventory levels with stock health summary.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $stockFilter = $request->string('stock_status')->trim()->value();

        $products = Product::query()
            ->with(['brand:id,name', 'category:id,name', 'variants'])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $q) use ($search): void {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhereHas('variants', function (Builder $vq) use ($search): void {
                            $vq->where('name', 'like', "%{$search}%")
                                ->orWhere('sku', 'like', "%{$search}%");
                        });
                });
            })
            ->when($stockFilter !== '', function (Builder $query) use ($stockFilter): void {
                if ($stockFilter === 'low') {
                    $query->lowStock();
                } elseif ($stockFilter === 'out') {
                    $query->outOfStock();
                } elseif ($stockFilter === 'in') {
                    $query->where('stock_quantity', '>', 0);
                }
            })
            ->orderBy('stock_quantity')
            ->paginate(15)
            ->withQueryString();

        // Inventory Telemetry Summary
        $totalProducts = Product::count();
        $lowStockCount = Product::lowStock()->count();
        $outOfStockCount = Product::outOfStock()->count();
        $inStockCount = Product::where('stock_quantity', '>', 0)->count();

        return Inertia::render('Admin/Inventory', [
            'products' => $products,
            'metrics' => [
                'total_products' => $totalProducts,
                'in_stock' => $inStockCount,
                'low_stock' => $lowStockCount,
                'out_of_stock' => $outOfStockCount,
            ],
            'filters' => [
                'search' => $search,
                'stock_status' => $stockFilter,
            ],
        ]);
    }

    /**
     * Update stock for a single standard product.
     */
    public function updateStock(Request $request, Product $product): RedirectResponse
    {
        /** @var array{stock_quantity: int, low_stock_threshold: int} $validated */
        $validated = $request->validate([
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
        ]);

        $product->update([
            'stock_quantity' => $validated['stock_quantity'],
            'low_stock_threshold' => $validated['low_stock_threshold'],
        ]);

        return redirect()->back()->with('success', "Stock for '{$product->name}' updated to {$validated['stock_quantity']} units.");
    }

    /**
     * Update stock for a specific product variant.
     */
    public function updateVariantStock(Request $request, ProductVariant $variant): RedirectResponse
    {
        /** @var array{stock_quantity: int, low_stock_threshold: int} $validated */
        $validated = $request->validate([
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
        ]);

        $variant->update([
            'stock_quantity' => $validated['stock_quantity'],
            'low_stock_threshold' => $validated['low_stock_threshold'],
        ]);

        // Keep parent product stock quantity in sync
        $parent = $variant->product;
        if ($parent !== null) {
            $totalVariantStock = (int) $parent->variants()->sum('stock_quantity');
            $parent->update(['stock_quantity' => $totalVariantStock]);
        }

        return redirect()->back()->with('success', "Variant '{$variant->name}' stock updated to {$validated['stock_quantity']} units.");
    }

    /**
     * Bulk stock adjustments.
     */
    public function batchUpdate(Request $request): RedirectResponse
    {
        /** @var array{items: list<array{id: string, type: string, stock_quantity: int}>} $validated */
        $validated = $request->validate([
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'string'],
            'items.*.type' => ['required', 'string', 'in:product,variant'],
            'items.*.stock_quantity' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($validated): void {
            foreach ($validated['items'] as $item) {
                if ($item['type'] === 'product') {
                    Product::where('id', $item['id'])->update(['stock_quantity' => $item['stock_quantity']]);
                } elseif ($item['type'] === 'variant') {
                    $v = ProductVariant::find($item['id']);
                    if ($v !== null) {
                        $v->update(['stock_quantity' => $item['stock_quantity']]);
                        $parent = $v->product;
                        if ($parent !== null) {
                            $parent->update(['stock_quantity' => (int) $parent->variants()->sum('stock_quantity')]);
                        }
                    }
                }
            }
        });

        return redirect()->back()->with('success', 'Batch inventory quantities updated successfully.');
    }
}

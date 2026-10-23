<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\Collection\CollectionType;
use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Collection;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CollectionController extends Controller
{
    /**
     * Display a listing of collections with product/brand/category assignments and metrics.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $status = $request->string('status')->trim()->value();
        $type = $request->string('type')->trim()->value();

        $collections = Collection::query()
            ->with([
                'image',
                'products:id,name,sku,sale_price,retail_price',
                'brands:id,name,logo_id',
                'categories:id,name',
            ])
            ->withCount(['products', 'brands', 'categories'])
            ->when($search !== '', function (Builder $q) use ($search): void {
                $q->where(function (Builder $sub) use ($search): void {
                    $sub->where('name', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($type !== '', function (Builder $q) use ($type): void {
                $q->where('type', $type);
            })
            ->when($status !== '', function (Builder $q) use ($status): void {
                if ($status === 'active') {
                    $q->where('is_active', true);
                } elseif ($status === 'inactive') {
                    $q->where('is_active', false);
                }
            })
            ->latest('created_at')
            ->paginate(15)
            ->withQueryString();

        // Options for assignment pickers
        $productOptions = Product::query()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'sale_price', 'retail_price']);

        $brandOptions = Brand::query()
            ->active()
            ->with('logo')
            ->orderBy('name')
            ->get(['id', 'name', 'logo_id']);

        $categoryOptions = Category::query()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Admin/Collections/Index', [
            'collections' => $collections,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'type' => $type,
            ],
        ]);
    }

    /**
     * Show the form for creating a new collection.
     */
    public function create(): Response
    {
        $productOptions = Product::query()->active()->orderBy('name')->get(['id', 'name', 'sku', 'sale_price', 'retail_price']);
        $brandOptions = Brand::query()->active()->with('logo')->orderBy('name')->get(['id', 'name', 'logo_id']);
        $categoryOptions = Category::query()->active()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/Collections/CreateOrEdit', [
            'collection' => null,
            'options' => [
                'products' => $productOptions,
                'brands' => $brandOptions,
                'categories' => $categoryOptions,
                'types' => CollectionType::options(),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified collection.
     */
    public function edit(Collection $collection): Response
    {
        $collection->load(['products:id,name,sku,sale_price,retail_price', 'brands:id,name,logo_id', 'categories:id,name']);

        $productOptions = Product::query()->active()->orderBy('name')->get(['id', 'name', 'sku', 'sale_price', 'retail_price']);
        $brandOptions = Brand::query()->active()->with('logo')->orderBy('name')->get(['id', 'name', 'logo_id']);
        $categoryOptions = Category::query()->active()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Admin/Collections/CreateOrEdit', [
            'collection' => $collection,
            'options' => [
                'products' => $productOptions,
                'brands' => $brandOptions,
                'categories' => $categoryOptions,
                'types' => CollectionType::options(),
            ],
        ]);
    }

    /**
     * Store a newly created collection in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'type' => ['required', Rule::in(CollectionType::values())],
            'description' => ['nullable', 'string', 'max:1000'],
            'image_id' => ['nullable', 'exists:media_files,id'],
            'is_active' => ['nullable', 'boolean'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['string', 'exists:products,id'],
            'brand_ids' => ['nullable', 'array'],
            'brand_ids.*' => ['string', 'exists:brands,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['string', 'exists:categories,id'],
        ]);

        $slug = ! empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);
        if (empty($slug)) {
            $slug = 'collection-'.Str::random(6);
        }

        $originalSlug = $slug;
        $counter = 1;
        while (Collection::where('slug', $slug)->exists()) {
            $slug = "{$originalSlug}-{$counter}";
            $counter++;
        }

        $collection = Collection::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'type' => $validated['type'],
            'description' => $validated['description'] ?? null,
            'image_id' => $validated['image_id'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $this->syncCollectionItems($collection, $validated);

        return redirect()->route('admin.collections.index')->with('success', "Collection '{$collection->name}' created successfully.");
    }

    /**
     * Update the specified collection in storage.
     */
    public function update(Request $request, Collection $collection): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', Rule::in(CollectionType::values())],
            'description' => ['nullable', 'string', 'max:1000'],
            'image_id' => ['nullable', 'exists:media_files,id'],
            'is_active' => ['nullable', 'boolean'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['string', 'exists:products,id'],
            'brand_ids' => ['nullable', 'array'],
            'brand_ids.*' => ['string', 'exists:brands,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['string', 'exists:categories,id'],
        ]);

        $slug = ! empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);
        if (empty($slug)) {
            $slug = 'collection-'.Str::random(6);
        }

        $originalSlug = $slug;
        $counter = 1;
        while (Collection::where('slug', $slug)->where('id', '!=', $collection->id)->exists()) {
            $slug = "{$originalSlug}-{$counter}";
            $counter++;
        }

        $collection->update([
            'name' => $validated['name'],
            'slug' => $slug,
            'type' => $validated['type'] ?? $collection->type,
            'description' => $validated['description'] ?? null,
            'image_id' => array_key_exists('image_id', $validated) ? $validated['image_id'] : $collection->image_id,
            'is_active' => $validated['is_active'] ?? $collection->is_active,
        ]);

        $this->syncCollectionItems($collection, $validated);

        return redirect()->route('admin.collections.index')->with('success', "Collection '{$collection->name}' updated successfully.");
    }

    /**
     * Remove the specified collection from storage.
     */
    public function destroy(Collection $collection): RedirectResponse
    {
        $name = $collection->name;
        $collection->delete();

        return redirect()->route('admin.collections.index')->with('success', "Collection '{$name}' deleted successfully.");
    }

    /**
     * Toggle collection active status.
     */
    public function toggleStatus(Collection $collection): RedirectResponse
    {
        $collection->update(['is_active' => ! $collection->is_active]);

        $statusStr = $collection->is_active ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "Collection '{$collection->name}' has been {$statusStr}.");
    }

    /**
     * Sync relations based on collection type.
     *
     * @param  array<string, mixed>  $data
     */
    protected function syncCollectionItems(Collection $collection, array $data): void
    {
        $type = $data['type'] ?? CollectionType::Product->value;

        if ($type === CollectionType::Product->value || $type === CollectionType::Product) {
            $syncData = [];
            foreach ($data['product_ids'] ?? [] as $idx => $id) {
                $syncData[$id] = ['sort_order' => $idx + 1];
            }
            $collection->products()->sync($syncData);
            $collection->brands()->detach();
            $collection->categories()->detach();
        } elseif ($type === CollectionType::Brand->value || $type === CollectionType::Brand) {
            $syncData = [];
            foreach ($data['brand_ids'] ?? [] as $idx => $id) {
                $syncData[$id] = ['sort_order' => $idx + 1];
            }
            $collection->brands()->sync($syncData);
            $collection->products()->detach();
            $collection->categories()->detach();
        } elseif ($type === CollectionType::Category->value || $type === CollectionType::Category) {
            $syncData = [];
            foreach ($data['category_ids'] ?? [] as $idx => $id) {
                $syncData[$id] = ['sort_order' => $idx + 1];
            }
            $collection->categories()->sync($syncData);
            $collection->products()->detach();
            $collection->brands()->detach();
        }
    }
}

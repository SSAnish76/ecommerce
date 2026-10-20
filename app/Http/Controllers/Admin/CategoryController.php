<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\MediaFile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * Display a listing of categories and subcategories.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $status = $request->string('status')->trim()->value();
        $parentId = $request->query('parent_id');

        $categories = Category::query()
            ->with(['parent:id,name', 'image'])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $q) use ($search): void {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($status !== '', function (Builder $query) use ($status): void {
                if ($status === 'active') {
                    $query->where('is_active', true);
                } elseif ($status === 'inactive') {
                    $query->where('is_active', false);
                }
            })
            ->when($parentId !== null && $parentId !== '', function (Builder $query) use ($parentId): void {
                if ($parentId === 'root') {
                    $query->whereNull('parent_id');
                } else {
                    $query->where('parent_id', $parentId);
                }
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        // All root and high-level categories for dropdowns
        $parentOptions = Category::query()
            ->whereNull('parent_id')
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Admin/Categories', [
            'categories' => $categories,
            'parentOptions' => $parentOptions,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'parent_id' => $parentId,
            ],
        ]);
    }

    /**
     * Store a newly created category in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        /** @var array{parent_id?: ?string, name: string, slug?: ?string, description?: ?string, image_id?: ?string, is_active?: bool, sort_order?: int} $validated */
        $validated = $request->validate([
            'parent_id' => ['nullable', 'string', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:categories,slug'],
            'description' => ['nullable', 'string', 'max:1000'],
            'image_id' => ['nullable'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $imageId = $request->input('image_id') ?: null;

        $slug = ! empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);

        $originalSlug = $slug;
        $counter = 1;
        while (Category::where('slug', $slug)->exists()) {
            $slug = "{$originalSlug}-{$counter}";
            $counter++;
        }

        Category::create([
            'parent_id' => $validated['parent_id'] ?? null,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'image_id' => $imageId,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()->back()->with('success', "Category '{$validated['name']}' created successfully.");
    }

    /**
     * Update the specified category in storage.
     */
    public function update(Request $request, Category $category): RedirectResponse
    {
        /** @var array{parent_id?: ?string, name: string, slug?: ?string, description?: ?string, image_id?: ?string, is_active?: bool, sort_order?: int} $validated */
        $validated = $request->validate([
            'parent_id' => [
                'nullable',
                'string',
                'exists:categories,id',
                // Cannot be parent of itself
                Rule::notIn([$category->id]),
            ],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('categories', 'slug')->ignore($category->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'image_id' => ['nullable'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $imageId = array_key_exists('image_id', $validated) ? ($validated['image_id'] ?: null) : $category->image_id;

        $slug = ! empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);

        $category->update([
            'parent_id' => $validated['parent_id'] ?? null,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'image_id' => $imageId,
            'is_active' => $validated['is_active'] ?? $category->is_active,
            'sort_order' => $validated['sort_order'] ?? $category->sort_order,
        ]);

        return redirect()->back()->with('success', "Category '{$category->name}' updated successfully.");
    }

    /**
     * Remove the specified category from storage.
     */
    public function destroy(Category $category): RedirectResponse
    {
        if ($category->children()->exists()) {
            return redirect()->back()->with('error', "Cannot delete category '{$category->name}' because it contains subcategories. Reassign or delete them first.");
        }

        if ($category->products()->exists()) {
            return redirect()->back()->with('error', "Cannot delete category '{$category->name}' because products are currently assigned to it.");
        }

        $categoryName = $category->name;
        $category->delete();

        return redirect()->back()->with('success', "Category '{$categoryName}' deleted successfully.");
    }

    /**
     * Toggle category active status.
     */
    public function toggleStatus(Category $category): RedirectResponse
    {
        $category->update(['is_active' => ! $category->is_active]);

        $statusStr = $category->is_active ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "Category '{$category->name}' has been {$statusStr}.");
    }
}

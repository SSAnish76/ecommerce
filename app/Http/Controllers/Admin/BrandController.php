<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\MediaFile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BrandController extends Controller
{
    /**
     * Display a listing of the brands.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $status = $request->string('status')->trim()->value();

        $brands = Brand::query()
            ->with('logo')
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
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Admin/Brands', [
            'brands' => $brands,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    /**
     * Store a newly created brand in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        /** @var array{name: string, slug?: ?string, description?: ?string, logo_id?: ?string, is_active?: bool} $validated */
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:brands,slug'],
            'description' => ['nullable', 'string', 'max:1000'],
            'logo_id' => ['nullable'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $logoId = $request->input('logo_id') ?: null;

        $slug = ! empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);

        // Ensure unique slug
        $originalSlug = $slug;
        $counter = 1;
        while (Brand::where('slug', $slug)->exists()) {
            $slug = "{$originalSlug}-{$counter}";
            $counter++;
        }

        Brand::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'logo_id' => $logoId,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->back()->with('success', "Brand '{$validated['name']}' created successfully.");
    }

    /**
     * Update the specified brand in storage.
     */
    public function update(Request $request, Brand $brand): RedirectResponse
    {
        /** @var array{name: string, slug?: ?string, description?: ?string, logo_id?: ?string, is_active?: bool} $validated */
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('brands', 'slug')->ignore($brand->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'logo_id' => ['nullable'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $logoId = array_key_exists('logo_id', $validated) ? ($validated['logo_id'] ?: null) : $brand->logo_id;

        $slug = ! empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);

        $brand->update([
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'logo_id' => $logoId,
            'is_active' => $validated['is_active'] ?? $brand->is_active,
        ]);

        return redirect()->back()->with('success', "Brand '{$brand->name}' updated successfully.");
    }

    /**
     * Remove the specified brand from storage.
     */
    public function destroy(Brand $brand): RedirectResponse
    {
        if ($brand->products()->exists()) {
            return redirect()->back()->with('error', "Cannot delete brand '{$brand->name}' because it has associated products.");
        }

        $brandName = $brand->name;
        $brand->delete();

        return redirect()->back()->with('success', "Brand '{$brandName}' deleted successfully.");
    }

    /**
     * Toggle active status.
     */
    public function toggleStatus(Brand $brand): RedirectResponse
    {
        $brand->update(['is_active' => ! $brand->is_active]);

        $statusStr = $brand->is_active ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "Brand '{$brand->name}' has been {$statusStr}.");
    }
}

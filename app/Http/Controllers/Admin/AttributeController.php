<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attribute;
use App\Models\AttributeValue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AttributeController extends Controller
{
    /**
     * Display a listing of product attributes.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $type = $request->string('type')->trim()->value();

        $attributes = Attribute::query()
            ->with(['values' => function ($q) {
                $q->orderBy('sort_order')->orderBy('value');
            }])
            ->withCount('products')
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $q) use ($search): void {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->when($type !== '', function (Builder $query) use ($type): void {
                $query->where('type', $type);
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Attributes', [
            'attributes' => $attributes,
            'filters' => [
                'search' => $search,
                'type' => $type,
            ],
            'attributeTypes' => [
                ['value' => 'select', 'label' => 'Dropdown Select'],
                ['value' => 'color', 'label' => 'Color Swatch'],
                ['value' => 'button', 'label' => 'Pill Button / Chip'],
                ['value' => 'radio', 'label' => 'Radio List'],
            ],
        ]);
    }

    /**
     * Store a newly created attribute in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100', 'unique:attributes,code'],
            'type' => ['required', 'string', 'in:select,color,button,radio'],
            'description' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
            'values' => ['nullable', 'array'],
            'values.*.value' => ['required', 'string', 'max:255'],
            'values.*.label' => ['nullable', 'string', 'max:255'],
            'values.*.color_code' => ['nullable', 'string', 'max:50'],
            'values.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $code = ! empty($validated['code'])
            ? Str::slug($validated['code'])
            : Str::slug($validated['name']);

        $originalCode = $code;
        $counter = 1;
        while (Attribute::where('code', $code)->exists()) {
            $code = "{$originalCode}-{$counter}";
            $counter++;
        }

        DB::transaction(function () use ($validated, $code): void {
            $attribute = Attribute::create([
                'name' => $validated['name'],
                'code' => $code,
                'type' => $validated['type'],
                'description' => $validated['description'] ?? null,
                'sort_order' => $validated['sort_order'] ?? 0,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            if (! empty($validated['values'])) {
                foreach ($validated['values'] as $idx => $val) {
                    AttributeValue::create([
                        'attribute_id' => $attribute->id,
                        'value' => $val['value'],
                        'label' => $val['label'] ?? $val['value'],
                        'color_code' => $val['color_code'] ?? null,
                        'sort_order' => $val['sort_order'] ?? ($idx + 1),
                        'is_active' => true,
                    ]);
                }
            }
        });

        return redirect()->back()->with('success', "Attribute '{$validated['name']}' created successfully.");
    }

    /**
     * Update the specified attribute in storage.
     */
    public function update(Request $request, Attribute $attribute): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:100', Rule::unique('attributes', 'code')->ignore($attribute->id)],
            'type' => ['required', 'string', 'in:select,color,button,radio'],
            'description' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $attribute->update([
            'name' => $validated['name'],
            'code' => Str::slug($validated['code']),
            'type' => $validated['type'],
            'description' => $validated['description'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->back()->with('success', "Attribute '{$attribute->name}' updated successfully.");
    }

    /**
     * Remove the specified attribute from storage.
     */
    public function destroy(Attribute $attribute): RedirectResponse
    {
        $name = $attribute->name;
        $attribute->delete();

        return redirect()->back()->with('success', "Attribute '{$name}' deleted successfully.");
    }

    /**
     * Add a value to an attribute.
     */
    public function storeValue(Request $request, Attribute $attribute): RedirectResponse
    {
        $validated = $request->validate([
            'value' => [
                'required',
                'string',
                'max:255',
                Rule::unique('attribute_values', 'value')->where('attribute_id', $attribute->id),
            ],
            'label' => ['nullable', 'string', 'max:255'],
            'color_code' => ['nullable', 'string', 'max:50'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $attribute->values()->create([
            'value' => $validated['value'],
            'label' => $validated['label'] ?? $validated['value'],
            'color_code' => $validated['color_code'] ?? null,
            'sort_order' => $validated['sort_order'] ?? ($attribute->values()->count() + 1),
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', "Value '{$validated['value']}' added to attribute '{$attribute->name}'.");
    }

    /**
     * Update an attribute value.
     */
    public function updateValue(Request $request, Attribute $attribute, AttributeValue $value): RedirectResponse
    {
        $validated = $request->validate([
            'value' => [
                'required',
                'string',
                'max:255',
                Rule::unique('attribute_values', 'value')
                    ->where('attribute_id', $attribute->id)
                    ->ignore($value->id),
            ],
            'label' => ['nullable', 'string', 'max:255'],
            'color_code' => ['nullable', 'string', 'max:50'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $value->update([
            'value' => $validated['value'],
            'label' => $validated['label'] ?? $validated['value'],
            'color_code' => $validated['color_code'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->back()->with('success', "Value '{$value->value}' updated.");
    }

    /**
     * Delete an attribute value.
     */
    public function destroyValue(Attribute $attribute, AttributeValue $value): RedirectResponse
    {
        $val = $value->value;
        $value->delete();

        return redirect()->back()->with('success', "Value '{$val}' removed from attribute '{$attribute->name}'.");
    }

    /**
     * Quick-add an attribute value dynamically from product form via JSON.
     */
    public function quickCreateValue(Request $request, Attribute $attribute): JsonResponse
    {
        $validated = $request->validate([
            'value' => [
                'required',
                'string',
                'max:255',
                Rule::unique('attribute_values', 'value')->where('attribute_id', $attribute->id),
            ],
            'label' => ['nullable', 'string', 'max:255'],
            'color_code' => ['nullable', 'string', 'max:50'],
        ]);

        $value = $attribute->values()->create([
            'value' => $validated['value'],
            'label' => $validated['label'] ?? $validated['value'],
            'color_code' => $validated['color_code'] ?? null,
            'sort_order' => $attribute->values()->count() + 1,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'value' => $value,
            'message' => "Value '{$value->value}' created successfully.",
        ]);
    }
}

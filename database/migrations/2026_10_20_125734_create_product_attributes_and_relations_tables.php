<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Pivot between Product and Attribute
        Schema::create('product_attributes', function (Blueprint $table): void {
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUuid('attribute_id')->constrained('attributes')->cascadeOnDelete();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->primary(['product_id', 'attribute_id']);
        });

        // 2. Pivot between Product and enabled AttributeValues
        Schema::create('product_attribute_values', function (Blueprint $table): void {
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUuid('attribute_id')->constrained('attributes')->cascadeOnDelete();
            $table->foreignUuid('attribute_value_id')->constrained('attribute_values')->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['product_id', 'attribute_value_id'], 'prod_attr_val_pk');
        });

        // 3. Relational Pivot between ProductVariant and AttributeValues
        Schema::create('product_variant_attribute_values', function (Blueprint $table): void {
            $table->foreignUuid('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignUuid('attribute_value_id')->constrained('attribute_values')->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['product_variant_id', 'attribute_value_id'], 'p_var_attr_val_pk');
        });

        // 4. Add media_id to product_variants if not present
        if (! Schema::hasColumn('product_variants', 'media_id')) {
            Schema::table('product_variants', function (Blueprint $table): void {
                $table->foreignUuid('media_id')->nullable()->after('image_path')->constrained('media_files')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('product_variants', 'media_id')) {
            Schema::table('product_variants', function (Blueprint $table): void {
                $table->dropForeign(['media_id']);
                $table->dropColumn('media_id');
            });
        }

        Schema::dropIfExists('product_variant_attribute_values');
        Schema::dropIfExists('product_attribute_values');
        Schema::dropIfExists('product_attributes');
    }
};

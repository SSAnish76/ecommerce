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
        Schema::create('collections', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('type')->default('product');
            $table->foreignUuid('image_id')->nullable()->constrained('media_files')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('collection_product', function (Blueprint $table): void {
            $table->foreignUuid('collection_id')->constrained('collections')->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->integer('sort_order')->default(0);
            $table->primary(['collection_id', 'product_id']);
        });

        Schema::create('collection_brand', function (Blueprint $table): void {
            $table->foreignUuid('collection_id')->constrained('collections')->cascadeOnDelete();
            $table->foreignUuid('brand_id')->constrained('brands')->cascadeOnDelete();
            $table->integer('sort_order')->default(0);
            $table->primary(['collection_id', 'brand_id']);
        });

        Schema::create('collection_category', function (Blueprint $table): void {
            $table->foreignUuid('collection_id')->constrained('collections')->cascadeOnDelete();
            $table->foreignUuid('category_id')->constrained('categories')->cascadeOnDelete();
            $table->integer('sort_order')->default(0);
            $table->primary(['collection_id', 'category_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('collection_category');
        Schema::dropIfExists('collection_brand');
        Schema::dropIfExists('collection_product');
        Schema::dropIfExists('collections');
    }
};

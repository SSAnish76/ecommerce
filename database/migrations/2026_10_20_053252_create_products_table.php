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
        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sku')->unique()->index();
            $table->text('short_description')->nullable();
            $table->longText('description')->nullable();
            $table->json('specifications')->nullable();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->decimal('mrp', 10, 2)->default(0.00);
            $table->decimal('retail_price', 10, 2)->default(0.00);
            $table->decimal('sale_price', 10, 2)->nullable();
            $table->decimal('discount_percentage', 5, 2)->nullable();
            $table->integer('stock_quantity')->default(0)->index();
            $table->integer('low_stock_threshold')->default(5);
            $table->string('stock_visibility')->default('badge');
            $table->boolean('has_variants')->default(false);
            $table->string('status')->default('active')->index();
            $table->boolean('is_featured')->default(false)->index();
            $table->string('location_availability_type')->default('all');
            $table->decimal('delivery_radius_km', 6, 2)->nullable();
            $table->text('return_policy')->nullable();
            $table->text('refund_policy')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};

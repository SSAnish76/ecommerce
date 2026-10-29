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
        Schema::create('coupons', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('code')->unique()->index();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('type')->default('percentage'); // percentage or fixed
            $table->decimal('value', 10, 2);
            $table->decimal('min_order_amount', 10, 2)->nullable();
            $table->decimal('max_discount_amount', 10, 2)->nullable();
            $table->string('applies_to')->default('all'); // all, products, categories, collections
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_limit_per_customer')->nullable()->default(1);
            $table->unsignedInteger('times_used')->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('coupon_product', function (Blueprint $table): void {
            $table->foreignUuid('coupon_id')->constrained('coupons')->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->primary(['coupon_id', 'product_id']);
        });

        Schema::create('coupon_category', function (Blueprint $table): void {
            $table->foreignUuid('coupon_id')->constrained('coupons')->cascadeOnDelete();
            $table->foreignUuid('category_id')->constrained('categories')->cascadeOnDelete();
            $table->primary(['coupon_id', 'category_id']);
        });

        Schema::create('coupon_collection', function (Blueprint $table): void {
            $table->foreignUuid('coupon_id')->constrained('coupons')->cascadeOnDelete();
            $table->foreignUuid('collection_id')->constrained('collections')->cascadeOnDelete();
            $table->primary(['coupon_id', 'collection_id']);
        });

        Schema::create('coupon_brand', function (Blueprint $table): void {
            $table->foreignUuid('coupon_id')->constrained('coupons')->cascadeOnDelete();
            $table->foreignUuid('brand_id')->constrained('brands')->cascadeOnDelete();
            $table->primary(['coupon_id', 'brand_id']);
        });

        Schema::create('coupon_usages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('coupon_id')->constrained('coupons')->cascadeOnDelete();
            $table->foreignUuid('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('customer_email')->index();
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->timestamp('used_at')->useCurrent();
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->string('coupon_code')->nullable()->after('subtotal');
            $table->decimal('discount_amount', 10, 2)->default(0.00)->after('coupon_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn(['coupon_code', 'discount_amount']);
        });

        Schema::dropIfExists('coupon_usages');
        Schema::dropIfExists('coupon_brand');
        Schema::dropIfExists('coupon_collection');
        Schema::dropIfExists('coupon_category');
        Schema::dropIfExists('coupon_product');
        Schema::dropIfExists('coupons');
    }
};

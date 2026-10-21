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
        Schema::table('collections', function (Blueprint $table): void {
            $table->string('type')->default('product')->after('description');
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

        Schema::table('collections', function (Blueprint $table): void {
            $table->dropColumn('type');
        });
    }
};

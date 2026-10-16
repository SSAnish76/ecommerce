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
        Schema::create('menus', function (Blueprint $table) {
            $table->string('slug')->primary();
            $table->string('parent_slug')->nullable()->index();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('href');
            $table->string('icon')->nullable();
            $table->string('sort_order', 20)->default('A01');
            $table->boolean('is_crud')->default(false);
            $table->boolean('is_import_export')->default(false);
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->foreign('parent_slug')->references('slug')->on('menus')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menus');
    }
};

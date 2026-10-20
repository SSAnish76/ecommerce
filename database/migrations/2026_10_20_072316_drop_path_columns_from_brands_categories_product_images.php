<?php

declare(strict_types=1);

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
        Schema::table('brands', function (Blueprint $table): void {
            if (Schema::hasColumn('brands', 'logo_path')) {
                $table->dropColumn('logo_path');
            }
        });

        Schema::table('categories', function (Blueprint $table): void {
            if (Schema::hasColumn('categories', 'image_path')) {
                $table->dropColumn('image_path');
            }
        });

        Schema::table('product_images', function (Blueprint $table): void {
            if (Schema::hasColumn('product_images', 'image_path')) {
                $table->dropColumn('image_path');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_images', function (Blueprint $table): void {
            $table->string('image_path')->nullable();
        });

        Schema::table('categories', function (Blueprint $table): void {
            $table->string('image_path')->nullable();
        });

        Schema::table('brands', function (Blueprint $table): void {
            $table->string('logo_path')->nullable();
        });
    }
};

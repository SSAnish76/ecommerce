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
            $table->foreignUuid('logo_id')->nullable()->after('description')->nullOnDelete()->constrained('media_files');
        });

        Schema::table('categories', function (Blueprint $table): void {
            $table->foreignUuid('image_id')->nullable()->after('description')->nullOnDelete()->constrained('media_files');
        });

        Schema::table('product_images', function (Blueprint $table): void {
            $table->foreignUuid('media_id')->nullable()->after('image_path')->nullOnDelete()->constrained('media_files');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_images', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('media_id');
        });

        Schema::table('categories', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('image_id');
        });

        Schema::table('brands', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('logo_id');
        });
    }
};

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
        Schema::create('media_files', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('disk', 50)->default('public');
            $table->string('directory');
            $table->string('filename');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->string('extension', 20);
            $table->unsignedBigInteger('size');
            $table->string('hash', 64)->nullable()->index();
            $table->string('collection', 60)->default('default')->index();

            // Uploader
            $table->foreignUuid('user_id')->nullable()->nullOnDelete();

            // Polymorphic relation to any model (supports both UUID and integer IDs)
            $table->string('mediable_type', 150)->nullable();
            $table->string('mediable_id', 36)->nullable();
            $table->index(['mediable_type', 'mediable_id']);

            // Metadata: dimensions, description, alt, etc.
            $table->json('meta')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('media_files');
    }
};

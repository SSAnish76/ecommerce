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
        Schema::create('stores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('legal_name')->nullable();
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('country')->nullable();
            $table->foreignUuid('logo_id')->nullable()->nullOnDelete()->constrained('media_files');
            $table->foreignUuid('favicon_id')->nullable()->nullOnDelete()->constrained('media_files');
            $table->string('currency', 10)->default('USD');
            $table->string('timezone', 80)->default('UTC');
            $table->string('tax_number', 60)->nullable();
            $table->text('description')->nullable();
            $table->string('website_url')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stores');
    }
};

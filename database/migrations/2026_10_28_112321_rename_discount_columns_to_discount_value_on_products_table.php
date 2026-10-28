<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->decimal('discount_value', 10, 2)->nullable()->after('discount_type');
        });

        // Migrate existing data: copy the relevant value based on discount_type
        DB::statement("
            UPDATE products
            SET discount_value = CASE
                WHEN discount_type = 'fixed' THEN discount_amount
                ELSE discount_percentage
            END
        ");

        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn(['discount_amount', 'discount_percentage']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->decimal('discount_amount', 10, 2)->nullable()->after('discount_value');
            $table->decimal('discount_percentage', 5, 2)->nullable()->after('discount_amount');
        });

        // Restore data based on discount_type
        DB::statement("
            UPDATE products
            SET
                discount_amount     = CASE WHEN discount_type = 'fixed' THEN discount_value ELSE NULL END,
                discount_percentage = CASE WHEN discount_type = 'percentage' THEN discount_value ELSE NULL END
        ");

        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn('discount_value');
        });
    }
};

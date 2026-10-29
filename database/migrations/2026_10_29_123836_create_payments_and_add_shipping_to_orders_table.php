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
        // 1. Separate table to record and track payment transactions
        Schema::create('payments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('transaction_id')->nullable()->index();
            $table->string('gateway')->index(); // stripe, paypal, razorpay, cod
            $table->decimal('amount', 10, 2);
            $table->string('currency', 10)->default('USD');
            $table->string('status')->default('pending')->index(); // pending, paid, failed, refunded
            $table->string('type')->default('charge'); // charge, refund
            $table->json('payload')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        // 2. Add shipping carrier and tracking columns to orders table
        Schema::table('orders', function (Blueprint $table): void {
            $table->string('shipping_carrier', 50)->nullable()->after('shipping_fee');
            $table->string('shipping_method', 50)->nullable()->after('shipping_carrier');
            $table->string('tracking_number', 100)->nullable()->index()->after('shipping_method');
            $table->text('shipping_label_url')->nullable()->after('tracking_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn([
                'shipping_carrier',
                'shipping_method',
                'tracking_number',
                'shipping_label_url',
            ]);
        });

        Schema::dropIfExists('payments');
    }
};

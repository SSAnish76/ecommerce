<?php

declare(strict_types=1);

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
        Schema::table('settings', function (Blueprint $table): void {
            $table->boolean('is_public')->default(false)->after('description')->index();
        });

        // 1. Mark storefront public settings
        $publicKeys = [
            'currency_code',
            'currency_symbol',
            'currency_decimals',
            'timezone',
            'allow_customer_cancellation',
            'enable_customer_reviews',
            'low_stock_threshold',
            'out_of_stock_visibility',
        ];

        DB::table('settings')->whereIn('key', $publicKeys)->update(['is_public' => true]);

        // 2. Add currency_position as a public setting
        DB::table('settings')->updateOrInsert(
            ['key' => 'currency_position'],
            [
                'value' => 'left',
                'group' => 'localization',
                'type' => 'string',
                'label' => 'Currency Position',
                'description' => 'Placement of currency symbol: left ($10) or right (10$)',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // 3. Add frontend exposed constants registry configuration in DB
        DB::table('settings')->updateOrInsert(
            ['key' => 'frontend_constants'],
            [
                'value' => json_encode(['currencies', 'currencies_map', 'timezones'], JSON_THROW_ON_ERROR),
                'group' => 'system',
                'type' => 'json',
                'label' => 'Storefront Exposed Constants',
                'description' => 'List of system constants exposed to public storefront endpoints',
                'is_public' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // 5. Update payment_settings to include gateway names
        $paymentRow = DB::table('settings')->where('key', 'payment_settings')->first();
        if ($paymentRow && ! empty($paymentRow->value)) {
            $gateways = json_decode((string) $paymentRow->value, true) ?: [];
            $gatewayNames = [
                'cod' => 'Cash on Delivery',
                'stripe' => 'Credit / Debit Card (Stripe)',
                'paypal' => 'PayPal',
                'razorpay' => 'Razorpay',
            ];

            foreach ($gatewayNames as $code => $name) {
                if (isset($gateways[$code]) && is_array($gateways[$code])) {
                    if (empty($gateways[$code]['name'])) {
                        $gateways[$code]['name'] = $name;
                    }
                }
            }

            DB::table('settings')->where('key', 'payment_settings')->update([
                'value' => json_encode($gateways),
                'updated_at' => now(),
            ]);
        }

        // 6. Update shipping_settings to include carrier names
        $shippingRow = DB::table('settings')->where('key', 'shipping_settings')->first();
        if ($shippingRow && ! empty($shippingRow->value)) {
            $shippingCarriers = json_decode((string) $shippingRow->value, true) ?: [];
            $carrierNames = [
                'fedex' => 'FedEx',
                'ups' => 'UPS',
                'dhl' => 'DHL Express',
            ];

            foreach ($carrierNames as $code => $name) {
                if (isset($shippingCarriers[$code]) && is_array($shippingCarriers[$code])) {
                    if (empty($shippingCarriers[$code]['name'])) {
                        $shippingCarriers[$code]['name'] = $name;
                    }
                }
            }

            DB::table('settings')->where('key', 'shipping_settings')->update([
                'value' => json_encode($shippingCarriers),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('settings')->whereIn('key', ['currency_position', 'frontend_constants'])->delete();

        Schema::table('settings', function (Blueprint $table): void {
            $table->dropColumn('is_public');
        });
    }
};

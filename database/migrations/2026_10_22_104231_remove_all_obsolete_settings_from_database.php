<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Delete individual obsolete rows
        DB::table('settings')->whereIn('key', [
            'currency_position',
            'session_lifetime_minutes',
            'max_login_attempts',
            'lockout_duration_minutes',
            'require_strong_passwords',
            'min_order_amount',
            'admin_alert_email',
            'enable_email_notifications',
            'enable_in_app_notifications',
            'maintenance_mode',
            'maintenance_notice',
            'allow_admin_bypass_maintenance',
            'shipping_default_method',
            'shipping_flat_rate_cost',
            'shipping_free_shipping_enabled',
            'shipping_free_shipping_min_order',
            'payment_bank_transfer_enabled',
            'payment_bank_name',
            'payment_bank_account_name',
            'payment_bank_account_number',
            'payment_bank_routing_number',
            'payment_bank_swift_code',
            'payment_bank_instructions',
            'mail_mailer',
        ])->delete();

        // 2. Clean payment_settings JSON row to remove bank_transfer
        $paymentSetting = DB::table('settings')->where('key', 'payment_settings')->first();
        if ($paymentSetting && ! empty($paymentSetting->value)) {
            $decoded = json_decode($paymentSetting->value, true);
            if (is_array($decoded) && isset($decoded['bank_transfer'])) {
                unset($decoded['bank_transfer']);
                DB::table('settings')->where('key', 'payment_settings')->update([
                    'value' => json_encode($decoded),
                    'updated_at' => now(),
                ]);
            }
        }

        // 3. Clean shipping_settings JSON row to remove flat_rate and free_shipping
        $shippingSetting = DB::table('settings')->where('key', 'shipping_settings')->first();
        if ($shippingSetting && ! empty($shippingSetting->value)) {
            $decoded = json_decode($shippingSetting->value, true);
            if (is_array($decoded)) {
                unset($decoded['default_method'], $decoded['flat_rate'], $decoded['free_shipping']);
                DB::table('settings')->where('key', 'shipping_settings')->update([
                    'value' => json_encode($decoded),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};

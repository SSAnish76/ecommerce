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
        $setting = DB::table('settings')->where('key', 'payment_settings')->first();
        if ($setting && ! empty($setting->value)) {
            $data = json_decode($setting->value, true);
            if (is_array($data) && ! isset($data['razorpay'])) {
                $data['razorpay'] = [
                    'enabled' => false,
                    'key_id' => '',
                    'key_secret' => '',
                    'webhook_secret' => '',
                ];
                DB::table('settings')->where('key', 'payment_settings')->update([
                    'value' => json_encode($data),
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

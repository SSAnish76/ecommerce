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
        DB::table('settings')->whereIn('key', ['date_format', 'time_format'])->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('settings')->insertOrIgnore([
            [
                'key' => 'date_format',
                'value' => 'Y-m-d',
                'group' => 'localization',
                'type' => 'string',
                'label' => 'Date Display Format',
                'description' => 'Standard date format across administrative dashboard and reports',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'time_format',
                'value' => 'h:i A',
                'group' => 'localization',
                'type' => 'string',
                'label' => 'Time Display Format',
                'description' => '12-hour (h:i A) or 24-hour (H:i) timestamp presentation',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
};

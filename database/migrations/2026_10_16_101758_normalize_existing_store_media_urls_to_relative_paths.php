<?php

declare(strict_types=1);

use App\Services\Storage\MediaStorageService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('stores')) {
            return;
        }

        /** @var MediaStorageService $storage */
        $storage = app(MediaStorageService::class);

        $stores = DB::table('stores')->get();

        foreach ($stores as $store) {
            $updates = [];

            if (! empty($store->logo_url)) {
                $normalizedLogo = $storage->normalizePath($store->logo_url);
                if ($normalizedLogo !== $store->logo_url) {
                    $updates['logo_url'] = $normalizedLogo;
                }
            }

            if (! empty($store->favicon_url)) {
                $normalizedFavicon = $storage->normalizePath($store->favicon_url);
                if ($normalizedFavicon !== $store->favicon_url) {
                    $updates['favicon_url'] = $normalizedFavicon;
                }
            }

            if (! empty($updates)) {
                DB::table('stores')->where('id', $store->id)->update($updates);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Path normalizations are forward-compatible and need not be reversed to broken URLs.
    }
};

<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\MediaPathCast;
use App\Enums\Store\StoreStatus;
use App\Traits\HasMedia;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Store extends Model
{
    use HasFactory, HasMedia, HasUuids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'legal_name',
        'email',
        'phone',
        'address_line1',
        'address_line2',
        'city',
        'state',
        'postal_code',
        'country',
        'logo_url',
        'favicon_url',
        'currency',
        'timezone',
        'tax_number',
        'description',
        'website_url',
        'status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => StoreStatus::class,
            'logo_url' => MediaPathCast::class,
            'favicon_url' => MediaPathCast::class,
        ];
    }

    /**
     * Get the raw relative storage path (folder/filename) for the logo.
     */
    public function getRawLogoPath(): ?string
    {
        return $this->getRawOriginal('logo_url');
    }

    /**
     * Get the raw relative storage path (folder/filename) for the favicon.
     */
    public function getRawFaviconPath(): ?string
    {
        return $this->getRawOriginal('favicon_url');
    }

    /**
     * Determine whether the store is active.
     */
    public function isActive(): bool
    {
        return $this->status === StoreStatus::Active;
    }

    /**
     * Cache key for active store profile.
     */
    public const CACHE_KEY = 'app_store_current';

    /**
     * Get or create the singleton active store profile.
     */
    public static function current(): self
    {
        $cached = Cache::get(self::CACHE_KEY);

        if (is_array($cached)) {
            return (new static)->newFromBuilder($cached);
        }

        if ($cached instanceof self) {
            return $cached;
        }

        if ($cached !== null) {
            Cache::forget(self::CACHE_KEY);
        }

        $store = static::query()->first();

        if ($store === null) {
            $store = static::query()->firstOrCreate(
                ['email' => 'support@store.com'],
                [
                    'name' => (string) config('app.name', 'E-Commerce Store'),
                    'legal_name' => (string) config('app.name', 'E-Commerce Store').' Inc.',
                    'status' => StoreStatus::Active,
                ]
            );
        }

        Cache::put(self::CACHE_KEY, $store->getRawOriginal(), 3600);

        return $store;
    }

    /**
     * Clear cached store profile.
     */
    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}

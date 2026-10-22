<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Store\StoreStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

class Store extends Model
{
    use HasFactory, HasUuids;

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
        'logo_id',
        'favicon_id',
        'tax_number',
        'description',
        'website_url',
        'status',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'logo_url',
        'favicon_url',
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
        ];
    }

    /**
     * Get the store brand logo media file.
     *
     * @return BelongsTo<MediaFile, $this>
     */
    public function logo(): BelongsTo
    {
        return $this->belongsTo(MediaFile::class, 'logo_id');
    }

    /**
     * Get the store favicon media file.
     *
     * @return BelongsTo<MediaFile, $this>
     */
    public function favicon(): BelongsTo
    {
        return $this->belongsTo(MediaFile::class, 'favicon_id');
    }

    /**
     * Dynamic accessor for logo URL.
     */
    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo?->url;
    }

    /**
     * Dynamic accessor for favicon URL.
     */
    public function getFaviconUrlAttribute(): ?string
    {
        return $this->favicon?->url;
    }

    /**
     * Get the raw relative storage path (folder/filename) for the logo.
     */
    public function getRawLogoPath(): ?string
    {
        return $this->logo?->path;
    }

    /**
     * Get the raw relative storage path (folder/filename) for the favicon.
     */
    public function getRawFaviconPath(): ?string
    {
        return $this->favicon?->path;
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
            $store = (new static)->newFromBuilder($cached);
            $store->loadMissing(['logo', 'favicon']);

            return $store;
        }

        if ($cached instanceof self) {
            $cached->loadMissing(['logo', 'favicon']);

            return $cached;
        }

        if ($cached !== null) {
            Cache::forget(self::CACHE_KEY);
        }

        $store = static::query()->with(['logo', 'favicon'])->first();

        if ($store === null) {
            $store = static::query()->create([
                'email' => 'support@store.com',
                'name' => (string) config('app.name', 'E-Commerce Store'),
                'legal_name' => (string) config('app.name', 'E-Commerce Store').' Inc.',
                'status' => StoreStatus::Active,
            ]);
            $store->loadMissing(['logo', 'favicon']);
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

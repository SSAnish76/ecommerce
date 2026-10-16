<?php

declare(strict_types=1);

namespace App\Casts;

use App\Services\Storage\MediaStorageService;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Eloquent Cast that ensures media attributes are stored in the database
 * as domain-agnostic relative paths ('folder/filename') while dynamically
 * resolving to absolute URLs when accessed at runtime.
 */
class MediaPathCast implements CastsAttributes
{
    /**
     * Cast the given value from the database to an absolute URL.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        /** @var MediaStorageService $storage */
        $storage = app(MediaStorageService::class);

        return $storage->resolveUrl((string) $value);
    }

    /**
     * Prepare the given value for storage in the database as a relative path.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        /** @var MediaStorageService $storage */
        $storage = app(MediaStorageService::class);

        return $storage->normalizePath((string) $value);
    }
}

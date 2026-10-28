<?php

declare(strict_types=1);

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Trait to provide flexible querying by UUID or slug/identifier column.
 *
 * @mixin Model
 */
trait FindsBySlugOrId
{
    /**
     * Scope a query to find a record by UUID (or primary key) or slug/identifier column.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeWhereSlugOrId(Builder $query, string $identifier, string $slugColumn = 'slug'): Builder
    {
        $trimmed = trim($identifier);
        $isId = Str::isUuid($trimmed) || (is_numeric($trimmed) && $this->getKeyType() === 'int');
        $column = $isId ? $this->getQualifiedKeyName() : $this->qualifyColumn($slugColumn);

        return $query->where($column, $trimmed);
    }

    /**
     * Scope a query by identifier or ID (alias for whereSlugOrId).
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeWhereIdentifierOrId(Builder $query, string $identifier, string $column = 'slug'): Builder
    {
        return $this->scopeWhereSlugOrId($query, $identifier, $column);
    }

    /**
     * Find a model by its UUID or slug/identifier.
     *
     * @param  array<int, string>  $columns
     */
    public static function findBySlugOrId(string $identifier, array $columns = ['*'], string $slugColumn = 'slug'): ?static
    {
        return static::query()->whereSlugOrId($identifier, $slugColumn)->first($columns);
    }

    /**
     * Find a model by its UUID or slug/identifier or fail with 404.
     *
     * @param  array<int, string>  $columns
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public static function findBySlugOrIdOrFail(string $identifier, array $columns = ['*'], string $slugColumn = 'slug'): static
    {
        return static::query()->whereSlugOrId($identifier, $slugColumn)->firstOrFail($columns);
    }
}


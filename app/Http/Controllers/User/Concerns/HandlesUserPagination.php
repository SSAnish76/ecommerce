<?php

declare(strict_types=1);

namespace App\Http\Controllers\User\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

trait HandlesUserPagination
{
    /**
     * Default number of items per page.
     */
    protected int $defaultPerPage = 15;

    /**
     * Maximum allowed items per page.
     */
    protected int $maxPerPage = 60;

    /**
     * Resolve validated per_page integer within minimum and maximum bounds.
     */
    protected function resolvePerPage(Request $request, ?int $default = null, ?int $max = null, int $min = 1): int
    {
        $defaultLimit = $default ?? $this->defaultPerPage;
        $maxLimit = $max ?? $this->maxPerPage;

        $perPage = $request->integer('per_page', $defaultLimit);

        return min(max($perPage, $min), $maxLimit);
    }

    /**
     * Build standard pagination metadata array from paginator.
     *
     * @return array{total: int, per_page: int, current_page: int, last_page: int, has_more: bool}
     */
    protected function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'total' => $paginator->total(),
            'per_page' => $paginator->perPage(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'has_more' => $paginator->hasMorePages(),
        ];
    }

    /**
     * Execute pagination on query and format items with optional transformer, returning standard response.
     *
     * @param  Builder|Relation  $query
     * @param  (callable(mixed): mixed)|null  $transformer
     */
    protected function paginateAndFormat(
        Builder|Relation $query,
        Request $request,
        ?callable $transformer = null,
        string $message = 'Success'
    ): JsonResponse {
        $perPage = $this->resolvePerPage($request);
        $paginator = $query->paginate($perPage);

        if ($transformer !== null) {
            $items = array_values(array_filter(
                array_map($transformer, $paginator->items()),
                fn ($item) => $item !== null
            ));
        } else {
            $items = $paginator->items();
        }

        return $this->paginatedResponse($paginator, $items, $message);
    }
}

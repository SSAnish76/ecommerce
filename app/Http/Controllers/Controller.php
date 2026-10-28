<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Lang;

abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    public $error;

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
    public function resolvePerPage(Request $request, ?int $default = null, ?int $max = null, int $min = 1): int
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
    public function paginationMeta(LengthAwarePaginator $paginator): array
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
    public function paginateAndFormat(
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

    /**
     * Standardized error response matching asign-api pattern.
     */
    public function returnError($errors = false, $message = 'Error', $code = 400)
    {
        if ($message === 'Error') {
            if (function_exists('trans') && Lang::has('messages.Error')) {
                $message = trans('messages.Error');
            } elseif (is_string($errors) && !empty($errors)) {
                $message = $errors;
                $errors = null;
            }
        } elseif ($errors === $message) {
            $errors = null;
        }

        $response = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null && $errors !== false && $errors !== '') {
            $response['error'] = $errors;
        }

        return response()->json($response, $code);
    }

    /**
     * Standardized success response matching asign-api pattern.
     */
    public function returnSuccess($data = [], $message = 'Success', $code = 200)
    {
        if ($message === 'Success' && function_exists('trans') && Lang::has('messages.Success')) {
            $message = trans('messages.Success');
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    /**
     * Paginated response helper.
     */
    public function paginatedResponse(LengthAwarePaginator $paginator, mixed $items = null, string $message = 'Success')
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $items ?? $paginator->items(),
            'pagination' => [
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'has_more' => $paginator->hasMorePages(),
            ],
        ]);
    }

    /**
     * Backward-compatible alias for successResponse.
     */
    public function successResponse(mixed $data = null, string $message = 'Success', int $statusCode = 200, array $extra = [])
    {
        if (!empty($extra)) {
            $data = is_array($data) ? array_merge($data, $extra) : ['items' => $data, ...$extra];
        }

        return $this->returnSuccess($data, $message, $statusCode);
    }

    /**
     * Backward-compatible alias for errorResponse.
     */
    public function errorResponse(string $message = 'Error', int $statusCode = 400, mixed $errors = null)
    {
        return $this->returnError($errors, $message, $statusCode);
    }
}

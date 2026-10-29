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
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    protected int $defaultPerPage = 15;

    protected int $maxPerPage = 60;

    /**
     * Resolve validated per_page integer within minimum and maximum bounds.
     */
    public function resolvePerPage(Request $request, ?int $default = null, ?int $max = null, int $min = 1): int
    {
        return min(max($request->integer('per_page', $default ?? $this->defaultPerPage), $min), $max ?? $this->maxPerPage);
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
     * Execute pagination on query and format items with optional transformer.
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
        $paginator = $query->paginate($this->resolvePerPage($request));

        $items = $transformer !== null
            ? array_values(array_filter(array_map($transformer, $paginator->items()), fn ($item): bool => $item !== null))
            : $paginator->items();

        return $this->paginatedResponse($paginator, $items, $message);
    }

    /**
     * Safely execute an operation with automatic validation formatting and exception shielding.
     *
     * @param  callable(): JsonResponse  $callback
     */
    public function safeCall(callable $callback): JsonResponse
    {
        try {
            return $callback();
        } catch (ValidationException $e) {
            return $this->returnError($e->errors(), 'Validation failed.', 400);
        } catch (HttpException $e) {
            return $this->returnError(null, $e->getMessage() ?: 'An error occurred.', $e->getStatusCode());
        } catch (RuntimeException|InvalidArgumentException $e) {
            return $this->returnError(null, $e->getMessage(), 400);
        } catch (Throwable $e) {
            Log::error($e->getMessage(), ['exception' => $e]);

            $message = config('app.debug') || app()->environment('local', 'testing')
                ? $e->getMessage()
                : 'An unexpected error occurred. Please try again.';

            return $this->returnError(null, $message, 500);
        }
    }

    /**
     * Standardized error response.
     */
    public function returnError(mixed $errors = null, string $message = 'Error', int $code = 400): JsonResponse
    {
        if ($message === 'Error') {
            if (Lang::has('messages.Error')) {
                $message = __('messages.Error');
            } elseif (is_string($errors) && $errors !== '') {
                $message = $errors;
                $errors = null;
            }
        } elseif ($errors === $message) {
            $errors = null;
        }

        return response()->json([
            'success' => false,
            'message' => $message,
            ...($errors !== null && $errors !== false && $errors !== '' ? ['error' => $errors] : []),
        ], $code);
    }

    /**
     * Standardized success response.
     */
    public function returnSuccess(mixed $data = [], string $message = 'Success', int $code = 200): JsonResponse
    {
        if ($message === 'Success' && Lang::has('messages.Success')) {
            $message = __('messages.Success');
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    /**
     * Standardized paginated response.
     */
    public function paginatedResponse(LengthAwarePaginator $paginator, mixed $items = null, string $message = 'Success'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $items ?? $paginator->items(),
            'pagination' => $this->paginationMeta($paginator),
        ]);
    }

    /**
     * Compatibility alias for success responses.
     */
    public function successResponse(mixed $data = null, string $message = 'Success', int $statusCode = 200, array $extra = []): JsonResponse
    {
        return $this->returnSuccess(
            $extra !== [] ? (is_array($data) ? [...$data, ...$extra] : ['items' => $data, ...$extra]) : $data,
            $message,
            $statusCode
        );
    }

    /**
     * Compatibility alias for error responses.
     */
    public function errorResponse(string $message = 'Error', int $statusCode = 400, mixed $errors = null): JsonResponse
    {
        return $this->returnError($errors, $message, $statusCode);
    }
}

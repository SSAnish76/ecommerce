<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Lang;

abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    public $error;

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
            }
        }

        return response()->json([
            'success' => false,
            'message' => $message,
            'error' => $errors,
        ], $code);
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
        return $this->returnError($errors ?? $message, $message, $statusCode);
    }
}

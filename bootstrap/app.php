<?php

use App\Http\Middleware\AuthenticateAdmin;
use App\Http\Middleware\AuthorizePermission;
use App\Http\Middleware\EnsureNotRefreshToken;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectIfAuthenticatedAdmin;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\CheckForAnyAbility;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'admin.auth' => AuthenticateAdmin::class,
            'admin.guest' => RedirectIfAuthenticatedAdmin::class,
            'permission' => AuthorizePermission::class,
            'abilities' => CheckAbilities::class,
            'ability' => CheckForAnyAbility::class,
            'not.refresh' => EnsureNotRefreshToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated.',
                    'error' => 'Unauthenticated.',
                ], 401);
            }
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $message = $e->getMessage() ?: 'This action is unauthorized.';

                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'error' => $message,
                ], 403);
            }
        });

        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $message = $e->getMessage() ?: 'This action is unauthorized.';

                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'error' => $message,
                ], 403);
            }
        });

        $exceptions->render(function (HttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $statusCode = $e->getStatusCode();
                if ($statusCode === 401 || $statusCode === 403) {
                    $defaultMessage = $statusCode === 401 ? 'Unauthenticated.' : 'This action is unauthorized.';
                    $message = !empty($e->getMessage()) ? $e->getMessage() : $defaultMessage;

                    return response()->json([
                        'success' => false,
                        'message' => $message,
                        'error' => $message,
                    ], $statusCode);
                }
            }
        });
    })->create();

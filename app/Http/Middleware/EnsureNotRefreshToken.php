<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class EnsureNotRefreshToken
{
    /**
     * Prevent refresh tokens from being used directly to authenticate API resource requests.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->currentAccessToken() instanceof PersonalAccessToken) {
            /** @var PersonalAccessToken $token */
            $token = $user->currentAccessToken();

            if ($token->can('issue-access-token') && $token->cant('access-api')) {
                abort(403, 'A refresh token cannot be used to authenticate API requests. Please use an access token.');
            }
        }

        return $next($request);
    }
}

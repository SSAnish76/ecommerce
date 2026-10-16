<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfAuthenticatedAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            /** @var User $user */
            $user = Auth::user();

            if ($user->isAdmin()) {
                // If 2FA not verified, do not redirect to dashboard
                if ($user->hasTwoFactorEnabled() && ! $request->session()->get('auth.two_factor_verified')) {
                    return $next($request);
                }

                return redirect()->route('admin.dashboard');
            }
        }

        return $next($request);
    }
}

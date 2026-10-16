<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::check()) {
            return redirect()->guest(route('admin.login'));
        }

        /** @var User $user */
        $user = Auth::user();

        if (! $user->isActive()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('admin.login')->withErrors([
                'email' => 'This account has been deactivated.',
            ]);
        }

        if (! $user->isAdmin()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('admin.login')->withErrors([
                'email' => 'Access denied. You do not possess administrator credentials.',
            ]);
        }

        // If 2FA is enabled on user account, ensure 2FA session verification flag is present
        if ($user->hasTwoFactorEnabled() && ! $request->session()->get('auth.two_factor_verified')) {
            $request->session()->put('login.id', $user->id);
            Auth::logout();

            return redirect()->route('admin.two-factor.challenge');
        }

        return $next($request);
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\User\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display a listing of the users with search filter and roles.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $roleFilter = $request->string('role')->trim()->value();

        $users = User::query()
            ->select(['id', 'name', 'email', 'status', 'is_2fa', 'role_id', 'created_at', 'last_login_at'])
            ->with(['role:id,name,is_system,status'])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $q) use ($search): void {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($roleFilter !== '', function (Builder $query) use ($roleFilter): void {
                $query->whereHas('role', function (Builder $q) use ($roleFilter): void {
                    $q->where('name', $roleFilter);
                });
            })
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        $roles = Role::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Admin/Users', [
            'users' => $users,
            'roles' => $roles,
            'filters' => [
                'search' => $search,
                'role' => $roleFilter,
            ],
            'statuses' => UserStatus::options(),
        ]);
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        /** @var array{name: string, email: string, password: string, role_id?: ?string, status?: ?string} $validated */
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::defaults()],
            'role_id' => ['nullable', 'string', 'exists:roles,id'],
            'status' => ['nullable', 'string', Rule::enum(UserStatus::class)],
        ]);

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id' => $validated['role_id'] ?? null,
            'status' => $validated['status'] ?? UserStatus::Active->value,
        ]);

        event(new \App\Events\User\UserCreated($user, $validated['password']));

        return redirect()->back()->with('success', 'User created successfully.');
    }

    /**
     * Update the specified user in storage.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        /** @var array{name: string, email: string, password?: ?string, role_id?: ?string, status?: ?string} $validated */
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', Password::defaults()],
            'role_id' => ['nullable', 'string', 'exists:roles,id'],
            'status' => ['nullable', 'string', Rule::enum(UserStatus::class)],
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];

        if (isset($validated['status'])) {
            $user->status = UserStatus::from($validated['status']);
        }

        if (filled($validated['password'] ?? null)) {
            $user->password = Hash::make($validated['password']);
        }

        if (array_key_exists('role_id', $validated)) {
            $user->role_id = $validated['role_id'] ?: null;
        }

        if ($request->boolean('reset_two_factor') || $request->boolean('reset_2fa')) {
            $user->{'2fa_secret'} = null;
            $user->{'2fa_recovery_codes'} = null;
            $user->{'2fa_confirmed_at'} = null;
            $user->is_2fa = false;
        }

        $user->save();

        return redirect()->back()->with('success', 'User updated successfully.');
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === Auth::id()) {
            return redirect()->back()->with('error', 'You cannot delete your own administrator account.');
        }

        if ($user->hasSystemRole()) {
            return redirect()->back()->with('error', 'Users assigned to a system role cannot be deleted.');
        }

        $user->delete();

        return redirect()->back()->with('success', 'User deleted successfully.');
    }
}

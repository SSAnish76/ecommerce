<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MenuController extends Controller
{
    /**
     * Return user's accessible role-based navigation menus with permissions and version.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'menus' => [],
                'version' => 0,
            ], 401);
        }

        $version = (int) Cache::get('role_menus_version', 1);
        $menus = Menu::roleMenuData($user);

        return response()->json([
            'success' => true,
            'version' => $version,
            'menus' => $menus,
        ]);
    }
}

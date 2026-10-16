<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\EnumRegistryService;
use App\Support\Constants;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EssentialsController extends Controller
{
    public function __construct(
        protected EnumRegistryService $enumRegistry
    ) {
    }

    /**
     * Return all system enums, constants, and dropdown configurations dynamically.
     */
    public function index(Request $request): JsonResponse
    {
        $modules = $this->enumRegistry->discover();
        $enums = $this->enumRegistry->getFlatEnums();

        $constants = [
            'timezones' => Constants::timezones(),
            'currencies' => Constants::currencies(),
            'currencies_map' => Constants::currenciesMap(),
            'date_formats' => Constants::dateFormats(),
            'time_formats' => Constants::timeFormats(),
            'vital_permissions' => Constants::vitalPermissions(),
        ];

        $moduleFilter = $request->query('module');
        if (is_string($moduleFilter) && array_key_exists($moduleFilter, $modules)) {
            return response()->json([
                'success' => true,
                'module' => $moduleFilter,
                'data' => $modules[$moduleFilter],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'modules' => $modules,
                'enums' => $enums,
                'constants' => $constants,
            ],
        ]);
    }
}

<?php

declare(strict_types=1);

namespace App\Services;

use BackedEnum;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Symfony\Component\Finder\SplFileInfo;

class EnumRegistryService
{
    /**
     * Cache key for discovered enums metadata.
     */
    public const CACHE_KEY = 'system_discovered_enums';

    /**
     * Discover all enums under app/Enums grouped by domain module.
     *
     * @return array<string, array<string, array{
     *     class: class-string,
     *     values: list<string|int>,
     *     options: list<array{value: string|int, label: string}>,
     *     map: array<string|int, string>
     * }>>
     */
    public function discover(): array
    {
        // In local development or testing, scan dynamically so new files appear instantly.
        if (App::environment('local', 'testing')) {
            return $this->scanDirectory();
        }

        return Cache::remember(self::CACHE_KEY, now()->addDay(), fn (): array => $this->scanDirectory());
    }

    /**
     * Scan the app/Enums directory and build metadata for all enums.
     *
     * @return array<string, array<string, array{
     *     class: class-string,
     *     values: list<string|int>,
     *     options: list<array{value: string|int, label: string}>,
     *     map: array<string|int, string>
     * }>>
     */
    protected function scanDirectory(): array
    {
        $enumsPath = app_path('Enums');

        if (! File::isDirectory($enumsPath)) {
            return [];
        }

        $files = File::allFiles($enumsPath);
        $modules = [];

        foreach ($files as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }

            $enumClass = $this->resolveEnumClass($file);

            if ($enumClass === null || ! enum_exists($enumClass)) {
                continue;
            }

            $module = $this->resolveModuleName($file);
            $enumKey = Str::snake(class_basename($enumClass));

            $modules[$module][$enumKey] = $this->formatEnum($enumClass);
        }

        ksort($modules);

        return $modules;
    }

    /**
     * Resolve the fully qualified class name for a given file.
     *
     * @return class-string|null
     */
    protected function resolveEnumClass(SplFileInfo $file): ?string
    {
        $relativePath = $file->getRelativePathname();
        $classPath = substr($relativePath, 0, -4);
        $normalized = str_replace(['/', '\\'], '\\', $classPath);

        /** @var class-string $class */
        $class = 'App\\Enums\\'.$normalized;

        return class_exists($class) || enum_exists($class) ? $class : null;
    }

    /**
     * Resolve the domain module name based on the subdirectory structure.
     */
    protected function resolveModuleName(SplFileInfo $file): string
    {
        $relativePath = $file->getRelativePath();

        if (empty($relativePath)) {
            return 'common';
        }

        // Take the first directory level as the primary module name
        $segments = explode(DIRECTORY_SEPARATOR, str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relativePath));
        $primaryDir = $segments[0] ?? 'common';

        return Str::snake($primaryDir);
    }

    /**
     * Format any BackedEnum or UnitEnum into a standardized payload.
     *
     * @param  class-string  $enumClass
     * @return array{
     *     class: class-string,
     *     values: list<string|int>,
     *     options: list<array{value: string|int, label: string}>,
     *     map: array<string|int, string>
     * }
     */
    public function formatEnum(string $enumClass): array
    {
        $cases = $enumClass::cases();

        // 1. Resolve raw values
        if (method_exists($enumClass, 'values')) {
            /** @var list<string|int> $values */
            $values = $enumClass::values();
        } else {
            $values = array_map(
                fn (object $case): string|int => $case instanceof BackedEnum ? $case->value : $case->name,
                $cases
            );
        }

        // 2. Resolve label-value options for UI select dropdowns
        if (method_exists($enumClass, 'options')) {
            /** @var list<array{value: string|int, label: string}> $options */
            $options = $enumClass::options();
        } else {
            $options = array_map(
                fn (object $case): array => [
                    'value' => $case instanceof BackedEnum ? $case->value : $case->name,
                    'label' => method_exists($case, 'label') ? $case->label() : Str::headline($case->name),
                ],
                $cases
            );
        }

        // 3. Resolve key-value associative map [value => label]
        if (method_exists($enumClass, 'toArray')) {
            /** @var array<string|int, string> $map */
            $map = $enumClass::toArray();
        } else {
            $map = [];
            foreach ($options as $opt) {
                $map[$opt['value']] = $opt['label'];
            }
        }

        return [
            'class' => $enumClass,
            'values' => $values,
            'options' => $options,
            'map' => $map,
        ];
    }

    /**
     * Get a flat dictionary of all discovered enums keyed by their snake_case name.
     *
     * @return array<string, array{
     *     class: class-string,
     *     values: list<string|int>,
     *     options: list<array{value: string|int, label: string}>,
     *     map: array<string|int, string>
     * }>
     */
    public function getFlatEnums(): array
    {
        $flat = [];
        $modules = $this->discover();

        foreach ($modules as $moduleEnums) {
            foreach ($moduleEnums as $key => $details) {
                $flat[$key] = $details;
            }
        }

        ksort($flat);

        return $flat;
    }

    /**
     * Clear cached enums and Inertia essentials payload.
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
        Cache::forget('app_essentials_data');
    }
}

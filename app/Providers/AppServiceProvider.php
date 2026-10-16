<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;


class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\NotificationDispatcher::class);
        $this->app->singleton(\App\Services\Storage\StorageConfigurator::class);
        $this->app->singleton(\App\Services\Storage\MediaOptimizer::class);
        $this->app->singleton(\App\Services\Storage\MediaStorageService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Model::preventLazyLoading(! $this->app->isProduction());
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());
    }
}


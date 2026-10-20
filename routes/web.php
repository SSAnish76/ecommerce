<?php

use App\Http\Controllers\Admin\Auth\AuthController;
use App\Http\Controllers\Admin\Auth\PasswordResetController;
use App\Http\Controllers\Admin\Auth\TwoFactorChallengeController;
use App\Http\Controllers\Admin\Auth\TwoFactorManagementController;
use App\Http\Controllers\Admin\BrandController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\InventoryController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\StoreController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\EssentialsController;
use App\Http\Controllers\MediaController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('admin.dashboard');
});

Route::prefix('admin')->name('admin.')->group(function (): void {
    // Guest Admin Routes
    Route::middleware('admin.guest')->group(function (): void {
        Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
        Route::post('/login', [AuthController::class, 'login'])->name('login.submit');

        Route::get('/forgot-password', [PasswordResetController::class, 'showForgotPassword'])->name('password.request');
        Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink'])->name('password.email');
        Route::get('/reset-password/{token}', [PasswordResetController::class, 'showResetPassword'])->name('password.reset');
        Route::post('/reset-password', [PasswordResetController::class, 'resetPassword'])->name('password.update');
    });

    // Two-Factor Authentication Challenge
    Route::get('/two-factor-challenge', [TwoFactorChallengeController::class, 'show'])->name('two-factor.challenge');
    Route::post('/two-factor-challenge', [TwoFactorChallengeController::class, 'verify'])->name('two-factor.verify');

    // Authenticated Admin Protected Routes
    Route::middleware('admin.auth')->group(function (): void {
        Route::match(['get', 'post'], '/logout', [AuthController::class, 'logout'])->name('logout');

        // Dashboard
        Route::get('/', [DashboardController::class, 'index'])
            ->middleware('permission:dashboard.view')
            ->name('dashboard');

        // Users Management
        Route::get('/users', [UserController::class, 'index'])
            ->middleware('permission:users.view')
            ->name('users.index');
        Route::post('/users', [UserController::class, 'store'])
            ->middleware('permission:users.create')
            ->name('users.store');
        Route::put('/users/{user}', [UserController::class, 'update'])
            ->middleware('permission:users.edit')
            ->name('users.update');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])
            ->middleware('permission:users.delete')
            ->name('users.destroy');

        // Role Management CRUD
        Route::get('/roles', [RoleController::class, 'index'])
            ->middleware('permission:users.roles')
            ->name('roles.index');
        Route::post('/roles', [RoleController::class, 'store'])
            ->middleware('permission:users.roles')
            ->name('roles.store');
        Route::put('/roles/{role}', [RoleController::class, 'update'])
            ->middleware('permission:users.roles')
            ->name('roles.update');
        Route::delete('/roles/{role}', [RoleController::class, 'destroy'])
            ->middleware('permission:users.roles')
            ->name('roles.destroy');

        // Catalog: Products Management
        Route::get('/products', [ProductController::class, 'index'])
            ->middleware('permission:products.view')
            ->name('products.index');
        Route::get('/products/create', [ProductController::class, 'create'])
            ->middleware('permission:products.create')
            ->name('products.create');
        Route::post('/products', [ProductController::class, 'store'])
            ->middleware('permission:products.create')
            ->name('products.store');
        Route::get('/products/{product}/edit', [ProductController::class, 'edit'])
            ->middleware('permission:products.edit')
            ->name('products.edit');
        Route::put('/products/{product}', [ProductController::class, 'update'])
            ->middleware('permission:products.edit')
            ->name('products.update');
        Route::delete('/products/{product}', [ProductController::class, 'destroy'])
            ->middleware('permission:products.delete')
            ->name('products.destroy');
        Route::patch('/products/{product}/toggle-status', [ProductController::class, 'toggleStatus'])
            ->middleware('permission:products.edit')
            ->name('products.toggle-status');

        // Catalog: Categories & Subcategories
        Route::get('/categories', [CategoryController::class, 'index'])
            ->middleware('permission:categories.view')
            ->name('categories.index');
        Route::post('/categories', [CategoryController::class, 'store'])
            ->middleware('permission:categories.create')
            ->name('categories.store');
        Route::put('/categories/{category}', [CategoryController::class, 'update'])
            ->middleware('permission:categories.edit')
            ->name('categories.update');
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])
            ->middleware('permission:categories.delete')
            ->name('categories.destroy');
        Route::patch('/categories/{category}/toggle-status', [CategoryController::class, 'toggleStatus'])
            ->middleware('permission:categories.edit')
            ->name('categories.toggle-status');

        // Catalog: Brands Management
        Route::get('/brands', [BrandController::class, 'index'])
            ->middleware('permission:brands.view')
            ->name('brands.index');
        Route::post('/brands', [BrandController::class, 'store'])
            ->middleware('permission:brands.create')
            ->name('brands.store');
        Route::put('/brands/{brand}', [BrandController::class, 'update'])
            ->middleware('permission:brands.edit')
            ->name('brands.update');
        Route::delete('/brands/{brand}', [BrandController::class, 'destroy'])
            ->middleware('permission:brands.delete')
            ->name('brands.destroy');
        Route::patch('/brands/{brand}/toggle-status', [BrandController::class, 'toggleStatus'])
            ->middleware('permission:brands.edit')
            ->name('brands.toggle-status');

        // Catalog: Inventory Management
        Route::get('/inventory', [InventoryController::class, 'index'])
            ->middleware('permission:inventory.view')
            ->name('inventory.index');
        Route::put('/inventory/product/{product}', [InventoryController::class, 'updateStock'])
            ->middleware('permission:inventory.edit')
            ->name('inventory.update-product');
        Route::put('/inventory/variant/{variant}', [InventoryController::class, 'updateVariantStock'])
            ->middleware('permission:inventory.edit')
            ->name('inventory.update-variant');
        Route::post('/inventory/batch-update', [InventoryController::class, 'batchUpdate'])
            ->middleware('permission:inventory.edit')
            ->name('inventory.batch-update');

        // Analytics
        Route::get('/analytics', function () {
            return Inertia::render('Admin/Analytics');
        })->middleware('permission:analytics.view')->name('analytics');

        // Store Profile (Singleton Brand & Location Management)
        Route::get('/store', [StoreController::class, 'index'])
            ->middleware('permission:store.view')
            ->name('store');
        Route::match(['post', 'put'], '/store', [StoreController::class, 'update'])
            ->middleware('permission:store.edit')
            ->name('store.update');

        // Global Platform & Operational Settings
        Route::get('/settings', [SettingController::class, 'index'])
            ->middleware('permission:settings.view')
            ->name('settings');
        Route::post('/settings', [SettingController::class, 'update'])
            ->middleware('permission:settings.edit')
            ->name('settings.update');

        // Essentials Lookup (All Enums and System Constants)
        Route::get('/essentials', [EssentialsController::class, 'index'])->name('essentials');

        // Personal Administrator Profile Management
        Route::get('/profile', function () {
            return Inertia::render('Admin/Profile');
        })->name('profile');
        Route::put('/profile', [AuthController::class, 'updateProfile'])->name('profile.update');
        Route::put('/profile/password', [AuthController::class, 'updatePassword'])->name('profile.password');

        // Two-Factor Management (Settings -> Security)
        Route::middleware('permission:security.manage')->prefix('two-factor')->name('two-factor.')->group(function (): void {
            Route::post('/setup', [TwoFactorManagementController::class, 'setup'])->name('setup');
            Route::post('/enable', [TwoFactorManagementController::class, 'enable'])->name('enable');
            Route::post('/disable', [TwoFactorManagementController::class, 'disable'])->name('disable');
            Route::post('/recovery-codes', [TwoFactorManagementController::class, 'showRecoveryCodes'])->name('recovery-codes');
            Route::post('/recovery-codes/regenerate', [TwoFactorManagementController::class, 'regenerateRecoveryCodes'])->name('regenerate-recovery-codes');
        });

        // Media Library & Storage Management
        Route::prefix('media')->name('media.')->group(function (): void {
            Route::get('/', [MediaController::class, 'index'])->name('index');
            Route::post('/upload', [MediaController::class, 'upload'])->name('upload');
            Route::get('/{mediaFile}', [MediaController::class, 'show'])->name('show');
            Route::delete('/{mediaFile}', [MediaController::class, 'destroy'])->name('destroy');
        });
    });
});

// Public Media View and Download Routes
Route::get('/media/view/{mediaFile}', [MediaController::class, 'view'])->name('media.view');
Route::get('/media/download/{mediaFile}', [MediaController::class, 'download'])->name('media.download');



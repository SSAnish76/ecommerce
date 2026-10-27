<?php

declare(strict_types=1);

use App\Http\Controllers\User\AddressController;
use App\Http\Controllers\User\AuthController;
use App\Http\Controllers\User\CartController;
use App\Http\Controllers\User\CategoryController;
use App\Http\Controllers\User\CheckoutController;
use App\Http\Controllers\User\CollectionController;
use App\Http\Controllers\User\OrderController;
use App\Http\Controllers\User\ProductController;
use App\Http\Controllers\User\SearchController;
use App\Http\Controllers\User\WishlistController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Customer Storefront API Routes (User Namespace)
|--------------------------------------------------------------------------
*/
Route::prefix('user')->name('api.user.')->group(function (): void {
    // Guest Authentication Routes
    Route::prefix('auth')->name('auth.')->group(function (): void {
        Route::post('/register', [AuthController::class, 'register'])->name('register');
        Route::post('/login', [AuthController::class, 'login'])->name('login');
        Route::post('/refresh', [AuthController::class, 'refresh'])->name('refresh');

        // Authenticated Auth Profile Routes
        Route::middleware(['auth:sanctum', 'not.refresh'])->group(function (): void {
            Route::get('/profile', [AuthController::class, 'profile'])->name('profile');
            Route::put('/profile', [AuthController::class, 'updateProfile'])->name('profile.update');
            Route::put('/password', [AuthController::class, 'updatePassword'])->name('password.update');
            Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
        });
    });

    // Public Catalog: Products
    Route::prefix('products')->name('products.')->group(function (): void {
        Route::get('/', [ProductController::class, 'index'])->name('index');
        Route::get('/{slugOrId}', [ProductController::class, 'show'])->name('show');
        Route::get('/{slugOrId}/related', [ProductController::class, 'related'])->name('related');
    });

    // Public Catalog: Categories
    Route::prefix('categories')->name('categories.')->group(function (): void {
        Route::get('/', [CategoryController::class, 'index'])->name('index');
        Route::get('/{slugOrId}', [CategoryController::class, 'show'])->name('show');
    });

    // Public Catalog: Collections
    Route::prefix('collections')->name('collections.')->group(function (): void {
        Route::get('/', [CollectionController::class, 'index'])->name('index');
        Route::get('/{slugOrId}', [CollectionController::class, 'show'])->name('show');
    });

    // Public Search & Suggestions
    Route::prefix('search')->name('search.')->group(function (): void {
        Route::get('/', [SearchController::class, 'search'])->name('index');
        Route::get('/suggestions', [SearchController::class, 'suggestions'])->name('suggestions');
    });

    // Authenticated Customer Protected Routes
    Route::middleware(['auth:sanctum', 'not.refresh'])->group(function (): void {
        // Wishlist Management
        Route::prefix('wishlist')->name('wishlist.')->group(function (): void {
            Route::get('/', [WishlistController::class, 'index'])->name('index');
            Route::post('/', [WishlistController::class, 'store'])->name('store');
            Route::post('/toggle', [WishlistController::class, 'toggle'])->name('toggle');
            Route::get('/check/{productId}', [WishlistController::class, 'check'])->name('check');
            Route::delete('/{productId}', [WishlistController::class, 'destroy'])->name('destroy');
        });

        // Shopping Cart Management
        Route::prefix('cart')->name('cart.')->group(function (): void {
            Route::get('/', [CartController::class, 'index'])->name('index');
            Route::post('/', [CartController::class, 'store'])->name('store');
            Route::match(['put', 'patch'], '/{id}', [CartController::class, 'update'])->name('update');
            Route::delete('/{id}', [CartController::class, 'destroy'])->name('destroy');
            Route::delete('/', [CartController::class, 'clear'])->name('clear');
        });

        // Customer Shipping & Billing Addresses
        Route::prefix('addresses')->name('addresses.')->group(function (): void {
            Route::get('/', [AddressController::class, 'index'])->name('index');
            Route::post('/', [AddressController::class, 'store'])->name('store');
            Route::get('/{id}', [AddressController::class, 'show'])->name('show');
            Route::match(['put', 'patch'], '/{id}', [AddressController::class, 'update'])->name('update');
            Route::delete('/{id}', [AddressController::class, 'destroy'])->name('destroy');
            Route::patch('/{id}/default', [AddressController::class, 'setDefault'])->name('default');
        });

        // Customer Order History & Tracking
        Route::prefix('orders')->name('orders.')->group(function (): void {
            Route::get('/statuses', [OrderController::class, 'statuses'])->name('statuses');
            Route::get('/', [OrderController::class, 'index'])->name('index');
            Route::get('/{orderNumberOrId}', [OrderController::class, 'show'])->name('show');
            Route::post('/{orderNumberOrId}/cancel', [OrderController::class, 'cancel'])->name('cancel');
        });

        // Checkout: Summary, Coupon & Order Placement
        Route::prefix('checkout')->name('checkout.')->group(function (): void {
            Route::post('/summary', [CheckoutController::class, 'summary'])->name('summary');
            Route::post('/apply-coupon', [CheckoutController::class, 'validateCoupon'])->name('apply-coupon');
            Route::post('/', [CheckoutController::class, 'checkout'])->name('place-order');
        });
    });
});

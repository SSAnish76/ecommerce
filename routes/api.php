<?php

use App\Http\Controllers\EssentialsController;
use App\Http\Controllers\MediaController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/essentials', [EssentialsController::class, 'index'])->name('api.essentials');

Route::prefix('media')->name('api.media.')->group(function (): void {
    Route::get('/', [MediaController::class, 'index'])->name('index');
    Route::post('/upload', [MediaController::class, 'upload'])->name('upload');
    Route::get('/{mediaFile}', [MediaController::class, 'show'])->name('show');
    Route::post('/{mediaFile}/attach', [MediaController::class, 'attach'])->name('attach');
    Route::delete('/{mediaFile}', [MediaController::class, 'destroy'])->name('destroy');
});

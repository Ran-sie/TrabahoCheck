<?php

use App\Http\Controllers\AiReviewController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\CheckController;
use App\Http\Controllers\JobFitController;
use App\Http\Controllers\ResumeController;
use App\Http\Controllers\ResumeReviewController;
use Illuminate\Support\Facades\Route;

Route::post('/check', CheckController::class)->middleware('throttle:20,1');

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'update']);
    Route::post('/me/resume', [ResumeController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/me/resume', [ResumeController::class, 'show']);
    Route::post('/me/resume/autofill', [ResumeController::class, 'autofill'])->middleware('throttle:6,1');
    Route::delete('/me/resume', [ResumeController::class, 'destroy']);
    Route::post('/me/resume/review', ResumeReviewController::class)->middleware('throttle:4,1');
    Route::post('/job-fit', JobFitController::class)->middleware('throttle:6,1');
    Route::post('/chat', ChatController::class)->middleware('throttle:8,1');
});
Route::post('/ai-review', AiReviewController::class)->middleware('throttle:10,1');

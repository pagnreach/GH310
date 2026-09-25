<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FrontDeskController;
use App\Http\Controllers\BookingCancellationController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\TelegramWebhookController;

Route::get('/', [FrontDeskController::class, 'index'])->name('frontdesk');
Route::get('/calendar', [ReportsController::class, 'calendar'])->name('reports.calendar');
Route::get('/guest-log', [ReportsController::class, 'guestLog'])->name('reports.guest-log');
Route::get('/finance', [FinanceController::class, 'index'])->name('reports.finance');

// Setup Routes
Route::get('/setup', [SettingController::class, 'index'])->name('setup.index');
Route::post('/setup/pricing', [SettingController::class, 'updatePricing'])->name('setup.pricing');
Route::post('/setup/rate', [SettingController::class, 'updateExchangeRate'])->name('setup.rate');
Route::post('/setup/telegram', [SettingController::class, 'updateTelegram'])->name('setup.telegram');
Route::post('/setup/telegram/test', [SettingController::class, 'testTelegram'])->name('setup.telegram.test');
Route::post('/setup/dropdowns', [SettingController::class, 'updateDropdowns'])->name('setup.dropdowns');

// Booking Operations
Route::post('/bookings/add-order', [FrontDeskController::class, 'addOrder'])->name('bookings.add-order');
Route::post('/bookings/{booking}/add-payment', [FrontDeskController::class, 'addPayment'])->name('bookings.add-payment');
Route::post('/bookings/{booking}/checkout', [FrontDeskController::class, 'checkout'])->name('bookings.checkout');
Route::post('/bookings/{booking}/cancel', [BookingCancellationController::class, 'cancel'])->name('bookings.cancel');
Route::post('/rooms/{room}/toggle-cleaning', [FrontDeskController::class, 'toggleCleaning'])->name('rooms.toggle-cleaning');

// Finance Expenses, Withdrawals, Transfers & Deposits
Route::post('/expenses', [FinanceController::class, 'storeExpense'])->name('expenses.store');
Route::post('/finance/withdraw', [FinanceController::class, 'withdrawCash'])->name('finance.withdraw');
Route::post('/finance/transfer', [FinanceController::class, 'storeTransfer'])->name('finance.transfer');
Route::post('/finance/deposit', [FinanceController::class, 'storeDeposit'])->name('finance.deposit');

// Telegram Webhook
Route::post('/telegram/webhook', [TelegramWebhookController::class, 'handle']);

// Financial Record Corrections (Edit / Adjust & Delete)
Route::prefix('finance')->middleware(['web'])->group(function () {
    Route::put('/transactions/{id}', [\App\Http\Controllers\FinanceController::class, 'updateTransaction'])->name('finance.transactions.update');
    Route::delete('/transactions/{id}', [\App\Http\Controllers\FinanceController::class, 'destroyTransaction'])->name('finance.transactions.destroy');
});

// Financial Record Corrections (Edit / Adjust & Delete)
Route::prefix('finance')->middleware(['web'])->group(function () {
    Route::put('/transactions/{id}', [\App\Http\Controllers\FinanceController::class, 'updateTransaction'])->name('finance.transactions.update');
    Route::delete('/transactions/{id}', [\App\Http\Controllers\FinanceController::class, 'destroyTransaction'])->name('finance.transactions.destroy');
});

Route::post('/bookings/add-order', [\App\Http\Controllers\FrontDeskController::class, 'addOrder'])->middleware(['web']);

Route::get('/occupancy-report', [\App\Http\Controllers\OccupancyReportController::class, 'index'])->name('reports.occupancy')->middleware(['web']);
Route::post('/bookings/{booking}/extend', [\App\Http\Controllers\FrontDeskController::class, 'extendStay'])->name('bookings.extend')->middleware(['web']);

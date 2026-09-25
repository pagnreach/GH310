<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Http;

class SettingController extends Controller {
    public function index() {
        return Inertia::render('Setup/Index', [
            'pricingMatrix' => Setting::get('pricing_matrix'),
            'exchangeRate' => Setting::get('exchange_rate', 4000),
            'telegramConfig' => Setting::get('telegram_config', [
                'bot_token' => '',
                'operations_chat_id' => '',
                'housekeeping_chat_id' => '',
                'checkin_alert' => true,
                'payment_alert' => true,
                'checkout_alert' => true,
            ]),
            'expenseCategories' => Setting::get('expense_categories', []),
            'accountsList' => Setting::get('accounts_list', []),
            'depositSources' => Setting::get('deposit_sources', []),
            'transferTypes' => Setting::get('transfer_types', []),
        ]);
    }

    public function updatePricing(Request $request) {
        $data = $request->validate([
            'pricing' => 'required|array',
        ]);

        Setting::set('pricing_matrix', $data['pricing']);
        return redirect()->back()->with('success', 'Room pricing updated successfully.');
    }

    public function updateExchangeRate(Request $request) {
        $data = $request->validate([
            'rate' => 'required|numeric|min:1',
        ]);

        Setting::set('exchange_rate', (float)$data['rate']);
        return redirect()->back()->with('success', 'Exchange rate updated successfully.');
    }

    public function updateTelegram(Request $request) {
        $data = $request->validate([
            'bot_token' => 'nullable|string',
            'operations_chat_id' => 'nullable|string',
            'housekeeping_chat_id' => 'nullable|string',
            'checkin_alert' => 'boolean',
            'payment_alert' => 'boolean',
            'checkout_alert' => 'boolean',
        ]);

        Setting::set('telegram_config', $data);
        return redirect()->back()->with('success', 'Telegram configuration saved.');
    }

    public function testTelegram(Request $request) {
        $chatId = $request->input('chat_id');
        $target = $request->input('target', 'Chat');
        $token = Setting::get('telegram_config')['bot_token'] ?? env('TELEGRAM_BOT_TOKEN');

        if (!$token || !$chatId) {
            return redirect()->back()->withErrors(['telegram' => 'Bot token or Chat ID is missing.']);
        }

        $res = Http::post("https://api.telegram.org/bot{$token}/sendMessage", [
            'chat_id' => $chatId,
            'text' => "🔔 [TEST MESSAGE] 310 Guesthouse PMS successfully connected to {$target}!\nTime: " . now()->format('Y-m-d H:i:s'),
        ]);

        if ($res->successful()) {
            return redirect()->back()->with('success', "Test message sent to {$target} successfully!");
        }

        return redirect()->back()->withErrors(['telegram' => 'Telegram API Error: ' . $res->body()]);
    }

    public function updateDropdowns(Request $request) {
        $data = $request->validate([
            'expense_categories' => 'nullable|array',
            'accounts_list' => 'nullable|array',
            'deposit_sources' => 'nullable|array',
            'transfer_types' => 'nullable|array',
        ]);

        if (isset($data['expense_categories'])) Setting::set('expense_categories', array_values(array_filter($data['expense_categories'])));
        if (isset($data['accounts_list'])) Setting::set('accounts_list', array_values(array_filter($data['accounts_list'])));
        if (isset($data['deposit_sources'])) Setting::set('deposit_sources', array_values(array_filter($data['deposit_sources'])));
        if (isset($data['transfer_types'])) Setting::set('transfer_types', array_values(array_filter($data['transfer_types'])));

        return redirect()->back()->with('success', 'Dropdown lists updated successfully.');
    }
}

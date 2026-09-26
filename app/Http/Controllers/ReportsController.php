<?php

namespace App\Http\Controllers;

use App\Models\Setting;

use App\Models\Booking;
use App\Models\Expense;
use App\Models\Room;
use App\Models\PaymentTransaction;
use App\Models\CashDrawerAdjustment;
use App\Models\BankTransfer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class ReportsController extends Controller {
    public function calendar() {
        $rooms = Room::orderBy('room_number')->get();
        $bookings = Booking::with('room')->where('status', '!=', 'Cancelled')->get();
        return Inertia::render('Reports/RoomCalendar', ['rooms' => $rooms, 'bookings' => $bookings]);
    }

    public function guestLog() {
        $bookings = Booking::with(['room', 'payment_transactions'])
            ->orderBy('id', 'desc')
            ->paginate(50);
        return Inertia::render('Reports/GuestLog', ['bookings' => $bookings]);
    }

    public function cashierReport(Request $request) {
        $preset = $request->input('preset', 'MONTH');
        $customDate = $request->input('date', today()->toDateString());
        $customMonth = $request->input('month', today()->format('Y-m'));

        $start = null;
        $end = null;

        if ($preset === 'TODAY') {
            $start = Carbon::parse($customDate)->startOfDay();
            $end = Carbon::parse($customDate)->endOfDay();
        } elseif ($preset === 'MONTH') {
            $start = Carbon::parse($customMonth . '-01')->startOfMonth()->startOfDay();
            $end = Carbon::parse($customMonth . '-01')->endOfMonth()->endOfDay();
        }

        $expenseQuery = Expense::query();
        $adjQuery = CashDrawerAdjustment::query();

        if ($start && $end) {
            $expenseQuery->whereBetween('created_at', [$start, $end]);
            $adjQuery->whereBetween('created_at', [$start, $end]);
        }

        $expenses = $expenseQuery->get();
        $adjustments = $adjQuery->get();

        $periodExpensesKHR = (float)$expenses->sum(fn($e) => ((float)$e->amount_khr + ((float)$e->amount_usd * Setting::get('exchange_rate', 4000))));

        $entries = collect();

        foreach ($expenses as $e) {
            $entries->push([
                'id' => 'exp-' . $e->id,
                'created_at' => $e->created_at->toDateTimeString(),
                'title' => $e->title,
                'expense_category' => $e->expense_category,
                'amount_khr' => (float)$e->amount_khr,
                'amount_usd' => (float)$e->amount_usd,
                'total_khr_eq' => (float)$e->amount_khr + ((float)$e->amount_usd * Setting::get('exchange_rate', 4000)),
                'payment_method' => $e->payment_method,
                'paid_by' => $e->paid_by ?: 'Reception',
                'notes' => $e->notes,
                'is_withdrawal' => false,
            ]);
        }

        foreach ($adjustments as $a) {
            if ($a->action === 'TOOK' || $a->action === 'BANK TOOK') {
                $entries->push([
                    'id' => 'adj-' . $a->id,
                    'created_at' => $a->created_at->toDateTimeString(),
                    'title' => 'Admin Cash Withdrawal (' . $a->username . ')',
                    'expense_category' => 'Cash Withdrawal',
                    'amount_khr' => (float)$a->khr_amount,
                    'amount_usd' => (float)$a->usd_amount,
                    'total_khr_eq' => (float)$a->khr_amount + ((float)$a->usd_amount * Setting::get('exchange_rate', 4000)),
                    'payment_method' => str_contains($a->action, 'BANK') ? 'ABA Bank' : 'KHR Cash',
                    'paid_by' => $a->username,
                    'notes' => $a->raw_message,
                    'is_withdrawal' => true,
                ]);
            }
        }

        $combinedSorted = $entries->sortByDesc('created_at')->values()->all();

        $allCashIn = (float)PaymentTransaction::sum('khr_cash');
        $allCashExpenses = (float)Expense::whereIn('payment_method', ['KHR Cash', 'Cash at Cashier', 'Cash'])->sum(fn($e) => ((float)$e->amount_khr + ((float)$e->amount_usd * Setting::get('exchange_rate', 4000))));
        $allCashTook = (float)CashDrawerAdjustment::where('action', 'TOOK')->sum('khr_amount');
        $allCashReturn = (float)CashDrawerAdjustment::where('action', 'RETURN')->sum('khr_amount');

        $allTransfers = BankTransfer::all();
        $cashierTransOut = (float)$allTransfers->filter(fn($t) => in_array($t->from_account, ['Cash', 'Cash at Cashier']))->sum('khr_amount');
        $cashierTransIn = (float)$allTransfers->filter(fn($t) => in_array($t->to_account, ['Cash', 'Cash at Cashier']))->sum('khr_amount');

        $currentCashDrawer = max(0, $allCashIn - $allCashExpenses - $allCashTook + $allCashReturn - $cashierTransOut + $cashierTransIn);

        return Inertia::render('Reports/CashierReport', [
            'expenses' => $combinedSorted,
            'preset' => $preset,
            'customDate' => $customDate,
            'customMonth' => $customMonth,
            'periodExpensesKHR' => $periodExpensesKHR,
            'currentCashDrawer' => $currentCashDrawer,
        ]);
    }

    public function storeExpense(Request $request) {
        $data = $request->validate([
            'title' => 'required|string',
            'amount_khr' => 'nullable|numeric|min:0',
            'amount_usd' => 'nullable|numeric|min:0',
            'expense_category' => 'required|string',
            'payment_method' => 'required|string',
            'paid_by' => 'nullable|string',
            'shift' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $khr = (float)($data['amount_khr'] ?? 0);
        $usd = (float)($data['amount_usd'] ?? 0);

        if ($khr <= 0 && $usd <= 0) {
            return redirect()->back()->withErrors(['amount' => 'Please enter an expense amount in KHR or USD.']);
        }

        // Validate available funds in source account
        $balances = FinanceController::getAccountBalances();
        $accountKey = 'ACLEDA';
        if (in_array($data['payment_method'], ['KHR Cash', 'Cash at Cashier', 'Cash'])) {
            $accountKey = 'Cash at Cashier';
        } elseif (str_contains($data['payment_method'], 'Wing')) {
            $accountKey = 'Wing';
        } elseif (str_contains($data['payment_method'], 'Cash We Took')) {
            $accountKey = 'Cash We Took';
        }

        if (isset($balances[$accountKey])) {
            $availKhr = $balances[$accountKey]['khr'];
            $availUsd = $balances[$accountKey]['usd'];

            if ($accountKey === 'Cash at Cashier') {
                $totalKhrReq = $khr + ($usd * Setting::get('exchange_rate', 4000));
                if ($totalKhrReq > $availKhr) {
                    return redirect()->back()->withErrors([
                        'amount' => "Insufficient Cash in Cashier Drawer! Available: " . number_format($availKhr) . " KHR"
                    ]);
                }
            } else {
                if ($khr > $availKhr) {
                    return redirect()->back()->withErrors([
                        'amount' => "Insufficient KHR in {$accountKey}! Available: " . number_format($availKhr) . " KHR"
                    ]);
                }
                if ($usd > $availUsd) {
                    return redirect()->back()->withErrors([
                        'amount' => "Insufficient USD in {$accountKey}! Available: $" . number_format($availUsd, 2)
                    ]);
                }
            }
        }

        // Normalize payment method naming so ACLEDA is recognized everywhere
        $method = $data['payment_method'];
        if (in_array($method, ['ABA Bank', 'ACLEDA', 'ACLEDA Bank'])) {
            $method = 'ACLEDA Bank';
        }

        Expense::create([
            'title' => $data['title'],
            'amount_khr' => $khr,
            'amount_usd' => $usd,
            'expense_category' => $data['expense_category'],
            'payment_method' => $method,
            'paid_by' => $data['paid_by'] ?: 'Reception',
            'shift' => $data['shift'] ?: 'Morning',
            'notes' => $data['notes'] ?: null,
        ]);

        return redirect()->back();
    }

    public function withdrawCash(Request $request) {
        $data = $request->validate([
            'khr_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $khr = (float)$data['khr_amount'];
        $balances = FinanceController::getAccountBalances();
        $availKhr = $balances['Cash at Cashier']['khr'] ?? 0;

        if ($khr > $availKhr) {
            return redirect()->back()->withErrors([
                'amount' => "Insufficient cash in drawer! Available: " . number_format($availKhr) . " KHR"
            ]);
        }

        CashDrawerAdjustment::create([
            'telegram_message_id' => null,
            'username' => 'Admin (Web)',
            'action' => 'TOOK',
            'usd_amount' => 0,
            'khr_amount' => $khr,
            'raw_message' => $data['notes'] ?: 'Admin cash drawer withdrawal',
        ]);

        return redirect()->back();
    }
}

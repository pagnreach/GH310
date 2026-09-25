<?php

namespace App\Http\Controllers;

use App\Models\PaymentTransaction;
use App\Models\Expense;
use App\Models\CashDrawerAdjustment;
use App\Models\BankTransfer;
use App\Models\Booking;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class FinanceController extends Controller {
    public static function getCashierDrawerBalance(): float {
        $payments = PaymentTransaction::all();
        $expenses = Expense::all();
        $adjustments = CashDrawerAdjustment::all();

        // Real front-desk cash collections since launch
        $livePayments = $payments->filter(fn($p) => 
            Carbon::parse($p->created_at)->gte(Carbon::parse('2026-09-01')) &&
            !str_starts_with($p->booking?->notes ?? '', 'Room Income:')
        );
        $deskCashIn = (float)$livePayments->sum('khr_cash');

        $deskExpenses = (float)$expenses->filter(fn($e) => 
            in_array($e->payment_method, ['KHR Cash', 'Cash at Cashier', 'Cash']) &&
            Carbon::parse($e->created_at)->gte(Carbon::parse('2026-09-01'))
        )->sum('amount_khr');

        $manualTook = (float)$adjustments->where('action', 'TOOK')
            ->filter(fn($a) => Carbon::parse($a->created_at)->gte(Carbon::parse('2026-09-01')))
            ->sum('khr_amount');
            
        $manualReturn = (float)$adjustments->where('action', 'RETURN')
            ->filter(fn($a) => Carbon::parse($a->created_at)->gte(Carbon::parse('2026-09-01')))
            ->sum('khr_amount');

        return max(0, $deskCashIn - $deskExpenses - $manualTook + $manualReturn);
    }

    public static function getAccountBalances() {
        $payments = PaymentTransaction::all();
        $expenses = Expense::all();
        $transfers = BankTransfer::all();
        $adjustments = CashDrawerAdjustment::all();

        // 1. CASHIER DRAWER
        $liveCashierKHR = self::getCashierDrawerBalance();

        // 2. ADMIN CASH (Excel baseline: $70.00 & 1,380,000 KHR)
        $adminTookUSD = (float)$adjustments->where('action', 'TOOK')
            ->filter(fn($a) => Carbon::parse($a->created_at)->gte(Carbon::parse('2026-09-01')))
            ->sum('usd_amount');

        $adminTookKHR = (float)$adjustments->where('action', 'TOOK')
            ->filter(fn($a) => Carbon::parse($a->created_at)->gte(Carbon::parse('2026-09-01')))
            ->sum('khr_amount');

        $adminTransOutUSD = (float)$transfers->where('transfer_category', 'TRANSFER')
            ->filter(fn($t) => in_array($t->from_account, ['Cash', 'Cash We Took', 'Admin Cash']))
            ->filter(fn($t) => Carbon::parse($t->transfer_date)->gte(Carbon::parse('2026-09-01')))
            ->sum('usd_amount');

        $adminTransOutKHR = (float)$transfers->where('transfer_category', 'TRANSFER')
            ->filter(fn($t) => in_array($t->from_account, ['Cash', 'Cash We Took', 'Admin Cash']))
            ->filter(fn($t) => Carbon::parse($t->transfer_date)->gte(Carbon::parse('2026-09-01')))
            ->sum('khr_amount');

        $adminCashNetUSD = 70.00 + $adminTookUSD - $adminTransOutUSD;
        $adminCashNetKHR = 1380000 + $adminTookKHR - $adminTransOutKHR;

        // 3. ACLEDA BANK ($3,884.01 & 9,787,400 KHR baseline)
        $newPayments = $payments->filter(fn($p) => Carbon::parse($p->created_at)->gte(Carbon::parse('2026-09-01')));
        $acledaNewInUSD = (float)$newPayments->sum('usd_bank');
        $acledaNewInKHR = (float)$newPayments->sum('khr_bank');

        $newExpenses = $expenses->filter(fn($e) => 
            in_array($e->payment_method, ['ABA Bank', 'ACLEDA Bank', 'ACLEDA']) && 
            Carbon::parse($e->created_at)->gte(Carbon::parse('2026-09-01'))
        );
        $acledaNewExpUSD = (float)$newExpenses->sum('amount_usd');
        $acledaNewExpKHR = (float)$newExpenses->sum('amount_khr');

        $newTransfers = $transfers->filter(fn($t) => Carbon::parse($t->transfer_date)->gte(Carbon::parse('2026-09-01')));
        $acledaTransInUSD = (float)$newTransfers->where('transfer_category', 'TRANSFER')->filter(fn($t) => str_starts_with($t->to_account, 'ACLEDA'))->sum('usd_amount');
        $acledaTransInKHR = (float)$newTransfers->where('transfer_category', 'TRANSFER')->filter(fn($t) => str_starts_with($t->to_account, 'ACLEDA'))->sum('khr_amount');
        $acledaTransOutUSD = (float)$newTransfers->where('transfer_category', 'TRANSFER')->filter(fn($t) => str_starts_with($t->from_account, 'ACLEDA'))->sum('usd_amount');
        $acledaTransOutKHR = (float)$newTransfers->where('transfer_category', 'TRANSFER')->filter(fn($t) => str_starts_with($t->from_account, 'ACLEDA'))->sum('khr_amount');

        $acledaNetUSD = 3884.01 + $acledaNewInUSD + $acledaTransInUSD - $acledaNewExpUSD - $acledaTransOutUSD;
        $acledaNetKHR = 9787400 + $acledaNewInKHR + $acledaTransInKHR - $acledaNewExpKHR - $acledaTransOutKHR;

        // 4. WING BANK ($5,918.85 & 5,948,594 KHR baseline)
        $wingNewInterest = $transfers->where('transfer_category', 'DEPOSIT')
            ->filter(fn($t) => str_starts_with($t->to_account, 'Wing') && Carbon::parse($t->transfer_date)->gte(Carbon::parse('2026-09-01')));
        $wingNewIntUSD = (float)$wingNewInterest->sum('usd_amount');
        $wingNewIntKHR = (float)$wingNewInterest->sum('khr_amount');

        $wingNewExpenses = $expenses->filter(fn($e) => 
            in_array($e->payment_method, ['Wing', 'Wing Bank']) && 
            Carbon::parse($e->created_at)->gte(Carbon::parse('2026-09-01'))
        );
        $wingNewExpUSD = (float)$wingNewExpenses->sum('amount_usd');
        $wingNewExpKHR = (float)$wingNewExpenses->sum('amount_khr');

        $wingTransInUSD = (float)$newTransfers->where('transfer_category', 'TRANSFER')->filter(fn($t) => str_starts_with($t->to_account, 'Wing'))->sum('usd_amount');
        $wingTransInKHR = (float)$newTransfers->where('transfer_category', 'TRANSFER')->filter(fn($t) => str_starts_with($t->to_account, 'Wing'))->sum('khr_amount');
        $wingTransOutUSD = (float)$newTransfers->where('transfer_category', 'TRANSFER')->filter(fn($t) => str_starts_with($t->from_account, 'Wing'))->sum('usd_amount');
        $wingTransOutKHR = (float)$newTransfers->where('transfer_category', 'TRANSFER')->filter(fn($t) => str_starts_with($t->from_account, 'Wing'))->sum('khr_amount');

        $wingNetUSD = 5918.85 + $wingNewIntUSD + $wingTransInUSD - $wingNewExpUSD - $wingTransOutUSD;
        $wingNetKHR = 5948594 + $wingNewIntKHR + $wingTransInKHR - $wingNewExpKHR - $wingTransOutKHR;

        return [
            'cashier_khr'  => $liveCashierKHR,
            'Cash We Took' => ['khr' => $adminCashNetKHR, 'usd' => $adminCashNetUSD],
            'ACLEDA'       => ['khr' => $acledaNetKHR,    'usd' => $acledaNetUSD],
            'Wing'         => ['khr' => $wingNetKHR,      'usd' => $wingNetUSD],
        ];
    }

    public function index(Request $request) {
        $preset = $request->input('preset', 'MONTH');
        $customDate = $request->input('date', today()->toDateString());
        $customMonth = $request->input('month', '2026-09');
        $customYear = $request->input('year', '2026');

        $paymentQuery = PaymentTransaction::with('booking.room');
        $expenseQuery = Expense::query();
        $transferQuery = BankTransfer::query();
        $adjustmentQuery = CashDrawerAdjustment::query();

        if ($preset === 'MONTH') {
            $monthNum = (int)substr($customMonth, 5, 2);
            $yearNum = (int)substr($customMonth, 0, 4);

            $paymentQuery->where(function($q) use ($yearNum, $monthNum) {
                $q->where(fn($sub) => $sub->where('trans_month', $monthNum)->where('trans_year', $yearNum))
                  ->orWhere(fn($sub) => $sub->whereYear('created_at', $yearNum)->whereMonth('created_at', $monthNum));
            });

            $expenseQuery->where(function($q) use ($yearNum, $monthNum) {
                $q->where(fn($sub) => $sub->where('trans_month', $monthNum)->where('trans_year', $yearNum))
                  ->orWhere(fn($sub) => $sub->whereYear('created_at', $yearNum)->whereMonth('created_at', $monthNum));
            });

            $transferQuery->where(function($q) use ($yearNum, $monthNum) {
                $q->where(fn($sub) => $sub->where('trans_month', $monthNum)->where('trans_year', $yearNum))
                  ->orWhere(fn($sub) => $sub->whereYear('transfer_date', $yearNum)->whereMonth('transfer_date', $monthNum));
            });

            $adjustmentQuery->whereYear('created_at', $yearNum)->whereMonth('created_at', $monthNum);
        } elseif ($preset === 'YEAR' || $preset === 'ALL') {
            $yearNum = (int)$customYear;

            $paymentQuery->where(function($q) use ($yearNum) {
                $q->where('trans_year', $yearNum)->orWhereYear('created_at', $yearNum);
            });

            $expenseQuery->where(function($q) use ($yearNum) {
                $q->where('trans_year', $yearNum)->orWhereYear('created_at', $yearNum);
            });

            $transferQuery->where(function($q) use ($yearNum) {
                $q->where('trans_year', $yearNum)->orWhereYear('transfer_date', $yearNum);
            });

            $adjustmentQuery->whereYear('created_at', $yearNum);
        } elseif ($preset === 'TODAY') {
            $paymentQuery->whereDate('created_at', $customDate);
            $expenseQuery->whereDate('created_at', $customDate);
            $transferQuery->whereDate('transfer_date', $customDate);
            $adjustmentQuery->whereDate('created_at', $customDate);
        }

        $payments = $paymentQuery->get();
        $expenses = $expenseQuery->get();
        $transfers = $transferQuery->get();
        $adjustments = $adjustmentQuery->get();

        $interestDeposits = $transfers->where('transfer_category', 'DEPOSIT');

        $depUSD = (float)$payments->sum('usd_bank') + (float)$payments->sum('usd_cash') + (float)$interestDeposits->sum('usd_amount');
        $depKHR = (float)$payments->sum('khr_bank') + (float)$payments->sum('khr_cash') + (float)$interestDeposits->sum('khr_amount');
        $depEq = $depUSD + ($depKHR / 4000);

        $expUSD = (float)$expenses->sum('amount_usd');
        $expKHR = (float)$expenses->sum('amount_khr');
        $expEq = $expUSD + ($expKHR / 4000);

        $netProfitUSD = $depEq - $expEq;
        $balances = self::getAccountBalances();

        $combinedLog = collect();

        foreach ($payments as $p) {
            $roomNum = $p->booking?->room?->room_number ?? 'Room';
            $guestName = $p->booking?->guest_name ?? '';
            $bookingCode = $p->booking?->booking_code ?? '';

            if ((float)$p->khr_cash > 0 || (float)$p->usd_cash > 0) {
                $combinedLog->push([
                    'id' => 'pay-cash-' . $p->id,
                    'date' => $p->created_at->toDateString(),
                    'created_at' => $p->created_at->toDateTimeString(),
                    'type' => 'ROOM PAYMENT',
                    'from_account' => "Guest ({$roomNum})",
                    'to_account' => 'Cash at Cashier',
                    'usd_amount' => (float)$p->usd_cash,
                    'khr_amount' => (float)$p->khr_cash,
                    'notes' => "{$bookingCode} {$guestName} (Cash payment)",
                    'recorded_by' => $p->handled_by ?: 'Reception',
                    'is_expense' => false,
                ]);
            }

            if ((float)$p->usd_bank > 0 || (float)$p->khr_bank > 0) {
                $combinedLog->push([
                    'id' => 'pay-bank-' . $p->id,
                    'date' => $p->created_at->toDateString(),
                    'created_at' => $p->created_at->toDateTimeString(),
                    'type' => 'ROOM PAYMENT',
                    'from_account' => "Guest ({$roomNum})",
                    'to_account' => 'ACLEDA Bank',
                    'usd_amount' => (float)$p->usd_bank,
                    'khr_amount' => (float)$p->khr_bank,
                    'notes' => "{$bookingCode} {$guestName} (Bank payment)",
                    'recorded_by' => $p->handled_by ?: 'Reception',
                    'is_expense' => false,
                ]);
            }
        }

        foreach ($transfers as $t) {
            $combinedLog->push([
                'id' => 'tx-' . $t->id,
                'date' => $t->transfer_date,
                'created_at' => $t->created_at ? $t->created_at->toDateTimeString() : Carbon::parse($t->transfer_date)->toDateTimeString(),
                'type' => $t->transfer_category,
                'from_account' => $t->from_account,
                'to_account' => $t->to_account,
                'usd_amount' => (float)$t->usd_amount,
                'khr_amount' => (float)$t->khr_amount,
                'notes' => $t->notes,
                'recorded_by' => $t->recorded_by,
                'is_expense' => false,
            ]);
        }

        foreach ($expenses as $e) {
            $combinedLog->push([
                'id' => 'exp-' . $e->id,
                'date' => $e->created_at->toDateString(),
                'created_at' => $e->created_at->toDateTimeString(),
                'type' => 'EXPENSE',
                'from_account' => $e->payment_method,
                'to_account' => $e->expense_category,
                'usd_amount' => (float)$e->amount_usd,
                'khr_amount' => (float)$e->amount_khr,
                'notes' => $e->title . ($e->notes ? ' (' . $e->notes . ')' : ''),
                'recorded_by' => $e->paid_by ?: 'Reception',
                'is_expense' => true,
            ]);
        }

        // PUSH CASH DRAWER ADJUSTMENTS / WITHDRAWALS TO LOG
        foreach ($adjustments as $a) {
            $isTook = $a->action === 'TOOK';
            $combinedLog->push([
                'id' => 'adj-' . $a->id,
                'date' => $a->created_at ? $a->created_at->toDateString() : today()->toDateString(),
                'created_at' => $a->created_at ? $a->created_at->toDateTimeString() : now()->toDateTimeString(),
                'type' => $isTook ? 'WITHDRAW' : 'RETURN',
                'from_account' => $isTook ? 'Cash at Cashier' : 'Cash We Took',
                'to_account' => $isTook ? 'Cash We Took' : 'Cash at Cashier',
                'usd_amount' => (float)$a->usd_amount,
                'khr_amount' => (float)$a->khr_amount,
                'notes' => $a->raw_message ?: ($isTook ? 'Admin collected cash drawer' : 'Drawer return'),
                'recorded_by' => $a->username ?: 'Admin',
                'is_expense' => false,
            ]);
        }

        $sortedLog = $combinedLog->sortByDesc('created_at')->values()->all();

        return Inertia::render('Reports/Finance', [
            'preset' => $preset,
            'customDate' => $customDate,
            'customMonth' => $customMonth,
            'customYear' => $customYear,
            'summary' => [
                'deposits_usd' => $depUSD,
                'deposits_khr' => $depKHR,
                'gross_revenue_usd' => $depEq,
                'expenses_usd' => $expUSD,
                'expenses_khr' => $expKHR,
                'total_opex_usd' => $expEq,
                'net_profit_usd' => $netProfitUSD,
            ],
            'cashier_cash' => $balances['cashier_khr'] ?? 0,
            'accounts' => [
                'cash_admin' => [
                    'khr' => $balances['Cash We Took']['khr'],
                    'usd' => $balances['Cash We Took']['usd'],
                    'total_usd_eq' => $balances['Cash We Took']['usd'] + ($balances['Cash We Took']['khr'] / 4000),
                ],
                'acleda' => [
                    'khr' => $balances['ACLEDA']['khr'],
                    'usd' => $balances['ACLEDA']['usd'],
                    'total_usd_eq' => $balances['ACLEDA']['usd'] + ($balances['ACLEDA']['khr'] / 4000),
                ],
                'wing' => [
                    'khr' => $balances['Wing']['khr'],
                    'usd' => $balances['Wing']['usd'],
                    'total_usd_eq' => $balances['Wing']['usd'] + ($balances['Wing']['khr'] / 4000),
                ],
            ],
            'transfers' => $sortedLog,
        ]);
    }

    public function withdrawCash(Request $request) {
        $data = $request->validate([
            'khr_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $khr = (float)$data['khr_amount'];
        $availKhr = self::getCashierDrawerBalance();

        if ($khr > $availKhr) {
            return redirect()->back()->withErrors([
                'amount' => "Insufficient cash in drawer! Available: " . number_format($availKhr) . " KHR"
            ]);
        }

        // Physically record withdrawal from drawer to Admin Cash
        CashDrawerAdjustment::create([
            'telegram_message_id' => null,
            'username' => 'Admin',
            'action' => 'TOOK',
            'usd_amount' => 0,
            'khr_amount' => $khr,
            'raw_message' => $data['notes'] ?: 'Admin collected cash drawer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Cash withdrawn successfully.');
    }

    public function storeExpense(Request $request) {
        $data = $request->validate([
            'title' => 'required|string',
            'amount_khr' => 'nullable|numeric|min:0',
            'amount_usd' => 'nullable|numeric|min:0',
            'expense_category' => 'required|string',
            'payment_method' => 'required|string',
            'expense_date' => 'nullable|date',
            'paid_by' => 'nullable|string',
            'shift' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $expDate = !empty($data['expense_date']) ? Carbon::parse($data['expense_date']) : now();

        Expense::create([
            'title' => $data['title'],
            'amount_khr' => (float)($data['amount_khr'] ?? 0),
            'amount_usd' => (float)($data['amount_usd'] ?? 0),
            'expense_category' => $data['expense_category'],
            'payment_method' => $data['payment_method'],
            'trans_month' => (int)$expDate->format('m'),
            'trans_year' => (int)$expDate->format('Y'),
            'paid_by' => $data['paid_by'] ?: 'Reception',
            'shift' => $data['shift'] ?: 'Morning',
            'notes' => $data['notes'] ?: null,
            'created_at' => $expDate,
        ]);

        return redirect()->back();
    }

    public function storeTransfer(Request $request) {
        $data = $request->validate([
            'transfer_date' => 'required|date',
            'transfer_category' => 'required|string',
            'from_account' => 'required|string',
            'to_account' => 'required|string',
            'usd_amount' => 'nullable|numeric|min:0',
            'khr_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $parsedDate = Carbon::parse($data['transfer_date']);

        BankTransfer::create([
            'transfer_date' => $data['transfer_date'],
            'transfer_category' => $data['transfer_category'],
            'from_account' => $data['from_account'],
            'to_account' => $data['to_account'],
            'usd_amount' => (float)($data['usd_amount'] ?? 0),
            'khr_amount' => (float)($data['khr_amount'] ?? 0),
            'trans_month' => (int)$parsedDate->format('m'),
            'trans_year' => (int)$parsedDate->format('Y'),
            'exchange_rate' => 4000,
            'notes' => $data['notes'],
            'recorded_by' => 'Admin',
            'created_at' => $parsedDate,
        ]);

        return redirect()->back();
    }

    public function storeDeposit(Request $request) {
        $data = $request->validate([
            'deposit_date' => 'required|date',
            'account' => 'required|string',
            'source' => 'required|string',
            'khr_amount' => 'nullable|numeric|min:0',
            'usd_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $parsedDate = Carbon::parse($data['deposit_date']);

        BankTransfer::create([
            'transfer_date' => $data['deposit_date'],
            'transfer_category' => 'DEPOSIT',
            'from_account' => 'External (' . $data['source'] . ')',
            'to_account' => $data['account'],
            'usd_amount' => (float)($data['usd_amount'] ?? 0),
            'khr_amount' => (float)($data['khr_amount'] ?? 0),
            'trans_month' => (int)$parsedDate->format('m'),
            'trans_year' => (int)$parsedDate->format('Y'),
            'exchange_rate' => 4000,
            'notes' => "Deposit: " . ($data['notes'] ?: $data['source']),
            'recorded_by' => 'Admin',
            'created_at' => $parsedDate,
        ]);

        return redirect()->back();
    }

    public function updateTransaction(Request $request, $id) {
        $data = $request->validate([
            'type' => 'required|string',
            'usd_amount' => 'nullable|numeric|min:0',
            'khr_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'date' => 'nullable|date',
        ]);

        $usd = (float)($data['usd_amount'] ?? 0);
        $khr = (float)($data['khr_amount'] ?? 0);
        $notes = $data['notes'] ?? '';
        $date = !empty($data['date']) ? Carbon::parse($data['date']) : now();

        if (str_starts_with($id, 'pay-cash-') || str_starts_with($id, 'pay-bank-')) {
            $rawId = str_replace(['pay-cash-', 'pay-bank-'], '', $id);
            $tx = PaymentTransaction::find($rawId);
            if ($tx) {
                if (str_starts_with($id, 'pay-cash-')) {
                    $tx->usd_cash = $usd;
                    $tx->khr_cash = $khr;
                } else {
                    $tx->usd_bank = $usd;
                    $tx->khr_bank = $khr;
                }
                $tx->notes = $notes;
                $tx->created_at = $date;
                $tx->trans_month = (int)$date->format('m');
                $tx->trans_year = (int)$date->format('Y');
                $tx->save();
            }
        } elseif (str_starts_with($id, 'exp-')) {
            $rawId = str_replace('exp-', '', $id);
            $exp = Expense::find($rawId);
            if ($exp) {
                $exp->amount_usd = $usd;
                $exp->amount_khr = $khr;
                $exp->title = $notes ?: $exp->title;
                $exp->created_at = $date;
                $exp->trans_month = (int)$date->format('m');
                $exp->trans_year = (int)$date->format('Y');
                $exp->save();
            }
        } elseif (str_starts_with($id, 'tx-')) {
            $rawId = str_replace('tx-', '', $id);
            $t = BankTransfer::find($rawId);
            if ($t) {
                $t->usd_amount = $usd;
                $t->khr_amount = $khr;
                $t->notes = $notes;
                $t->transfer_date = $date->toDateString();
                $t->created_at = $date;
                $t->trans_month = (int)$date->format('m');
                $t->trans_year = (int)$date->format('Y');
                $t->save();
            }
        } elseif (str_starts_with($id, 'adj-')) {
            $rawId = str_replace('adj-', '', $id);
            $a = CashDrawerAdjustment::find($rawId);
            if ($a) {
                $a->usd_amount = $usd;
                $a->khr_amount = $khr;
                $a->raw_message = $notes;
                $a->created_at = $date;
                $a->save();
            }
        }

        return redirect()->back();
    }

    public function destroyTransaction($id) {
        if (str_starts_with($id, 'pay-cash-') || str_starts_with($id, 'pay-bank-')) {
            $rawId = str_replace(['pay-cash-', 'pay-bank-'], '', $id);
            $tx = PaymentTransaction::find($rawId);
            if ($tx) {
                $booking = $tx->booking;
                $tx->delete();
                if ($booking && !str_starts_with($booking->notes ?? '', 'Room Income:')) {
                    $booking->delete();
                }
            }
        } elseif (str_starts_with($id, 'exp-')) {
            $rawId = str_replace('exp-', '', $id);
            Expense::where('id', $rawId)->delete();
        } elseif (str_starts_with($id, 'tx-')) {
            $rawId = str_replace('tx-', '', $id);
            BankTransfer::where('id', $rawId)->delete();
        } elseif (str_starts_with($id, 'adj-')) {
            $rawId = str_replace('adj-', '', $id);
            CashDrawerAdjustment::where('id', $rawId)->delete();
        }

        return redirect()->back();
    }
}

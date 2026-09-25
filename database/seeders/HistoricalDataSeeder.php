<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentTransaction;
use App\Models\Booking;
use App\Models\Room;
use App\Models\Expense;
use App\Models\BankTransfer;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class HistoricalDataSeeder extends Seeder {
    public function run(): void {
        DB::statement('PRAGMA foreign_keys = OFF;');

        DB::table('payment_transactions')->delete();
        DB::table('expenses')->delete();
        DB::table('bank_transfers')->delete();
        DB::table('bookings')->delete();

        $defaultRoom = Room::first() ?? Room::create([
            'room_number' => '101',
            'room_type' => 'Single',
            'floor' => '1st Floor',
            'status' => 'vacant',
            'is_cleaned' => true,
        ]);

        $recordIncome = function($date, $account, $desc, $usd, $khr, $month, $year) use ($defaultRoom) {
            $usd = (float)$usd;
            $khr = (float)$khr;
            $totalEqKhr = $khr + ($usd * 4000);

            if ($desc === 'Bank Interest' || str_contains($account, 'Wing')) {
                BankTransfer::create([
                    'transfer_date' => $date,
                    'transfer_category' => 'DEPOSIT',
                    'from_account' => 'External (Bank Interest)',
                    'to_account' => str_contains($account, 'Wing') ? 'Wing Bank' : 'ACLEDA Bank',
                    'usd_amount' => $usd,
                    'khr_amount' => $khr,
                    'trans_month' => (int)$month,
                    'trans_year' => (int)$year,
                    'exchange_rate' => 4000,
                    'notes' => 'Monthly Bank Interest',
                    'recorded_by' => 'Admin',
                    'created_at' => Carbon::parse($date . ' 12:00:00'),
                ]);
            } else {
                $booking = Booking::create([
                    'booking_code' => 'B' . strtoupper(substr(md5($date . $desc . microtime()), 0, 5)),
                    'guest_name' => $desc ?: 'Daily Revenue',
                    'room_id' => $defaultRoom->id,
                    'check_in' => $date,
                    'check_out' => $date,
                    'nights' => 1,
                    'room_charge_usd' => $totalEqKhr,
                    'total_paid_usd' => $totalEqKhr,
                    'balance_usd' => 0,
                    'status' => 'Checked Out',
                    'notes' => 'Room Income: ' . $desc,
                    'created_at' => Carbon::parse($date . ' 12:00:00'),
                ]);

                $isCash = str_contains($account, 'Cash');

                PaymentTransaction::create([
                    'booking_id' => $booking->id,
                    'action' => 'Add Order',
                    'usd_cash' => $isCash ? $usd : 0,
                    'khr_cash' => $isCash ? $khr : 0,
                    'usd_bank' => !$isCash ? $usd : 0,
                    'khr_bank' => !$isCash ? $khr : 0,
                    'trans_month' => (int)$month,
                    'trans_year' => (int)$year,
                    'exchange_rate' => 4000,
                    'total_paid_usd' => $totalEqKhr,
                    'shift' => 'Morning',
                    'handled_by' => 'Admin',
                    'notes' => $desc,
                    'created_at' => Carbon::parse($date . ' 12:00:00'),
                ]);
            }
        };

        $recordExpense = function($date, $account, $category, $desc, $usd, $khr, $month, $year) {
            $method = 'ACLEDA Bank';
            if (str_contains($account, 'Cash')) $method = 'Cash We Took';
            elseif (str_contains($account, 'Wing')) $method = 'Wing Bank';

            Expense::create([
                'title' => $desc,
                'amount_usd' => (float)$usd,
                'amount_khr' => (float)$khr,
                'expense_category' => $category,
                'payment_method' => $method,
                'trans_month' => (int)$month,
                'trans_year' => (int)$year,
                'paid_by' => 'Admin',
                'shift' => 'Morning',
                'notes' => $desc,
                'created_at' => Carbon::parse($date . ' 14:00:00'),
            ]);
        };

        $recordTransfer = function($date, $from, $to, $usd, $khr, $month, $year) {
            $fromAcc = str_contains($from, 'Cash') ? 'Cash We Took' : (str_contains($from, 'Wing') ? 'Wing Bank' : 'ACLEDA Bank');
            $toAcc = str_contains($to, 'Wing') ? 'Wing Bank' : (str_contains($to, 'Cash') ? 'Cash We Took' : 'ACLEDA Bank');

            BankTransfer::create([
                'transfer_date' => $date,
                'transfer_category' => 'TRANSFER',
                'from_account' => $fromAcc,
                'to_account' => $toAcc,
                'usd_amount' => (float)$usd,
                'khr_amount' => (float)$khr,
                'trans_month' => (int)$month,
                'trans_year' => (int)$year,
                'exchange_rate' => 4000,
                'notes' => "Transfer {$from} to {$to}",
                'recorded_by' => 'Admin',
                'created_at' => Carbon::parse($date . ' 16:00:00'),
            ]);
        };

        // ========================================================
        // 0. OPENING BALANCES AS OF JAN 1, 2026
        // Net Opening Balance across 2025 raw activities:
        // Cash: -$100 USD & -120,000 KHR (Pre-operating out-of-pocket setup)
        // ACLEDA: +$7,706 USD & +6,000 KHR ($8,500 deposit - $794 setup)
        // Wing: -$5,300 USD ($6,700 deposit - $12,000 Porsche)
        // TOTAL = $2,277.50 USD Eq (Cell E3 in Yearly Overview)
        // ========================================================
        BankTransfer::create([
            'transfer_date' => '2026-01-01',
            'transfer_category' => 'OPENING_BALANCE',
            'from_account' => 'External (2025 Carryover)',
            'to_account' => 'Cash We Took',
            'usd_amount' => -100.00,
            'khr_amount' => -120000,
            'trans_month' => 0,
            'trans_year' => 2026,
            'exchange_rate' => 4000,
            'notes' => 'Opening Cash (2025 setup expenses paid out of pocket)',
            'recorded_by' => 'Admin',
            'created_at' => Carbon::parse('2026-01-01 00:00:00'),
        ]);

        BankTransfer::create([
            'transfer_date' => '2026-01-01',
            'transfer_category' => 'OPENING_BALANCE',
            'from_account' => 'External (2025 Carryover)',
            'to_account' => 'ACLEDA Bank',
            'usd_amount' => 7706.00,
            'khr_amount' => 6000,
            'trans_month' => 0,
            'trans_year' => 2026,
            'exchange_rate' => 4000,
            'notes' => 'Opening ACLEDA ($8,500 starting deposit less $794 setup)',
            'recorded_by' => 'Admin',
            'created_at' => Carbon::parse('2026-01-01 00:00:01'),
        ]);

        BankTransfer::create([
            'transfer_date' => '2026-01-01',
            'transfer_category' => 'OPENING_BALANCE',
            'from_account' => 'External (2025 Carryover)',
            'to_account' => 'Wing Bank',
            'usd_amount' => -5300.00,
            'khr_amount' => 0,
            'trans_month' => 0,
            'trans_year' => 2026,
            'exchange_rate' => 4000,
            'notes' => 'Opening Wing ($6,700 deposit less $12,000 Porsche)',
            'recorded_by' => 'Admin',
            'created_at' => Carbon::parse('2026-01-01 00:00:02'),
        ]);

        // ========================================================
        // 1. INCOMES (Cash Deposit Log)
        // ========================================================
        $incomes = [
            // June 2026: $3,384.15 & 10,613,600 KHR
            ['2026-06-01', 'ACLEDA', '', 134.00, 0, 6, 2026],
            ['2026-06-01', 'Cash', 'cash by SL', 0, 168000, 6, 2026],
            ['2026-06-02', 'ACLEDA', '', 97.50, 0, 6, 2026],
            ['2026-06-02', 'ACLEDA', '', 0, 60000, 6, 2026],
            ['2026-06-02', 'Cash', 'cash by N', 0, 240000, 6, 2026],
            ['2026-06-03', 'ACLEDA', '', 90.00, 0, 6, 2026],
            ['2026-06-03', 'ACLEDA', '', 0, 180000, 6, 2026],
            ['2026-06-04', 'ACLEDA', '', 45.00, 0, 6, 2026],
            ['2026-06-04', 'ACLEDA', '', 0, 250000, 6, 2026],
            ['2026-06-04', 'Cash', 'cash by N', 0, 230000, 6, 2026],
            ['2026-06-05', 'ACLEDA', '', 110.00, 0, 6, 2026],
            ['2026-06-05', 'ACLEDA', '', 0, 105000, 6, 2026],
            ['2026-06-05', 'Cash', 'cash by N', 0, 472000, 6, 2026],
            ['2026-06-06', 'ACLEDA', '', 104.50, 0, 6, 2026],
            ['2026-06-06', 'ACLEDA', '', 0, 100000, 6, 2026],
            ['2026-06-06', 'Cash', 'cash by N', 0, 177000, 6, 2026],
            ['2026-06-07', 'ACLEDA', '', 89.00, 0, 6, 2026],
            ['2026-06-07', 'ACLEDA', '', 0, 109000, 6, 2026],
            ['2026-06-08', 'ACLEDA', '', 102.00, 0, 6, 2026],
            ['2026-06-08', 'ACLEDA', '', 0, 60000, 6, 2026],
            ['2026-06-08', 'Cash', '', 70.00, 691000, 6, 2026],
            ['2026-06-09', 'ACLEDA', '', 37.00, 0, 6, 2026],
            ['2026-06-10', 'ACLEDA', '', 0, 65000, 6, 2026],
            ['2026-06-10', 'ACLEDA', '', 75.00, 0, 6, 2026],
            ['2026-06-10', 'ACLEDA', '', 0, 264000, 6, 2026],
            ['2026-06-10', 'Cash', '', 0, 384000, 6, 2026],
            ['2026-06-11', 'ACLEDA', '', 72.00, 0, 6, 2026],
            ['2026-06-11', 'ACLEDA', '', 0, 208000, 6, 2026],
            ['2026-06-11', 'Cash', '', 0, 0, 6, 2026],
            ['2026-06-01', 'ACLEDA', 'Bank Interest', 0.03, 0, 6, 2026],
            ['2026-06-13', 'Cash', '', 110.00, 640000, 6, 2026],
            ['2026-06-14', 'Cash', '', 10.00, 396000, 6, 2026],
            ['2026-06-13', 'ACLEDA', '', 0, 200000, 6, 2026],
            ['2026-06-13', 'ACLEDA', '', 85.00, 0, 6, 2026],
            ['2026-06-14', 'ACLEDA', '', 90.00, 40000, 6, 2026],
            ['2026-06-13', 'Cash', '', 0, 540000, 6, 2026],
            ['2026-06-14', 'Cash', '', 0, 240000, 6, 2026],
            ['2026-06-15', 'Cash', '', 0, 208000, 6, 2026],
            ['2026-06-16', 'Cash', '', 0, 140000, 6, 2026],
            ['2026-06-21', 'Cash', '', 70.00, 488000, 6, 2026],
            ['2026-06-15', 'ACLEDA', '', 57.00, 120000, 6, 2026],
            ['2026-06-16', 'ACLEDA', '', 90.00, 80000, 6, 2026],
            ['2026-06-17', 'ACLEDA', '', 92.00, 120000, 6, 2026],
            ['2026-06-18', 'ACLEDA', '', 62.00, 240000, 6, 2026],
            ['2026-06-19', 'ACLEDA', '', 8.00, 60000, 6, 2026],
            ['2026-06-20', 'ACLEDA', '', 101.00, 240000, 6, 2026],
            ['2026-06-21', 'ACLEDA', '', 259.50, 120000, 6, 2026],
            ['2026-06-23', 'Cash', '', 0, 558000, 6, 2026],
            ['2026-06-25', 'Cash', '', 50.00, 416000, 6, 2026],
            ['2026-06-26', 'Cash', '', 0, 120000, 6, 2026],
            ['2026-06-28', 'Cash', '', 175.00, 0, 6, 2026],
            ['2026-06-29', 'Cash', '', 0, 464000, 6, 2026],
            ['2026-06-30', 'Cash', '', 0, 360000, 6, 2026],
            ['2026-06-22', 'ACLEDA', '', 57.00, 180000, 6, 2026],
            ['2026-06-23', 'ACLEDA', '', 87.00, 180000, 6, 2026],
            ['2026-06-24', 'ACLEDA', '', 128.00, 260000, 6, 2026],
            ['2026-06-25', 'ACLEDA', '', 129.00, 60000, 6, 2026],
            ['2026-06-26', 'ACLEDA', '', 134.00, 60000, 6, 2026],
            ['2026-06-27', 'ACLEDA', '', 226.50, 60000, 6, 2026],
            ['2026-06-28', 'ACLEDA', '', 103.00, 140000, 6, 2026],
            ['2026-06-29', 'ACLEDA', '', 37.00, 60000, 6, 2026],
            ['2026-06-30', 'ACLEDA', '', 195.00, 60000, 6, 2026],
            ['2026-06-30', 'ACLEDA', 'Bank Interest', 2.12, 600, 6, 2026],

            // July 2026: $4,728.98 & 11,165,100 KHR
            ['2026-07-01', 'ACLEDA', '', 140.00, 180000, 7, 2026],
            ['2026-07-13', 'Cash', '', 142.00, 3319500, 7, 2026],
            ['2026-07-25', 'Cash', '', 180.00, 2123000, 7, 2026],
            ['2026-07-26', 'Cash', '', 0, 548000, 7, 2026],
            ['2026-07-30', 'Cash', '', 0, 996000, 7, 2026],
            ['2026-07-02', 'ACLEDA', '', 172.00, 15000, 7, 2026],
            ['2026-07-03', 'ACLEDA', '', 255.00, 0, 7, 2026],
            ['2026-07-04', 'ACLEDA', '', 97.00, 60000, 7, 2026],
            ['2026-07-05', 'ACLEDA', '', 82.00, 240000, 7, 2026],
            ['2026-07-06', 'ACLEDA', '', 50.00, 180000, 7, 2026],
            ['2026-07-07', 'ACLEDA', '', 67.00, 0, 7, 2026],
            ['2026-07-08', 'ACLEDA', '', 74.00, 80000, 7, 2026],
            ['2026-07-09', 'ACLEDA', '', 135.00, 60000, 7, 2026],
            ['2026-07-10', 'ACLEDA', '', 57.00, 28000, 7, 2026],
            ['2026-07-11', 'ACLEDA', '', 230.00, 60000, 7, 2026],
            ['2026-07-12', 'ACLEDA', '', 200.00, 268000, 7, 2026],
            ['2026-07-13', 'ACLEDA', '', 184.00, 280000, 7, 2026],
            ['2026-07-14', 'ACLEDA', '', 115.00, 160000, 7, 2026],
            ['2026-07-15', 'ACLEDA', '', 50.00, 180000, 7, 2026],
            ['2026-07-16', 'ACLEDA', '', 139.00, 60000, 7, 2026],
            ['2026-07-17', 'ACLEDA', '', 235.00, 60000, 7, 2026],
            ['2026-07-18', 'ACLEDA', '', 166.00, 340000, 7, 2026],
            ['2026-07-19', 'ACLEDA', '', 137.00, 190000, 7, 2026],
            ['2026-07-20', 'ACLEDA', '', 177.00, 110000, 7, 2026],
            ['2026-07-21', 'ACLEDA', '', 140.00, 120000, 7, 2026],
            ['2026-07-22', 'ACLEDA', '', 105.00, 55000, 7, 2026],
            ['2026-07-23', 'ACLEDA', '', 19.00, 200000, 7, 2026],
            ['2026-07-24', 'ACLEDA', '', 170.00, 460000, 7, 2026],
            ['2026-07-25', 'ACLEDA', '', 160.00, 280000, 7, 2026],
            ['2026-07-26', 'ACLEDA', '', 182.50, 168000, 7, 2026],
            ['2026-07-27', 'ACLEDA', '', 143.00, 64000, 7, 2026],
            ['2026-07-28', 'ACLEDA', '', 116.00, 160000, 7, 2026],
            ['2026-07-29', 'ACLEDA', '', 107.00, 0, 7, 2026],
            ['2026-07-30', 'ACLEDA', '', 101.00, 0, 7, 2026],
            ['2026-07-31', 'ACLEDA', '', 401.48, 120600, 7, 2026],

            // August 2026: $6,616.10 & 10,946,594 KHR
            ['2026-08-01', 'ACLEDA', '', 333.00, 60000, 8, 2026],
            ['2026-08-02', 'ACLEDA', '', 129.00, 60000, 8, 2026],
            ['2026-08-03', 'ACLEDA', '', 199.00, 0, 8, 2026],
            ['2026-08-04', 'ACLEDA', '', 185.00, 60000, 8, 2026],
            ['2026-08-05', 'ACLEDA', '', 156.00, 0, 8, 2026],
            ['2026-08-06', 'ACLEDA', '', 105.00, 80000, 8, 2026],
            ['2026-08-07', 'ACLEDA', '', 269.00, 0, 8, 2026],
            ['2026-08-08', 'ACLEDA', '', 297.50, 52000, 8, 2026],
            ['2026-08-09', 'ACLEDA', '', 157.00, 0, 8, 2026],
            ['2026-08-10', 'ACLEDA', '', 81.00, 0, 8, 2026],
            ['2026-08-11', 'ACLEDA', '', 107.00, 0, 8, 2026],
            ['2026-08-12', 'ACLEDA', '', 75.00, 28000, 8, 2026],
            ['2026-08-13', 'ACLEDA', '', 105.00, 120000, 8, 2026],
            ['2026-08-14', 'ACLEDA', '', 172.00, 120000, 8, 2026],
            ['2026-08-15', 'ACLEDA', '', 340.00, 0, 8, 2026],
            ['2026-08-16', 'ACLEDA', '', 115.00, 145000, 8, 2026],
            ['2026-08-17', 'ACLEDA', '', 215.00, 140000, 8, 2026],
            ['2026-08-18', 'ACLEDA', '', 75.00, 0, 8, 2026],
            ['2026-08-19', 'ACLEDA', '', 135.00, 120000, 8, 2026],
            ['2026-08-20', 'ACLEDA', '', 164.00, 60000, 8, 2026],
            ['2026-08-21', 'ACLEDA', '', 185.00, 40000, 8, 2026],
            ['2026-08-22', 'ACLEDA', '', 155.00, 60000, 8, 2026],
            ['2026-08-23', 'ACLEDA', '', 831.00, 160000, 8, 2026],
            ['2026-08-24', 'ACLEDA', '', 65.00, 140000, 8, 2026],
            ['2026-08-25', 'ACLEDA', '', 40.00, 100000, 8, 2026],
            ['2026-08-26', 'ACLEDA', '', 96.00, 103500, 8, 2026],
            ['2026-08-27', 'ACLEDA', '', 179.00, 100000, 8, 2026],
            ['2026-08-28', 'ACLEDA', '', 195.00, 180000, 8, 2026],
            ['2026-08-29', 'ACLEDA', '', 127.00, 30000, 8, 2026],
            ['2026-08-30', 'ACLEDA', '', 67.00, 68000, 8, 2026],
            ['2026-08-31', 'ACLEDA', 'pending', 274.00, 0, 8, 2026],
            ['2026-08-01', 'Cash', '', 890.00, 7722000, 8, 2026],
            ['2026-08-01', 'Wing', 'Bank Interest', 27.60, 18094, 8, 2026],
            ['2026-08-31', 'Cash', '', 70.00, 1180000, 8, 2026],
        ];

        foreach ($incomes as $inc) {
            $recordIncome($inc[0], $inc[1], $inc[2], $inc[3], $inc[4], $inc[5], $inc[6]);
        }

        // ========================================================
        // 2. EXPENSES (Expense Log)
        // ========================================================
        $expenses = [
            // June 2026: $1,926.90 & 4,329,100 KHR
            ['2026-06-02', 'Cash', 'Salary', 'police tourism', 0, 8000, 6, 2026],
            ['2026-06-02', 'Cash', 'Supplies', 'water drinking', 0, 100000, 6, 2026],
            ['2026-06-02', 'Cash', 'Salary', 'tax monthly', 0, 260000, 6, 2026],
            ['2026-06-02', 'ACLEDA', 'Salary', 'tax monthly', 24.85, 0, 6, 2026],
            ['2026-06-03', 'ACLEDA', 'Supplies', 'toiletries', 54.00, 0, 6, 2026],
            ['2026-06-03', 'ACLEDA', 'Supplies', 'laundry + snack', 46.25, 0, 6, 2026],
            ['2026-06-05', 'ACLEDA', 'Supplies', 'trash bag', 0, 60000, 6, 2026],
            ['2026-06-05', 'ACLEDA', 'Supplies', 'nom tao', 14.50, 0, 6, 2026],
            ['2026-06-09', 'Cash', 'Supplies', 'scryb for cleaning', 0, 2500, 6, 2026],
            ['2026-06-09', 'Cash', 'Supplies', 'buy broom', 0, 50000, 6, 2026],
            ['2026-06-09', 'ACLEDA', 'Other Expense', 'Yisor?', 0, 45000, 6, 2026],
            ['2026-06-14', 'Cash', 'Other Expense', 'Error', 0, 53000, 6, 2026],
            ['2026-06-15', 'Cash', 'Supplies', 'stamp, paper for motor and uv plein', 0, 13000, 6, 2026],
            ['2026-06-15', 'ACLEDA', 'Salary', 'ESS', 165.00, 0, 6, 2026],
            ['2026-06-20', 'ACLEDA', 'Supplies', 'Detergent', 37.80, 0, 6, 2026],
            ['2026-06-21', 'ACLEDA', 'Supplies', 'Shampoo', 26.00, 0, 6, 2026],
            ['2026-06-21', 'ACLEDA', 'Other Expense', 'Sim Card', 1.00, 0, 6, 2026],
            ['2026-06-22', 'ACLEDA', 'Supplies', 'Water', 25.00, 0, 6, 2026],
            ['2026-06-23', 'ACLEDA', 'Salary', 'Wifi Ezecom', 79.00, 0, 6, 2026],
            ['2026-06-23', 'ACLEDA', 'Other Expense', 'Pri Pleing', 5.00, 0, 6, 2026],
            ['2026-06-23', 'ACLEDA', 'Other Expense', 'Elevator', 50.00, 0, 6, 2026],
            ['2026-06-30', 'ACLEDA', 'Supplies', 'Cleaning', 84.50, 0, 6, 2026],
            ['2026-06-30', 'ACLEDA', 'Salary', 'B Neath', 240.00, 0, 6, 2026],
            ['2026-06-30', 'ACLEDA', 'Salary', 'Seanglay', 200.00, 0, 6, 2026],
            ['2026-06-30', 'ACLEDA', 'Salary', 'Cleaner 2 nak', 360.00, 0, 6, 2026],
            ['2026-06-30', 'ACLEDA', 'Salary', 'Security', 250.00, 0, 6, 2026],
            ['2026-06-30', 'ACLEDA', 'Salary', 'Washer', 180.00, 0, 6, 2026],
            ['2026-06-30', 'ACLEDA', 'Salary', 'Nun', 84.00, 0, 6, 2026],
            ['2026-06-30', 'ACLEDA', 'Utilities', 'EDC', 0, 3737600, 6, 2026],

            // July 2026: $2,113.30 & 6,579,800 KHR
            ['2026-07-01', 'ACLEDA', 'Other Expense', 'Romne Terk', 8.00, 0, 7, 2026],
            ['2026-07-01', 'ACLEDA', 'Other Expense', 'Shower Head', 4.00, 0, 7, 2026],
            ['2026-07-02', 'ACLEDA', 'Salary', 'Tissue', 0, 35000, 7, 2026],
            ['2026-07-09', 'ACLEDA', 'Salary', 'water drinking', 0, 100000, 7, 2026],
            ['2026-07-13', 'ACLEDA', 'Salary', 'mosquito', 0, 10000, 7, 2026],
            ['2026-07-14', 'ACLEDA', 'Salary', 'tax monthly', 90.00, 0, 7, 2026],
            ['2026-07-14', 'ACLEDA', 'Salary', 'mosquito', 5.00, 0, 7, 2026],
            ['2026-07-14', 'ACLEDA', 'Salary', 'water', 0, 781100, 7, 2026],
            ['2026-07-15', 'ACLEDA', 'Salary', 'toiletries', 54.00, 0, 7, 2026],
            ['2026-07-15', 'ACLEDA', 'Salary', 'ESS', 165.00, 0, 7, 2026],
            ['2026-07-15', 'ACLEDA', 'Salary', 'Security', 64.51, 0, 7, 2026],
            ['2026-07-16', 'ACLEDA', 'Other Expense', 'fix water pump roth', 0, 263500, 7, 2026],
            ['2026-07-19', 'ACLEDA', 'Salary', 'trash bag', 0, 60000, 7, 2026],
            ['2026-07-20', 'ACLEDA', 'Salary', 'wifi Metfone', 0, 1213500, 7, 2026],
            ['2026-07-21', 'ACLEDA', 'Salary', 'Elevator', 50.00, 0, 7, 2026],
            ['2026-07-24', 'ACLEDA', 'Salary', 'Camera Fixing', 25.00, 0, 7, 2026],
            ['2026-07-25', 'ACLEDA', 'Other Expense', 'B tra water fixing', 180.00, 0, 7, 2026],
            ['2026-07-26', 'ACLEDA', 'Other Expense', 'Tshirt Staff', 43.19, 0, 7, 2026],
            ['2026-07-27', 'ACLEDA', 'Salary', 'water drinking', 0, 100000, 7, 2026],
            ['2026-07-28', 'ACLEDA', 'Salary', 'sabu floor', 7.50, 0, 7, 2026],
            ['2026-07-28', 'ACLEDA', 'Salary', 'taobao supply', 29.00, 0, 7, 2026],
            ['2026-07-29', 'ACLEDA', 'Other Expense', 'jruk kvai', 7.50, 0, 7, 2026],
            ['2026-07-31', 'ACLEDA', 'Other Expense', 'pillow etc except', 180.60, 0, 7, 2026],
            ['2026-07-31', 'ACLEDA', 'Salary', 'B Neath', 240.00, 0, 7, 2026],
            ['2026-07-31', 'ACLEDA', 'Salary', 'Seanglay', 200.00, 0, 7, 2026],
            ['2026-07-31', 'ACLEDA', 'Salary', 'Washer', 180.00, 0, 7, 2026],
            ['2026-07-31', 'ACLEDA', 'Salary', 'Nun', 200.00, 0, 7, 2026],
            ['2026-07-03', 'ACLEDA', 'Other Expense', 'Yisor?', 0, 14500, 7, 2026],
            ['2026-07-30', 'ACLEDA', 'Salary', 'EDC', 0, 3982200, 7, 2026],
            ['2026-07-30', 'ACLEDA', 'Salary', 'Cleaner 2 nak', 380.00, 0, 7, 2026],
            ['2026-07-30', 'ACLEDA', 'Commission', 'Reimburse Guest', 0, 20000, 7, 2026],

            // August 2026: $3,122.17 & 4,586,400 KHR
            ['2026-08-01', 'ACLEDA', 'Supplies', 'pen sticker and b', 14.10, 0, 8, 2026],
            ['2026-08-02', 'ACLEDA', 'Supplies', 'Towel 10 and bla', 183.00, 0, 8, 2026],
            ['2026-08-03', 'ACLEDA', 'Supplies', 'Comb 500', 15.00, 0, 8, 2026],
            ['2026-08-03', 'ACLEDA', 'Salary', 'tax monthly', 90.00, 0, 8, 2026],
            ['2026-08-03', 'ACLEDA', 'Supplies', 'Tissue, Soap and', 67.25, 0, 8, 2026],
            ['2026-08-06', 'ACLEDA', 'Supplies', 'Fan', 70.00, 0, 8, 2026],
            ['2026-08-07', 'ACLEDA', 'Salary', 'Water', 0, 321600, 8, 2026],
            ['2026-08-07', 'ACLEDA', 'Salary', 'Elevator', 250.00, 0, 8, 2026],
            ['2026-08-08', 'ACLEDA', 'Supplies', 'Room Spray', 2.60, 0, 8, 2026],
            ['2026-08-09', 'ACLEDA', 'Salary', 'Tip', 2.00, 0, 8, 2026],
            ['2026-08-11', 'ACLEDA', 'Maintenance', 'Paint Door', 315.00, 0, 8, 2026],
            ['2026-08-12', 'ACLEDA', 'Supplies', 'Light Bulb', 36.75, 0, 8, 2026],
            ['2026-08-13', 'ACLEDA', 'Supplies', 'Water Drinking', 0, 100000, 8, 2026],
            ['2026-08-15', 'ACLEDA', 'Maintenance', 'Camera Fixing', 15.00, 0, 8, 2026],
            ['2026-08-18', 'ACLEDA', 'Salary', 'ESS', 165.00, 0, 8, 2026],
            ['2026-08-15', 'ACLEDA', 'Maintenance', 'EDC and Water', 28.00, 0, 8, 2026],
            ['2026-08-22', 'ACLEDA', 'Supplies', 'Cleaning tool', 9.50, 0, 8, 2026],
            ['2026-08-23', 'ACLEDA', 'Supplies', 'Battery', 1.50, 0, 8, 2026],
            ['2026-08-23', 'ACLEDA', 'Salary', 'taobao supply', 77.85, 0, 8, 2026],
            ['2026-08-27', 'ACLEDA', 'Supplies', 'Battery', 10.00, 0, 8, 2026],
            ['2026-08-29', 'ACLEDA', 'Supplies', 'Water Drinking', 0, 100000, 8, 2026],
            ['2026-08-29', 'ACLEDA', 'Supplies', 'trash bag', 0, 60000, 8, 2026],
            ['2026-08-29', 'ACLEDA', 'Supplies', 'Comb and Brush', 37.00, 0, 8, 2026],
            ['2026-08-29', 'ACLEDA', 'Supplies', 'Sabu Msav', 12.70, 0, 8, 2026],
            ['2026-08-29', 'ACLEDA', 'Salary', 'Salary lay', 200.00, 0, 8, 2026],
            ['2026-08-31', 'ACLEDA', 'Salary', 'Taobao Basket', 13.00, 0, 8, 2026],
            ['2026-08-31', 'ACLEDA', 'Salary', 'Towel', 296.92, 0, 8, 2026],
            ['2026-08-31', 'ACLEDA', 'Salary', 'EDC', 0, 4004800, 8, 2026],
            ['2026-08-31', 'ACLEDA', 'Salary', 'Cleaner 2 nak', 380.00, 0, 8, 2026],
            ['2026-08-31', 'ACLEDA', 'Salary', 'Mey', 200.00, 0, 8, 2026],
            ['2026-08-31', 'ACLEDA', 'Salary', 'Nun', 200.00, 0, 8, 2026],
            ['2026-08-31', 'ACLEDA', 'Salary', 'Neath', 240.00, 0, 8, 2026],
            ['2026-08-31', 'ACLEDA', 'Salary', 'Washer', 190.00, 0, 8, 2026],
        ];

        foreach ($expenses as $exp) {
            $recordExpense($exp[0], $exp[1], $exp[2], $exp[3], $exp[4], $exp[5], $exp[6], $exp[7]);
        }

        // ========================================================
        // 3. TRANSFERS
        // ========================================================
        $transfers = [
            ['2026-06-11', 'Cash', 'ACLEDA', 70.00, 1908500, 6, 2026],
            ['2026-06-21', 'Cash', 'ACLEDA', 90.00, 2499000, 6, 2026],
            ['2026-06-29', 'Cash', 'ACLEDA', 225.00, 1558000, 6, 2026],
            ['2026-07-31', 'ACLEDA', 'Wing', 9191.25, 5930500, 7, 2026],
            ['2026-07-13', 'Cash', 'ACLEDA', 142.00, 3679500, 7, 2026],
            ['2026-07-25', 'Cash', 'ACLEDA', 180.00, 2123000, 7, 2026],
            ['2026-08-28', 'Cash', 'ACLEDA', 890.00, 9066000, 8, 2026],
            ['2026-08-28', 'ACLEDA', 'Wing', 2000.00, 0, 8, 2026],
        ];

        foreach ($transfers as $tx) {
            $recordTransfer($tx[0], $tx[1], $tx[2], $tx[3], $tx[4], $tx[5], $tx[6]);
        }

        DB::statement('PRAGMA foreign_keys = ON;');
        echo "Historical database seeded with pure dynamic ledger." . PHP_EOL;
    }
}

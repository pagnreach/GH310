<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Setting;
use App\Http\Controllers\FinanceController;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TelegramService {
    protected string $botToken = '';
    protected string $opsChatId = '';
    protected string $hkChatId = '';
    protected array $config = [];

    public function __construct() {
        $this->reloadConfig();
    }

    public function reloadConfig(): void {
        $cfg = Setting::get('telegram_config', []);
        if (is_string($cfg)) {
            $cfg = json_decode($cfg, true) ?? [];
        }
        $this->config = is_array($cfg) ? $cfg : [];

        $this->botToken = (string)($this->config['bot_token'] ?? env('TELEGRAM_BOT_TOKEN', ''));
        $this->opsChatId = (string)($this->config['operations_chat_id'] ?? env('TELEGRAM_OPERATIONS_CHAT_ID', ''));
        $this->hkChatId = (string)($this->config['housekeeping_chat_id'] ?? env('TELEGRAM_HOUSEKEEPING_CHAT_ID', ''));
    }

    public function isAlertEnabled(string $key): bool {
        if (empty($this->config)) {
            $this->reloadConfig();
        }
        if (!isset($this->config[$key])) {
            return false;
        }
        return filter_var($this->config[$key], FILTER_VALIDATE_BOOLEAN);
    }

    public function getDrawerCashFormatted(): string {
        try {
            $drawerBalance = FinanceController::getCashierDrawerBalance();
            return number_format((float)$drawerBalance);
        } catch (\Throwable $e) {
            return "0";
        }
    }

    public function sendCheckIn(Booking $booking, float $khrCash = 0, float $khrBank = 0, float $usdBank = 0): bool {
        if (!$this->isAlertEnabled('checkin_alert')) return false;

        $room = $booking->room;
        $roomNo = $room ? $room->room_number : 'Unknown';
        $balance = (float)$booking->balance_usd;

        $header = $balance > 0 ? "⚠️ CHECK-IN (not yet paid)" : "✅ CHECK-IN";
        $checkInDate = \Carbon\Carbon::parse($booking->check_in)->format('d-M');
        $checkOutDate = \Carbon\Carbon::parse($booking->check_out)->format('d-M');

        $msg = "{$header}\n\n" .
               "Guest: {$booking->guest_name}\n" .
               "Room: {$roomNo} ({$booking->notes})\n" .
               "Date: {$checkInDate} - {$checkOutDate}\n";

        if ($khrCash > 0) $msg .= "KHR Cash: " . number_format($khrCash) . "\n";
        if ($khrBank > 0) $msg .= "KHR Bank: " . number_format($khrBank) . "\n";
        if ($usdBank > 0) $msg .= "USD Bank: $" . number_format($usdBank, 2) . "\n";
        if ($khrCash <= 0 && $khrBank <= 0 && $usdBank <= 0) $msg .= "Paid: KHR 0\n";

        if ($balance > 0) {
            $msg .= "Remaining Balance: KHR " . number_format($balance) . "\n";
        }

        $msg .= "\nCash Holding: KHR " . $this->getDrawerCashFormatted();

        return $this->sendToOperations($msg);
    }

    public function sendPayment(string $roomNo, float $usdCash, float $khrCash, float $usdBank, float $khrBank, float $balanceDue, string $guestName = ''): bool {
        if (!$this->isAlertEnabled('payment_alert')) return false;

        $msg = "💰 PAYMENT\n\n";
        if (!empty($guestName)) {
            $msg .= "Guest: {$guestName}\n";
        }
        $msg .= "Room: {$roomNo}\n";

        if ($usdCash > 0) $msg .= "USD Cash: $" . number_format($usdCash, 2) . "\n";
        if ($khrCash > 0) $msg .= "KHR Cash: " . number_format($khrCash) . "\n";
        if ($usdBank > 0) $msg .= "USD Bank: $" . number_format($usdBank, 2) . "\n";
        if ($khrBank > 0) $msg .= "KHR Bank: " . number_format($khrBank) . "\n";

        if ($balanceDue > 0) {
            $msg .= "Amount Due: KHR " . number_format($balanceDue) . "\n";
        }

        $msg .= "\nCash Holding: KHR " . $this->getDrawerCashFormatted();

        return $this->sendToOperations($msg);
    }

    public function sendCheckout(Booking $booking): bool {
        if (!$this->isAlertEnabled('checkout_alert')) return false;

        $roomNo = $booking->room ? $booking->room->room_number : 'Unknown';
        $time = now()->format('h:i A');

        $msg = "🚪 CHECK-OUT\n\n" .
               "Guest: {$booking->guest_name}\n" .
               "Room: {$roomNo}\n" .
               "Time: {$time}\n\n" .
               "Cash Holding: KHR " . $this->getDrawerCashFormatted();

        return $this->sendToOperations($msg);
    }

    public function sendCancellation(Booking $booking, float $khrCash = 0, float $khrBank = 0, float $usdBank = 0): bool {
        if (!$this->isAlertEnabled('cancel_alert')) return false;

        $roomNo = $booking->room ? $booking->room->room_number : 'Unknown';
        $checkInDate = \Carbon\Carbon::parse($booking->check_in)->format('d-M');
        $checkOutDate = \Carbon\Carbon::parse($booking->check_out)->format('d-M');

        $msg = "❌ BOOKING CANCELLED\n\n" .
               "Guest: {$booking->guest_name}\n" .
               "Room: {$roomNo}\n" .
               "Date: {$checkInDate} - {$checkOutDate}\n";

        if ($khrCash > 0) $msg .= "Returned KHR Cash: " . number_format($khrCash) . "\n";
        if ($khrBank > 0) $msg .= "Returned KHR Bank: " . number_format($khrBank) . "\n";
        if ($usdBank > 0) $msg .= "Returned USD Bank: $" . number_format($usdBank, 2) . "\n";
        if ($khrCash <= 0 && $khrBank <= 0 && $usdBank <= 0) $msg .= "Returned: KHR 0\n";

        $msg .= "\nCash Holding: KHR " . $this->getDrawerCashFormatted();

        return $this->sendToOperations($msg);
    }

    public function sendExtendStay(Booking $booking, int $extraNights, float $extraCharge, float $paidNow): bool {
        if (!$this->isAlertEnabled('extend_stay_alert')) return false;

        $roomNo = $booking->room ? $booking->room->room_number : 'Unknown';
        $checkOutDate = \Carbon\Carbon::parse($booking->check_out)->format('d-M');

        $msg = "⏳ EXTEND STAY\n\n" .
               "Guest: {$booking->guest_name}\n" .
               "Room: {$roomNo}\n" .
               "Extended By: {$extraNights} Night(s)\n" .
               "New Checkout: {$checkOutDate}\n" .
               "Added Charge: KHR " . number_format($extraCharge) . "\n";

        if ($paidNow > 0) {
            $msg .= "Paid Now: KHR " . number_format($paidNow) . "\n";
        }

        $msg .= "\nCash Holding: KHR " . $this->getDrawerCashFormatted();

        return $this->sendToOperations($msg);
    }

    public function sendHousekeepingTask(string $roomNumber, string $bookingCode): ?int {
        if (!$this->isAlertEnabled('cleaning_task_alert')) return null;
        if (empty($this->botToken) || empty($this->hkChatId)) return null;

        $text = "🧹 បន្ទប់/Phòng: " . $roomNumber . " 🧹\n" .
                "ម៉ោងចេញ/Giờ trả phòng: " . now()->format('h:i A') . "\n" .
                "Booking: #" . $bookingCode;

        try {
            $response = Http::timeout(5)->post("https://api.telegram.org/bot{$this->botToken}/sendMessage", [
                'chat_id' => $this->hkChatId,
                'text' => $text,
            ]);

            if ($response->successful()) {
                return $response->json('result.message_id');
            }
        } catch (\Throwable $e) {
            Log::error('Telegram Housekeeping delivery failed: ' . $e->getMessage());
        }

        DB::table('telegram_outbox')->insert([
            'chat_id' => $this->hkChatId,
            'message' => $text,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return null;
    }

    public function sendToOperations(string $text): bool {
        if (empty($this->botToken) || empty($this->opsChatId)) return false;
        return $this->sendMessageWithQueue($this->opsChatId, $text);
    }

    public function sendMessageWithQueue(string $chatId, string $text): bool {
        if (empty($this->botToken) || empty($chatId)) return false;

        try {
            $response = Http::timeout(5)->post("https://api.telegram.org/bot{$this->botToken}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $text,
            ]);

            if ($response->successful()) {
                $this->processPendingQueue();
                return true;
            }
        } catch (\Throwable $e) {
            Log::warning('Telegram send failed: ' . $e->getMessage());
        }

        DB::table('telegram_outbox')->insert([
            'chat_id' => $chatId,
            'message' => $text,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return false;
    }

    public function processPendingQueue(): void {
        if (empty($this->botToken)) return;

        $pending = DB::table('telegram_outbox')
            ->where('status', 'pending')
            ->orderBy('id', 'asc')
            ->limit(10)
            ->get();

        foreach ($pending as $item) {
            try {
                $res = Http::timeout(5)->post("https://api.telegram.org/bot{$this->botToken}/sendMessage", [
                    'chat_id' => $item->chat_id,
                    'text' => $item->message,
                ]);

                if ($res->successful()) {
                    DB::table('telegram_outbox')->where('id', $item->id)->update([
                        'status' => 'sent',
                        'sent_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    DB::table('telegram_outbox')->where('id', $item->id)->increment('attempts');
                    break;
                }
            } catch (\Throwable $e) {
                DB::table('telegram_outbox')->where('id', $item->id)->increment('attempts');
                break;
            }
        }
    }
}

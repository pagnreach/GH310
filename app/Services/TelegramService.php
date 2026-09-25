<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TelegramService {
    protected string $botToken;
    protected string $opsChatId;
    protected string $hkChatId;

    public function __construct() {
        $this->botToken = env('TELEGRAM_BOT_TOKEN', '');
        $this->opsChatId = env('TELEGRAM_OPERATIONS_CHAT_ID', '');
        $this->hkChatId = env('TELEGRAM_HOUSEKEEPING_CHAT_ID', '');
    }

    public function sendToOperations(string $text): bool {
        return $this->sendMessageWithQueue($this->opsChatId, $text);
    }

    public function sendHousekeepingTask(string $roomNumber, string $bookingCode): ?int {
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

        // Save to outbox queue for automated retry
        DB::table('telegram_outbox')->insert([
            'chat_id' => $this->hkChatId,
            'message' => $text,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return null;
    }

    public function sendMessageWithQueue(string $chatId, string $text): bool {
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
            Log::warning('Telegram send failed, enqueuing message: ' . $e->getMessage());
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

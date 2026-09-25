<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\HousekeepingTask;
use App\Models\CashDrawerAdjustment;
use App\Models\MaintenanceLog;
use App\Models\LostAndFound;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller {
    public function handle(Request $request, TelegramService $telegram) {
        $update = $request->all();

        // 1. Housekeeping Message Reactions (👍, 👎, 🙏)
        if (isset($update['message_reaction'])) {
            $reaction = $update['message_reaction'];
            $messageId = $reaction['message_id'];
            $emoji = $reaction['new_reaction'][0]['emoji'] ?? null;
            $user = $reaction['user']['first_name'] ?? 'Housekeeping';

            $task = HousekeepingTask::where('telegram_message_id', $messageId)->first();
            if ($task) {
                $room = Room::find($task->room_id);

                if ($emoji === '👍') {
                    $task->update(['status' => 'cleaned', 'cleaned_by' => $user, 'reacted_at' => now()]);
                    $room->update(['is_cleaned' => true, 'status' => 'vacant']);

                    $telegram->sendToOperations("✅ CLEANING COMPLETED\nRoom: {$room->room_number}\nCleaner: {$user}\nTime: " . now()->format('h:i A'));
                } elseif ($emoji === '👎') {
                    $task->update(['status' => 'maintenance', 'cleaned_by' => $user, 'reacted_at' => now()]);
                    $room->update(['status' => 'maintenance']);
                    MaintenanceLog::create(['room_id' => $room->id, 'reported_by' => $user]);

                    $telegram->sendToOperations("⚠️ MAINTENANCE ISSUE\nRoom: {$room->room_number}\nReported by: {$user}");
                } elseif ($emoji === '🙏') {
                    $task->update(['status' => 'lost_and_found', 'cleaned_by' => $user, 'reacted_at' => now()]);
                    LostAndFound::create(['room_id' => $room->id, 'reported_by' => $user]);

                    $telegram->sendToOperations("🙏 LOST & FOUND\nRoom: {$room->room_number}\nReported by: {$user}");
                }
            }
        }

        // 2. Owner Cash Commands (took / return / bank took / bank return)
        if (isset($update['message']['text'])) {
            $msg = $update['message'];
            $text = strtolower(trim($msg['text']));
            $username = strtolower($msg['from']['username'] ?? '');
            $authorized = ['pagnreach', 'pagnreach_v', 'muypor', 'muypor13'];

            if (in_array($username, $authorized)) {
                $action = null;
                if (str_starts_with($text, 'bank took')) $action = 'BANK TOOK';
                elseif (str_starts_with($text, 'bank return')) $action = 'BANK RETURN';
                elseif (str_starts_with($text, 'took')) $action = 'TOOK';
                elseif (str_starts_with($text, 'return')) $action = 'RETURN';

                if ($action) {
                    preg_match('/(\d+(?:,\d+)*(?:\.\d+)?)\s*(usd|\$)/i', $text, $usdMatch);
                    preg_match('/(\d+(?:,\d+)*(?:\.\d+)?)\s*(khr|r)/i', $text, $khrMatch);

                    $usd = isset($usdMatch[1]) ? (float)str_replace(',', '', $usdMatch[1]) : 0;
                    $khr = isset($khrMatch[1]) ? (float)str_replace(',', '', $khrMatch[1]) : 0;

                    if ($usd > 0 || $khr > 0) {
                        CashDrawerAdjustment::create([
                            'telegram_message_id' => $msg['message_id'],
                            'username' => $username,
                            'action' => $action,
                            'usd_amount' => $usd,
                            'khr_amount' => $khr,
                            'raw_message' => $msg['text'],
                        ]);

                        $telegram->sendToOperations("💰 {$action} RECORDED\n" . 
                            ($usd > 0 ? "USD: $" . number_format($usd, 2) . "\n" : "") .
                            ($khr > 0 ? "KHR: " . number_format($khr) . "\n" : "") .
                            "Recorded by: @{$username}");
                    }
                }
            }
        }

        return response()->json(['ok' => true]);
    }
}

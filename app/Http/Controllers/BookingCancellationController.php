<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\PaymentTransaction;
use App\Models\Room;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingCancellationController extends Controller {
    public function cancel(Request $request, Booking $booking, TelegramService $telegram) {
        $data = $request->validate([
            'refund_khr_cash' => 'nullable|numeric|min:0',
            'refund_khr_bank' => 'nullable|numeric|min:0',
            'shift' => 'nullable|string',
            'handled_by' => 'nullable|string',
        ]);

        $kCash = (float)($data['refund_khr_cash'] ?? 0);
        $kBank = (float)($data['refund_khr_bank'] ?? 0);
        $totalRefund = $kCash + $kBank;

        DB::transaction(function() use ($booking, $data, $kCash, $kBank, $totalRefund) {
            $booking->update(['status' => 'Cancelled']);
            Room::where('id', $booking->room_id)->update(['status' => 'vacant', 'is_cleaned' => true]);

            PaymentTransaction::create([
                'booking_id' => $booking->id,
                'action' => 'Cancel Order Refund',
                'usd_cash' => 0,
                'khr_cash' => -$kCash,
                'usd_bank' => 0,
                'khr_bank' => -$kBank,
                'exchange_rate' => 1,
                'total_paid_usd' => -$totalRefund,
                'shift' => $data['shift'] ?? 'Morning',
                'handled_by' => $data['handled_by'] ?? 'Reception',
                'notes' => 'Booking cancelled - refund recorded',
            ]);
        });

        $room = $booking->room;
        $refundText = ($totalRefund > 0) 
            ? "Returned: KHR " . number_format($totalRefund)
            : "Returned: KHR 0";

        try {
            $telegram->sendToOperations(
                "❌ BOOKING CANCELLED\n\n" .
                "Room: {$room->room_number}\n" .
                "Booking ID: {$booking->booking_code}\n" .
                "Guest: {$booking->guest_name}\n" .
                $refundText
            );
        } catch (\Throwable $e) {}

        return redirect()->route('frontdesk');
    }
}

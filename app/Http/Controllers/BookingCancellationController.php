<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\PaymentTransaction;
use App\Models\Room;
use App\Models\Setting;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingCancellationController extends Controller {
    public function cancel(Request $request, Booking $booking, TelegramService $telegram) {
        $data = $request->validate([
            'refund_khr_cash' => 'nullable|numeric|min:0',
            'refund_khr_bank' => 'nullable|numeric|min:0',
            'refund_usd_bank' => 'nullable|numeric|min:0',
            'shift' => 'nullable|string',
            'handled_by' => 'nullable|string',
        ]);

        $kCash = (float)($data['refund_khr_cash'] ?? 0);
        $kBank = (float)($data['refund_khr_bank'] ?? 0);
        $uBank = (float)($data['refund_usd_bank'] ?? 0);
        $rate = (float)Setting::get('exchange_rate', 4000);
        $totalRefundKhr = $kCash + $kBank + ($uBank * $rate);

        DB::transaction(function() use ($booking, $data, $kCash, $kBank, $uBank, $totalRefundKhr, $rate) {
            $booking->update(['status' => 'Cancelled']);
            Room::where('id', $booking->room_id)->update(['status' => 'vacant', 'is_cleaned' => true]);

            PaymentTransaction::create([
                'booking_id' => $booking->id,
                'action' => 'Refund',
                'usd_cash' => 0,
                'khr_cash' => -$kCash,
                'usd_bank' => -$uBank,
                'khr_bank' => -$kBank,
                'exchange_rate' => $rate,
                'total_paid_usd' => -$totalRefundKhr,
                'shift' => $data['shift'] ?? 'Morning',
                'handled_by' => $data['handled_by'] ?? 'Reception',
                'notes' => 'Booking cancelled - refund recorded',
            ]);
        });

        try {
            $telegram->sendCancellation($booking, $kCash, $kBank, $uBank);
        } catch (\Throwable $e) {}

        return redirect()->route('frontdesk')->with('success', 'Booking cancelled successfully.');
    }
}

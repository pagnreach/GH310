<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\Booking;
use App\Models\PaymentTransaction;
use App\Models\Expense;
use App\Models\CashDrawerAdjustment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FrontDeskController extends Controller
{
    public function index(Request $request)
    {
        $selectedDate = $request->input('date', today()->toDateString());
        $isToday = $selectedDate === today()->toDateString();

        $rooms = Room::with(['bookings' => function ($query) use ($selectedDate) {
            $query->where('check_in', '<=', $selectedDate)
                  ->where(function ($q) use ($selectedDate) {
                      $q->where('status', 'In House')
                        ->orWhere(function ($sub) use ($selectedDate) {
                            $sub->whereIn('status', ['Confirmed', 'Checked Out'])
                                ->where('check_out', '>=', $selectedDate);
                        });
                  })
                  ->with('payments');
        }])->orderBy('room_number')->get()->map(function ($room) use ($selectedDate) {
            $booking = $room->bookings->sortByDesc('check_in')->first();
            if ($booking) {
                $isPastCheckout = ($selectedDate > $booking->check_out) || (today()->toDateString() > $booking->check_out);
                $booking->is_overdue = ($booking->status === 'In House' && $isPastCheckout);
            }
            $room->active_booking = $booking;
            return $room;
        });

        $totalRooms = $rooms->count();
        $occupiedCount = $rooms->filter(fn($r) => !empty($r->active_booking) && $r->active_booking->status === 'In House')->count();
        $vacantCount = $totalRooms - $occupiedCount;
        $dirtyCount = $rooms->where('is_cleaned', false)->count();

        $drawerCash = FinanceController::getCashierDrawerBalance();

        $realCount = Booking::where('booking_code', 'NOT LIKE', 'B%')
            ->where('notes', 'NOT LIKE', 'Room Income%')
            ->count();
        $nextGuestCode = 'G' . str_pad($realCount + 1, 3, '0', STR_PAD_LEFT);

        return Inertia::render('FrontDesk', [
            'rooms' => $rooms,
            'selectedDate' => $selectedDate,
            'isToday' => $isToday,
            'kpi' => [
                'total_rooms' => $totalRooms,
                'occupied' => $occupiedCount,
                'vacant' => $vacantCount,
                'dirty' => $dirtyCount,
            ],
            'cashDrawer' => [
                'khr_cash' => $drawerCash,
                'usd_cash' => 0,
            ],
            'nextGuestCode' => $nextGuestCode,
        ]);
    }

    public function addOrder(Request $request, $id = null)
    {
        $bookingId = $id ?? $request->input('booking_id');

        if ($bookingId) {
            $booking = Booking::with('room')->findOrFail($bookingId);

            $cashKhr = (float)$request->input('khr_cash', $request->input('cash_khr', 0));
            $bankKhr = (float)$request->input('khr_bank', $request->input('bank_khr', 0));
            $bankUsd = (float)$request->input('usd_bank', $request->input('bank_usd', 0));
            $paidKhr = $cashKhr + $bankKhr + ($bankUsd * 4000);

            PaymentTransaction::create([
                'booking_id' => $booking->id,
                'action' => 'Add Order',
                'usd_cash' => 0,
                'khr_cash' => $cashKhr,
                'usd_bank' => $bankUsd,
                'khr_bank' => $bankKhr,
                'exchange_rate' => 4000,
                'total_paid_usd' => $paidKhr,
                'shift' => $request->input('shift', now()->hour < 15 ? 'Morning' : 'Night'),
                'handled_by' => $request->input('handled_by', auth()->user()->name ?? 'Reception'),
                'notes' => $request->input('notes', "Payment for Room {$booking->room?->room_number}"),
            ]);

            $newTotalPaid = (float)$booking->total_paid_usd + $paidKhr;
            $newBalance = max(0, (float)$booking->room_charge_usd - $newTotalPaid);

            $booking->update([
                'total_paid_usd' => $newTotalPaid,
                'balance_usd' => $newBalance,
            ]);

            return redirect()->back()->with('success', 'Order recorded successfully.');
        }

        $data = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'guest_name' => 'nullable|string',
            'guest_code' => 'nullable|string',
            'service_type' => 'nullable|string',
            'cooling' => 'nullable|string',
            'cooling_type' => 'nullable|string',
            'nights' => 'nullable|integer|min:1',
            'check_in' => 'nullable|date',
            'check_out' => 'nullable|date',
            'total_charge' => 'nullable|numeric|min:0',
            'room_charge' => 'nullable|numeric|min:0',
            'room_charge_khr' => 'nullable|numeric|min:0',
            'khr_cash' => 'nullable|numeric|min:0',
            'cash_khr' => 'nullable|numeric|min:0',
            'khr_bank' => 'nullable|numeric|min:0',
            'bank_khr' => 'nullable|numeric|min:0',
            'usd_bank' => 'nullable|numeric|min:0',
            'bank_usd' => 'nullable|numeric|min:0',
            'shift' => 'nullable|string',
            'handled_by' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $room = Room::findOrFail($data['room_id']);
        $guestName = !empty($data['guest_name']) ? $data['guest_name'] : ($data['guest_code'] ?? 'Guest');
        $nights = (int)($data['nights'] ?? 1);
        $checkInDate = !empty($data['check_in']) ? Carbon::parse($data['check_in']) : today();
        $checkOutDate = !empty($data['check_out']) ? Carbon::parse($data['check_out']) : $checkInDate->copy()->addDays($nights);

        $totalChargeKhr = (float)($data['room_charge_khr'] ?? $data['room_charge'] ?? $data['total_charge'] ?? 80000);
        $cashKhr = (float)($data['khr_cash'] ?? $data['cash_khr'] ?? 0);
        $bankKhr = (float)($data['khr_bank'] ?? $data['bank_khr'] ?? 0);
        $bankUsd = (float)($data['usd_bank'] ?? $data['bank_usd'] ?? 0);
        $totalPaidKhr = $cashKhr + $bankKhr + ($bankUsd * 4000);
        $balanceKhr = max(0, $totalChargeKhr - $totalPaidKhr);

        $realCount = Booking::where('booking_code', 'NOT LIKE', 'B%')
            ->where('notes', 'NOT LIKE', 'Room Income%')
            ->count();
        $bookingCode = 'G' . str_pad($realCount + 1, 3, '0', STR_PAD_LEFT);

        $cooling = $data['cooling_type'] ?? $data['cooling'] ?? 'AC';
        $serviceType = $data['service_type'] ?? 'Overnight';
        $serviceDesc = trim("{$serviceType} {$cooling}");
        $userNotes = !empty($data['notes']) ? " - " . $data['notes'] : '';

        $booking = Booking::create([
            'booking_code' => $bookingCode,
            'guest_name' => $guestName,
            'room_id' => $room->id,
            'check_in' => $checkInDate->toDateString(),
            'check_out' => $checkOutDate->toDateString(),
            'nights' => $nights,
            'room_charge_usd' => $totalChargeKhr,
            'total_paid_usd' => $totalPaidKhr,
            'balance_usd' => $balanceKhr,
            'status' => 'In House',
            'notes' => $serviceDesc . $userNotes,
        ]);

        if ($totalPaidKhr > 0) {
            PaymentTransaction::create([
                'booking_id' => $booking->id,
                'action' => 'Check In',
                'usd_cash' => 0,
                'khr_cash' => $cashKhr,
                'usd_bank' => $bankUsd,
                'khr_bank' => $bankKhr,
                'exchange_rate' => 4000,
                'total_paid_usd' => $totalPaidKhr,
                'shift' => $data['shift'] ?? (now()->hour < 15 ? 'Morning' : 'Night'),
                'handled_by' => $data['handled_by'] ?? (auth()->user()->name ?? 'Reception'),
                'notes' => "Check-in Payment for Room {$room->room_number}",
            ]);
        }

        $room->update([
            'status' => 'occupied',
            'is_cleaned' => true,
        ]);

        return redirect()->back()->with('success', 'Guest checked in successfully.');
    }

    public function extendStay(Request $request, $id)
    {
        $data = $request->validate([
            'extra_nights' => 'required|integer|min:1',
            'extra_charge' => 'required|numeric|min:0',
        ]);

        $booking = Booking::with('room')->findOrFail($id);
        $extraNights = (int)$data['extra_nights'];
        $extraCharge = (float)$data['extra_charge'];

        $newCheckOut = Carbon::parse($booking->check_out)->addDays($extraNights)->toDateString();
        $newNights = (int)$booking->nights + $extraNights;
        $newTotalCharge = (float)$booking->room_charge_usd + $extraCharge;
        $newBalance = max(0, $newTotalCharge - (float)$booking->total_paid_usd);

        $booking->update([
            'nights' => $newNights,
            'check_out' => $newCheckOut,
            'room_charge_usd' => $newTotalCharge,
            'balance_usd' => $newBalance,
        ]);

        return redirect()->back()->with('success', "Booking extended by {$extraNights} night(s).");
    }

    public function addPayment(Request $request, $id)
    {
        return $this->addOrder($request, $id);
    }

    public function checkout(Request $request, $id)
    {
        $booking = Booking::with('room')->findOrFail($id);

        $booking->update([
            'status' => 'Checked Out',
            'check_out' => today()->toDateString(),
        ]);

        if ($booking->room) {
            $booking->room->update([
                'status' => 'vacant',
                'is_cleaned' => false,
            ]);
        }

        return redirect()->back()->with('success', 'Guest checked out successfully.');
    }

    public function toggleCleaning($id)
    {
        $room = Room::findOrFail($id);
        $room->update(['is_cleaned' => !$room->is_cleaned]);

        return redirect()->back()->with('success', "Room {$room->room_number} cleaning status updated.");
    }
}

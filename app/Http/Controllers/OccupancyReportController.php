<?php

namespace App\Http\Controllers;

use App\Models\Setting;

use App\Models\Booking;
use App\Models\Room;
use App\Models\PaymentTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class OccupancyReportController extends Controller
{
    public function index(Request $request)
    {
        $selectedMonth = $request->input('month', '2026-09');
        $year = (int)substr($selectedMonth, 0, 4);
        $month = (int)substr($selectedMonth, 5, 2);

        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        $totalInventoryRooms = Room::count() ?: 32;

        // Fetch bookings relevant to this month
        $bookings = Booking::with('room')
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('check_in', [$startDate->toDateString(), $endDate->toDateString()])
                  ->orWhereBetween('check_out', [$startDate->toDateString(), $endDate->toDateString()])
                  ->orWhere(function ($sub) use ($startDate, $endDate) {
                      $sub->where('check_in', '<=', $startDate->toDateString())
                          ->where('check_out', '>=', $endDate->toDateString());
                  });
            })
            ->where('status', '!=', 'Cancelled')
            ->get();

        // Fetch payments made in this month to calculate accurate daily revenue
        $payments = PaymentTransaction::with('booking')
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->get();

        $dailyStats = [];
        $totalMonthlyRevenueUsd = 0;
        $totalOccupiedRoomNights = 0;

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $currentDateStr = Carbon::createFromDate($year, $month, $day)->toDateString();
            $formattedDate = Carbon::createFromDate($year, $month, $day)->format('d-M');

            // Arrivals: Check-ins on this date
            $arrivals = $bookings->filter(fn($b) => $b->check_in === $currentDateStr)->count();

            // Checkouts: Check-outs on this date
            $checkouts = $bookings->filter(fn($b) => $b->check_out === $currentDateStr)->count();

            // Occupied Rooms: Distinct rooms occupied on this date
            $occupiedRooms = $bookings->filter(function ($b) use ($currentDateStr) {
                return $b->check_in <= $currentDateStr && $b->check_out > $currentDateStr;
            })->pluck('room_id')->unique()->count();

            $totalOccupiedRoomNights += $occupiedRooms;

            // Room Revenue USD for this date
            $dayPayments = $payments->filter(fn($p) => Carbon::parse($p->created_at)->toDateString() === $currentDateStr);
            $dayRevUSD = (float)$dayPayments->sum('usd_bank') + (float)$dayPayments->sum('usd_cash') 
                + (((float)$dayPayments->sum('khr_bank') + (float)$dayPayments->sum('khr_cash')) / 4000);
            
            $totalMonthlyRevenueUsd += $dayRevUSD;

            $occupancyRate = $totalInventoryRooms > 0 ? round(($occupiedRooms / $totalInventoryRooms) * 100, 1) : 0;

            $dailyStats[] = [
                'day' => $day,
                'date' => $formattedDate,
                'full_date' => $currentDateStr,
                'occupied_rooms' => $occupiedRooms,
                'arrivals' => $arrivals,
                'checkouts' => $checkouts,
                'room_revenue_usd' => round($dayRevUSD, 2),
                'total_rooms' => $totalInventoryRooms,
                'occupancy_rate' => $occupancyRate,
            ];
        }

        // Summary Calculations
        $monthBookings = $bookings->filter(function ($b) use ($year, $month) {
            return Carbon::parse($b->check_in)->year === $year && Carbon::parse($b->check_in)->month === $month;
        });

        $totalBookingsCount = $monthBookings->count();
        $availableRoomNights = $totalInventoryRooms * $daysInMonth;
        $avgOccupancy = $availableRoomNights > 0 ? round(($totalOccupiedRoomNights / $availableRoomNights) * 100, 2) : 0;
        $avgStayLength = $totalBookingsCount > 0 ? round($monthBookings->sum('nights') / $totalBookingsCount, 2) : 0;

        // AC vs Fan Matrix Calculations
        $classify = function ($b) {
            $notes = strtolower(($b->notes ?? '') . ' ' . ($b->room?->room_type ?? ''));
            $isFan = str_contains($notes, 'fan');
            $isDouble = str_contains($notes, 'double');
            $is3Hour = str_contains($notes, '3-hour') || str_contains($notes, '3 hour') || (int)$b->nights === 0;

            return [
                'type' => $isFan ? 'fan' : 'ac',
                'category' => $isDouble ? 'double' : 'single',
                'is_3hour' => $is3Hour,
                'nights' => max(1, (int)$b->nights),
            ];
        };

        $matrix = [
            'ac' => ['checkins' => 0, 'checkouts' => 0, 'short_stay' => 0, 'single_checkins' => 0, 'double_checkins' => 0, 'single_nights' => 0, 'double_nights' => 0],
            'fan' => ['checkins' => 0, 'checkouts' => 0, 'short_stay' => 0, 'single_checkins' => 0, 'double_checkins' => 0, 'single_nights' => 0, 'double_nights' => 0],
        ];

        foreach ($monthBookings as $b) {
            $c = $classify($b);
            $group = $c['type'];

            $matrix[$group]['checkins']++;
            if ($b->status === 'Checked Out') {
                $matrix[$group]['checkouts']++;
            }
            if ($c['is_3hour']) {
                $matrix[$group]['short_stay']++;
            }
            if ($c['category'] === 'single') {
                $matrix[$group]['single_checkins']++;
                $matrix[$group]['single_nights'] += $c['nights'];
            } else {
                $matrix[$group]['double_checkins']++;
                $matrix[$group]['double_nights'] += $c['nights'];
            }
        }

        return Inertia::render('Reports/OccupancyReport', [
            'selectedMonth' => $selectedMonth,
            'summary' => [
                'total_bookings' => $totalBookingsCount,
                'total_revenue_usd' => round($totalMonthlyRevenueUsd, 2),
                'average_occupancy' => $avgOccupancy,
                'average_stay_length' => $avgStayLength,
            ],
            'matrix' => $matrix,
            'dailyStats' => $dailyStats,
            'totalInventoryRooms' => $totalInventoryRooms,
        ]);
    }
}

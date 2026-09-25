import React, { useState, useMemo } from 'react';
import Navbar from '@/Components/Navbar';

export default function RoomCalendar({ rooms = [], bookings = [] }) {
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

    const daysInMonth = useMemo(() => {
        return new Date(currentYear, currentMonth + 1, 0).getDate();
    }, [currentYear, currentMonth]);

    const monthDays = useMemo(() => {
        const days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({ day: i, dateStr });
        }
        return days;
    }, [currentYear, currentMonth, daysInMonth]);

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear((prev) => prev - 1);
        } else {
            setCurrentMonth((prev) => prev - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear((prev) => prev + 1);
        } else {
            setCurrentMonth((prev) => prev + 1);
        }
    };

    const monthLabel = useMemo(() => {
        return new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    }, [currentYear, currentMonth]);

    // Check if room has an active booking on a specific date string
    const getBookingForRoomDate = (roomId, dateStr) => {
        return bookings.find((b) => {
            if (b.room_id !== roomId) return false;
            if (b.status === 'Cancelled') return false;
            const inDate = b.check_in ? b.check_in.split('T')[0] : '';
            const outDate = b.check_out ? b.check_out.split('T')[0] : inDate;
            return dateStr >= inDate && dateStr <= outDate;
        });
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            <Navbar activeTab="calendar" />

            <main className="p-4 flex-1 flex flex-col gap-3 max-w-[1800px] w-full mx-auto">
                {/* Calendar Navigation Bar */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs flex flex-wrap justify-between items-center gap-3">
                    <div>
                        <h2 className="text-base font-black text-slate-800">Room Availability Calendar</h2>
                        <span className="text-xs text-slate-500 font-medium">Daily occupancy timeline by room</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={prevMonth}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border text-xs cursor-pointer"
                        >
                            &larr; Prev
                        </button>
                        <span className="font-black text-sm text-slate-800 px-3">{monthLabel}</span>
                        <button
                            onClick={nextMonth}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border text-xs cursor-pointer"
                        >
                            Next &rarr;
                        </button>
                        <button
                            onClick={() => {
                                setCurrentYear(today.getFullYear());
                                setCurrentMonth(today.getMonth());
                            }}
                            className="ml-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg shadow-xs cursor-pointer"
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* Calendar Timeline Grid */}
                <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-900 text-white select-none">
                                <th className="p-2.5 text-left font-black w-24 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                                    Room
                                </th>
                                {monthDays.map(({ day, dateStr }) => {
                                    const isToday = dateStr === today.toISOString().split('T')[0];
                                    return (
                                        <th
                                            key={dateStr}
                                            className={`p-1.5 text-center min-w-[34px] border-r border-slate-800 font-mono text-[11px] ${
                                                isToday ? 'bg-emerald-600 text-white font-black' : ''
                                            }`}
                                        >
                                            {day}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-sans">
                            {rooms.map((room) => (
                                <tr key={room.id} className="hover:bg-slate-50 transition">
                                    {/* Sticky Room Label */}
                                    <td className="p-2 font-black text-slate-900 bg-white sticky left-0 z-10 border-r border-slate-300 shadow-xs whitespace-nowrap">
                                        <span>{room.room_number}</span>
                                        <span className={`text-[9px] ml-1.5 px-1 rounded uppercase ${
                                            room.room_type === 'Double' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                                        }`}>
                                            {room.room_type === 'Double' ? 'D' : 'S'}
                                        </span>
                                    </td>

                                    {/* Daily Day Cells */}
                                    {monthDays.map(({ dateStr }) => {
                                        const booking = getBookingForRoomDate(room.id, dateStr);
                                        const isToday = dateStr === today.toISOString().split('T')[0];

                                        if (booking) {
                                            const isStart = booking.check_in && booking.check_in.split('T')[0] === dateStr;
                                            const isDue = (parseFloat(booking.balance_usd) || 0) > 0;
                                            return (
                                                <td
                                                    key={dateStr}
                                                    title={`Room ${room.room_number} - ${booking.guest_name} (${booking.booking_code})`}
                                                    className={`p-0.5 border-r border-slate-200 text-center select-none ${
                                                        isToday ? 'ring-1 ring-emerald-400' : ''
                                                    }`}
                                                >
                                                    <div
                                                        className={`w-full h-7 rounded text-[9px] font-bold flex items-center justify-center truncate px-0.5 text-white ${
                                                            isDue ? 'bg-amber-600' : 'bg-emerald-600'
                                                        }`}
                                                    >
                                                        {isStart ? booking.guest_name : '•'}
                                                    </div>
                                                </td>
                                            );
                                        }

                                        return (
                                            <td
                                                key={dateStr}
                                                className={`p-0.5 border-r border-slate-200 text-center ${
                                                    isToday ? 'bg-emerald-50/50' : ''
                                                }`}
                                            >
                                                <div className="w-full h-7"></div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}

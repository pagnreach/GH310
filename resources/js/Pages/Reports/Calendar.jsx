import React from 'react';
import Navbar from '@/Components/Navbar';
import { router } from '@inertiajs/react';

export default function Calendar({ rooms, bookings, year, month, daysInMonth }) {
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const changeMonth = (newMonth, newYear) => {
        if (newMonth < 1) { newMonth = 12; newYear--; }
        if (newMonth > 12) { newMonth = 1; newYear++; }
        router.get('/calendar', { month: newMonth, year: newYear });
    };

    const isRoomOccupied = (roomId, day) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return bookings.find(b => {
            if (b.room_id !== roomId) return false;
            const inDate = b.check_in.split('T')[0];
            const outDate = b.check_out.split('T')[0];
            return dateStr >= inDate && (inDate === outDate ? dateStr === inDate : dateStr < outDate);
        });
    };

    const getDayName = (day) => {
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('en-US', { weekday: 'narrow' });
    };

    return (
        <div className="h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
            <Navbar activeTab="calendar" />

            <div className="p-2 flex-1 flex flex-col gap-1.5 max-w-[1850px] w-full mx-auto overflow-hidden">
                {/* Header Controls */}
                <div className="bg-white px-3 py-1 rounded border border-slate-300 shadow-xs flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xs font-black text-slate-800 tracking-tight">
                            Occupancy Calendar &bull; {monthNames[month - 1]} {year}
                        </h2>
                        <span className="text-[10px] text-slate-500 font-medium">
                            Rows: Rooms (G &rarr; 4th Floor) &bull; Columns: Days 1–{daysInMonth}
                        </span>
                    </div>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => changeMonth(month - 1, year)}
                            className="px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 border rounded font-bold text-[10px] cursor-pointer"
                        >
                            &larr; Prev
                        </button>
                        <button
                            onClick={() => changeMonth(month + 1, year)}
                            className="px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 border rounded font-bold text-[10px] cursor-pointer"
                        >
                            Next &rarr;
                        </button>
                    </div>
                </div>

                {/* 32-Row by 31-Column Matrix */}
                <div className="bg-white rounded border border-slate-300 shadow-xs flex-1 flex flex-col overflow-hidden">
                    <table className="w-full h-full table-fixed text-center border-collapse">
                        {/* Days 1 to 31 Header */}
                        <thead>
                            <tr className="bg-slate-900 text-white h-[24px]">
                                <th className="p-0 border border-slate-800 w-[58px] text-center font-black text-[10px] text-slate-200">
                                    Room
                                </th>
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const weekday = getDayName(day);
                                    const isWeekend = weekday === 'S';

                                    return (
                                        <th
                                            key={day}
                                            className={`p-0 border border-slate-800 font-bold text-[9px] leading-tight ${
                                                isWeekend ? 'bg-slate-800 text-amber-300' : 'text-slate-200'
                                            }`}
                                        >
                                            <div>{String(day).padStart(2, '0')}</div>
                                            <div className="text-[7px] text-slate-400 font-normal">{weekday}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        {/* 32 Room Rows (Ground Floor through 4th Floor) */}
                        <tbody>
                            {rooms.map((room) => {
                                const isGround = room.room_number.startsWith('G');
                                return (
                                    <tr
                                        key={room.id}
                                        className={`border-b border-slate-200/70 hover:bg-slate-50/80 transition ${
                                            isGround ? 'bg-slate-50/50' : 'bg-white'
                                        }`}
                                    >
                                        {/* Room Header Cell */}
                                        <td className="p-0 border-r border-slate-300 font-black text-[10px] leading-none text-slate-900 bg-slate-50/90 text-left pl-2">
                                            <span>{room.room_number}</span>
                                            <span className={`text-[8px] font-bold ml-1 px-1 rounded ${
                                                room.room_type === 'Double' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'
                                            }`}>
                                                {room.room_type === 'Double' ? 'D' : 'S'}
                                            </span>
                                        </td>

                                        {/* Day Cells for this room */}
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                            const day = i + 1;
                                            const booking = isRoomOccupied(room.id, day);
                                            const weekday = getDayName(day);
                                            const isWeekend = weekday === 'S';

                                            return (
                                                <td
                                                    key={day}
                                                    className={`border-r border-slate-200/50 p-0 text-[10px] leading-none transition ${
                                                        booking
                                                            ? 'bg-amber-400 font-black text-slate-900 ring-inset'
                                                            : isWeekend
                                                            ? 'bg-slate-100/40'
                                                            : 'bg-white'
                                                    }`}
                                                    title={booking ? `${room.room_number}: ${booking.guest_name} (${booking.notes})` : `${room.room_number} (Day ${day}): Vacant`}
                                                >
                                                    {booking ? '▪' : ''}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import { Head, router } from '@inertiajs/react';
import Navbar from '@/Components/Navbar';

export default function OccupancyReport({ selectedMonth, summary, matrix, dailyStats, totalInventoryRooms }) {
    const handleMonthChange = (e) => {
        router.get('/occupancy-report', { month: e.target.value }, { preserveState: true });
    };

    const maxOccupied = Math.max(...dailyStats.map(d => d.occupied_rooms), 1);

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            <Head title="Monthly Occupancy Report (MOR)" />
            <Navbar activeTab="occupancy" />

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
                {/* Header & Month Selector */}
                <div className="bg-white border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <span>📊</span> 310 Guest House - Monthly Occupancy Report
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                            Audited room nights, arrivals, checkouts, and utilization rate (Total Inventory: {totalInventoryRooms} rooms)
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Month:</label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={handleMonthChange}
                            className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* 4 Summary KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border rounded-2xl p-4 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bookings</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{summary.total_bookings}</p>
                        <p className="text-[11px] text-slate-400 mt-1">Stays captured</p>
                    </div>
                    <div className="bg-white border rounded-2xl p-4 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room Revenue</p>
                        <p className="text-2xl font-black text-emerald-600 mt-1">${summary.total_revenue_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-[11px] text-slate-400 mt-1">Gross realized room sales</p>
                    </div>
                    <div className="bg-white border rounded-2xl p-4 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Occupancy</p>
                        <p className="text-2xl font-black text-blue-600 mt-1">{summary.average_occupancy}%</p>
                        <p className="text-[11px] text-slate-400 mt-1">Monthly capacity utilization</p>
                    </div>
                    <div className="bg-white border rounded-2xl p-4 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Stay Length</p>
                        <p className="text-2xl font-black text-indigo-600 mt-1">{summary.average_stay_length} <span className="text-sm font-medium text-slate-500">nights</span></p>
                        <p className="text-[11px] text-slate-400 mt-1">ALOS (Length of Stay)</p>
                    </div>
                </div>

                {/* Occupancy Trend Visualizer */}
                <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Monthly Occupancy Trend</h2>
                        <span className="text-xs font-medium text-slate-400">Peak: {maxOccupied} rooms</span>
                    </div>
                    <div className="h-28 flex items-end gap-1.5 pt-4 pb-1 overflow-x-auto border-b border-slate-100">
                        {dailyStats.map((d) => {
                            const pct = Math.min(100, Math.round((d.occupied_rooms / totalInventoryRooms) * 100));
                            return (
                                <div key={d.day} className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group relative">
                                    <div
                                        className={`w-full rounded-t transition-all duration-300 ${
                                            pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : pct > 0 ? 'bg-amber-400' : 'bg-slate-200'
                                        }`}
                                        style={{ height: `${Math.max(4, (d.occupied_rooms / totalInventoryRooms) * 90)}px` }}
                                    ></div>
                                    <span className="text-[9px] font-mono text-slate-400">{d.day}</span>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-10 hidden group-hover:flex flex-col bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg z-20 whitespace-nowrap pointer-events-none">
                                        <span className="font-bold">{d.date}: {d.occupied_rooms} Rooms</span>
                                        <span>{pct}% Occupancy &bull; ${d.room_revenue_usd}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2-Column: AC vs Fan Matrix + Daily Report Table */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* AC vs Fan Matrix */}
                    <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Operational Breakdown</h2>
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-900 text-white uppercase text-[10px]">
                                <tr>
                                    <th className="p-2.5 rounded-tl-lg">Category</th>
                                    <th className="p-2.5 text-center">AC</th>
                                    <th className="p-2.5 text-center">Fan</th>
                                    <th className="p-2.5 text-right rounded-tr-lg">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                <tr>
                                    <td className="p-2.5">Total Check-In</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.ac.checkins}</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.fan.checkins}</td>
                                    <td className="p-2.5 text-right font-black text-slate-900">{matrix.ac.checkins + matrix.fan.checkins}</td>
                                </tr>
                                <tr>
                                    <td className="p-2.5">Total Check-Out</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.ac.checkouts}</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.fan.checkouts}</td>
                                    <td className="p-2.5 text-right font-black text-slate-900">{matrix.ac.checkouts + matrix.fan.checkouts}</td>
                                </tr>
                                <tr>
                                    <td className="p-2.5">Total 3-Hour Service</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.ac.short_stay}</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.fan.short_stay}</td>
                                    <td className="p-2.5 text-right font-black text-slate-900">{matrix.ac.short_stay + matrix.fan.short_stay}</td>
                                </tr>
                                <tr>
                                    <td className="p-2.5">Total Single Check-In</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.ac.single_checkins}</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.fan.single_checkins}</td>
                                    <td className="p-2.5 text-right font-black text-slate-900">{matrix.ac.single_checkins + matrix.fan.single_checkins}</td>
                                </tr>
                                <tr>
                                    <td className="p-2.5">Total Double Check-In</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.ac.double_checkins}</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.fan.double_checkins}</td>
                                    <td className="p-2.5 text-right font-black text-slate-900">{matrix.ac.double_checkins + matrix.fan.double_checkins}</td>
                                </tr>
                                <tr>
                                    <td className="p-2.5">Total Single Nights</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.ac.single_nights}</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.fan.single_nights}</td>
                                    <td className="p-2.5 text-right font-black text-slate-900">{matrix.ac.single_nights + matrix.fan.single_nights}</td>
                                </tr>
                                <tr>
                                    <td className="p-2.5">Total Double Nights</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.ac.double_nights}</td>
                                    <td className="p-2.5 text-center font-bold text-slate-900">{matrix.fan.double_nights}</td>
                                    <td className="p-2.5 text-right font-black text-slate-900">{matrix.ac.double_nights + matrix.fan.double_nights}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Daily Breakdown Table */}
                    <div className="lg:col-span-2 bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Daily Occupancy Audit</h2>
                            <span className="text-xs text-slate-500 font-medium">Auto-compiled from guest arrivals & payments</span>
                        </div>
                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-900 text-white uppercase text-[10px] sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2.5">Date</th>
                                        <th className="p-2.5 text-center">Occupied</th>
                                        <th className="p-2.5 text-center">Arrivals</th>
                                        <th className="p-2.5 text-center">Checkouts</th>
                                        <th className="p-2.5 text-right">Revenue (USD)</th>
                                        <th className="p-2.5 text-right">Occ Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {dailyStats.map((row) => (
                                        <tr key={row.day} className="hover:bg-slate-50 transition">
                                            <td className="p-2.5 font-bold font-mono text-slate-900">{row.date}</td>
                                            <td className="p-2.5 text-center font-semibold text-slate-800">{row.occupied_rooms}</td>
                                            <td className="p-2.5 text-center text-emerald-600 font-semibold">{row.arrivals > 0 ? `+${row.arrivals}` : '0'}</td>
                                            <td className="p-2.5 text-center text-rose-500 font-semibold">{row.checkouts > 0 ? `-${row.checkouts}` : '0'}</td>
                                            <td className="p-2.5 text-right font-mono text-slate-900">
                                                {row.room_revenue_usd > 0 ? `$${row.room_revenue_usd.toFixed(2)}` : '$0.00'}
                                            </td>
                                            <td className="p-2.5 text-right font-mono">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                        row.occupancy_rate >= 70
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : row.occupancy_rate >= 40
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : row.occupancy_rate > 0
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'text-slate-400'
                                                    }`}
                                                >
                                                    {row.occupancy_rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

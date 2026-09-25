import React, { useState, useMemo } from 'react';
import Navbar from '@/Components/Navbar';

export default function GuestLog({ bookings }) {
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [datePreset, setDatePreset] = useState('MONTH');

    const todayStr = new Date().toISOString().split('T')[0];
    const [customDay, setCustomDay] = useState(todayStr);
    const [customMonth, setCustomMonth] = useState(todayStr.slice(0, 7));
    const [customYear, setCustomYear] = useState(todayStr.slice(0, 4));

    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });

    const rawList = bookings.data || [];

    const formatDateRange = (inDate, outDate) => {
        if (!inDate) return '—';
        const dIn = inDate.split('T')[0].slice(5);
        const dOut = outDate ? outDate.split('T')[0].slice(5) : dIn;
        return dIn === dOut ? dIn : `${dIn} - ${dOut}`;
    };

    const getCashPaid = (b) => {
        if (!b.payment_transactions) return 0;
        return b.payment_transactions.reduce((sum, tx) => sum + (parseFloat(tx.khr_cash) || 0), 0);
    };

    const getBankPaidDetails = (b) => {
        if (!b.payment_transactions) return { usd: 0, khr: 0, totalEq: 0 };
        let usd = 0;
        let khr = 0;
        b.payment_transactions.forEach((tx) => {
            usd += (parseFloat(tx.usd_bank) || 0);
            khr += (parseFloat(tx.khr_bank) || 0);
        });
        return { usd, khr, totalEq: (usd * 4000) + khr };
    };

    // Sub-line: "$10 + 20,000៛" or "$10.00"
    const getBankSubtext = (usd, khr) => {
        if (usd <= 0 && khr <= 0) return null;
        const usdClean = Number.isInteger(usd) ? usd : usd.toFixed(2);
        if (usd > 0 && khr > 0) {
            return `$${usdClean} + ${Number(khr).toLocaleString()}៛`;
        }
        if (usd > 0) {
            return `$${usdClean}`;
        }
        return null;
    };

    const formatServiceNotes = (notes) => {
        if (!notes) return 'Overnight AC';
        if (notes === 'Overnight') return 'Overnight AC';
        if (notes === '3-Hour' || notes === '3-Hour Service') return '3-Hour AC';
        return notes;
    };

    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const processedBookings = useMemo(() => {
        return rawList
            .filter((b) => {
                if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;

                const inDate = b.check_in.split('T')[0];
                const outDate = b.check_out ? b.check_out.split('T')[0] : inDate;

                if (datePreset === 'TODAY') {
                    const targetDay = customDay || todayStr;
                    if (inDate === outDate) {
                        if (inDate !== targetDay) return false;
                    } else {
                        if (targetDay < inDate || targetDay > outDate) return false;
                    }
                } else if (datePreset === 'MONTH') {
                    const targetYM = customMonth || todayStr.slice(0, 7);
                    if (inDate.slice(0, 7) !== targetYM && outDate.slice(0, 7) !== targetYM) return false;
                } else if (datePreset === 'YEAR') {
                    const targetY = customYear || todayStr.slice(0, 4);
                    if (inDate.slice(0, 4) !== targetY && outDate.slice(0, 4) !== targetY) return false;
                }

                if (searchQuery.trim() !== '') {
                    const q = searchQuery.toLowerCase();
                    const roomNum = (b.room?.room_number || '').toLowerCase();
                    const guest = (b.guest_name || '').toLowerCase();
                    const code = (b.booking_code || '').toLowerCase();
                    const notes = formatServiceNotes(b.notes).toLowerCase();
                    return roomNum.includes(q) || guest.includes(q) || code.includes(q) || notes.includes(q);
                }

                return true;
            })
            .sort((a, b) => {
                let aVal, bVal;
                switch (sortConfig.key) {
                    case 'room':
                        aVal = a.room?.room_number || '';
                        bVal = b.room?.room_number || '';
                        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    case 'nights':
                        aVal = Number(a.nights) || 0;
                        bVal = Number(b.nights) || 0;
                        break;
                    case 'date':
                        aVal = new Date(a.check_in).getTime();
                        bVal = new Date(b.check_in).getTime();
                        break;
                    case 'charge':
                        aVal = Number(a.room_charge_usd) || 0;
                        bVal = Number(b.room_charge_usd) || 0;
                        break;
                    case 'cash':
                        aVal = getCashPaid(a);
                        bVal = getCashPaid(b);
                        break;
                    case 'bank':
                        aVal = getBankPaidDetails(a).totalEq;
                        bVal = getBankPaidDetails(b).totalEq;
                        break;
                    case 'balance':
                        aVal = Number(a.balance_usd) || 0;
                        bVal = Number(b.balance_usd) || 0;
                        break;
                    case 'status':
                        aVal = a.status || '';
                        bVal = b.status || '';
                        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    case 'id':
                    default:
                        aVal = a.id;
                        bVal = b.id;
                        break;
                }
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            });
    }, [rawList, searchQuery, statusFilter, datePreset, customDay, customMonth, customYear, sortConfig]);

    const sortIndicator = (key) => {
        if (sortConfig.key !== key) return <span className="text-slate-400 text-[10px] ml-1.5 inline-block">⇅</span>;
        return <span className="text-emerald-400 font-black text-[10px] ml-1.5 inline-block">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    const currentYear = new Date().getFullYear();
    const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            <Navbar activeTab="guest-log" />

            <main className="p-4 flex-1 flex flex-col gap-3 max-w-[1720px] w-full mx-auto">
                {/* Control Toolbar */}
                <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-xs flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search room, guest, B00..., AC/Fan..."
                                    className="border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-xs w-64 bg-slate-50 focus:bg-white focus:outline-emerald-600 font-medium"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1.5 text-slate-400 hover:text-black font-bold text-xs cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Selector Box */}
                            {datePreset === 'TODAY' && (
                                <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-300 rounded-lg px-2.5 py-1">
                                    <span className="text-[10px] font-black text-emerald-800 uppercase">Day:</span>
                                    <input
                                        type="date"
                                        value={customDay}
                                        onChange={(e) => setCustomDay(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                    />
                                    {customDay !== todayStr && (
                                        <button
                                            onClick={() => setCustomDay(todayStr)}
                                            className="text-[10px] bg-emerald-200 hover:bg-emerald-300 text-emerald-900 px-1 rounded font-bold ml-1 cursor-pointer"
                                        >
                                            Today
                                        </button>
                                    )}
                                </div>
                            )}

                            {datePreset === 'MONTH' && (
                                <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-300 rounded-lg px-2.5 py-1">
                                    <span className="text-[10px] font-black text-emerald-800 uppercase">Month:</span>
                                    <input
                                        type="month"
                                        value={customMonth}
                                        onChange={(e) => setCustomMonth(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                    />
                                    {customMonth !== todayStr.slice(0, 7) && (
                                        <button
                                            onClick={() => setCustomMonth(todayStr.slice(0, 7))}
                                            className="text-[10px] bg-emerald-200 hover:bg-emerald-300 text-emerald-900 px-1 rounded font-bold ml-1 cursor-pointer"
                                        >
                                            This Month
                                        </button>
                                    )}
                                </div>
                            )}

                            {datePreset === 'YEAR' && (
                                <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-300 rounded-lg px-2.5 py-1">
                                    <span className="text-[10px] font-black text-emerald-800 uppercase">Year:</span>
                                    <select
                                        value={customYear}
                                        onChange={(e) => setCustomYear(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                    >
                                        {availableYears.map((yr) => (
                                            <option key={yr} value={yr.toString()}>{yr}</option>
                                        ))}
                                    </select>
                                    {customYear !== todayStr.slice(0, 4) && (
                                        <button
                                            onClick={() => setCustomYear(todayStr.slice(0, 4))}
                                            className="text-[10px] bg-emerald-200 hover:bg-emerald-300 text-emerald-900 px-1 rounded font-bold ml-1 cursor-pointer"
                                        >
                                            This Year
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Preset Pills */}
                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                                {[
                                    { id: 'TODAY', label: 'Today' },
                                    { id: 'MONTH', label: 'Month' },
                                    { id: 'YEAR', label: 'Year' },
                                    { id: 'ALL', label: 'All Time' },
                                ].map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setDatePreset(preset.id)}
                                        className={`px-3 py-1 rounded-md transition cursor-pointer ${
                                            datePreset === preset.id
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <span className="text-xs text-slate-600 font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                            {processedBookings.length} Stays
                        </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Status:</span>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                            {['ALL', 'In House', 'Checked Out', 'Cancelled'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1 rounded-md transition cursor-pointer ${
                                        statusFilter === st
                                            ? 'bg-slate-900 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {st === 'ALL' ? 'All' : st}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider select-none whitespace-nowrap">
                                <th onClick={() => handleSort('room')} className="py-2.5 pl-4 pr-6 w-48 cursor-pointer hover:bg-slate-800">
                                    <div className="flex items-center">
                                        <span>Room</span>
                                        {sortIndicator('room')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('nights')} className="py-2.5 px-4 text-center w-24 cursor-pointer hover:bg-slate-800">
                                    <div className="flex items-center justify-center">
                                        <span>Nights</span>
                                        {sortIndicator('nights')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('date')} className="py-2.5 px-4 w-44 cursor-pointer hover:bg-slate-800">
                                    <div className="flex items-center">
                                        <span>Date</span>
                                        {sortIndicator('date')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('charge')} className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-800">
                                    <div className="flex items-center justify-end">
                                        <span>Room Charge</span>
                                        {sortIndicator('charge')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('cash')} className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-800">
                                    <div className="flex items-center justify-end">
                                        <span>Cash Paid</span>
                                        {sortIndicator('cash')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('bank')} className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-800">
                                    <div className="flex items-center justify-end">
                                        <span>Bank Paid</span>
                                        {sortIndicator('bank')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('balance')} className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-800">
                                    <div className="flex items-center justify-end">
                                        <span>Balance</span>
                                        {sortIndicator('balance')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('status')} className="py-2.5 px-4 text-center w-32 cursor-pointer hover:bg-slate-800">
                                    <div className="flex items-center justify-center">
                                        <span>Status</span>
                                        {sortIndicator('status')}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-sans">
                            {processedBookings.map((b) => {
                                const isCancelled = b.status === 'Cancelled';
                                const cashPaid = getCashPaid(b);
                                const is3H = b.notes && b.notes.includes('3-Hour');
                                const serviceText = formatServiceNotes(b.notes);
                                const { usd, khr, totalEq } = getBankPaidDetails(b);
                                const bankSubtext = getBankSubtext(usd, khr);

                                return (
                                    <tr
                                        key={b.id}
                                        onClick={() => setSelectedBooking(b)}
                                        className={`hover:bg-blue-50/60 transition cursor-pointer select-none ${
                                            isCancelled ? 'bg-rose-50/70 text-rose-900' : ''
                                        }`}
                                    >
                                        <td className="py-2 pl-4 pr-6">
                                            <div className="flex items-center gap-1.5 leading-tight">
                                                <span className="font-black text-slate-900 text-xs">{b.room?.room_number}</span>
                                                <span className="text-[11px] text-slate-400 font-medium">({b.guest_name})</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                                                {b.booking_code} &bull; <span>{serviceText}</span>
                                            </div>
                                        </td>

                                        <td className="py-2 px-4 text-center font-bold text-slate-700 text-xs">
                                            {is3H ? '3h' : b.nights}
                                        </td>

                                        <td className="py-2 px-4 font-mono font-medium text-slate-600 text-xs whitespace-nowrap">
                                            {formatDateRange(b.check_in, b.check_out)}
                                        </td>

                                        <td className="py-2 px-4 text-right font-black text-slate-900 text-xs">
                                            {Number(b.room_charge_usd).toLocaleString()}៛
                                        </td>

                                        <td className="py-2 px-4 text-right font-bold text-emerald-700 text-xs">
                                            {cashPaid > 0 ? `${Number(cashPaid).toLocaleString()}៛` : '0៛'}
                                        </td>

                                        {/* Bank Paid: 60,000៛ (bold) + $10 + 20,000៛ (subtle gray) */}
                                        <td className="py-2 px-4 text-right">
                                            <div className="font-bold text-blue-700 text-xs leading-tight">
                                                {totalEq > 0 ? `${Number(totalEq).toLocaleString()}៛` : '0៛'}
                                            </div>
                                            {bankSubtext && (
                                                <div className="text-[10px] text-slate-400 leading-tight mt-0.5 font-normal">
                                                    {bankSubtext}
                                                </div>
                                            )}
                                        </td>

                                        <td className={`py-2 px-4 text-right font-black text-xs ${
                                            Number(b.balance_usd) > 0 ? 'text-orange-600' : 'text-slate-400'
                                        }`}>
                                            {Number(b.balance_usd).toLocaleString()}៛
                                        </td>

                                        <td className="py-2 px-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                isCancelled
                                                    ? 'bg-rose-200 text-rose-800'
                                                    : b.status === 'In House'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-slate-200 text-slate-700'
                                            }`}>
                                                {b.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {processedBookings.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="text-center py-10 text-slate-400 italic text-xs">
                                        No bookings found for this selection.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Audit Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4">
                        <div className="flex justify-between items-start border-b pb-2">
                            <div>
                                <h3 className="font-black text-base text-slate-900">
                                    Payment Record: {selectedBooking.booking_code}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Room {selectedBooking.room?.room_number} &bull; Guest: <strong>{selectedBooking.guest_name}</strong> &bull; {formatServiceNotes(selectedBooking.notes)}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="text-slate-400 hover:text-black cursor-pointer font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-center">
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Charge</span>
                                <span className="font-black">{Number(selectedBooking.room_charge_usd).toLocaleString()}៛</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Cash Paid</span>
                                <span className="font-black text-emerald-700">{Number(getCashPaid(selectedBooking)).toLocaleString()}៛</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Bank Paid</span>
                                <span className="font-black text-blue-700">
                                    {Number(getBankPaidDetails(selectedBooking).totalEq).toLocaleString()}៛
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Balance Due</span>
                                <span className={`font-black ${Number(selectedBooking.balance_usd) > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
                                    {Number(selectedBooking.balance_usd).toLocaleString()}៛
                                </span>
                            </div>
                        </div>

                        <div>
                            <span className="text-xs font-bold text-slate-700 block mb-2">Itemized Payments</span>
                            {selectedBooking.payment_transactions && selectedBooking.payment_transactions.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {selectedBooking.payment_transactions.map((tx) => {
                                        const isRefund = tx.total_paid_usd < 0;
                                        return (
                                            <div
                                                key={tx.id}
                                                className={`p-2.5 rounded border text-xs flex justify-between items-center ${
                                                    isRefund ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200 shadow-2xs'
                                                }`}
                                            >
                                                <div>
                                                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                        <span>{tx.action}</span>
                                                        <span className="text-[10px] font-normal text-slate-400">
                                                            ({tx.shift} shift)
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                                        {new Date(tx.created_at).toLocaleString()}
                                                    </div>
                                                    {tx.notes && <div className="text-[10px] text-slate-400 mt-0.5">{tx.notes}</div>}
                                                </div>

                                                <div className="text-right">
                                                    <div className={`font-black text-sm ${isRefund ? 'text-rose-600' : 'text-emerald-700'}`}>
                                                        {Number(tx.total_paid_usd).toLocaleString()}៛
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-mono">
                                                        Cash: {Number(tx.khr_cash).toLocaleString()}៛ &bull; Bank: {tx.usd_bank > 0 ? `$${Number(tx.usd_bank).toFixed(2)} ` : ''}{Number(tx.khr_bank).toLocaleString()}៛
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-400 text-xs italic">
                                    No payment records found for this stay.
                                </div>
                            )}
                        </div>

                        <div className="pt-2 border-t flex justify-end">
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

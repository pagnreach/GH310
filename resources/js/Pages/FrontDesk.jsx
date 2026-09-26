import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Navbar from '@/Components/Navbar';

export default function FrontDesk({ rooms, kpi, cashDrawer, nextGuestCode = 'G001', selectedDate, isToday, pricingMatrix, exchangeRate = 4000 }) {
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [activeDropdownRoomId, setActiveDropdownRoomId] = useState(null);
    const [extendForm, setExtendForm] = useState({ extra_nights: 1, rate_per_night: 80000, extra_charge: 80000 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const PRICING_TABLE_KHR = pricingMatrix || {
        'Single': {
            'Overnight': { 'AC': 60000, 'Fan': 40000 },
            '3-Hour Service': { 'AC': 28000, 'Fan': 20000 }
        },
        'Double': {
            'Overnight': { 'AC': 80000, 'Fan': 60000 },
            '3-Hour Service': { 'AC': 40000, 'Fan': 32000 }
        }
    };

    const roomMap = new Map(rooms.map(r => [r.room_number, r]));

    const floorSections = [
        {
            title: 'Ground Floor',
            roomCount: 5,
            colSpan: 'col-span-1',
            columns: [['G1', 'G2', 'G3', 'G4', 'G5']]
        },
        {
            title: '1st Floor',
            roomCount: 6,
            colSpan: 'col-span-1',
            columns: [['101', '102', '103', '104', '105', '106']]
        },
        {
            title: '2nd Floor',
            roomCount: 9,
            colSpan: 'col-span-2',
            columns: [
                ['201', '202', '203', '204', '205', '206'],
                ['207', '208', '209']
            ]
        },
        {
            title: '3rd Floor',
            roomCount: 6,
            colSpan: 'col-span-1',
            columns: [['301', '302', '303', '304', '305', '306']]
        },
        {
            title: '4th Floor',
            roomCount: 6,
            colSpan: 'col-span-1',
            columns: [['401', '402', '403', '404', '405', '406']]
        },
    ];

    const [form, setForm] = useState({
        guest_name: '',
        service_type: 'Overnight',
        cooling_type: 'AC',
        check_in: selectedDate,
        check_out: new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split('T')[0],
        nights: '1',
        room_charge_khr: 60000,
        khr_cash: '',
        khr_bank: '',
        usd_bank: '',
        shift: 'Morning',
        handled_by: 'Reception',
    });

    const [refundForm, setRefundForm] = useState({
        refund_khr_cash: '',
        refund_khr_bank: '',
        shift: 'Morning',
        handled_by: 'Reception',
    });

    const handleDateChange = (newDate) => {
        router.get('/', { date: newDate }, { preserveState: true });
    };

    const formatShortDate = (dateStr) => {
        if (!dateStr) return '';
        return dateStr.split('T')[0].slice(5);
    };

    const formatServiceNotes = (notes) => {
        if (!notes) return 'Overnight AC';
        if (notes === 'Overnight') return 'Overnight AC';
        if (notes === '3-Hour' || notes === '3-Hour Service') return '3-Hour AC';
        return notes;
    };

    const openCheckIn = (room) => {
        setSelectedRoom(room);
        const defaultRate = PRICING_TABLE_KHR[room.room_type]['Overnight']['AC'];
        const inDate = selectedDate;
        const outDate = new Date(new Date(inDate).getTime() + 86400000).toISOString().split('T')[0];

        setForm({
            guest_name: nextGuestCode,
            service_type: 'Overnight',
            cooling_type: 'AC',
            nights: '1',
            check_in: inDate,
            check_out: outDate,
            room_charge_khr: defaultRate,
            khr_cash: '',
            khr_bank: '',
            usd_bank: '',
            shift: 'Morning',
            handled_by: 'Reception',
        });
        setActiveModal('addOrder');
    };

    const openCancel = (room) => {
        setSelectedRoom(room);
        setRefundForm({
            refund_khr_cash: '',
            refund_khr_bank: '',
            shift: 'Morning',
            handled_by: 'Reception',
        });
        setActiveModal('cancelOrder');
    };

    const updatePricing = (service, cooling, nightsStr) => {
        const is3H = service === '3-Hour Service';
        const n = is3H ? 1 : (parseInt(nightsStr) || 1);
        const unitRate = PRICING_TABLE_KHR[selectedRoom.room_type][service][cooling];

        let checkOut = form.check_in;
        if (!is3H) {
            const inDate = new Date(form.check_in);
            inDate.setDate(inDate.getDate() + n);
            checkOut = inDate.toISOString().split('T')[0];
        }

        setForm(prev => ({
            ...prev,
            service_type: service,
            cooling_type: cooling,
            nights: is3H ? '' : nightsStr,
            check_out: checkOut,
            room_charge_khr: unitRate * n,
        }));
    };

    const calculateTotalPaidKHR = () => {
        const kCash = parseFloat(form.khr_cash) || 0;
        const kBank = parseFloat(form.khr_bank) || 0;
        const uBank = parseFloat(form.usd_bank) || 0;
        return kCash + kBank + (uBank * (Number(exchangeRate) || 4000));
    };

    const calculateTotalRefundKHR = () => {
        const kCash = parseFloat(refundForm.refund_khr_cash) || 0;
        const kBank = parseFloat(refundForm.refund_khr_bank) || 0;
        
            {/* EXTEND STAY MODAL */}
            {activeModal === "extendStay" && selectedRoom && selectedRoom.active_booking && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-black text-slate-900">Extend Stay: Room {selectedRoom.room_number}</h3>
                                <p className="text-xs text-slate-500 font-medium">Guest: {selectedRoom.active_booking.guest_name} ({selectedRoom.active_booking.booking_code})</p>
                            </div>
                            <button
                                onClick={() => setActiveModal(null)}
                                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={submitExtendStay} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Extra Nights to Add
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    required
                                    value={extendForm.extra_nights}
                                    onChange={(e) => {
                                        const nights = Math.max(1, parseInt(e.target.value) || 1);
                                        setExtendForm({
                                            ...extendForm,
                                            extra_nights: nights,
                                            extra_charge: nights * extendForm.rate_per_night
                                        });
                                    }}
                                    className="w-full text-base font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Rate / Night (KHR)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={extendForm.rate_per_night}
                                        onChange={(e) => {
                                            const rate = parseFloat(e.target.value) || 0;
                                            setExtendForm({
                                                ...extendForm,
                                                rate_per_night: rate,
                                                extra_charge: rate * extendForm.extra_nights
                                            });
                                        }}
                                        className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Total Extra Due (KHR)
                                    </label>
                                    <div className="text-xs font-black text-slate-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                                        {extendForm.extra_charge.toLocaleString()}៛
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                                <div className="flex justify-between text-slate-600">
                                    <span>Current Check-out:</span>
                                    <span className="font-mono font-bold text-slate-800">{selectedRoom.active_booking.check_out}</span>
                                </div>
                                <div className="flex justify-between text-emerald-700 font-bold">
                                    <span>New Check-out:</span>
                                    <span className="font-mono">
                                        {(() => {
                                            const d = new Date(selectedRoom.active_booking.check_out);
                                            d.setDate(d.getDate() + extendForm.extra_nights);
                                            return d.toISOString().split("T")[0];
                                        })()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-md disabled:opacity-50"
                                >
                                    {isSubmitting ? "Extending..." : "Confirm Extension"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

    return (kCash + kBank);
    };

    const submitOrder = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        router.post('/bookings/add-order', {
            ...form,
            cooling_type: form.cooling_type,
            nights: form.service_type === '3-Hour Service' ? 1 : Math.max(1, parseInt(form.nights) || 1),
            room_id: selectedRoom.id,
        }, {
            onSuccess: () => {
                setIsSubmitting(false);
                setActiveModal(null);
            },
            onError: (errors) => {
                setIsSubmitting(false);
                alert('Check-in error: ' + Object.values(errors).join(', '));
            }
        });
    };

    
    const handleQuickFill = (type, targetTotal, targetSetter) => {
        const total = parseFloat(targetTotal) || 0;
        if (type === "cash") {
            targetSetter(prev => ({ ...prev, khr_cash: total, khr_bank: "", usd_bank: "" }));
        } else if (type === "bank_khr") {
            targetSetter(prev => ({ ...prev, khr_cash: "", khr_bank: total, usd_bank: "" }));
        } else if (type === "bank_usd") {
            const usd = (total / (Number(exchangeRate) || 4000)).toFixed(2);
            targetSetter(prev => ({ ...prev, khr_cash: "", khr_bank: "", usd_bank: usd }));
        }
    };

    
    const fillField = (type, targetTotal) => {
        const total = parseFloat(targetTotal) || 0;
        if (type === "cash") {
            setForm(prev => ({ ...prev, khr_cash: total, khr_bank: "", usd_bank: "" }));
        } else if (type === "bank_khr") {
            setForm(prev => ({ ...prev, khr_cash: "", khr_bank: total, usd_bank: "" }));
        } else if (type === "bank_usd") {
            const usd = (total / (Number(exchangeRate) || 4000)).toFixed(2);
            setForm(prev => ({ ...prev, khr_cash: "", khr_bank: "", usd_bank: usd }));
        }
    };

    const submitPayment = (e) => {
        e.preventDefault();
        const due = parseFloat(selectedRoom?.active_booking?.balance_usd || 0);
        const cashKhr = parseFloat(form.khr_cash || 0);
        const bankKhr = parseFloat(form.khr_bank || 0);
        const bankUsd = parseFloat(form.usd_bank || 0);
        const totalPaid = (cashKhr + bankKhr + (bankUsd * (exchangeRate || 4000)));

        if (totalPaid !== due) {
            const diff = due - totalPaid;
            const msg = diff > 0 
                ? `Payment (${totalPaid.toLocaleString()}៛) is less than balance due (${due.toLocaleString()}៛).\nRemaining balance due: ${diff.toLocaleString()}៛.\n\nDo you wish to confirm?`
                : `Payment (${totalPaid.toLocaleString()}៛) is greater than balance due (${due.toLocaleString()}៛).\nExcess: ${Math.abs(diff).toLocaleString()}៛.\n\nDo you wish to confirm?`;
            if (!window.confirm(msg)) return;
        }

        setIsSubmitting(true);
        router.post(`/bookings/${selectedRoom.active_booking.id}/add-payment`, {
            ...form,
        }, {
            onSuccess: () => {
                setIsSubmitting(false);
                setActiveModal(null);
            },
            onError: (errors) => {
                setIsSubmitting(false);
                alert('Payment error: ' + Object.values(errors).join(', '));
            }
        });
    };

    
    const handleOpenExtend = (room) => {
        setSelectedRoom(room);
        setActiveDropdownRoomId(null);
        const b = room.active_booking;
        const totalNights = Math.max(1, parseInt(b?.nights) || 1);
        const totalCharge = parseFloat(b?.room_charge_usd) || 80000;
        const baseRate = Math.round(totalCharge / totalNights);
        setExtendForm({
            extra_nights: 1,
            rate_per_night: baseRate,
            extra_charge: baseRate
        });
        setActiveModal("extendStay");
    };

    const submitExtendStay = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        router.post(`/bookings/${selectedRoom.active_booking.id}/extend`, {
            extra_nights: extendForm.extra_nights,
            extra_charge: extendForm.extra_charge
        }, {
            onSuccess: () => {
                setIsSubmitting(false);
                setActiveModal(null);
            },
            onError: (err) => {
                setIsSubmitting(false);
                alert("Extend error: " + Object.values(err).join(", "));
            }
        });
    };

    const submitCancel = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        router.post(`/bookings/${selectedRoom.active_booking.id}/cancel`, {
            ...refundForm,
        }, {
            onSuccess: () => {
                setIsSubmitting(false);
                setActiveModal(null);
            },
            onError: (errors) => {
                setIsSubmitting(false);
                alert('Cancel error: ' + Object.values(errors).join(', '));
            }
        });
    };

    const handleCheckout = (booking) => {
        const balance = parseFloat(booking.balance_usd) || 0;
        if (balance > 0) {
            alert(`Cannot check out! Guest still owes ${balance.toLocaleString()}៛. Please click 'Pay' and collect payment first.`);
            return;
        }

        if (confirm('Check out guest? Housekeeping will be notified on Telegram.')) {
            router.post(`/bookings/${booking.id}/checkout`, {}, {
                onError: (errors) => {
                    alert(errors.checkout || 'Failed to check out.');
                }
            });
        }
    };

    const toggleClean = (roomId) => {
        router.post(`/rooms/${roomId}/toggle-cleaning`);
    };

    const getCardTheme = (room) => {
        if (room.status === 'maintenance') {
            return {
                bg: 'bg-red-50 border-red-300',
                statusText: 'Maintenance',
                statusColor: 'text-red-700 font-bold'
            };
        }
        if (room.active_booking && room.active_booking.status === 'In House') {
            const balance = parseFloat(room.active_booking.balance_usd) || 0;
            const isOverdue = Boolean(room.active_booking.is_overdue);

            if (isOverdue) {
                return {
                    bg: 'bg-rose-100 border-rose-500 ring-2 ring-rose-500 shadow-md',
                    statusText: balance > 0 ? `⚠️ OVERDUE (Due: ${balance.toLocaleString()}៛)` : '⚠️ OVERDUE',
                    statusColor: 'text-rose-900 font-black text-xs uppercase tracking-wide'
                };
            }
            if (balance <= 0) {
                return {
                    bg: 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300',
                    statusText: '✓ Paid',
                    statusColor: 'text-emerald-700 font-black text-xs'
                };
            }
            return {
                bg: 'bg-orange-50 border-orange-400 ring-1 ring-orange-300',
                statusText: `Due: ${balance.toLocaleString()}៛`,
                statusColor: 'text-orange-700 font-black text-xs'
            };
        }
        if (!room.is_cleaned) {
            return {
                bg: 'bg-rose-50 border-rose-300',
                statusText: 'Dirty',
                statusColor: 'text-rose-600 font-bold text-xs'
            };
        }
        return {
            bg: 'bg-slate-100 border-slate-300 hover:border-slate-400',
            statusText: 'Ready',
            statusColor: 'text-slate-400 font-semibold text-xs'
        };
    };

    const renderRoomCard = (roomNumber) => {
        const room = roomMap.get(roomNumber);
        if (!room) return null;

        const theme = getCardTheme(room);
        const isOccupied = Boolean(room.active_booking && room.active_booking.status === 'In House');
        const isMaint = room.status === 'maintenance';
        const booking = room.active_booking;
        const balanceDue = booking ? (parseFloat(booking.balance_usd) || 0) : 0;
        const hasUnpaidBalance = balanceDue > 0;

        return (
            <div
                key={room.id}
                className={`p-2.5 rounded-xl border shadow-xs flex flex-col justify-between transition ${theme.bg}`}
            >
                <div className="flex justify-between items-start leading-none">
                    <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="font-black text-base text-slate-900 tracking-tight">{room.room_number}</span>
                        <span className={`text-[9px] font-black px-1 py-0.5 rounded uppercase tracking-wider ${
                            room.room_type === 'Double' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                            {room.room_type === 'Double' ? 'D' : 'S'}
                        </span>
                    </div>

                    {isOccupied && booking ? (
                        <div className="text-right flex flex-col items-end gap-0.5">
                            <span className="text-[11px] text-slate-400 font-normal leading-none">
                                {booking.guest_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal leading-none">
                                {formatServiceNotes(booking.notes)}
                            </span>
                        </div>
                    ) : (
                        <span className={`text-[11px] ${theme.statusColor}`}>
                            {theme.statusText}
                        </span>
                    )}
                </div>

                {isOccupied && booking ? (
                    <div className="flex flex-col gap-1 my-1.5 leading-none">
                        <div className={theme.statusColor}>
                            {theme.statusText}
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 font-semibold">
                            <span className="text-slate-400 font-sans text-[9px] uppercase font-bold mr-1">OUT:</span>
                            {formatShortDate(booking.check_out)}
                        </div>
                    </div>
                ) : (
                    <div className="text-[11px] text-slate-400 my-2.5 leading-none">
                        {room.is_cleaned ? 'Vacant' : 'Awaiting Clean'}
                    </div>
                )}

                <div className="flex gap-1 items-center pt-1.5 border-t border-slate-900/5">
                    {isOccupied && booking ? (
                        <>
                            <button
                                onClick={() => { setSelectedRoom(room); setActiveModal('addPayment'); }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] py-1 rounded-md cursor-pointer transition shadow-2xs"
                            >
                                Pay
                            </button>
                            <button
                                onClick={() => handleCheckout(booking)}
                                className={`flex-1 font-bold text-[10px] py-1 rounded-md transition shadow-2xs ${
                                    hasUnpaidBalance
                                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                                        : 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
                                }`}
                                title={hasUnpaidBalance ? `Cannot checkout: ${balanceDue.toLocaleString()}៛ unpaid` : 'Check out'}
                            >
                                Out
                            </button>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDropdownRoomId(activeDropdownRoomId === room.id ? null : room.id);
                                    }}
                                    className="px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs py-1 rounded-md cursor-pointer transition shadow-2xs"
                                    title="More Options"
                                >
                                    •••
                                </button>
                                {activeDropdownRoomId === room.id && (
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 bottom-full mb-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 flex flex-col text-left overflow-hidden"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleOpenExtend(room)}
                                            className="px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-1.5 transition text-left cursor-pointer"
                                        >
                                            <span>📅</span> Extend Order
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveDropdownRoomId(null);
                                                openCancel(room);
                                            }}
                                            className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition text-left cursor-pointer border-t border-slate-100"
                                        >
                                            <span>✕</span> Cancel Order
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : !isMaint ? (
                        <>
                            <button
                                onClick={() => openCheckIn(room)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1 rounded-md cursor-pointer transition shadow-2xs"
                            >
                                Check In
                            </button>
                            <button
                                onClick={() => toggleClean(room.id)}
                                className={`text-[10px] px-2 py-1 rounded-md border transition cursor-pointer ${
                                    room.is_cleaned
                                        ? 'border-slate-300 text-slate-500 bg-white hover:bg-slate-50'
                                        : 'border-rose-400 text-rose-700 bg-rose-100 hover:bg-rose-200 font-bold'
                                }`}
                                title={room.is_cleaned ? 'Mark as dirty' : 'Mark as clean'}
                            >
                                {room.is_cleaned ? '✓' : 'Clean'}
                            </button>
                        </>
                    ) : null}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-200/60 text-slate-900 flex flex-col font-sans">
            <Navbar activeTab="frontdesk" />

            <div className="p-4 flex-1 flex flex-col gap-3 max-w-[1680px] w-full mx-auto">
                {/* Top Control Bar */}
                <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Viewing Date:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="border border-slate-300 rounded px-2.5 py-1 text-xs font-bold bg-slate-50 text-slate-800 outline-none focus:bg-white cursor-pointer"
                        />
                        {!isToday ? (
                            <button
                                onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
                                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded shadow cursor-pointer transition"
                            >
                                Jump to Today
                            </button>
                        ) : (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                                Live Today
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <span className="bg-slate-100 border px-2.5 py-1 rounded font-bold text-slate-600">
                            Total: <strong className="text-slate-900">{kpi.total_rooms}</strong>
                        </span>
                        <span className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded font-bold text-amber-800">
                            Occupied: <strong>{kpi.occupied}</strong>
                        </span>
                        <span className="bg-slate-50 border px-2.5 py-1 rounded font-bold text-slate-600">
                            Vacant: <strong>{kpi.vacant}</strong>
                        </span>
                        <span className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded font-bold text-rose-700">
                            Dirty: <strong>{kpi.dirty}</strong>
                        </span>
                        <div className="bg-slate-900 text-white px-3 py-1 rounded font-mono font-bold">
                            Drawer: {cashDrawer.khr_cash.toLocaleString()}៛
                        </div>
                    </div>
                </div>

                {/* 6-Column Equalizer Grid */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start flex-1">
                    {floorSections.map((section, idx) => (
                        <div
                            key={idx}
                            className={`${section.colSpan} bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col gap-2.5`}
                        >
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2 px-1">
                                <span className="font-black text-xs text-slate-700 uppercase tracking-wide">{section.title}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                                    {section.roomCount} Rooms
                                </span>
                            </div>

                            <div className={`grid gap-2 ${section.columns.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {section.columns.map((colGroup, gIdx) => (
                                    <div key={gIdx} className="flex flex-col gap-2">
                                        {colGroup.map(roomNum => renderRoomCard(roomNum))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Check-In Modal */}
            {activeModal === 'addOrder' && selectedRoom && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-base text-slate-800">
                                Check In: Room {selectedRoom.room_number} <span className="font-semibold text-xs text-slate-500">({selectedRoom.room_type})</span>
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-black cursor-pointer font-bold">✕</button>
                        </div>
                        <form onSubmit={submitOrder} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Guest Code / Name</label>
                                <input
                                    className="w-full border rounded px-3 py-1.5 bg-slate-50 focus:bg-white font-medium"
                                    value={form.guest_name}
                                    onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                                    placeholder="e.g. G001"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Service Type</label>
                                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded border border-slate-300">
                                        <button
                                            type="button"
                                            onClick={() => updatePricing('Overnight', form.cooling_type, form.nights || '1')}
                                            className={`py-1 text-center font-bold rounded transition cursor-pointer ${
                                                form.service_type === 'Overnight' 
                                                    ? 'bg-slate-900 text-white shadow-xs' 
                                                    : 'text-slate-600 hover:text-black'
                                            }`}
                                        >
                                            Overnight
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updatePricing('3-Hour Service', form.cooling_type, '')}
                                            className={`py-1 text-center font-bold rounded transition cursor-pointer ${
                                                form.service_type === '3-Hour Service' 
                                                    ? 'bg-slate-900 text-white shadow-xs' 
                                                    : 'text-slate-600 hover:text-black'
                                            }`}
                                        >
                                            3-Hour
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Cooling</label>
                                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded border border-slate-300">
                                        <button
                                            type="button"
                                            onClick={() => updatePricing(form.service_type, 'AC', form.nights)}
                                            className={`py-1 text-center font-bold rounded transition cursor-pointer ${
                                                form.cooling_type === 'AC' 
                                                    ? 'bg-blue-600 text-white shadow-xs' 
                                                    : 'text-slate-600 hover:text-black'
                                            }`}
                                        >
                                            ❄️ AC
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updatePricing(form.service_type, 'Fan', form.nights)}
                                            className={`py-1 text-center font-bold rounded transition cursor-pointer ${
                                                form.cooling_type === 'Fan' 
                                                    ? 'bg-emerald-600 text-white shadow-xs' 
                                                    : 'text-slate-600 hover:text-black'
                                            }`}
                                        >
                                            🌀 Fan
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">
                                    Nights {form.service_type === '3-Hour Service' && <span className="font-normal text-slate-400">(N/A for 3-Hour)</span>}
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    disabled={form.service_type === '3-Hour Service'}
                                    className={`w-full border rounded px-3 py-1.5 font-bold ${
                                        form.service_type === '3-Hour Service' 
                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                            : 'bg-slate-50 focus:bg-white text-slate-900'
                                    }`}
                                    value={form.service_type === '3-Hour Service' ? '' : form.nights}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        updatePricing(form.service_type, form.cooling_type, val);
                                    }}
                                    placeholder={form.service_type === '3-Hour Service' ? '—' : '1'}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Check In</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded px-2 py-1 bg-slate-50"
                                        value={form.check_in}
                                        onChange={(e) => {
                                            const newIn = e.target.value;
                                            const n = parseInt(form.nights) || 1;
                                            const inDate = new Date(newIn);
                                            inDate.setDate(inDate.getDate() + n);
                                            setForm(prev => ({
                                                ...prev,
                                                check_in: newIn,
                                                check_out: form.service_type === '3-Hour Service' ? newIn : inDate.toISOString().split('T')[0]
                                            }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Check Out (Auto)</label>
                                    <input
                                        type="date"
                                        disabled
                                        readOnly
                                        className="w-full border border-slate-200 rounded px-2 py-1 bg-slate-100 text-slate-500 cursor-not-allowed font-medium select-none"
                                        value={form.check_out}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Total Charge (KHR)</label>
                                <input
                                    type="number"
                                    step="500"
                                    className="w-full border rounded px-3 py-1.5 font-black text-sm bg-slate-50 text-slate-900"
                                    value={form.room_charge_khr}
                                    onChange={(e) => setForm({ ...form, room_charge_khr: e.target.value })}
                                />
                            </div>

                            <div className="border rounded p-2.5 bg-slate-50 space-y-2">
                                <span className="font-extrabold text-[10px] uppercase text-slate-500 block">Payment Collected Now</span>

                                <div>
                                    <label className="text-[10px] text-slate-700 font-bold block mb-0.5">Physical Cash (KHR only)</label>
                                    <div className="flex gap-1.5">
                                        <input
                                            type="number"
                                            step="500"
                                            className="w-full border rounded px-2.5 py-1.5 bg-white font-semibold text-slate-900"
                                            value={form.khr_cash}
                                            onChange={(e) => setForm({ ...form, khr_cash: e.target.value })}
                                            placeholder="0 KHR"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fillField("cash", form.room_charge_khr || form.total_charge)}
                                            className="px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded cursor-pointer transition border border-emerald-300 shadow-2xs"
                                        >
                                            Fill
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-1 border-t border-slate-200">
                                    <span className="text-[10px] text-blue-700 font-black uppercase block mb-1">ABA Bank (KHR / USD)</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Bank KHR</label>
                                            <div className="flex gap-1">
                                                <input
                                                    type="number"
                                                    step="500"
                                                    className="w-full border rounded px-2 py-1 bg-white font-semibold text-blue-900"
                                                    value={form.khr_bank}
                                                    onChange={(e) => setForm({ ...form, khr_bank: e.target.value })}
                                                    placeholder="0 KHR"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fillField("bank_khr", form.room_charge_khr || form.total_charge)}
                                                    className="px-2 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold rounded border border-blue-300 cursor-pointer shadow-2xs"
                                                >
                                                    Fill
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Bank USD ($1 = ${exchangeRate}៛)</label>
                                            <div className="flex gap-1">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-full border rounded px-2 py-1 bg-white font-semibold text-blue-900"
                                                    value={form.usd_bank}
                                                    onChange={(e) => setForm({ ...form, usd_bank: e.target.value })}
                                                    placeholder="$0.00"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fillField("bank_usd", form.room_charge_khr || form.total_charge)}
                                                    className="px-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] font-bold rounded border border-indigo-300 cursor-pointer shadow-2xs"
                                                >
                                                    Fill
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right font-black text-xs pt-1 text-slate-800">
                                    Total Paid Equivalent: {calculateTotalPaidKHR().toLocaleString()} KHR
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full font-black py-2 rounded shadow transition ${
                                    isSubmitting ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                }`}
                            >
                                {isSubmitting ? 'Processing Check-In...' : 'Confirm Check-In'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {activeModal === "addPayment" && selectedRoom && selectedRoom.active_booking && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-base text-slate-800">Add Payment - Room {selectedRoom.room_number}</h3>
                            <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-black cursor-pointer font-bold">✕</button>
                        </div>
                        <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
                            Guest: <strong>{selectedRoom.active_booking.guest_name}</strong> | Balance Due: <strong className="text-orange-600">{Number(selectedRoom.active_booking.balance_usd).toLocaleString()} KHR</strong>
                        </div>
                        <form onSubmit={submitPayment} className="space-y-3 text-xs">
                            <div className="border rounded p-2.5 bg-slate-50 space-y-2">
                                <span className="font-extrabold text-[10px] uppercase text-slate-500 block">Payment Collected</span>

                                <div>
                                    <label className="text-[10px] text-slate-700 font-bold block mb-0.5">Physical Cash (KHR only)</label>
                                    <div className="flex gap-1.5">
                                        <input
                                            type="number"
                                            step="500"
                                            className="w-full border rounded px-2.5 py-1.5 bg-white font-semibold text-slate-900"
                                            value={form.khr_cash}
                                            onChange={(e) => setForm({ ...form, khr_cash: e.target.value })}
                                            placeholder="0 KHR"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fillField("cash", selectedRoom?.active_booking?.balance_usd)}
                                            className="px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded cursor-pointer transition border border-emerald-300 shadow-2xs"
                                        >
                                            Fill
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-1 border-t border-slate-200">
                                    <span className="text-[10px] text-blue-700 font-black uppercase block mb-1">ABA Bank (KHR / USD)</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Bank KHR</label>
                                            <div className="flex gap-1">
                                                <input
                                                    type="number"
                                                    step="500"
                                                    className="w-full border rounded px-2 py-1 bg-white font-semibold text-blue-900"
                                                    value={form.khr_bank}
                                                    onChange={(e) => setForm({ ...form, khr_bank: e.target.value })}
                                                    placeholder="0 KHR"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fillField("bank_khr", selectedRoom?.active_booking?.balance_usd)}
                                                    className="px-2 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold rounded border border-blue-300 cursor-pointer shadow-2xs"
                                                >
                                                    Fill
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-slate-500 font-bold block mb-0.5">Bank USD ($1 = ${exchangeRate}៛)</label>
                                            <div className="flex gap-1">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-full border rounded px-2 py-1 bg-white font-semibold text-blue-900"
                                                    value={form.usd_bank}
                                                    onChange={(e) => setForm({ ...form, usd_bank: e.target.value })}
                                                    placeholder="$0.00"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fillField("bank_usd", selectedRoom?.active_booking?.balance_usd)}
                                                    className="px-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] font-bold rounded border border-indigo-300 cursor-pointer shadow-2xs"
                                                >
                                                    Fill
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right font-black text-xs pt-1 text-slate-800">
                                    Total Paid Equivalent: {calculateTotalPaidKHR().toLocaleString()} KHR
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full font-black py-2 rounded shadow transition ${
                                    isSubmitting ? "bg-slate-400 text-white cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                }`}
                            >
                                {isSubmitting ? "Recording Payment..." : "Record Payment"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
{/* EXTEND STAY MODAL */}
            {activeModal === "extendStay" && selectedRoom && selectedRoom.active_booking && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <div>
                                <h3 className="font-black text-base text-slate-800">Extend Stay - Room {selectedRoom.room_number}</h3>
                                <p className="text-[11px] text-slate-500 font-medium">Guest: {selectedRoom.active_booking.guest_name} ({selectedRoom.active_booking.booking_code})</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                className="text-slate-400 hover:text-black cursor-pointer font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={submitExtendStay} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Extra Nights to Add
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    required
                                    value={extendForm.extra_nights}
                                    onChange={(e) => {
                                        const nights = Math.max(1, parseInt(e.target.value) || 1);
                                        setExtendForm(prev => ({
                                            ...prev,
                                            extra_nights: nights,
                                            extra_charge: nights * prev.rate_per_night
                                        }));
                                    }}
                                    className="w-full text-base font-bold bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                                        Rate / Night (KHR)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={extendForm.rate_per_night}
                                        onChange={(e) => {
                                            const rate = parseFloat(e.target.value) || 0;
                                            setExtendForm(prev => ({
                                                ...prev,
                                                rate_per_night: rate,
                                                extra_charge: rate * prev.extra_nights
                                            }));
                                        }}
                                        className="w-full text-xs font-bold bg-slate-50 border rounded-lg px-2.5 py-1.5 text-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                                        Total Extra Due (KHR)
                                    </label>
                                    <div className="text-xs font-black text-slate-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                                        {(extendForm.extra_charge || 0).toLocaleString()}៛
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs space-y-1">
                                <div className="flex justify-between text-slate-600">
                                    <span>Current Check-out:</span>
                                    <span className="font-mono font-bold text-slate-800">{selectedRoom.active_booking.check_out}</span>
                                </div>
                                <div className="flex justify-between text-emerald-700 font-bold">
                                    <span>New Check-out:</span>
                                    <span className="font-mono">
                                        {(() => {
                                            const d = new Date(selectedRoom.active_booking.check_out);
                                            d.setDate(d.getDate() + (parseInt(extendForm.extra_nights) || 1));
                                            return d.toISOString().split("T")[0];
                                        })()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition cursor-pointer shadow disabled:opacity-50"
                                >
                                    {isSubmitting ? "Extending..." : "Confirm Extension"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {activeModal === 'cancelOrder' && selectedRoom && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-base text-rose-600">Cancel Booking - Room {selectedRoom.room_number}</h3>
                            <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-black cursor-pointer font-bold">✕</button>
                        </div>
                        <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
                            Guest: <strong>{selectedRoom.active_booking.guest_name}</strong> | Total Paid: <strong className="text-emerald-600">{Number(selectedRoom.active_booking.total_paid_usd).toLocaleString()} KHR</strong>
                        </div>
                        <form onSubmit={submitCancel} className="space-y-3 text-xs">
                            <div className="border border-slate-300 rounded-lg p-3 bg-white space-y-3">
                                <span className="font-extrabold text-[10px] tracking-wider text-slate-500 uppercase block">REFUND RETURNED NOW</span>

                                {/* Physical Cash */}
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Physical Cash (KHR only)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="w-full border rounded px-2.5 py-1.5 font-bold"
                                            value={refundForm?.refund_khr_cash ?? ""}
                                            onChange={(e) => setRefundForm(prev => ({ ...prev, refund_khr_cash: Number(e.target.value) }))}
                                            placeholder="0 KHR"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const paid = Number(selectedRoom?.active_booking?.total_paid_usd || 0);
                                                setRefundForm(prev => ({ ...prev, refund_khr_cash: paid, refund_khr_bank: 0, refund_usd_bank: 0 }));
                                            }}
                                            className="px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded cursor-pointer transition text-xs"
                                        >
                                            Fill
                                        </button>
                                    </div>
                                </div>

                                {/* ABA Bank */}
                                <div className="border-t pt-2 space-y-2">
                                    <span className="block text-[11px] font-bold text-blue-700">ABA BANK (KHR / USD)</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Bank KHR</label>
                                            <div className="flex gap-1.5">
                                                <input
                                                    type="number"
                                                    className="w-full border rounded px-2 py-1.5 font-bold"
                                                    value={refundForm?.refund_khr_bank ?? ""}
                                                    onChange={(e) => setRefundForm(prev => ({ ...prev, refund_khr_bank: Number(e.target.value) }))}
                                                    placeholder="0 KHR"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const paid = Number(selectedRoom?.active_booking?.total_paid_usd || 0);
                                                        setRefundForm(prev => ({ ...prev, refund_khr_bank: paid, refund_khr_cash: 0, refund_usd_bank: 0 }));
                                                    }}
                                                    className="px-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded cursor-pointer transition text-xs"
                                                >
                                                    Fill
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Bank USD ($1 = {Number(exchangeRate || 4000).toLocaleString()}៛)</label>
                                            <div className="flex gap-1.5">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-full border rounded px-2 py-1.5 font-bold"
                                                    value={refundForm?.refund_usd_bank ?? ""}
                                                    onChange={(e) => setRefundForm(prev => ({ ...prev, refund_usd_bank: Number(e.target.value) }))}
                                                    placeholder="$0.00"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const paid = Number(selectedRoom?.active_booking?.total_paid_usd || 0);
                                                        const rate = Number(exchangeRate) || 4000;
                                                        setRefundForm(prev => ({ ...prev, refund_usd_bank: parseFloat((paid / rate).toFixed(2)), refund_khr_cash: 0, refund_khr_bank: 0 }));
                                                    }}
                                                    className="px-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded cursor-pointer transition text-xs"
                                                >
                                                    Fill
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right font-black text-xs pt-1 text-slate-800">
                                    Total Refund: {(
                                        Number(refundForm?.refund_khr_cash || 0) +
                                        Number(refundForm?.refund_khr_bank || 0) +
                                        (Number(refundForm?.refund_usd_bank || 0) * (Number(exchangeRate) || 4000))
                                    ).toLocaleString()} KHR
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg cursor-pointer transition shadow"
                            >
                                {isSubmitting ? "Processing..." : "Confirm Cancellation & Process Refund"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

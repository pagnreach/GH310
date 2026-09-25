import React, { useState } from 'react';
import Navbar from '@/Components/Navbar';
import { router } from '@inertiajs/react';

export default function Setup({
    pricingMatrix = {},
    exchangeRate = 4000,
    telegramConfig = {},
    expenseCategories = [],
    accountsList = [],
    depositSources = [],
    transferTypes = []
}) {
    const [activeSection, setActiveSection] = useState('PRICING');
    const [pricing, setPricing] = useState(pricingMatrix);
    const [rate, setRate] = useState(exchangeRate);
    const [telegram, setTelegram] = useState(telegramConfig);
    const [categories, setCategories] = useState(expenseCategories);
    const [newCategory, setNewCategory] = useState('');

    const [statusMessage, setStatusMessage] = useState(null);

    const handlePricingChange = (roomType, service, cooling, val) => {
        setPricing(prev => ({
            ...prev,
            [roomType]: {
                ...prev[roomType],
                [service]: {
                    ...prev[roomType][service],
                    [cooling]: parseFloat(val) || 0
                }
            }
        }));
    };

    const savePricing = (e) => {
        e.preventDefault();
        router.post('/setup/pricing', { pricing }, {
            onSuccess: () => {
                setStatusMessage('Room pricing saved successfully.');
                setTimeout(() => setStatusMessage(null), 3000);
            }
        });
    };

    const saveRate = (e) => {
        e.preventDefault();
        router.post('/setup/rate', { rate }, {
            onSuccess: () => {
                setStatusMessage('Exchange rate saved.');
                setTimeout(() => setStatusMessage(null), 3000);
            }
        });
    };

    const saveTelegram = (e) => {
        e.preventDefault();
        router.post('/setup/telegram', telegram, {
            onSuccess: () => {
                setStatusMessage('Telegram settings saved.');
                setTimeout(() => setStatusMessage(null), 3000);
            }
        });
    };

    const sendTestPing = (chatId, target) => {
        if (!chatId) {
            alert(`Please enter a Chat ID for ${target} first.`);
            return;
        }
        router.post('/setup/telegram/test', { chat_id: chatId, target }, {
            onSuccess: () => alert(`Test message successfully sent to ${target}!`),
            onError: (errs) => alert('Test failed: ' + Object.values(errs).join(' '))
        });
    };

    const addCategory = (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        const updated = [...categories, newCategory.trim()];
        setCategories(updated);
        setNewCategory('');
        router.post('/setup/dropdowns', { expense_categories: updated });
    };

    const removeCategory = (index) => {
        const updated = categories.filter((_, i) => i !== index);
        setCategories(updated);
        router.post('/setup/dropdowns', { expense_categories: updated });
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            <Navbar activeTab="setup" />

            <main className="p-4 flex-1 flex flex-col gap-4 max-w-[1400px] w-full mx-auto">
                <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs flex justify-between items-center">
                    <div>
                        <h2 className="text-base font-black text-slate-800">System Setup & Configuration</h2>
                        <span className="text-xs text-slate-500 font-medium">Control room pricing, Telegram channels, exchange rates, and master dropdowns</span>
                    </div>

                    {statusMessage && (
                        <div className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded border border-emerald-200 animate-fade">
                            ✓ {statusMessage}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    {/* Sidebar Nav */}
                    <div className="bg-white p-2 rounded-xl border border-slate-300 shadow-xs flex flex-col gap-1 text-xs font-bold">
                        {[
                            { id: 'PRICING', label: '💵 Room Pricing Matrix', desc: 'Single & Double rates' },
                            { id: 'TELEGRAM', label: '✈️ Telegram & Groups', desc: 'Ops & Housekeeping pings' },
                            { id: 'CURRENCY', label: '💱 Currency & Exchange', desc: 'Fixed KHR / USD rate' },
                            { id: 'CATEGORIES', label: '🏷️ Expense Categories', desc: 'Ledger dropdown options' },
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setActiveSection(s.id)}
                                className={`p-2.5 rounded-lg text-left transition cursor-pointer ${
                                    activeSection === s.id
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-black'
                                }`}
                            >
                                <div className="text-xs font-black">{s.label}</div>
                                <div className={`text-[10px] ${activeSection === s.id ? 'text-slate-300' : 'text-slate-400'}`}>
                                    {s.desc}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Content Panels */}
                    <div className="md:col-span-3 bg-white p-5 rounded-xl border border-slate-300 shadow-xs">
                        {/* 1. PRICING MATRIX */}
                        {activeSection === 'PRICING' && (
                            <form onSubmit={savePricing} className="space-y-5">
                                <div>
                                    <h3 className="font-black text-sm text-slate-900">Room Pricing Matrix (KHR)</h3>
                                    <p className="text-xs text-slate-500">Auto-populates rates during Check-In based on stay duration and cooling type.</p>
                                </div>

                                {['Single', 'Double'].map((type) => (
                                    <div key={type} className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
                                        <h4 className="font-black text-xs uppercase tracking-wide text-slate-800 mb-3 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            {type} Room Rates
                                        </h4>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-600 mb-1">Overnight (AC)</label>
                                                <input
                                                    type="number"
                                                    step="500"
                                                    className="w-full border rounded px-2.5 py-1.5 bg-white font-bold text-slate-900"
                                                    value={pricing?.[type]?.['Overnight']?.['AC'] || ''}
                                                    onChange={(e) => handlePricingChange(type, 'Overnight', 'AC', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-600 mb-1">Overnight (Fan)</label>
                                                <input
                                                    type="number"
                                                    step="500"
                                                    className="w-full border rounded px-2.5 py-1.5 bg-white font-bold text-slate-900"
                                                    value={pricing?.[type]?.['Overnight']?.['Fan'] || ''}
                                                    onChange={(e) => handlePricingChange(type, 'Overnight', 'Fan', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-600 mb-1">3-Hour (AC)</label>
                                                <input
                                                    type="number"
                                                    step="500"
                                                    className="w-full border rounded px-2.5 py-1.5 bg-white font-bold text-slate-900"
                                                    value={pricing?.[type]?.['3-Hour Service']?.['AC'] || ''}
                                                    onChange={(e) => handlePricingChange(type, '3-Hour Service', 'AC', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-600 mb-1">3-Hour (Fan)</label>
                                                <input
                                                    type="number"
                                                    step="500"
                                                    className="w-full border rounded px-2.5 py-1.5 bg-white font-bold text-slate-900"
                                                    value={pricing?.[type]?.['3-Hour Service']?.['Fan'] || ''}
                                                    onChange={(e) => handlePricingChange(type, '3-Hour Service', 'Fan', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="submit"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition shadow"
                                >
                                    Save Pricing Matrix
                                </button>
                            </form>
                        )}

                        {/* 2. TELEGRAM SETTINGS */}
                        {activeSection === 'TELEGRAM' && (
                            <form onSubmit={saveTelegram} className="space-y-4">
                                <div>
                                    <h3 className="font-black text-sm text-slate-900">Telegram Bot & Channel Config</h3>
                                    <p className="text-xs text-slate-500">Configure bot dispatch targets and test connections.</p>
                                </div>

                                <div className="space-y-3 text-xs">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">Bot API Token</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded px-3 py-1.5 bg-slate-50 font-mono text-xs"
                                            value={telegram.bot_token || ''}
                                            onChange={(e) => setTelegram({ ...telegram, bot_token: e.target.value })}
                                            placeholder="e.g. 7859345228:AAH..."
                                        />
                                    </div>

                                    {/* Operations Group */}
                                    <div className="border p-3 rounded-lg bg-slate-50/50 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-800">Operations Group (Check-in & Payments)</span>
                                            <button
                                                type="button"
                                                onClick={() => sendTestPing(telegram.operations_chat_id, 'Operations Group')}
                                                className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded cursor-pointer"
                                            >
                                                Send Test Ping
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full border rounded px-3 py-1.5 bg-white font-mono text-xs"
                                            value={telegram.operations_chat_id || ''}
                                            onChange={(e) => setTelegram({ ...telegram, operations_chat_id: e.target.value })}
                                            placeholder="-100xxxxxxxxxx"
                                        />
                                    </div>

                                    {/* Housekeeping Group */}
                                    <div className="border p-3 rounded-lg bg-slate-50/50 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-800">Housekeeping Group (Cleaning Tasks)</span>
                                            <button
                                                type="button"
                                                onClick={() => sendTestPing(telegram.housekeeping_chat_id, 'Housekeeping Group')}
                                                className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded cursor-pointer"
                                            >
                                                Send Test Ping
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full border rounded px-3 py-1.5 bg-white font-mono text-xs"
                                            value={telegram.housekeeping_chat_id || ''}
                                            onChange={(e) => setTelegram({ ...telegram, housekeeping_chat_id: e.target.value })}
                                            placeholder="-100xxxxxxxxxx"
                                        />
                                    </div>

                                    {/* Alert Toggles */}
                                    <div className="pt-2 border-t space-y-1.5">
                                        <span className="font-bold text-slate-700 block text-[11px] uppercase">Alert Triggers</span>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={telegram.checkin_alert ?? true}
                                                onChange={(e) => setTelegram({ ...telegram, checkin_alert: e.target.checked })}
                                                className="rounded text-emerald-600"
                                            />
                                            <span>Send Check-in alerts to Operations</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={telegram.payment_alert ?? true}
                                                onChange={(e) => setTelegram({ ...telegram, payment_alert: e.target.checked })}
                                                className="rounded text-emerald-600"
                                            />
                                            <span>Send Additional Payment alerts to Operations</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={telegram.checkout_alert ?? true}
                                                onChange={(e) => setTelegram({ ...telegram, checkout_alert: e.target.checked })}
                                                className="rounded text-emerald-600"
                                            />
                                            <span>Dispatch cleaning task on Checkout</span>
                                        </label>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition shadow"
                                >
                                    Save Telegram Config
                                </button>
                            </form>
                        )}

                        {/* 3. CURRENCY SETTINGS */}
                        {activeSection === 'CURRENCY' && (
                            <form onSubmit={saveRate} className="space-y-4">
                                <div>
                                    <h3 className="font-black text-sm text-slate-900">Exchange Rate</h3>
                                    <p className="text-xs text-slate-500">Defines the fixed conversion rate for $1 USD across all calculations.</p>
                                </div>

                                <div className="max-w-xs space-y-2 text-xs">
                                    <label className="block font-bold text-slate-700">1 USD = (KHR)</label>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-slate-500">$1.00 =</span>
                                        <input
                                            type="number"
                                            step="50"
                                            className="border rounded px-3 py-1.5 font-black text-sm w-36 bg-slate-50"
                                            value={rate}
                                            onChange={(e) => setRate(e.target.value)}
                                        />
                                        <span className="font-black text-slate-700">KHR</span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition shadow"
                                >
                                    Save Exchange Rate
                                </button>
                            </form>
                        )}

                        {/* 4. EXPENSE CATEGORIES */}
                        {activeSection === 'CATEGORIES' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-black text-sm text-slate-900">Expense Categories</h3>
                                    <p className="text-xs text-slate-500">Manage categories available in the "+ Expense" dropdown.</p>
                                </div>

                                <form onSubmit={addCategory} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add new category (e.g. Laundry, Staff Food)..."
                                        className="border rounded px-3 py-1.5 text-xs w-72 bg-slate-50"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                                    >
                                        + Add
                                    </button>
                                </form>

                                <div className="flex flex-wrap gap-2 pt-2">
                                    {categories.map((c, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300"
                                        >
                                            <span>{c}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeCategory(idx)}
                                                className="text-slate-400 hover:text-rose-600 font-black cursor-pointer text-xs ml-1"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

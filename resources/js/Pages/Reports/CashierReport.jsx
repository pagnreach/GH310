import React, { useState, useMemo } from 'react';
import Navbar from '@/Components/Navbar';
import { router } from '@inertiajs/react';

export default function CashierReport({
    expenses = [],
    preset = 'MONTH',
    customDate,
    customMonth,
    periodExpensesKHR = 0,
    currentCashDrawer = 0
}) {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultMonth = todayStr.slice(0, 7);

    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [modalError, setModalError] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [methodFilter, setMethodFilter] = useState('ALL');
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    const EXPENSE_CATEGORIES = ['Salary', 'Utilities', 'Supplies', 'Maintenance', 'Cleaning', 'Commission', 'Rent/Owner', 'Bank Fee', 'Other Expense', 'Monthly Expense'];

    // Default ACLEDA, blank category, dual currency
    const [expenseForm, setExpenseForm] = useState({
        title: '',
        amount_khr: '',
        amount_usd: '',
        expense_category: '',
        payment_method: 'ACLEDA Bank',
        paid_by: 'Reception',
        shift: 'Morning',
        notes: '',
    });

    const [withdrawForm, setWithdrawForm] = useState({
        khr_amount: currentCashDrawer > 0 ? currentCashDrawer : '',
        notes: 'Admin cash drawer withdrawal',
    });

    const openWithdrawModal = () => {
        setWithdrawForm({
            khr_amount: currentCashDrawer > 0 ? currentCashDrawer : '',
            notes: 'Admin cash drawer withdrawal',
        });
        setIsWithdrawModalOpen(true);
    };

    const handleFilterChange = (newPreset, params = {}) => {
        router.get('/cashier-report', {
            preset: newPreset,
            date: params.date || customDate,
            month: params.month || customMonth,
        }, { preserveState: true });
    };

    const submitExpense = (e) => {
        e.preventDefault();
        setModalError(null);
        if (!expenseForm.expense_category) {
            const err = "Please select an Expense Category.";
            setModalError(err);
            alert(err);
            return;
        }

        router.post("/expenses", expenseForm, {
            onSuccess: () => {
                setIsExpenseModalOpen(false);
                setExpenseForm({
                    title: "",
                    amount_khr: "",
                    amount_usd: "",
                    expense_category: "",
                    payment_method: "ACLEDA Bank",
                    paid_by: "Reception",
                    shift: "Morning",
                    notes: "",
                });
            },
            onError: (errs) => {
                const msg = Object.values(errs).join(" ");
                setModalError(msg);
                alert(msg);
            }
        });
    };

    const submitWithdrawal = (e) => {
        e.preventDefault();
        router.post('/cashier/withdraw', withdrawForm, {
            onSuccess: () => {
                setIsWithdrawModalOpen(false);
            }
        });
    };

    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const sortIndicator = (key) => {
        if (sortConfig.key !== key) return <span className="text-slate-400 text-[10px] ml-1.5 inline-block">⇅</span>;
        return <span className="text-emerald-400 font-black text-[10px] ml-1.5 inline-block">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    const processedExpenses = useMemo(() => {
        return expenses
            .filter((exp) => {
                if (categoryFilter !== 'ALL' && exp.expense_category !== categoryFilter) return false;
                if (methodFilter !== 'ALL' && exp.payment_method !== methodFilter) return false;
                if (searchQuery.trim() !== '') {
                    const q = searchQuery.toLowerCase();
                    return (
                        exp.title.toLowerCase().includes(q) ||
                        (exp.paid_by && exp.paid_by.toLowerCase().includes(q)) ||
                        (exp.notes && exp.notes.toLowerCase().includes(q)) ||
                        exp.expense_category.toLowerCase().includes(q)
                    );
                }
                return true;
            })
            .sort((a, b) => {
                let aVal, bVal;
                switch (sortConfig.key) {
                    case 'title':
                        aVal = a.title || '';
                        bVal = b.title || '';
                        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    case 'category':
                        aVal = a.expense_category || '';
                        bVal = b.expense_category || '';
                        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    case 'amount':
                        aVal = Number(a.amount_khr) || 0;
                        bVal = Number(b.amount_khr) || 0;
                        break;
                    case 'method':
                        aVal = a.payment_method || '';
                        bVal = b.payment_method || '';
                        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    case 'paid_by':
                        aVal = a.paid_by || '';
                        bVal = b.paid_by || '';
                        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    case 'created_at':
                    default:
                        aVal = new Date(a.created_at).getTime();
                        bVal = new Date(b.created_at).getTime();
                        break;
                }
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            });
    }, [expenses, searchQuery, categoryFilter, methodFilter, sortConfig]);

    const expKhr = parseFloat(expenseForm.amount_khr) || 0;
    const expUsd = parseFloat(expenseForm.amount_usd) || 0;
    const totalExpKhrEq = expKhr + (expUsd * 4000);

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            <Navbar activeTab="cashier" />

            <main className="p-4 flex-1 flex flex-col gap-4 max-w-[1720px] w-full mx-auto">
                <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs flex flex-wrap justify-between items-center gap-3">
                    <div>
                        <h2 className="text-base font-black text-slate-800">Cashier Report & Expense Ledger</h2>
                        <span className="text-xs text-slate-500 font-medium">Record staff expenses, audit drawer balance, and manage admin cash withdrawals</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {preset === 'TODAY' && (
                            <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-300 rounded-lg px-2.5 py-1">
                                <span className="text-[10px] font-black text-emerald-800 uppercase">Day:</span>
                                <input
                                    type="date"
                                    value={customDate || todayStr}
                                    onChange={(e) => handleFilterChange('TODAY', { date: e.target.value })}
                                    className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                />
                                {customDate !== todayStr && (
                                    <button
                                        onClick={() => handleFilterChange('TODAY', { date: todayStr })}
                                        className="text-[10px] bg-emerald-200 hover:bg-emerald-300 text-emerald-900 px-1 rounded font-bold ml-1 cursor-pointer"
                                    >
                                        Today
                                    </button>
                                )}
                            </div>
                        )}

                        {preset === 'MONTH' && (
                            <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-300 rounded-lg px-2.5 py-1">
                                <span className="text-[10px] font-black text-emerald-800 uppercase">Month:</span>
                                <input
                                    type="month"
                                    value={customMonth || defaultMonth}
                                    onChange={(e) => handleFilterChange('MONTH', { month: e.target.value })}
                                    className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                />
                                {customMonth !== defaultMonth && (
                                    <button
                                        onClick={() => handleFilterChange('MONTH', { month: defaultMonth })}
                                        className="text-[10px] bg-emerald-200 hover:bg-emerald-300 text-emerald-900 px-1 rounded font-bold ml-1 cursor-pointer"
                                    >
                                        This Month
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                            {[
                                { id: 'TODAY', label: 'Today' },
                                { id: 'MONTH', label: 'Month' },
                                { id: 'ALL', label: 'All Time' },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => handleFilterChange(p.id)}
                                    className={`px-3 py-1 rounded-md transition cursor-pointer ${
                                        preset === p.id
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={openWithdrawModal}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
                        >
                            <span>💸</span>
                            <span>Withdraw Cash</span>
                        </button>

                        <button
                            onClick={() => setIsExpenseModalOpen(true)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
                        >
                            <span>+</span>
                            <span>Add Expense</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs border-l-4 border-l-emerald-500 flex justify-between items-center">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Current Cash (Drawer)</span>
                            <div className="text-2xl font-black text-emerald-700 mt-1">
                                {Number(currentCashDrawer).toLocaleString()} KHR
                            </div>
                            <span className="text-[11px] text-slate-500">Live physical cash available right now</span>
                        </div>
                        <div className="text-3xl opacity-80">💵</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs border-l-4 border-l-rose-500 flex justify-between items-center">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {preset === 'TODAY' ? "Today's Total Expenses" : preset === 'MONTH' ? "This Month's Expenses" : "All Time Expenses"}
                            </span>
                            <div className="text-2xl font-black text-rose-600 mt-1">
                                -{Number(periodExpensesKHR).toLocaleString()} KHR
                            </div>
                            <span className="text-[11px] text-slate-500">Total staff operational outflows</span>
                        </div>
                        <div className="text-3xl opacity-80">🧾</div>
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search expense item, staff, notes..."
                                    className="border border-slate-300 rounded px-2.5 py-1 text-xs w-64 bg-slate-50 focus:bg-white font-medium"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1 text-slate-400 hover:text-black font-bold text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-slate-50 cursor-pointer"
                            >
                                <option value="ALL">All Categories</option>
                                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            <select
                                value={methodFilter}
                                onChange={(e) => setMethodFilter(e.target.value)}
                                className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-slate-50 cursor-pointer"
                            >
                                <option value="ALL">All Payment Methods</option>
                                <option value="ACLEDA Bank">ACLEDA Bank</option>
                                <option value="KHR Cash">KHR Cash</option>
                                <option value="Wing">Wing Bank</option>
                            </select>
                        </div>

                        <span className="text-xs text-slate-600 font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                            {processedExpenses.length} Expenses Recorded
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded border border-slate-200">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider select-none whitespace-nowrap">
                                    <th onClick={() => handleSort('created_at')} className="p-2.5 cursor-pointer hover:bg-slate-800">
                                        Date & Time {sortIndicator('created_at')}
                                    </th>
                                    <th onClick={() => handleSort('title')} className="p-2.5 cursor-pointer hover:bg-slate-800">
                                        Expense Item / Title {sortIndicator('title')}
                                    </th>
                                    <th onClick={() => handleSort('category')} className="p-2.5 cursor-pointer hover:bg-slate-800">
                                        Category {sortIndicator('category')}
                                    </th>
                                    <th onClick={() => handleSort('amount')} className="p-2.5 text-right cursor-pointer hover:bg-slate-800">
                                        Amount (KHR) {sortIndicator('amount')}
                                    </th>
                                    <th onClick={() => handleSort('method')} className="p-2.5 cursor-pointer hover:bg-slate-800">
                                        Paid Via {sortIndicator('method')}
                                    </th>
                                    <th onClick={() => handleSort('paid_by')} className="p-2.5 cursor-pointer hover:bg-slate-800">
                                        Paid By {sortIndicator('paid_by')}
                                    </th>
                                    <th className="p-2.5">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-sans">
                                {processedExpenses.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-slate-50 transition">
                                        <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">
                                            {new Date(exp.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-2.5 font-bold text-slate-800">{exp.title}</td>
                                        <td className="p-2.5">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border">
                                                {exp.expense_category}
                                            </span>
                                        </td>
                                        <td className="p-2.5 text-right font-black text-rose-600">
                                            -{Number(exp.amount_khr).toLocaleString()}៛
                                        </td>
                                        <td className="p-2.5">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                exp.payment_method === 'KHR Cash'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {exp.payment_method}
                                            </span>
                                        </td>
                                        <td className="p-2.5 font-medium text-slate-700">{exp.paid_by || 'Reception'}</td>
                                        <td className="p-2.5 text-slate-400 font-normal">{exp.notes || '—'}</td>
                                    </tr>
                                ))}
                                {processedExpenses.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-slate-400 italic">
                                            No expenses found matching the criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal: Add Expense */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-base text-rose-600">Record Cashier Expense</h3>
                            <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-black font-bold cursor-pointer">✕</button>
                        </div>

                        {modalError && (
                            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 font-bold text-xs">
                                ⚠️ {modalError}
                            </div>
                        )}

                        <form onSubmit={submitExpense} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Expense Item / Description</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Trash bags & bleach"
                                    className="w-full border rounded px-3 py-1.5 bg-slate-50 focus:bg-white font-medium"
                                    value={expenseForm.title}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Amount (KHR)</label>
                                    <input
                                        type="number"
                                        step="500"
                                        placeholder="0 KHR"
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-black text-slate-900"
                                        value={expenseForm.amount_khr}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, amount_khr: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Amount (USD)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="$0.00"
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-black text-slate-900"
                                        value={expenseForm.amount_usd}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, amount_usd: e.target.value })}
                                    />
                                </div>
                            </div>

                            {totalExpKhrEq > 0 && (
                                <div className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 p-1.5 rounded flex justify-between">
                                    <span>Total Equivalent:</span>
                                    <span>{totalExpKhrEq.toLocaleString()}៛</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Paid From Account</label>
                                    <select
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-bold"
                                        value={expenseForm.payment_method}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                                    >
                                        <option value="ACLEDA Bank">ACLEDA Bank</option>
                                        <option value="KHR Cash">Cash at Cashier</option>
                                        <option value="Wing">Wing Bank</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Expense Category</label>
                                    <select
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-semibold"
                                        value={expenseForm.expense_category}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, expense_category: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Category...</option>
                                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Notes (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Receipt # or details"
                                    className="w-full border rounded px-3 py-1.5 bg-slate-50 font-medium"
                                    value={expenseForm.notes}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg cursor-pointer transition shadow"
                            >
                                Record Expense
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Admin Cash Withdrawal */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-base text-amber-700">Admin Cash Withdrawal</h3>
                            <button onClick={() => setIsWithdrawModalOpen(false)} className="text-slate-400 hover:text-black font-bold cursor-pointer">✕</button>
                        </div>

                        <div className="text-xs bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900 flex justify-between items-center">
                            <span>Available in Drawer: <strong>{Number(currentCashDrawer).toLocaleString()} KHR</strong></span>
                            <button
                                type="button"
                                onClick={() => setWithdrawForm({ ...withdrawForm, khr_amount: currentCashDrawer })}
                                className="text-[10px] bg-amber-200 hover:bg-amber-300 font-bold px-2 py-0.5 rounded cursor-pointer transition"
                            >
                                All Cash
                            </button>
                        </div>

                        <form onSubmit={submitWithdrawal} className="space-y-3 text-xs">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="font-bold text-slate-600">Withdraw Amount (KHR)</label>
                                    <span className="text-[10px] text-slate-400">Defaults to all available cash</span>
                                </div>
                                <input
                                    type="number"
                                    step="500"
                                    placeholder="e.g. 500000"
                                    className="w-full border rounded px-3 py-1.5 bg-slate-50 font-black text-slate-900 text-sm"
                                    value={withdrawForm.khr_amount}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, khr_amount: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Note</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Owner collected afternoon cash"
                                    className="w-full border rounded px-3 py-1.5 bg-slate-50 font-medium"
                                    value={withdrawForm.notes}
                                    onChange={(e) => setWithdrawForm({ ...withdrawForm, notes: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg cursor-pointer transition shadow"
                            >
                                Confirm Withdrawal
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

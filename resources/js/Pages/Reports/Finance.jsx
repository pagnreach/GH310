import React, { useState, useMemo } from 'react';
import Navbar from '@/Components/Navbar';
import { router } from '@inertiajs/react';

export default function Finance({ preset = 'MONTH',
    customDate,
    customMonth,
    customYear,
    summary,
    accounts,
    cashier_cash = 0,
    transfers = [], exchangeRate = 4000 }) {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultMonth = customMonth || '2026-08';
    const defaultYear = customYear || '2026';

    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

    // Edit/Adjust Modal state
    const [editModalItem, setEditModalItem] = useState(null);
    const [editForm, setEditForm] = useState({ usd_amount: '', khr_amount: '', notes: '', date: '' });

    // Minimize / Hide toggle for Cash Overview section
    const [isOverviewMinimized, setIsOverviewMinimized] = useState(false);

    const [manageTab, setManageTab] = useState('TRANSFER');
    const [convertDirection, setConvertDirection] = useState('KHR_TO_USD');
    const [modalError, setModalError] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [accountFilter, setAccountFilter] = useState('ALL');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    const TRANSFER_FROM_OPTIONS = ['Cash We Took', 'Cash at Cashier', 'ACLEDA Bank', 'Wing Bank'];
    const TRANSFER_TO_OPTIONS = ['Cash We Took', 'Cash at Cashier', 'ACLEDA Bank', 'Wing Bank'];
    const DUAL_CURRENCY_ACCOUNTS = ['Cash We Took', 'ACLEDA Bank', 'Wing Bank'];
    const DEPOSIT_SOURCES = ['Room Income', 'Cash Deposit', 'Owner Added Money', 'Bank Interest', 'Other Income', 'Adjustment'];
    const EXPENSE_CATEGORIES = ['Salary', 'Utilities', 'Supplies', 'Maintenance', 'Cleaning', 'Commission', 'Rent/Owner', 'Bank Fee', 'Other Expense', 'Monthly Expense'];

    const [transferForm, setTransferForm] = useState({
        transfer_date: todayStr,
        from_account: 'Cash We Took',
        to_account: 'ACLEDA Bank',
        khr_amount: '',
        usd_amount: '',
        notes: '',
    });

    const [convertForm, setConvertForm] = useState({
        transfer_date: todayStr,
        target_account: 'ACLEDA Bank',
        amount_input: '',
        notes: '',
    });

    const [depositForm, setDepositForm] = useState({
        deposit_date: todayStr,
        account: 'Cash We Took',
        source: 'Cash Deposit',
        khr_amount: '',
        usd_amount: '',
        notes: '',
    });

    const [expenseForm, setExpenseForm] = useState({
        title: '',
        amount_khr: '',
        amount_usd: '',
        expense_category: '',
        payment_method: 'ACLEDA Bank',
        expense_date: todayStr,
        paid_by: 'Reception',
        shift: 'Morning',
        notes: '',
    });

    const [withdrawForm, setWithdrawForm] = useState({
        khr_amount: '',
        notes: 'Admin cash drawer withdrawal',
    });

    const openWithdrawModal = () => {
        setModalError(null);
        setWithdrawForm({
            khr_amount: cashier_cash > 0 ? cashier_cash : '',
            notes: 'Admin cash drawer withdrawal',
        });
        setIsWithdrawModalOpen(true);
    };

    const openEditModal = (t) => {
        setEditModalItem(t);
        setEditForm({
            usd_amount: t.usd_amount || '',
            khr_amount: t.khr_amount || '',
            notes: t.notes || '',
            date: t.date || todayStr,
        });
    };

    const submitEdit = (e) => {
        e.preventDefault();
        if (!editModalItem) return;

        router.put(`/finance/transactions/${editModalItem.id}`, {
            type: editModalItem.type,
            usd_amount: parseFloat(editForm.usd_amount) || 0,
            khr_amount: parseFloat(editForm.khr_amount) || 0,
            notes: editForm.notes,
            date: editForm.date,
        }, {
            onSuccess: () => setEditModalItem(null),
            onError: (errs) => alert(Object.values(errs).join(' ')),
        });
    };

    const handleDeleteRecord = (id) => {
        if (!confirm('Are you sure you want to permanently delete this transaction? All balances will automatically recalculate.')) return;
        router.delete(`/finance/transactions/${id}`, {
            onError: (errs) => alert(Object.values(errs).join(' ')),
        });
    };

    const handleFilterChange = (newPreset, params = {}) => {
        router.get('/finance', {
            preset: newPreset,
            date: params.date || customDate,
            month: params.month || defaultMonth,
            year: params.year || defaultYear,
        }, { preserveState: true });
    };

    // Compact date formatting: Line 1: DD/MM/YY | Line 2: H:MM A
    const formatCompactDate = (dateStr) => {
        if (!dateStr) return { date: '—', time: '' };
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { date: dateStr, time: '' };

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);

        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;

        return {
            date: `${day}/${month}/${year}`,
            time: `${hours}:${minutes} ${ampm}`
        };
    };

    const getConversionPreview = () => {
        const val = parseFloat(convertForm.amount_input) || 0;
        if (convertDirection === 'KHR_TO_USD') {
            const usd = val / (Number(exchangeRate) || 4000);
            return {
                usdOutput: usd > 0 ? `$${usd.toFixed(2)}` : '$0.00',
                khrInput: val,
                usdVal: usd,
            };
        } else {
            const khr = val * (Number(exchangeRate) || 4000);
            return {
                khrOutput: khr > 0 ? `${khr.toLocaleString()}៛` : '0៛',
                usdInput: val,
                khrVal: khr,
            };
        }
    };

    const submitTransfer = (e) => {
        e.preventDefault();
        setModalError(null);

        router.post('/finance/transfer', {
            transfer_date: transferForm.transfer_date,
            transfer_category: 'TRANSFER',
            from_account: transferForm.from_account,
            to_account: transferForm.to_account,
            usd_amount: parseFloat(transferForm.usd_amount) || 0,
            khr_amount: parseFloat(transferForm.khr_amount) || 0,
            notes: transferForm.notes || 'Internal account transfer',
        }, {
            onSuccess: () => {
                setIsManageModalOpen(false);
                setTransferForm({
                    transfer_date: todayStr,
                    from_account: 'Cash We Took',
                    to_account: 'ACLEDA Bank',
                    khr_amount: '',
                    usd_amount: '',
                    notes: '',
                });
            },
            onError: (errs) => {
                const msg = Object.values(errs).join(' ');
                setModalError(msg);
                alert(msg);
            }
        });
    };

    const submitConversion = (e) => {
        e.preventDefault();
        setModalError(null);

        const preview = getConversionPreview();
        const isKhrToUsd = convertDirection === 'KHR_TO_USD';

        router.post('/finance/transfer', {
            transfer_date: convertForm.transfer_date,
            transfer_category: isKhrToUsd ? 'CONVERT_KHR_TO_USD' : 'CONVERT_USD_TO_KHR',
            from_account: convertForm.target_account,
            to_account: convertForm.target_account,
            usd_amount: isKhrToUsd ? preview.usdVal : preview.usdInput,
            khr_amount: isKhrToUsd ? preview.khrInput : preview.khrVal,
            notes: convertForm.notes || (isKhrToUsd 
                ? `Exchanged ${preview.khrInput.toLocaleString()}៛ to $${preview.usdVal.toFixed(2)}` 
                : `Exchanged $${preview.usdInput.toFixed(2)} to ${preview.khrVal.toLocaleString()}៛`),
        }, {
            onSuccess: () => {
                setIsManageModalOpen(false);
                setConvertForm({
                    transfer_date: todayStr,
                    target_account: 'ACLEDA Bank',
                    amount_input: '',
                    notes: '',
                });
            },
            onError: (errs) => {
                const msg = Object.values(errs).join(' ');
                setModalError(msg);
                alert(msg);
            }
        });
    };

    const submitWithdrawal = (e) => {
        e.preventDefault();
        setModalError(null);

        router.post('/finance/withdraw', {
            khr_amount: parseFloat(withdrawForm.khr_amount) || 0,
            notes: withdrawForm.notes || 'Admin cash drawer withdrawal',
        }, {
            onSuccess: () => {
                setIsWithdrawModalOpen(false);
            },
            onError: (errs) => {
                const msg = Object.values(errs).join(' ');
                setModalError(msg);
                alert(msg);
            }
        });
    };

    const submitDeposit = (e) => {
        e.preventDefault();
        setModalError(null);
        router.post('/finance/deposit', {
            ...depositForm,
            usd_amount: parseFloat(depositForm.usd_amount) || 0,
            khr_amount: parseFloat(depositForm.khr_amount) || 0,
        }, {
            onSuccess: () => {
                setIsDepositModalOpen(false);
                setDepositForm({
                    deposit_date: todayStr,
                    account: 'Cash We Took',
                    source: 'Cash Deposit',
                    khr_amount: '',
                    usd_amount: '',
                    notes: '',
                });
            },
            onError: (errs) => {
                const msg = Object.values(errs).join(' ');
                setModalError(msg);
                alert(msg);
            }
        });
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

        const khrVal = parseFloat(expenseForm.amount_khr) || 0;
        const usdVal = parseFloat(expenseForm.amount_usd) || 0;

        if (khrVal <= 0 && usdVal <= 0) {
            const err = "Please enter an amount in KHR or USD.";
            setModalError(err);
            alert(err);
            return;
        }

        router.post('/expenses', {
            ...expenseForm,
            amount_khr: khrVal,
            amount_usd: usdVal,
        }, {
            onSuccess: () => {
                setIsExpenseModalOpen(false);
                setExpenseForm({
                    title: '',
                    amount_khr: '',
                    amount_usd: '',
                    expense_category: '',
                    payment_method: 'ACLEDA Bank',
                    expense_date: todayStr,
                    paid_by: 'Reception',
                    shift: 'Morning',
                    notes: '',
                });
            },
            onError: (errs) => {
                const msg = Object.values(errs).join(' ');
                setModalError(msg);
                alert(msg);
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

    const processedTransfers = useMemo(() => {
        return transfers
            .filter((t) => {
                if (typeFilter !== 'ALL') {
                    if (typeFilter === 'CONVERT') {
                        if (!t.type || !t.type.includes('CONVERT')) return false;
                    } else if (t.type !== typeFilter) {
                        return false;
                    }
                }

                if (accountFilter !== 'ALL') {
                    const fromMatches = (t.from_account || '').includes(accountFilter);
                    const toMatches = (t.to_account || '').includes(accountFilter);
                    if (!fromMatches && !toMatches) return false;
                }

                if (searchQuery.trim() !== '') {
                    const q = searchQuery.toLowerCase();
                    const fromAcc = (t.from_account || '').toLowerCase();
                    const toAcc = (t.to_account || '').toLowerCase();
                    const notes = (t.notes || '').toLowerCase();
                    const rec = (t.recorded_by || '').toLowerCase();
                    const type = (t.type || '').toLowerCase();
                    return fromAcc.includes(q) || toAcc.includes(q) || notes.includes(q) || rec.includes(q) || type.includes(q);
                }

                return true;
            })
            .sort((a, b) => {
                let aVal, bVal;
                switch (sortConfig.key) {
                    case 'type':
                        aVal = a.type || '';
                        bVal = b.type || '';
                        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    case 'from':
                        aVal = a.from_account || '';
                        bVal = b.from_account || '';
                        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    case 'to':
                        aVal = a.to_account || '';
                        bVal = b.to_account || '';
                        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    case 'usd':
                        aVal = Number(a.usd_amount) || 0;
                        bVal = Number(b.usd_amount) || 0;
                        break;
                    case 'khr':
                        aVal = Number(a.khr_amount) || 0;
                        bVal = Number(b.khr_amount) || 0;
                        break;
                    case 'date':
                    case 'created_at':
                    default:
                        aVal = new Date(a.created_at || a.date).getTime();
                        bVal = new Date(b.created_at || b.date).getTime();
                        break;
                }
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            });
    }, [transfers, searchQuery, typeFilter, accountFilter, sortConfig]);

    const availableYears = ['2026', '2025'];
    const preview = getConversionPreview();

    // Summary calculations
    const depUSD = Number(summary?.deposits_usd || 0);
    const depKHR = Number(summary?.deposits_khr || 0);
    const depEq = Number(summary?.gross_revenue_usd || 0);

    const expUSD = Number(summary?.expenses_usd || 0);
    const expKHR = Number(summary?.expenses_khr || 0);
    const expEq = Number(summary?.total_opex_usd || 0);

    const netUSD = depUSD - expUSD;
    const netKHR = depKHR - expKHR;
    const netEq = Number(summary?.net_profit_usd || 0);

    const totalLiquidityUSD = (accounts.cash_admin.usd || 0) + (accounts.acleda.usd || 0) + (accounts.wing.usd || 0);
    const totalLiquidityKHR = (accounts.cash_admin.khr || 0) + (accounts.acleda.khr || 0) + (accounts.wing.khr || 0);
    const totalLiquidityEq = totalLiquidityUSD + (totalLiquidityKHR / (Number(exchangeRate) || 4000));

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            <Navbar activeTab="finance" />

            <main className="p-4 flex-1 flex flex-col gap-4 max-w-[1720px] w-full mx-auto">
                {/* 1. CASH & BANK OVERVIEW (YELLOW LINE) WITH MINIMIZE / HIDE TOGGLE */}
                <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-base">💼</span>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Cash & Bank Overview</h2>
                            <span className="text-xs text-slate-400 font-medium hidden sm:inline">&bull; Multi-Account Liquidity & Closing Positions</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOverviewMinimized(!isOverviewMinimized)}
                            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>{isOverviewMinimized ? '👁️' : '👁️‍🗨️'}</span>
                            <span>{isOverviewMinimized ? 'Show Cash Overview' : 'Hide Details'}</span>
                        </button>
                    </div>

                    {!isOverviewMinimized && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 animate-fade">
                            {/* Account 1: Admin Cash (Cash in Excel) */}
                            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs flex flex-col justify-between border-t-4 border-t-amber-500">
                                <div>
                                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-base">💼</span>
                                            <span className="font-black text-xs text-slate-800 uppercase tracking-wide">Cash</span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                            Admin Cash
                                        </span>
                                    </div>

                                    <div className="mt-2 text-center py-2 bg-amber-50/60 rounded-lg border border-amber-100">
                                        <span className="text-[10px] font-bold text-amber-900 uppercase block">Closing USD Equivalent</span>
                                        <div className="text-xl font-black text-amber-700 mt-0.5">
                                            ${Number(accounts.cash_admin.total_usd_eq).toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-[11px] text-slate-700 mt-3 pt-1">
                                        <div className="flex justify-between">
                                            <span>Holding (USD):</span>
                                            <span className="font-bold text-slate-900 font-mono">${Number(accounts.cash_admin.usd).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Holding (KHR):</span>
                                            <span className="font-bold text-slate-900 font-mono">{Number(accounts.cash_admin.khr).toLocaleString()}៛</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 pt-2 border-t mt-3">
                                    Cash collected & held by admin.
                                </div>
                            </div>

                            {/* Account 2: ACLEDA Bank */}
                            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs flex flex-col justify-between border-t-4 border-t-blue-600">
                                <div>
                                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-base">🏦</span>
                                            <span className="font-black text-xs text-slate-800 uppercase tracking-wide">ACLEDA Bank</span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                            Operating
                                        </span>
                                    </div>

                                    <div className="mt-2 text-center py-2 bg-blue-50/60 rounded-lg border border-blue-100">
                                        <span className="text-[10px] font-bold text-blue-900 uppercase block">Closing USD Equivalent</span>
                                        <div className="text-xl font-black text-blue-700 mt-0.5">
                                            ${Number(accounts.acleda.total_usd_eq).toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-[11px] text-slate-700 mt-3 pt-1">
                                        <div className="flex justify-between">
                                            <span>Holding (USD):</span>
                                            <span className="font-bold text-slate-900 font-mono">${Number(accounts.acleda.usd).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Holding (KHR):</span>
                                            <span className="font-bold text-slate-900 font-mono">{Number(accounts.acleda.khr).toLocaleString()}៛</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 pt-2 border-t mt-3">
                                    Primary operating bank account.
                                </div>
                            </div>

                            {/* Account 3: Wing Bank */}
                            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs flex flex-col justify-between border-t-4 border-t-indigo-600">
                                <div>
                                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-base">💳</span>
                                            <span className="font-black text-xs text-slate-800 uppercase tracking-wide">Wing Bank</span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                                            Reserve
                                        </span>
                                    </div>

                                    <div className="mt-2 text-center py-2 bg-indigo-50/60 rounded-lg border border-indigo-100">
                                        <span className="text-[10px] font-bold text-indigo-900 uppercase block">Closing USD Equivalent</span>
                                        <div className="text-xl font-black text-indigo-700 mt-0.5">
                                            ${Number(accounts.wing.total_usd_eq).toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-[11px] text-slate-700 mt-3 pt-1">
                                        <div className="flex justify-between">
                                            <span>Holding (USD):</span>
                                            <span className="font-bold text-slate-900 font-mono">${Number(accounts.wing.usd).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Holding (KHR):</span>
                                            <span className="font-bold text-slate-900 font-mono">{Number(accounts.wing.khr).toLocaleString()}៛</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 pt-2 border-t mt-3">
                                    Secondary/reserve account.
                                </div>
                            </div>

                            {/* Account 4: Total Portfolio Liquidity */}
                            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs flex flex-col justify-between border-t-4 border-t-slate-900">
                                <div>
                                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-base">💰</span>
                                            <span className="font-black text-xs text-slate-800 uppercase tracking-wide">Total Liquidity</span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">
                                            All Accounts
                                        </span>
                                    </div>

                                    <div className="mt-2 text-center py-2 bg-slate-50 rounded-lg border border-slate-200">
                                        <span className="text-[10px] font-bold text-slate-600 uppercase block">Closing USD Equivalent</span>
                                        <div className="text-xl font-black text-slate-900 mt-0.5">
                                            ${Number(totalLiquidityEq).toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-[11px] text-slate-700 mt-3 pt-1">
                                        <div className="flex justify-between">
                                            <span>Total (USD):</span>
                                            <span className="font-bold text-slate-900 font-mono">${Number(totalLiquidityUSD).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Total (KHR):</span>
                                            <span className="font-bold text-slate-900 font-mono">{Number(totalLiquidityKHR).toLocaleString()}៛</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 pt-2 border-t mt-3">
                                    Net closing cash & bank holdings.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. TWO-ROW CONTROL TOOLBAR */}
                <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs flex flex-col gap-3.5">
                    {/* ROW 1: HEADER (LEFT) + CASHIER DRAWER BADGE (RIGHT) */}
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <div>
                            <h2 className="text-base font-black text-slate-900 leading-tight">Financial Performance & Reconciliation</h2>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Automated Revenue &bull; OpEx &bull; Cash Ledger</p>
                        </div>

                        {/* Top-Right Stacked Cashier Drawer Badge */}
                        <div className="bg-emerald-50/90 border border-emerald-300 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-2xs">
                            <span className="text-lg">🛎️</span>
                            <div className="text-right">
                                <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider block">Cashier Drawer</span>
                                <span className="text-sm font-black text-emerald-700 font-mono block leading-tight">
                                    {Number(cashier_cash).toLocaleString()}៛
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ROW 2: FILTERS (LEFT) + ACTION BUTTONS (RIGHT) */}
                    <div className="flex flex-wrap justify-between items-center gap-3">
                        <div className="flex flex-wrap items-center gap-2">
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
                                </div>
                            )}

                            {preset === 'YEAR' && (
                                <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-300 rounded-lg px-2.5 py-1">
                                    <span className="text-[10px] font-black text-emerald-800 uppercase">Year:</span>
                                    <select
                                        value={customYear || defaultYear}
                                        onChange={(e) => handleFilterChange('YEAR', { year: e.target.value })}
                                        className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                    >
                                        {availableYears.map((yr) => (
                                            <option key={yr} value={yr}>{yr}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                                {[
                                    { id: 'MONTH', label: 'Month' },
                                    { id: 'YEAR', label: 'Year' },
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
                        </div>

                        {/* Action Buttons on Right */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={openWithdrawModal}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>💸</span>
                                <span>Withdraw Cash</span>
                            </button>

                            <button
                                onClick={() => { setModalError(null); setIsManageModalOpen(true); }}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>🔁</span>
                                <span>Manage Cash</span>
                            </button>

                            <button
                                onClick={() => setIsDepositModalOpen(true)}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                            >
                                <span>+</span>
                                <span>Cash Deposit</span>
                            </button>

                            <button
                                onClick={() => setIsExpenseModalOpen(true)}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                            >
                                <span>+</span>
                                <span>Expense</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. KPI SUMMARY CARDS: 3 BALANCED COLUMNS (RECEIVABLES REMOVED) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Gross Realized Revenue */}
                    <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs border-l-4 border-l-emerald-500 flex flex-col justify-between">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Gross Realized Revenue</span>
                            <div className="text-2xl font-black text-slate-900 mt-1">
                                ${depEq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-1 font-medium">
                                ${depUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5 font-medium">
                                {depKHR.toLocaleString()}៛
                            </div>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-2 pt-2 border-t border-slate-100">
                            Auto-captured room bookings & deposits
                        </span>
                    </div>

                    {/* Operating Expenses (OpEx) */}
                    <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs border-l-4 border-l-rose-500 flex flex-col justify-between">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Operating Expenses (OpEx)</span>
                            <div className="text-2xl font-black text-rose-600 mt-1">
                                -${expEq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-1 font-medium">
                                -${expUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5 font-medium">
                                -{expKHR.toLocaleString()}៛
                            </div>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-2 pt-2 border-t border-slate-100">
                            Supplies, repairs, utilities & staff costs
                        </span>
                    </div>

                    {/* Net Operating Income (NOI) */}
                    <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs border-l-4 border-l-blue-600 flex flex-col justify-between">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Net Operating Income (NOI)</span>
                            <div className={`text-2xl font-black mt-1 ${netEq >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                                {netEq >= 0 ? '+' : ''}${netEq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-1 font-medium">
                                {netUSD >= 0 ? '$' : '-$'}{Math.abs(netUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5 font-medium">
                                {netKHR >= 0 ? '+' : ''}{netKHR.toLocaleString()}៛
                            </div>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-2 pt-2 border-t border-slate-100">
                            Realized profit (Rev - OpEx)
                        </span>
                    </div>
                </div>

                {/* 4. UNIFIED SEARCHABLE, FILTERABLE, SORTABLE AUDIT TABLE WITH ADJUST & DELETE */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search account, guest, B00..., notes..."
                                    className="border border-slate-300 rounded px-2.5 py-1 text-xs w-64 bg-slate-50 focus:bg-white font-medium outline-none focus:border-slate-400"
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
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-slate-50 cursor-pointer"
                            >
                                <option value="ALL">All Types</option>
                                <option value="ROOM PAYMENT">Room Payment</option>
                                <option value="EXPENSE">Expense</option>
                                <option value="WITHDRAW">Withdrawal</option>
                                <option value="TRANSFER">Transfer</option>
                                <option value="DEPOSIT">Deposit</option>
                            </select>

                            <select
                                value={accountFilter}
                                onChange={(e) => setAccountFilter(e.target.value)}
                                className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-slate-50 cursor-pointer"
                            >
                                <option value="ALL">All Accounts</option>
                                <option value="Cash at Cashier">Cashier Drawer</option>
                                <option value="Cash We Took">Admin Cash</option>
                                <option value="ACLEDA">ACLEDA Bank</option>
                                <option value="Wing">Wing Bank</option>
                            </select>
                        </div>

                        <span className="text-xs text-slate-600 font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                            {processedTransfers.length} Records Found
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded border border-slate-200">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider select-none whitespace-nowrap">
                                    <th onClick={() => handleSort('date')} className="p-2.5 cursor-pointer hover:bg-slate-800">
                                        Date & Time {sortIndicator('date')}
                                    </th>
                                    <th onClick={() => handleSort('type')} className="p-2.5 cursor-pointer hover:bg-slate-800">
                                        Type {sortIndicator('type')}
                                    </th>
                                    <th onClick={() => handleSort('from')} className="p-2.5 cursor-pointer hover:bg-slate-800">
                                        From Account {sortIndicator('from')}
                                    </th>
                                    <th onClick={() => handleSort('to')} className="p-2.5 cursor-pointer hover:bg-slate-800">
                                        To Account {sortIndicator('to')}
                                    </th>
                                    <th onClick={() => handleSort('usd')} className="p-2.5 text-right cursor-pointer hover:bg-slate-800">
                                        USD Amount {sortIndicator('usd')}
                                    </th>
                                    <th onClick={() => handleSort('khr')} className="p-2.5 text-right cursor-pointer hover:bg-slate-800">
                                        KHR Amount {sortIndicator('khr')}
                                    </th>
                                    <th className="p-2.5">Notes</th>
                                    <th className="p-2.5">Recorded By</th>
                                    <th className="p-2.5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-sans">
                                {processedTransfers.map((t) => {
                                    const hasUsd = (typeof t.usd_amount === 'number' ? t.usd_amount : parseFloat(t.usd_amount)) > 0;
                                    const hasKhr = (typeof t.khr_amount === 'number' ? t.khr_amount : parseFloat(t.khr_amount)) > 0;
                                    const formattedDate = formatCompactDate(t.created_at || t.date);

                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50 transition">
                                            {/* TWO-LINE COMPACT DATE & TIME */}
                                            <td className="p-2.5 font-mono text-slate-800 whitespace-nowrap leading-tight">
                                                <div className="font-bold text-[11px]">{formattedDate.date}</div>
                                                <div className="text-[10px] text-slate-400 font-normal">{formattedDate.time}</div>
                                            </td>
                                            <td className="p-2.5">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                    t.is_expense
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : t.type === 'ROOM PAYMENT'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : t.type === 'WITHDRAW'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : (t.type && t.type.includes('CONVERT'))
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {t.is_expense
                                                        ? 'EXPENSE'
                                                        : t.type === 'ROOM PAYMENT'
                                                        ? 'ROOM PAYMENT'
                                                        : t.type === 'WITHDRAW'
                                                        ? 'WITHDRAW'
                                                        : (t.type || 'TRANSFER')}
                                                </span>
                                            </td>
                                            <td className="p-2.5 font-bold text-slate-700">{t.from_account}</td>
                                            <td className="p-2.5 font-bold text-blue-700">{t.to_account}</td>
                                            <td className="p-2.5 text-right font-mono text-slate-700 font-bold whitespace-nowrap">
                                                {hasUsd ? `$${Number(t.usd_amount).toFixed(2)}` : '—'}
                                            </td>
                                            <td className="p-2.5 text-right font-black text-indigo-700 whitespace-nowrap">
                                                {hasKhr ? `${Number(t.khr_amount).toLocaleString()}៛` : '—'}
                                            </td>
                                            <td className="p-2.5 text-slate-600 font-medium">{t.notes || '—'}</td>
                                            <td className="p-2.5 text-slate-500 whitespace-nowrap">{t.recorded_by}</td>
                                            <td className="p-2.5 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => openEditModal(t)}
                                                        title="Adjust / Edit Record"
                                                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold transition cursor-pointer"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRecord(t.id)}
                                                        title="Delete Record"
                                                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2 py-1 rounded text-xs font-bold transition cursor-pointer"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {processedTransfers.length === 0 && (
                                    <tr>
                                        <td colSpan="9" className="text-center py-8 text-slate-400 italic">
                                            No records match the current filter and search criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal: Adjust / Edit Record */}
            {editModalItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5">
                        <div className="flex justify-between items-center border-b pb-2">
                            <div>
                                <h3 className="font-black text-base text-slate-800">Adjust Transaction</h3>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{editModalItem.type} &bull; {editModalItem.from_account} ➔ {editModalItem.to_account}</span>
                            </div>
                            <button onClick={() => setEditModalItem(null)} className="text-slate-400 hover:text-black font-bold cursor-pointer">✕</button>
                        </div>

                        <form onSubmit={submitEdit} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">USD Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-black text-slate-900"
                                        value={editForm.usd_amount}
                                        onChange={(e) => setEditForm({ ...editForm, usd_amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">KHR Amount</label>
                                    <input
                                        type="number"
                                        step="500"
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-black text-slate-900"
                                        value={editForm.khr_amount}
                                        onChange={(e) => setEditForm({ ...editForm, khr_amount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Date</label>
                                <input
                                    type="date"
                                    className="w-full border rounded px-3 py-1.5 bg-slate-50 font-medium"
                                    value={editForm.date}
                                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Notes / Description</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-1.5 bg-slate-50 font-medium"
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg cursor-pointer transition shadow"
                            >
                                Save Adjustments
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Withdraw Cash */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-base text-amber-700">Admin Cash Withdrawal</h3>
                            <button onClick={() => setIsWithdrawModalOpen(false)} className="text-slate-400 hover:text-black font-bold cursor-pointer">✕</button>
                        </div>

                        {modalError && (
                            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 font-bold text-xs">
                                ⚠️ {modalError}
                            </div>
                        )}

                        <div className="text-xs bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900 flex justify-between items-center">
                            <span>Available in Cashier Drawer: <strong>{Number(cashier_cash).toLocaleString()} KHR</strong></span>
                            <button
                                type="button"
                                onClick={() => setWithdrawForm({ ...withdrawForm, khr_amount: cashier_cash })}
                                className="text-[10px] bg-amber-200 hover:bg-amber-300 font-bold px-2 py-0.5 rounded cursor-pointer transition"
                            >
                                All Cash
                            </button>
                        </div>

                        <form onSubmit={submitWithdrawal} className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold text-slate-600 block mb-1">Withdraw Amount (KHR)</label>
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

            {/* Modal: Manage Cash */}
            {isManageModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-base text-slate-800">Manage Cash</h3>
                            <button onClick={() => setIsManageModalOpen(false)} className="text-slate-400 hover:text-black font-bold cursor-pointer">✕</button>
                        </div>

                        {modalError && (
                            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 font-bold text-xs">
                                ⚠️ {modalError}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => { setManageTab('TRANSFER'); setModalError(null); }}
                                className={`py-1.5 text-center rounded transition cursor-pointer ${
                                    manageTab === 'TRANSFER' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-black'
                                }`}
                            >
                                🔁 Transfer Between Accounts
                            </button>
                            <button
                                type="button"
                                onClick={() => { setManageTab('CONVERT'); setModalError(null); }}
                                className={`py-1.5 text-center rounded transition cursor-pointer ${
                                    manageTab === 'CONVERT' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-black'
                                }`}
                            >
                                💱 Currency Conversion
                            </button>
                        </div>

                        {manageTab === 'TRANSFER' && (
                            <form onSubmit={submitTransfer} className="space-y-3 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block font-bold text-slate-600 mb-1">From Account</label>
                                        <select
                                            className="w-full border rounded px-3 py-1.5 bg-slate-50 font-bold"
                                            value={transferForm.from_account}
                                            onChange={(e) => setTransferForm({ ...transferForm, from_account: e.target.value })}
                                        >
                                            {TRANSFER_FROM_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-600 mb-1">To Account</label>
                                        <select
                                            className="w-full border rounded px-3 py-1.5 bg-slate-50 font-bold"
                                            value={transferForm.to_account}
                                            onChange={(e) => setTransferForm({ ...transferForm, to_account: e.target.value })}
                                        >
                                            {TRANSFER_TO_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block font-bold text-slate-600 mb-1">KHR Amount</label>
                                        <input
                                            type="number"
                                            step="500"
                                            placeholder="0 KHR"
                                            className="w-full border rounded px-3 py-1.5 bg-slate-50 font-black text-slate-900"
                                            value={transferForm.khr_amount}
                                            onChange={(e) => setTransferForm({ ...transferForm, khr_amount: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-600 mb-1">USD Amount</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="$0.00"
                                            className="w-full border rounded px-3 py-1.5 bg-slate-50 font-bold text-slate-900"
                                            value={transferForm.usd_amount}
                                            onChange={(e) => setTransferForm({ ...transferForm, usd_amount: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block font-bold text-slate-600 mb-1">Date</label>
                                        <input
                                            type="date"
                                            className="w-full border rounded px-3 py-1.5 bg-slate-50 font-medium"
                                            value={transferForm.transfer_date}
                                            onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-600 mb-1">Note</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Deposit cashier cash to bank"
                                            className="w-full border rounded px-3 py-1.5 bg-slate-50 font-medium"
                                            value={transferForm.notes}
                                            onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg cursor-pointer transition shadow"
                                >
                                    Confirm Transfer
                                </button>
                            </form>
                        )}

                        {manageTab === 'CONVERT' && (
                            <form onSubmit={submitConversion} className="space-y-3 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Account Holding Being Exchanged</label>
                                    <select
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-bold"
                                        value={convertForm.target_account}
                                        onChange={(e) => setConvertForm({ ...convertForm, target_account: e.target.value })}
                                    >
                                        {DUAL_CURRENCY_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-1 bg-purple-100/70 p-1 rounded-lg border border-purple-200 font-bold">
                                    <button
                                        type="button"
                                        onClick={() => { setConvertDirection('KHR_TO_USD'); setConvertForm({ ...convertForm, amount_input: '' }); }}
                                        className={`py-1 text-center rounded transition cursor-pointer text-[11px] ${
                                            convertDirection === 'KHR_TO_USD' ? 'bg-purple-800 text-white shadow-xs' : 'text-purple-900 hover:text-black'
                                        }`}
                                    >
                                        KHR ➔ USD ($)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setConvertDirection('USD_TO_KHR'); setConvertForm({ ...convertForm, amount_input: '' }); }}
                                        className={`py-1 text-center rounded transition cursor-pointer text-[11px] ${
                                            convertDirection === 'USD_TO_KHR' ? 'bg-purple-800 text-white shadow-xs' : 'text-purple-900 hover:text-black'
                                        }`}
                                    >
                                        USD ($) ➔ KHR
                                    </button>
                                </div>

                                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 space-y-2">
                                    <div className="text-[10px] font-black text-purple-900 uppercase">
                                        RATE: $1 = {Number(exchangeRate || 4000).toLocaleString()} KHR
                                    </div>

                                    {convertDirection === 'KHR_TO_USD' ? (
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Input KHR to Exchange</label>
                                            <input
                                                type="number"
                                                step="500"
                                                placeholder={`e.g. ${(Number(exchangeRate) || 4000) * 10}`}
                                                className="w-full border rounded px-2.5 py-1.5 bg-white font-black text-slate-900 text-sm"
                                                value={convertForm.amount_input}
                                                onChange={(e) => setConvertForm({ ...convertForm, amount_input: e.target.value })}
                                                required
                                            />
                                            <div className="mt-2 text-[11px] font-bold text-purple-900 bg-white p-2 rounded border border-purple-100 flex justify-between">
                                                <span>You Receive:</span>
                                                <strong className="text-emerald-700 text-xs">{preview.usdOutput}</strong>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Input USD to Exchange</label>
                                            <input
                                                type="number"
                                                step="1"
                                                placeholder="e.g. 10"
                                                className="w-full border rounded px-2.5 py-1.5 bg-white font-black text-slate-900 text-sm"
                                                value={convertForm.amount_input}
                                                onChange={(e) => setConvertForm({ ...convertForm, amount_input: e.target.value })}
                                                required
                                            />
                                            <div className="mt-2 text-[11px] font-bold text-purple-900 bg-white p-2 rounded border border-purple-100 flex justify-between">
                                                <span>You Receive:</span>
                                                <strong className="text-emerald-700 text-xs">{preview.khrOutput}</strong>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block font-bold text-slate-600 mb-1">Date</label>
                                        <input
                                            type="date"
                                            className="w-full border rounded px-3 py-1.5 bg-slate-50 font-medium"
                                            value={convertForm.transfer_date}
                                            onChange={(e) => setConvertForm({ ...convertForm, transfer_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-600 mb-1">Note</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Converted holding"
                                            className="w-full border rounded px-3 py-1.5 bg-slate-50 font-medium"
                                            value={convertForm.notes}
                                            onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 rounded-lg cursor-pointer transition shadow"
                                >
                                    Confirm Conversion
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Modal: Cash Deposit */}
            {isDepositModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-base text-emerald-700">Add Cash Deposit</h3>
                            <button onClick={() => setIsDepositModalOpen(false)} className="text-slate-400 hover:text-black font-bold cursor-pointer">✕</button>
                        </div>
                        <form onSubmit={submitDeposit} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Target Account</label>
                                    <select
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-bold"
                                        value={depositForm.account}
                                        onChange={(e) => setDepositForm({ ...depositForm, account: e.target.value })}
                                    >
                                        {TRANSFER_TO_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Deposit Source</label>
                                    <select
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-bold"
                                        value={depositForm.source}
                                        onChange={(e) => setDepositForm({ ...depositForm, source: e.target.value })}
                                    >
                                        {DEPOSIT_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">KHR Amount</label>
                                    <input
                                        type="number"
                                        step="500"
                                        placeholder="0 KHR"
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-black text-slate-900"
                                        value={depositForm.khr_amount}
                                        onChange={(e) => setDepositForm({ ...depositForm, khr_amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">USD Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="$0.00"
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-bold text-slate-900"
                                        value={depositForm.usd_amount}
                                        onChange={(e) => setDepositForm({ ...depositForm, usd_amount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Date</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-medium"
                                        value={depositForm.deposit_date}
                                        onChange={(e) => setDepositForm({ ...depositForm, deposit_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Notes</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Owner capital injection"
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-medium"
                                        value={depositForm.notes}
                                        onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-lg cursor-pointer transition shadow"
                            >
                                Confirm Deposit
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Record Expense */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-black text-base text-rose-600">Record Expense</h3>
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
                                    placeholder="e.g. Staff Salary or EDC Bill"
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

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Paid From Account</label>
                                    <select
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-bold"
                                        value={expenseForm.payment_method}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                                    >
                                        <option value="ACLEDA Bank">ACLEDA Bank</option>
                                        <option value="Cash We Took">Cash We Took</option>
                                        <option value="Wing Bank">Wing Bank</option>
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

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Expense Date</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded px-3 py-1.5 bg-slate-50 font-medium"
                                        value={expenseForm.expense_date}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                                        required
                                    />
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
        </div>
    );
}

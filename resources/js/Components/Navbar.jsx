import React from 'react';
import { Link } from '@inertiajs/react';

export default function Navbar({ activeTab }) {
    return (
        <header className="bg-slate-900 text-white px-5 py-2.5 flex items-center justify-between border-b border-slate-800 shadow-md">
            <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2">
                    <span className="font-black text-lg tracking-tight text-emerald-400">310 GUESTHOUSE</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded border border-slate-700">KHR</span>
                </Link>

                <nav className="flex items-center gap-1 text-xs font-bold">
                    <Link
                        href="/"
                        className={`px-3 py-1.5 rounded-lg transition ${
                            activeTab === 'frontdesk'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        Front Desk
                    </Link>
                    <Link
                        href="/calendar"
                        className={`px-3 py-1.5 rounded-lg transition ${
                            activeTab === 'calendar'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        Room Calendar
                    </Link>
                    <Link
                        href="/occupancy-report"
                        className={`px-3 py-1.5 rounded-lg transition ${
                            activeTab === 'occupancy' || activeTab === 'mor'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        MOR
                    </Link>
                    <Link
                        href="/guest-log"
                        className={`px-3 py-1.5 rounded-lg transition ${
                            activeTab === 'guest-log'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        Guest Log
                    </Link>
                    <Link
                        href="/finance"
                        className={`px-3 py-1.5 rounded-lg transition ${
                            activeTab === 'finance'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        Finance
                    </Link>
                    <Link
                        href="/setup"
                        className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                            activeTab === 'setup'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        <span>⚙️</span>
                        <span>Setup</span>
                    </Link>
                </nav>
            </div>

            <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Reception Live
                </span>
            </div>
        </header>
    );
}

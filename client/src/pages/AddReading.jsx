import { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const AddReading = () => {
    const navigate = useNavigate();
    const [residents, setResidents] = useState([]);
    const [selectedRes, setSelectedRes] = useState('');
    const [pricing, setPricing] = useState(null);

    // Logic States
    const [nextBillDate, setNextBillDate] = useState({ year: '', month: '', monthName: '' });
    const [lastBillInfo, setLastBillInfo] = useState(null);

    // Forms
    const [form, setForm] = useState({ water: '', electricity: '' });
    const [rateForm, setRateForm] = useState({ water: '', electricity: '' });
    const [showRateModal, setShowRateModal] = useState(false);

    const [manualStart, setManualStart] = useState({ year: '', month: '' });
    const isFirstReading =
        selectedRes &&
        !lastBillInfo &&
        (!manualStart.year || !manualStart.month);



    const monthNames = ["", "Baisakh", "Jestha", "Asadh", "Shrawan", "Bhadra", "Ashoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

    useEffect(() => {
        api.get('/list-residents').then(res => setResidents(res.data));
    }, []);

    useEffect(() => {
        if (!lastBillInfo && manualStart.year && manualStart.month) {
            setNextBillDate({
                year: manualStart.year,
                month: manualStart.month,
                monthName: monthNames[manualStart.month]
            });
        }
    }, [manualStart, lastBillInfo]);


    // --- LOGIC: Fetch Context & Calculate Next Date ---
    useEffect(() => {
        if (!selectedRes) {
            setNextBillDate({ year: '', month: '', monthName: '' });
            return;
        }

        const fetchContext = async () => {
            try {
                // 1. Get Pricing
                const priceRes = await api.get(`/get-pricing?home_id=1`);
                setPricing(priceRes.data.rates);
                setRateForm({
                    water: priceRes.data.rates.water_price_per_liter,
                    electricity: priceRes.data.rates.electricity_price_per_unit
                });

                // 2. Get Ledger
                const ledgerRes = await api.get(`/get-ledger?resident_id=${selectedRes}`);
                const bills = ledgerRes.data.ledger_entries.filter(x => x.type === 'BILL');


                if (bills.length > 0) {
                    const last = bills[bills.length - 1];
                    const [lastY, lastM] = last.description
                        .split(' ')[2]
                        .split('-')
                        .map(Number);

                    setLastBillInfo({
                        date: `${monthNames[lastM]} ${lastY}`,
                        w_reading: last.details.water_reading || 0,
                        e_reading: last.details.electricity_reading || 0,
                        w_used: last.details.water_usage,
                        e_used: last.details.electricity_usage
                    });

                    let nextY, nextM;
                    if (lastM === 12) {
                        nextY = lastY + 1;
                        nextM = 1;
                    } else {
                        nextY = lastY;
                        nextM = lastM + 1;
                    }

                    setNextBillDate({
                        year: nextY,
                        month: nextM,
                        monthName: monthNames[nextM]
                    });
                } else {
                    // FIRST READING — no auto date
                    setLastBillInfo(null);
                }




            } catch (e) { console.error(e); }
        };
        fetchContext();
    }, [selectedRes]);

    const handleRateUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/set-pricing', {
                home_id: 1,
                water_price: rateForm.water,
                electricity_price: rateForm.electricity
            });
            setPricing({ water_price_per_liter: rateForm.water, electricity_price_per_unit: rateForm.electricity });
            setShowRateModal(false);
            alert("Boom! Rates Updated.");
        } catch (e) { alert("Error updating rates"); }
    };

    const handleSubmit = async (e) => {
        if (isFirstReading && (!manualStart.year || !manualStart.month)) {
            alert("Please select start year and month");
            return;
        }
        e.preventDefault();
        try {
            await api.post('/add-reading', {
                resident_id: selectedRes,
                year: isFirstReading ? manualStart.year : nextBillDate.year,
                month: isFirstReading ? manualStart.month : nextBillDate.month,
                water_reading: form.water,
                electricity_reading: form.electricity
            });
            alert("Cha-Ching! Bill Generated.");
            navigate(`/resident/${selectedRes}`);
        } catch (e) { alert("Error: " + (e.response?.data?.error || e.message)); }
    };

    return (
        <div className="h-screen overflow-hidden bg-gray-50 text-gray-800 font-sans">
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 py-8 overflow-hidden">

                <button onClick={() => navigate('/dashboard')} className="mb-4 text-gray-400 hover:text-blue-600 flex items-center gap-1 cursor-pointer transition">
                    &larr; Escape to Dashboard
                </button>

                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 scale-[0.9]">
                    <h2 className="text-3xl font-extrabold mb-8 text-gray-800 flex items-center gap-2">
                        <span>📝</span> Time to Bill!
                    </h2>

                    {/* Resident Select */}
                    <div className="mb-8">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Who are we billing?</label>
                        <div className="relative">
                            <select
                                className="w-full appearance-none border border-gray-200 bg-gray-50 p-4 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none cursor-pointer font-bold text-lg transition"
                                value={selectedRes}
                                onChange={e => setSelectedRes(e.target.value)}
                            >
                                <option value="">-- Pick a Lucky Tenant --</option>
                                {residents.map(r => (
                                    <option key={r.resident_id} value={r.resident_id}>
                                        {r.name}{r.home ? ` (${r.home})` : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    {isFirstReading && (
                        <div className="mb-6 grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Start Year</label>
                                <input
                                    type="number"
                                    className="w-full border p-3 rounded-xl"
                                    placeholder="e.g. 2024"
                                    value={manualStart.year}
                                    onChange={e => setManualStart({ ...manualStart, year: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Start Month</label>
                                <select
                                    className="w-full border p-3 rounded-xl"
                                    value={manualStart.month}
                                    onChange={e => setManualStart({ ...manualStart, month: e.target.value })}
                                    required
                                >
                                    <option value="">Select</option>
                                    {monthNames.slice(1).map((m, i) => (
                                        <option key={i + 1} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}


                    {selectedRes && !isFirstReading && nextBillDate.year && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* LOCKED DATE BANNER (Fun Version) */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-2xl mb-8 shadow-lg shadow-blue-200 relative overflow-hidden">
                                <div className="relative z-10 flex justify-between items-center">
                                    <div>
                                        <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">Coming Up Next</p>
                                        <p className="text-3xl font-black tracking-tight">{nextBillDate.monthName} {nextBillDate.year}</p>
                                    </div>
                                    <div className="text-5xl opacity-20">📅</div>
                                </div>
                                {/* Decorative Circle */}
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                            </div>

                            {/* Info & Rates Panel */}
                            {pricing && (
                                <div className="mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Previous Meter Stats</span>
                                            {lastBillInfo ? (
                                                <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                    {lastBillInfo.date}
                                                </span>
                                            ) : (
                                                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">New Start</span>
                                            )}
                                        </div>

                                        {lastBillInfo ? (
                                            <div className="flex gap-6 text-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-400 text-xs font-semibold">Water Reading</span>
                                                    <span className="font-mono font-bold text-gray-700 text-lg">
                                                        {lastBillInfo.w_reading}<span className="text-xs text-gray-400">L</span>
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-gray-400 text-xs font-semibold">Elec Reading</span>
                                                    <span className="font-mono font-bold text-gray-700 text-lg">
                                                        {lastBillInfo.e_reading}<span className="text-xs text-gray-400">U</span>
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No history yet. Enter initial readings.</p>
                                        )}
                                    </div>

                                    {/* Edit Rates Button */}
                                    <div className="flex items-center gap-3 bg-white p-2 pl-4 rounded-xl border border-gray-100 shadow-sm">
                                        <div className="text-xs text-right">
                                            <div className="text-blue-600 font-bold">⚡ {pricing.electricity_price_per_unit}</div>
                                            <div className="text-blue-600 font-bold">💧 {pricing.water_price_per_liter}</div>
                                        </div>
                                        <button
                                            onClick={() => setShowRateModal(true)}
                                            className="h-10 w-10 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 rounded-lg flex items-center justify-center transition cursor-pointer"
                                            title="Edit Rates"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="group">
                                        <label className="block text-xs font-bold text-blue-400 uppercase mb-2 ml-1 group-focus-within:text-blue-600 transition">Water Reading (L)</label>
                                        <input type="number" step="0.001" className="w-full border-2 border-gray-100 bg-gray-50 p-4 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none font-bold text-xl text-gray-700 transition"
                                            placeholder="000.00" value={form.water} onChange={e => setForm({ ...form, water: e.target.value })} required autoFocus />
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold text-yellow-500 uppercase mb-2 ml-1 group-focus-within:text-yellow-600 transition">Elec Reading (U)</label>
                                        <input type="number" step="0.001" className="w-full border-2 border-gray-100 bg-gray-50 p-4 rounded-2xl focus:bg-white focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 outline-none font-bold text-xl text-gray-700 transition"
                                            placeholder="000.00" value={form.electricity} onChange={e => setForm({ ...form, electricity: e.target.value })} required />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-gray-900 hover:bg-black text-white font-bold py-5 rounded-2xl shadow-xl shadow-gray-200 transform hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer text-lg"
                                >
                                    🚀 Generate Bill
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Rate Modal (Kept Simple) */}
            {showRateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-white p-6 rounded-2xl w-80 shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 text-center">💸 Tweak the Rates</h3>
                        <form onSubmit={handleRateUpdate} className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Electricity / Unit</label>
                                <input type="number" step="0.1" className="w-full border-2 border-gray-200 p-2 rounded-xl focus:border-blue-500 outline-none font-bold"
                                    value={rateForm.electricity} onChange={e => setRateForm({ ...rateForm, electricity: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Water / Liter</label>
                                <input type="number" step="0.1" className="w-full border-2 border-gray-200 p-2 rounded-xl focus:border-blue-500 outline-none font-bold"
                                    value={rateForm.water} onChange={e => setRateForm({ ...rateForm, water: e.target.value })} />
                            </div>
                            <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200">Save It</button>
                            <button type="button" onClick={() => setShowRateModal(false)} className="w-full text-gray-400 text-sm py-2 hover:text-gray-600">Nevermind</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddReading;
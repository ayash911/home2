import { useEffect, useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);
    const [sendStatus, setSendStatus] = useState("idle")

    // 1. Fetch Dashboard Data on Load
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/dashboard-summary');
                setData(res.data);
                setLoading(false);
            } catch (err) {
                setError("Failed to load dashboard data.");
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        window.onbeforeunload = sending ? () => true : null;
        return () => (window.onbeforeunload = null);
    }, [sending]);


    // 2. Handle PDF Download
    const downloadPDF = async (residentId, name) => {
        try {
            // We must set responseType to 'blob' for binary files like PDF
            const response = await api.get(`/download-statement?resident_id=${residentId}`, {
                responseType: 'blob'
            });

            // Create a hidden link to trigger the download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Statement_${name}_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            alert("Failed to generate PDF. Please check the logs.");
        }
    };

    const sendmail = async (residentId) => {
        try {
            setSending(true);
            setSendStatus("sending");

            await api.post('/email-statements', {
                resident_id: residentId
            });

            setSendStatus("success");

            // auto-close after confirmation
            setTimeout(() => {
                setSending(false);
                setSendStatus("idle");
            }, 1200);

        } catch (e) {
            setSendStatus("error");

            setTimeout(() => {
                setSending(false);
                setSendStatus("idle");
            }, 1500);
        }
    };
    const send_collective_mail = async () => {
        try {
            setSending(true);
            setSendStatus("sending");

            await api.post('/email-statements', {});

            setSendStatus("success");

            // auto-close after confirmation
            setTimeout(() => {
                setSending(false);
                setSendStatus("idle");
            }, 1200);

        } catch (e) {
            setSendStatus("error");

            setTimeout(() => {
                setSending(false);
                setSendStatus("idle");
            }, 1500);
        }
    };




    if (loading) return <div className="text-center mt-20 text-xl">Loading System...</div>;
    if (error) return <div className="text-center mt-20 text-red-500 font-bold">{error}</div>;

    const { operations, financials, alerts } = data;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* --- Top Stats Cards --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Card 1: Outstanding Debt */}
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                        <h3 className="text-gray-500 text-sm font-bold uppercase">Total Pending Dues</h3>
                        <p className="text-3xl font-bold text-red-600 mt-2">
                            Rs. {financials.current_outstanding_debt.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">{alerts.count_overdue} Residents Overdue</p>
                    </div>

                    {/* Card 2: Total Collected */}
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                        <h3 className="text-gray-500 text-sm font-bold uppercase">Lifetime Collected</h3>
                        <p className="text-3xl font-bold text-green-600 mt-2">
                            Rs. {financials.total_collected_lifetime.toLocaleString()}
                        </p>
                    </div>

                    {/* Card 3: Operations */}
                    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                        <h3 className="text-gray-500 text-sm font-bold uppercase">Occupancy</h3>
                        <div className="mt-2">
                            <span className="text-2xl font-bold text-gray-800">{operations.total_residents}</span>
                            <span className="text-gray-500 ml-2">Residents</span>
                        </div>
                        <div className="text-sm text-gray-400">Across {operations.total_homes} Homes</div>
                    </div>
                </div>

                {/* --- Defaulters Table --- */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">Payment Alerts</h2>
                        <button
                            onClick={() => send_collective_mail()}
                            className="cursor-pointer text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-full transition"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                            </svg>
                        </button>

                    </div>

                    {alerts.overdue_residents.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">All Clear! No pending payments.</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resident</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Home</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Due Amount</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {alerts.overdue_residents.map((res) => (
                                    <tr key={res.resident_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{res.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{res.home}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${res.amount_due < 0
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                Rs. {Math.abs(res.amount_due).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium  w-24">
                                            <div className="flex justify-start gap-2">
                                                <button
                                                    onClick={() => downloadPDF(res.resident_id, res.name)}
                                                    className="cursor-pointer text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-full transition"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                                                    </svg>
                                                </button>

                                                <button
                                                    onClick={() => sendmail(res.resident_id)}
                                                    className="cursor-pointer text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-full transition"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            {sending && (
                <div className="fixed inset-0 z-50 bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">

                        {sendStatus === "sending" && (
                            <>
                                <div className="relative w-14 h-14">
                                    <div className="absolute inset-0 rounded-full border-4 border-indigo-200"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                                </div>
                                <p className="text-gray-600 font-semibold tracking-wide">
                                    Generating & sending statements…
                                </p>
                            </>
                        )}

                        {sendStatus === "success" && (
                            <>
                                <div className="w-14 h-14 flex items-center justify-center rounded-full bg-green-100">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-green-600 font-semibold tracking-wide">
                                    Statements sent successfully
                                </p>
                            </>
                        )}

                        {sendStatus === "error" && (
                            <>
                                <div className="w-14 h-14 flex items-center justify-center rounded-full bg-red-100">
                                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <p className="text-red-600 font-semibold tracking-wide">
                                    Failed to send statements
                                </p>
                            </>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
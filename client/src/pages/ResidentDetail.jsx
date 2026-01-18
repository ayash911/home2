import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";

const BackIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
    />
  </svg>
);
const EditIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
);
const PhoneIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);
const HomeIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const ResidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showPayModal, setShowPayModal] = useState(false);
  const [showRentModal, setShowRentModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditTransModal, setShowEditTransModal] = useState(false);

  const [payForm, setPayForm] = useState({
    amount: "",
    method: "Cash",
    notes: "",
  });
  const [rentForm, setRentForm] = useState({ amount: "" });

  const [profileForm, setProfileForm] = useState({
    name: "",
    primary_phone: "",
    secondary_phone: "",
  });

  const [editTransForm, setEditTransForm] = useState({
    type: "",
    year: "",
    month: "",
    resident_id: "",
    payment_id: "",
    water_reading: "",
    electricity_reading: "",
    water_rate: "",
    electricity_rate: "",
    prev_w: 0,
    prev_e: 0,
    amount: "",
    notes: "",
    method: "",
  });

  useEffect(() => {
    fetchLedger();
  }, [id]);

  const fetchLedger = async () => {
    try {
      const res = await api.get(`/get-ledger?resident_id=${id}`);
      setData(res.data);

      if (res.data.profile.current_base_rent) {
        setRentForm({ amount: res.data.profile.current_base_rent });
      }

      setProfileForm({
        name: res.data.profile.name,
        primary_phone: res.data.profile.phones.primary || "",
        secondary_phone: res.data.profile.phones.secondary || "",
      });

      setLoading(false);
    } catch (e) {
      console.error("Failed to fetch ledger");
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await api.post("/add-payment", {
        resident_id: id,
        amount: payForm.amount,
        method: payForm.method,
        notes: payForm.notes,
      });
      setShowPayModal(false);
      setPayForm({ amount: "", method: "Cash", notes: "" });
      fetchLedger();
      alert("Payment Recorded!");
    } catch (err) {
      alert("Error recording payment");
    }
  };

  const handleRentUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/set-rent", {
        resident_id: id,
        rent_amount: rentForm.amount,
      });
      setShowRentModal(false);
      fetchLedger();
      alert("Rent Updated!");
    } catch (err) {
      alert("Error updating rent");
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/set-phones", {
        resident_id: id,
        new_name: profileForm.name,
        primary_phone: profileForm.primary_phone,
        secondary_phone: profileForm.secondary_phone,
      });

      setShowProfileModal(false);
      fetchLedger();
      alert("Profile Updated Successfully!");
    } catch (err) {
      alert("Error updating profile");
    }
  };

  const openEditTransaction = (entry) => {
    if (entry.type === "BILL") {
      const rawW = entry.details.water_reading || entry.details.water_usage;
      const rawE =
        entry.details.electricity_reading || entry.details.electricity_usage;

      // Calculate previous roughly if unavailable, or use 0 if this is the first entry
      const prevW = Math.max(0, rawW - entry.details.water_usage);
      const prevE = Math.max(0, rawE - entry.details.electricity_usage);

      setEditTransForm({
        type: "BILL",
        resident_id: id,
        year: entry.description.split(" ")[2].split("-")[0],
        month: entry.description.split(" ")[2].split("-")[1],
        water_reading: rawW,
        electricity_reading: rawE,
        water_rate: entry.details.water_rate,
        electricity_rate: entry.details.electricity_rate,
        prev_w: prevW.toFixed(2),
        prev_e: prevE.toFixed(2),
      });
    } else {
      // FIX: Ensure we capture the ID correctly.
      // Some backends return 'id' or 'payment_id'. We check both.
      setEditTransForm({
        type: "PAYMENT",
        payment_id: entry.id || entry.payment_id,
        amount: entry.amount_paid,
        notes: entry.details.notes || "",
        method: entry.details.method || "Cash",
      });
    }
    setShowEditTransModal(true);
  };

  const submitEditTransaction = async (e) => {
    e.preventDefault();
    try {
      if (editTransForm.type === "BILL") {
        await api.post("/update-transaction", {
          type: "BILL",
          resident_id: id,
          year: parseInt(editTransForm.year),
          month: parseInt(editTransForm.month),
          water_reading: parseFloat(editTransForm.water_reading),
          electricity_reading: parseFloat(editTransForm.electricity_reading),
          water_rate: parseFloat(editTransForm.water_rate),
          electricity_rate: parseFloat(editTransForm.electricity_rate),
        });
        alert("Bill Corrected & Subsequent Months Updated!");
      } else {
        await api.post("/update-transaction", {
          type: "PAYMENT",
          payment_id: editTransForm.payment_id,
          amount: parseFloat(editTransForm.amount),
          notes: editTransForm.notes,
          method: editTransForm.method,
        });
        alert("Payment Updated!");
      }
      setShowEditTransModal(false);
      fetchLedger();
    } catch (err) {
      alert(err.response?.data?.error || "Update Failed");
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await api.get(`/download-statement?resident_id=${id}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Statement_${data.profile.name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("PDF Download Failed");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-blue-600 font-bold">
        Loading Profile...
      </div>
    );
  if (!data)
    return (
      <div className="text-center mt-20 text-red-500 font-bold">
        Resident Not Found
      </div>
    );

  const { profile, financial_summary, ledger_entries } = data;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate("/residents")}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition mb-4 font-medium cursor-pointer"
        >
          <BackIcon /> Back to Directory
        </button>

        {/* --- Header --- */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-gray-100">
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-6 sm:p-10 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                  <span className="text-3xl">👤</span>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-extrabold tracking-tight">
                      {profile.name}
                    </h1>
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition text-xs flex items-center gap-1 backdrop-blur-md"
                      title="Edit Profile"
                    >
                      <EditIcon />{" "}
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-blue-100 text-sm font-medium">
                    <div className="flex items-center gap-1">
                      <HomeIcon /> {profile.home.home_name} (Floor{" "}
                      {profile.floor_no})
                    </div>
                    <div className="flex items-center gap-1">
                      <PhoneIcon /> {profile.phones.primary || "No Number"}{" "}
                      {profile.phones.secondary && (
                        <span>/ {profile.phones.secondary}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 md:mt-0 text-right bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                <p className="text-blue-100 text-xs uppercase font-bold tracking-wider mb-1">
                  Current Outstanding
                </p>
                <p
                  className={`text-4xl font-extrabold ${
                    financial_summary.current_outstanding_balance > 0
                      ? "text-red-300"
                      : "text-green-300"
                  }`}
                >
                  Rs.{" "}
                  {financial_summary.current_outstanding_balance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-white flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={() => setShowPayModal(true)}
                className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg font-semibold transition border border-green-200"
              >
                <span>💵</span> Record Payment
              </button>
              <button
                onClick={() => setShowRentModal(true)}
                className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-semibold transition border border-blue-200"
              >
                <span>📝</span> Update Rent
              </button>
            </div>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download Statement
            </button>
          </div>
        </div>

        {/* --- Stats --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">
                Base Rent
              </p>
              <span className="text-blue-500 bg-blue-50 p-1 rounded">🏠</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              Rs. {profile.current_base_rent.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">
                Lifetime Billed
              </p>
              <span className="text-yellow-600 bg-yellow-50 p-1 rounded">
                📉
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              Rs. {financial_summary.total_billed.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">
                Lifetime Paid
              </p>
              <span className="text-green-600 bg-green-50 p-1 rounded">💰</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              Rs. {financial_summary.total_paid.toLocaleString()}
            </p>
          </div>
        </div>

        {/* --- Detailed Ledger --- */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              📜 Transaction History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 text-left font-semibold">Date</th>
                  <th className="px-6 py-4 text-left font-semibold w-1/2">
                    Description & Breakdown
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Billed (+)
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Paid (-)
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Balance
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Edit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {[...ledger_entries].reverse().map((entry, idx) => {
                  // --- DISABLE EDIT LOGIC FOR BASELINE ---
                  const isBaseline =
                    entry.type === "BILL" &&
                    entry.details.water_usage === 0 &&
                    entry.details.electricity_usage === 0;

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                        {entry.date.split(" ")[0]}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              entry.type === "BILL"
                                ? "bg-red-400"
                                : "bg-green-400"
                            }`}
                          ></span>
                          <span className="font-bold text-gray-800">
                            {entry.description}
                          </span>
                        </div>
                        {entry.type === "BILL" && (
                          <div className="mt-1 ml-4 text-xs text-gray-500 space-y-0.5">
                            <div className="flex gap-3">
                              <span className="bg-gray-100 px-1.5 rounded">
                                Rent: Rs.{entry.details.rent}
                              </span>
                              <span className="bg-blue-50 text-blue-700 px-1.5 rounded">
                                💧 {entry.details.water_usage}L @ Rs.
                                {entry.details.water_rate}
                              </span>
                              <span className="bg-yellow-50 text-yellow-700 px-1.5 rounded">
                                ⚡ {entry.details.electricity_usage}U @ Rs.
                                {entry.details.electricity_rate}
                              </span>
                            </div>
                          </div>
                        )}
                        {entry.type === "PAYMENT" && entry.details.notes && (
                          <div className="mt-1 ml-4 text-xs text-gray-500 italic flex items-center gap-1">
                            <span>📝</span> {entry.details.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {entry.amount_due > 0 ? (
                          <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">
                            {entry.amount_due.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {entry.amount_paid > 0 ? (
                          <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                            {entry.amount_paid.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-extrabold text-gray-700">
                        {entry.running_balance.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() =>
                            !isBaseline && openEditTransaction(entry)
                          }
                          disabled={isBaseline}
                          className={`transition p-2 rounded-full ${
                            isBaseline
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          }`}
                          title={
                            isBaseline
                              ? "Opening Balance cannot be edited"
                              : "Edit Transaction"
                          }
                        >
                          <EditIcon />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-gray-800">
              💰 Record Payment
            </h2>
            <form onSubmit={handlePayment} className="space-y-4">
              <input
                type="number"
                className="w-full border p-2 rounded"
                placeholder="Amount"
                value={payForm.amount}
                onChange={(e) =>
                  setPayForm({ ...payForm, amount: e.target.value })
                }
                required
                autoFocus
              />
              <select
                className="w-full border p-2 rounded"
                value={payForm.method}
                onChange={(e) =>
                  setPayForm({ ...payForm, method: e.target.value })
                }
              >
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>E-Sewa</option>
              </select>
              <textarea
                className="w-full border p-2 rounded h-20"
                placeholder="Notes"
                value={payForm.notes}
                onChange={(e) =>
                  setPayForm({ ...payForm, notes: e.target.value })
                }
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-2 text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded font-bold"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-gray-800">
              📝 Update Rent
            </h2>
            <form onSubmit={handleRentUpdate} className="space-y-4">
              <input
                type="number"
                className="w-full border p-2 rounded"
                placeholder="New Rent Amount"
                value={rentForm.amount}
                onChange={(e) =>
                  setRentForm({ ...rentForm, amount: e.target.value })
                }
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRentModal(false)}
                  className="flex-1 py-2 text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded font-bold"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-gray-800">
              👤 Edit Profile
            </h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <input
                type="text"
                className="w-full border p-2 rounded"
                placeholder="Name"
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, name: e.target.value })
                }
              />
              <input
                type="text"
                className="w-full border p-2 rounded"
                placeholder="Primary Phone"
                value={profileForm.primary_phone}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    primary_phone: e.target.value,
                  })
                }
              />
              <input
                type="text"
                className="w-full border p-2 rounded"
                placeholder="Secondary Phone"
                value={profileForm.secondary_phone}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    secondary_phone: e.target.value,
                  })
                }
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2 text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 rounded font-bold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- IMPROVED EDIT TRANSACTION MODAL --- */}
      {showEditTransModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-xl shadow-2xl transform transition-all">
            <h3 className="text-2xl font-extrabold mb-6 text-gray-800 border-b pb-4">
              Correct Transaction
            </h3>

            {editTransForm.type === "BILL" ? (
              <form onSubmit={submitEditTransaction} className="space-y-6">
                {/* Water Card */}
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                  <div className="flex justify-between mb-3">
                    <label className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                      💧 Water Reading
                    </label>
                    <span className="text-xs font-bold bg-white text-blue-500 px-2 py-1 rounded shadow-sm border border-blue-100">
                      Prev: {editTransForm.prev_w}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                        New Reading
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full border border-blue-200 p-3 rounded-xl bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none font-bold text-gray-700"
                        placeholder="Reading"
                        value={editTransForm.water_reading}
                        onChange={(e) =>
                          setEditTransForm({
                            ...editTransForm,
                            water_reading: e.target.value,
                          })
                        }
                      />
                      <p className="text-[10px] text-blue-400 mt-1 text-right font-semibold">
                        New Usage:{" "}
                        <span className="text-blue-700">
                          {(
                            editTransForm.water_reading - editTransForm.prev_w
                          ).toFixed(2)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                        Rate (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full border border-blue-200 p-3 rounded-xl bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none font-bold text-gray-700"
                        value={editTransForm.water_rate}
                        onChange={(e) =>
                          setEditTransForm({
                            ...editTransForm,
                            water_rate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Electricity Card */}
                <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100 shadow-sm">
                  <div className="flex justify-between mb-3">
                    <label className="text-xs font-bold text-yellow-600 uppercase tracking-wider flex items-center gap-1">
                      ⚡ Elec Reading
                    </label>
                    <span className="text-xs font-bold bg-white text-yellow-600 px-2 py-1 rounded shadow-sm border border-yellow-100">
                      Prev: {editTransForm.prev_e}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                        New Reading
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full border border-yellow-200 p-3 rounded-xl bg-white focus:ring-4 focus:ring-yellow-100 focus:border-yellow-400 outline-none font-bold text-gray-700"
                        placeholder="Reading"
                        value={editTransForm.electricity_reading}
                        onChange={(e) =>
                          setEditTransForm({
                            ...editTransForm,
                            electricity_reading: e.target.value,
                          })
                        }
                      />
                      <p className="text-[10px] text-yellow-600 mt-1 text-right font-semibold">
                        New Usage:{" "}
                        <span className="text-yellow-800">
                          {(
                            editTransForm.electricity_reading -
                            editTransForm.prev_e
                          ).toFixed(2)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">
                        Rate (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full border border-yellow-200 p-3 rounded-xl bg-white focus:ring-4 focus:ring-yellow-100 focus:border-yellow-400 outline-none font-bold text-gray-700"
                        value={editTransForm.electricity_rate}
                        onChange={(e) =>
                          setEditTransForm({
                            ...editTransForm,
                            electricity_rate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowEditTransModal(false)}
                    className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition transform active:scale-95"
                  >
                    Update Bill
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={submitEditTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                    value={editTransForm.amount}
                    onChange={(e) =>
                      setEditTransForm({
                        ...editTransForm,
                        amount: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Method
                  </label>
                  <select
                    className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                    value={editTransForm.method}
                    onChange={(e) =>
                      setEditTransForm({
                        ...editTransForm,
                        method: e.target.value,
                      })
                    }
                  >
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>E-Sewa / Khalti</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    className="w-full border p-3 rounded-xl h-24 focus:ring-2 focus:ring-green-500 outline-none"
                    value={editTransForm.notes}
                    onChange={(e) =>
                      setEditTransForm({
                        ...editTransForm,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditTransModal(false)}
                    className="px-4 py-2 text-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-green-700 transition transform active:scale-95"
                  >
                    Update Payment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentDetail;

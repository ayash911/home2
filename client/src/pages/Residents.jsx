import { useEffect, useState } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const Residents = () => {
    const [residents, setResidents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();
    
    // Form State
    const [formData, setFormData] = useState({ 
        name: '', 
        home_id: 1, 
        floor: '', 
        primary_phone: '', 
        secondary_phone: '',
        rent_amount: ''
    });

    useEffect(() => {
        loadResidents();
    }, []);

    const loadResidents = async () => {
        try {
            const res = await api.get('/list-residents'); 
            setResidents(res.data);
        } catch (e) { console.error(e); }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            // STEP 1: Add Resident & Rent (Required by your Python backend)
            // We must use 'await' to ensure we get the response before moving on
            const res = await api.post('/add-resident', {
                name: formData.name,       // Matches python: data.get('name')
                home_id: formData.home_id, // Matches python: data.get('home_id')
                floor: formData.floor,     // Matches python: data.get('floor')
                rent: formData.rent_amount // Matches python: data.get('rent')
            });

            // STEP 2: Capture the new Resident ID
            // Your python code returns: "id": new_res.resident_id
            const newResidentId = res.data.id;

            // STEP 3: Set Phones using the ID we just got
            if (formData.primary_phone) {
                await api.post('/set-phones', {
                    resident_id: newResidentId, // Use the ID from Step 1
                    primary_phone: formData.primary_phone,
                    secondary_phone: formData.secondary_phone
                });
            }

            // Success!
            setShowModal(false);
            setFormData({ name: '', home_id: 1, floor: '', primary_phone: '', secondary_phone: '', rent_amount: '' });
            loadResidents();
            alert("Resident Added Successfully!");

        } catch (e) { 
            alert("Error adding resident: " + (e.response?.data?.error || e.message)); 
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Residents Directory</h1>
                    <button 
                        onClick={() => setShowModal(true)}
                        className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition transform hover:scale-105"
                    >
                        + New Resident
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {residents.map((r) => (
                        <div 
                            key={r.resident_id}
                            onClick={() => navigate(`/resident/${r.resident_id}`)}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 cursor-pointer transition group"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition">{r.name}</h3>
                                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-lg font-bold">#{r.resident_id}</span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-500">
                                <p className="flex items-center gap-2">
                                    <span>🏠</span> Home {r.home_id || "N/A"} <span className="text-gray-300">|</span> Floor {r.floor}
                                </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">View Details</span>
                                <div className="bg-blue-50 text-blue-600 h-8 w-8 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                                    &rarr;
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- ADD MODAL --- */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Add New Tenant</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                        </div>
                        
                        <form onSubmit={handleAdd} className="space-y-4">
                            {/* Row 1: Name & Home */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                                    <input className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-blue-500 outline-none font-bold text-gray-700" 
                                        placeholder="e.g. Ram Bahadur" 
                                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                                </div>
                            </div>

                            {/* Row 2: Location */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Home ID</label>
                                    <input type="number" className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-blue-500 outline-none" 
                                        value={formData.home_id} onChange={e => setFormData({...formData, home_id: e.target.value})} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Floor No</label>
                                    <input type="number" className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-blue-500 outline-none" 
                                        placeholder="0" 
                                        value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} required />
                                </div>
                            </div>

                            {/* Row 3: Contact */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Primary Phone</label>
                                    <input className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-blue-500 outline-none" 
                                        placeholder="98..." 
                                        value={formData.primary_phone} onChange={e => setFormData({...formData, primary_phone: e.target.value})} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Secondary (Opt)</label>
                                    <input className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-blue-500 outline-none" 
                                        placeholder="Optional" 
                                        value={formData.secondary_phone} onChange={e => setFormData({...formData, secondary_phone: e.target.value})} />
                                </div>
                            </div>

                            {/* Row 4: Rent */}
                            <div>
                                <label className="block text-xs font-bold text-green-600 uppercase mb-1">Monthly Base Rent (Rs.)</label>
                                <input type="number" className="w-full border-2 border-green-100 bg-green-50 p-3 rounded-xl focus:border-green-500 outline-none font-bold text-green-700" 
                                    placeholder="e.g. 15000" 
                                    value={formData.rent_amount} onChange={e => setFormData({...formData, rent_amount: e.target.value})} required />
                            </div>
                            
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition">Save Tenant</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Residents;
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const { logout, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Helper to highlight active link
    const isActive = (path) => location.pathname === path ? "bg-blue-800" : "";

    return (
        <nav className="bg-blue-900 text-white shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between h-16">
                    <div className="flex items-center space-x-8">
                        <span className="text-xl font-bold tracking-wider mr-4">🏠 HomeUtility</span>
                        
                        {/* Navigation Links */}
                        <div className="hidden md:flex space-x-2">
                            <Link to="/dashboard" className={`px-3 py-2 rounded hover:bg-blue-800 ${isActive('/dashboard')}`}>
                                Dashboard
                            </Link>
                            <Link to="/residents" className={`px-3 py-2 rounded hover:bg-blue-800 ${isActive('/residents')}`}>
                                Residents
                            </Link>
                            <Link to="/add-reading" className={`px-3 py-2 rounded hover:bg-blue-800 ${isActive('/add-reading')}`}>
                                + Add Reading
                            </Link>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-300 hidden md:block">{user?.username}</span>
                        <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded text-sm">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
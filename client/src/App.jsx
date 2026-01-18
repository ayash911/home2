import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';        // New
import AddReading from './pages/AddReading';      // New
import ResidentDetail from './pages/ResidentDetail'; // New (The Super Page)

// Protected Route Wrapper
const PrivateRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div className="p-10">Loading...</div>;
    return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/residents" element={<PrivateRoute><Residents /></PrivateRoute>} />
          <Route path="/add-reading" element={<PrivateRoute><AddReading /></PrivateRoute>} />
          
          {/* Dynamic Route: The :id lets us grab the specific resident */}
          <Route path="/resident/:id" element={<PrivateRoute><ResidentDetail /></PrivateRoute>} />
          
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
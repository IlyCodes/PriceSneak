import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { Login } from './features/auth/routes/Login';
import { Register } from './features/auth/routes/Register';

const Dashboard = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans text-gray-900">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Dashboard (Protégé)</h1>
        <p className="text-gray-500 mb-6">Si vous voyez cette page, c'est que votre JWT est valide.</p>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

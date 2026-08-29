import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './features/auth/context/AuthContext';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { Login } from './features/auth/routes/Login';
import { Register } from './features/auth/routes/Register';
import { VerifyEmail } from './features/auth/routes/VerifyEmail';
import { ForgotPassword } from './features/auth/routes/ForgotPassword';
import { ResetPassword } from './features/auth/routes/ResetPassword';
import { AdminRoute } from './features/auth/components/AdminRoute';
import { AdminPanel } from './features/admin/routes/AdminPanel';
import { Settings as SettingsPage } from './features/settings/routes/Settings';
import { Dashboard } from './features/dashboard/routes/Dashboard';
import { ProductsList } from './features/products/routes/ProductsList';
import { ProductDetails } from './features/products/routes/ProductDetails';
import { PricingRules } from './features/pricing-rules/routes/PricingRules';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<ProductsList />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/rules" element={<PricingRules />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPanel />} />
            </Route>
          </Route>
        </Routes>
      </Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'bg-white/80 backdrop-blur-md border border-gray-100 text-slate-800 shadow-xl rounded-2xl',
          duration: 4000,
          style: {
            padding: '16px',
            color: '#1e293b',
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;

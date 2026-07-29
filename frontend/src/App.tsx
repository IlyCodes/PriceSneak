import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { Login } from './features/auth/routes/Login';
import { Register } from './features/auth/routes/Register';
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
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<ProductsList />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/rules" element={<PricingRules />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

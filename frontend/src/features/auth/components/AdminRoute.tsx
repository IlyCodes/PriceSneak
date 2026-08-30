import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AdminRoute = () => {
  const { user, token } = useAuth();

  // Si on a un token mais que l'utilisateur n'est pas admin, on le redirige vers son dashboard
  if (token && user && !user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  // S'il n'y a ni token ni user, c'est géré par ProtectedRoute en amont
  // S'il est admin, on affiche le contenu enfant
  return <Outlet />;
};

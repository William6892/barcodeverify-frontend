// components/auth/AdminRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminRoute() {
  const { user } = useAuth();

  if (user?.role !== 'Admin') {
    // Si no es admin, redirigir al escáner
    return <Navigate to="/scanner" replace />;
  }

  return <Outlet />;
}
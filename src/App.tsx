import { Routes, Route } from 'react-router-dom'; 
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import UsersManagementPage from './pages/UsersManagementPage';
import ShipmentsPage from './pages/ShipmentsPage';
import ScannerPage from './pages/ScannerPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';
import Layout from './components/layout/Layout';
import TransportCompaniesPage from './pages/TransportCompaniesPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Rutas protegidas */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              {/* La raíz redirige al scanner para todos */}
              <Route path="/" element={<ScannerPage />} />
              
              {/* SOLO ADMIN: Dashboard y gestión de usuarios */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/users" element={<UsersManagementPage />} />
              </Route>
              
              {/* PARA TODOS LOS USUARIOS: Envíos y transportadoras */}
              <Route path="/shipments" element={<ShipmentsPage />} />
              <Route path="/transportadoras" element={<TransportCompaniesPage />} />
              <Route path="/scanner" element={<ScannerPage />} />
              
              {/* Opcional: Rutas para perfil y ayuda */}
              <Route path="/profile" element={<div>Perfil del usuario</div>} />
              <Route path="/help" element={<div>Página de ayuda</div>} />
            </Route>
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
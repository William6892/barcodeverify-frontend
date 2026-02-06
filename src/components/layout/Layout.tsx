// Layout.tsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* SIDEBAR - Navegación principal */}
      <Sidebar isAdmin={isAdmin} />
      
      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col">
        {/* HEADER con info de usuario */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Bienvenido, {user?.username}
              </h1>
              <p className="text-sm text-gray-500">
                {isAdmin ? 'Administrador' : 'Usuario'}
              </p>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </header>
        
        {/* CONTENIDO DE LA PÁGINA */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
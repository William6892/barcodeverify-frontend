// components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { 
  BarChart,  // Dashboard primero
  Package,   // Envíos
  Camera,    // Escanear  
  Truck,     // Transportadoras
  Users,     // Usuarios
  User,      // Mi Perfil
  Bell,      // Notificaciones
} from 'lucide-react';

interface SidebarProps {
  isAdmin: boolean;
}

export default function Sidebar({ isAdmin }: SidebarProps) {
  // ADMIN: Dashboard PRIMERO, luego el resto
  const adminItems = [
    { to: '/admin', icon: BarChart, label: 'Dashboard' }, 
    { to: '/shipments', icon: Package, label: 'Envíos' },
    { to: '/transportadoras', icon: Truck, label: 'Transportadoras' },
    { to: '/scanner', icon: Camera, label: 'Escanear' },
    { to: '/users', icon: Users, label: 'Usuarios' },
  ];

  // USUARIO NORMAL: Escanear primero, luego lo demás
  const userItems = [
    { to: '/scanner', icon: Camera, label: 'Escanear' }, 
    { to: '/shipments', icon: Package, label: 'Envíos' },
    { to: '/transportadoras', icon: Truck, label: 'Transportadoras' },
    { to: '/profile', icon: User, label: 'Mi Perfil' },
    { to: '/notifications', icon: Bell, label: 'Notificaciones' },
  ];

  // Usar items según el rol
  const navItems = isAdmin ? adminItems : userItems;

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4">
      {/* Logo */}
      <div className="p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Sistema de Escaneo</h1>
            <p className="text-sm text-gray-500"> de Seguridad Samcol</p>
          </div>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="space-y-1">
        <p className="text-xs font-medium text-gray-500 uppercase px-4 py-2">
          {isAdmin ? 'Administración' : 'Navegación Principal'}
        </p>
        
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
            end={item.to === '/admin' || item.to === '/scanner'}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Consejo rápido */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <Camera className="w-4 h-4 text-primary-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Consejo Rápido</h3>
        </div>
        <p className="text-sm text-gray-600">
          {isAdmin 
            ? 'Revisa el dashboard diariamente para estadísticas actualizadas.' 
            : 'Usa un lector USB para escanear códigos de barras rápidamente.'}
        </p>
      </div>

      {/* Información de versión */}
      <div className="mt-auto pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Seguridad Samcol v1.0.0 • © 2026
        </p>
      </div>
    </aside>
  );
}
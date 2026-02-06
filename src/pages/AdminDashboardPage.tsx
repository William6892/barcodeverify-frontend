import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  Truck, 
  BarChart, 
  TrendingUp, 
  Activity,
  UserCheck,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// Importa el servicio de admin
import { adminService } from '../services/api'; // <-- AÑADIDO

// Tipos basados en API 
interface DashboardStats {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalShipments: number;
    totalProductsScanned: number;
    totalUsersActive: number;
    avgProductsPerShipment: number;
  };
  topTransportCompanies: Array<{
    companyId: number;
    companyName: string;
    driverName: string;
    shipmentCount: number;
    productCount: number;
  }>;
  topUsers: Array<{
    userId: number;
    username: string;
    email: string;
    scanCount: number;
    totalProductsScanned: number;
    lastScan: string;
  }>;
  topProducts: Array<{
    barcode: string;
    name: string;
    category: string;
    brand: string;
    totalQuantity: number;
    shipmentCount: number;
  }>;
  shipmentsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  dailyActivity: Array<{
    date: string;
    scanOperations: number;
    productsScanned: number;
  }>;
}

// interfaz pero la USA para que no dé error
interface QuickStats {
  today: {
    shipments: number;
    productsScanned: number;
  };
  system: {
    activeUsers: number;
    pendingShipments: number;
    inProgressShipments: number;
  };
}

export default function AdminDashboardPage() {
  const { token, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Obteniendo estadísticas de admin...');
      
      // ✅ CORRECTO: Usar adminService que ya tiene la URL base configurada
      const [dashboardData, quickStatsData] = await Promise.all([
        adminService.getDashboardStats().catch(err => {
          console.error('Error en getDashboardStats:', err);
          throw err;
        }),
        adminService.getQuickStats().catch(err => {
          console.warn('Quick stats no disponibles:', err.message);
          return null; // No fallar si quickStats falla
        })
      ]);
      
      console.log('✅ Dashboard data recibida:', dashboardData);
      console.log('✅ Quick stats recibidas:', quickStatsData);
      
      setStats(dashboardData);
      setQuickStats(quickStatsData);
      
    } catch (err: any) {
      console.error('❌ Error fetching admin stats:', err);
      
      // Extraer mensaje de error más descriptivo
      let errorMessage = 'Error al cargar las estadísticas del sistema';
      
      // Verificar el tipo de error
      if (err.response?.status === 401) {
        errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
      } else if (err.response?.status === 403) {
        errorMessage = 'No tienes permisos de administrador.';
      } else if (err.response?.status === 404) {
        errorMessage = 'No se encontró el recurso solicitado. Verifica la configuración del backend.';
      } else if (err.message?.includes('Network Error')) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, [token]); // Refetch cuando cambie el token

  // Calcular estadísticas derivadas
  const calculateDerivedStats = () => {
    if (!stats) return null;

    const completedShipments = stats.shipmentsByStatus.find(s => 
      s.status.toLowerCase().includes('completed') || 
      s.status.toLowerCase().includes('delivered')
    )?.count || 0;

    const activeShipments = stats.shipmentsByStatus.find(s => 
      s.status.toLowerCase().includes('active') || 
      s.status.toLowerCase().includes('progress') ||
      s.status.toLowerCase().includes('transit')
    )?.count || 0;

    const pendingShipments = stats.shipmentsByStatus.find(s => 
      s.status.toLowerCase().includes('pending') || 
      s.status.toLowerCase().includes('preparing')
    )?.count || 0;

    // Escaneos hoy - USAMOS quickStats si está disponible
    let dailyScans = 0;
    
    if (quickStats?.today?.productsScanned) {
      dailyScans = quickStats.today.productsScanned;
    } else {
      // Fallback a stats.dailyActivity
      const today = new Date().toISOString().split('T')[0];
      const todayActivity = stats.dailyActivity.find(activity => 
        activity.date.split('T')[0] === today
      );
      dailyScans = todayActivity?.productsScanned || 0;
    }

    // Crecimiento (comparar con ayer)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayActivity = stats.dailyActivity.find(activity => 
      activity.date.split('T')[0] === yesterdayStr
    );
    const yesterdayScans = yesterdayActivity?.productsScanned || 0;
    const growthRate = yesterdayScans > 0 
      ? ((dailyScans - yesterdayScans) / yesterdayScans * 100).toFixed(1)
      : '0.0';

    return {
      totalUsers: stats.summary.totalUsersActive,
      activeUsers: stats.summary.totalUsersActive,
      totalShipments: stats.summary.totalShipments,
      activeShipments,
      completedShipments,
      pendingShipments,
      transportCompanies: stats.topTransportCompanies.length,
      dailyScans,
      growthRate: parseFloat(growthRate),
      // datos de quickStats si están disponibles
      todayShipments: quickStats?.today?.shipments || 0,
      activeUsersCount: quickStats?.system?.activeUsers || stats.summary.totalUsersActive,
      pendingShipmentsCount: quickStats?.system?.pendingShipments || pendingShipments,
      inProgressShipmentsCount: quickStats?.system?.inProgressShipments || activeShipments
    };
  };

  const derivedStats = calculateDerivedStats();

  // Función para recargar
  const handleRefresh = () => {
    fetchAdminStats();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
          <div className="text-sm text-gray-500">
            <Activity className="w-4 h-4 inline mr-2" />
            Cargando...
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Panel de Administración</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-600">Error</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
            {error.includes('Sesión expirada') && (
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Ir al Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6">
      {/* Header con botón de recarga */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-600">
            Período: {stats?.period?.start ? formatDate(stats.period.start) : ''} - {stats?.period?.end ? formatDate(stats.period.end) : ''}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Activity className="w-4 h-4" />
            <span>Actualizado en tiempo real</span>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Estadísticas principales - USAMOS quickStats donde sea relevante */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Usuarios */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className={`text-sm font-medium px-2 py-1 rounded-full ${
              derivedStats?.growthRate && derivedStats.growthRate > 0
                ? 'text-green-600 bg-green-50'
                : 'text-red-600 bg-red-50'
            }`}>
              {derivedStats?.growthRate && derivedStats.growthRate > 0 ? '+' : ''}{derivedStats?.growthRate}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{derivedStats?.activeUsersCount || derivedStats?.totalUsers || 0}</h3>
          <p className="text-gray-500">Usuarios Activos</p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <UserCheck className="w-4 h-4 text-green-500" />
            <span className="text-green-600">{derivedStats?.activeUsersCount || stats?.summary.totalUsersActive || 0} activos hoy</span>
          </div>
        </div>

        {/* Envíos */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex gap-1">
              <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">
                {derivedStats?.completedShipments || 0}
              </span>
              <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {derivedStats?.inProgressShipmentsCount || derivedStats?.activeShipments || 0}
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{derivedStats?.totalShipments || 0}</h3>
          <p className="text-gray-500">Envíos Totales</p>
          <div className="mt-2 text-sm text-gray-600">
            <span className="text-green-600">{derivedStats?.completedShipments || 0} completados</span>
            {' • '}
            <span className="text-blue-600">{derivedStats?.inProgressShipmentsCount || derivedStats?.activeShipments || 0} activos</span>
          </div>
        </div>

        {/* Transportadoras */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 rounded-lg">
              <Truck className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Top 1</div>
              <div className="font-medium text-gray-900">
                {stats?.topTransportCompanies[0]?.companyName || 'N/A'}
              </div>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{derivedStats?.transportCompanies || 0}</h3>
          <p className="text-gray-500">Transportadoras</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <Package className="w-4 h-4" />
            <span>{stats?.topTransportCompanies[0]?.shipmentCount || 0} envíos</span>
          </div>
        </div>

        {/* Escaneos */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <BarChart className="w-6 h-6 text-green-600" />
            </div>
            {derivedStats?.growthRate && derivedStats.growthRate > 0 ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingUp className="w-5 h-5 text-red-500 transform rotate-180" />
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{derivedStats?.dailyScans || 0}</h3>
          <p className="text-gray-500">Escaneos Hoy</p>
          <div className="mt-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500" 
                style={{ 
                  width: `${Math.min(100, (derivedStats?.dailyScans || 0) / 500 * 100)}%` 
                }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats?.summary.avgProductsPerShipment || 0} productos/envió promedio
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos y tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Transportadoras */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Transportadoras</h3>
          <div className="space-y-4">
            {stats?.topTransportCompanies.slice(0, 5).map((company, index) => (
              <div key={company.companyId} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{company.companyName}</p>
                      <p className="text-sm text-gray-500">{company.driverName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{company.shipmentCount} envíos</p>
                    <p className="text-sm text-gray-500">{company.productCount} productos</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Usuarios */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Usuarios</h3>
          <div className="space-y-4">
            {stats?.topUsers.slice(0, 5).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    index === 0 ? 'bg-yellow-100 text-yellow-600' :
                    index === 1 ? 'bg-gray-100 text-gray-600' :
                    index === 2 ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.username}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{user.totalProductsScanned} productos</p>
                  <p className="text-sm text-gray-500">{user.scanCount} escaneos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Envíos por estado y Productos más escaneados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Envíos por Estado */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Envíos por Estado</h3>
          <div className="space-y-4">
            {stats?.shipmentsByStatus.map((item) => (
              <div key={item.status} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.status}</span>
                  <span className="font-medium">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      item.status.toLowerCase().includes('completed') ? 'bg-green-500' :
                      item.status.toLowerCase().includes('progress') ? 'bg-blue-500' :
                      item.status.toLowerCase().includes('pending') ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Productos más escaneados */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos más Escaneados</h3>
          <div className="space-y-4">
            {stats?.topProducts.slice(0, 5).map((product, index) => (
              <div key={product.barcode} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    index === 0 ? 'bg-green-100 text-green-600' :
                    index === 1 ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="max-w-xs">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <div className="flex gap-2 text-sm text-gray-500">
                      <span>{product.barcode}</span>
                      <span>•</span>
                      <span>{product.category}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{product.totalQuantity} unidades</p>
                  <p className="text-sm text-gray-500">{product.shipmentCount} envíos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actividad diaria */}
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Diaria (Últimos 7 días)</h3>
        <div className="space-y-4">
          {stats?.dailyActivity.slice(-7).map((activity) => (
            <div key={activity.date} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Activity className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(activity.date).toLocaleDateString('es-ES', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </p>
                  <p className="text-sm text-gray-500">Día de actividad</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{activity.productsScanned} productos</p>
                <p className="text-sm text-gray-500">{activity.scanOperations} operaciones</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
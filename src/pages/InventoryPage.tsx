// pages/InventoryPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { 
  Boxes, Package, AlertCircle, Filter, X,
  TrendingDown, TrendingUp, CircleOff, Search, RefreshCw
} from 'lucide-react';
import { inventoryService } from '../services/api';
import type { StockSummary, DailyStock } from '../services/api';

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StockSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<DailyStock[]>([]);
  
  // ✅ Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    productName: '',
    minStock: '',
    maxStock: ''
  });

  // ✅ Opciones de estados de stock
  const statusOptions = [
    { value: '', label: 'Todos los productos' },
    { value: 'normal', label: 'Stock Normal (>10)' },
    { value: 'low', label: 'Stock Bajo (1-9)' },
    { value: 'out', label: 'Agotado (0)' }
  ];

  // ✅ Manejar cambios en filtros
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // ✅ Limpiar todos los filtros
  const clearFilters = () => {
    setFilters({
      status: '',
      productName: '',
      minStock: '',
      maxStock: ''
    });
    setSearchTerm('');
  };

  // ✅ Verificar si hay filtros activos
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => v !== '') || searchTerm !== '';
  }, [filters, searchTerm]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (data) {
      let filtered = [...data.productos];
      
      // Filtro por búsqueda de nombre
      if (searchTerm) {
        filtered = filtered.filter(p =>
          p.productName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Filtro por nombre de producto
      if (filters.productName) {
        filtered = filtered.filter(p =>
          p.productName.toLowerCase().includes(filters.productName.toLowerCase())
        );
      }
      
      // Filtro por estado de stock
      if (filters.status) {
        filtered = filtered.filter(p => {
          if (filters.status === 'normal') return p.actual > 10;
          if (filters.status === 'low') return p.actual > 0 && p.actual <= 10;
          if (filters.status === 'out') return p.actual === 0;
          return true;
        });
      }
      
      // Filtro por stock mínimo
      if (filters.minStock) {
        const min = parseInt(filters.minStock);
        if (!isNaN(min)) {
          filtered = filtered.filter(p => p.actual >= min);
        }
      }
      
      // Filtro por stock máximo
      if (filters.maxStock) {
        const max = parseInt(filters.maxStock);
        if (!isNaN(max)) {
          filtered = filtered.filter(p => p.actual <= max);
        }
      }
      
      setFilteredProducts(filtered);
    }
  }, [searchTerm, filters, data]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await inventoryService.getTodayStock();
      setData(result);
      setFilteredProducts(result.productos);
    } catch (error) {
      console.error('Error cargando inventario:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('es-CO');
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">AGOTADO</span>;
    }
    if (stock < 10) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">STOCK BAJO</span>;
    }
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">NORMAL</span>;
  };

  const getStockIcon = (stock: number) => {
    if (stock === 0) return <CircleOff className="w-4 h-4 text-red-500" />;
    if (stock < 10) return <TrendingDown className="w-4 h-4 text-yellow-500" />;
    return <TrendingUp className="w-4 h-4 text-green-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Error al cargar los datos de inventario</p>
          <button 
            onClick={loadData}
            className="mt-4 btn-primary flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary-50 rounded-lg">
                <Boxes className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
                  Control de Inventario
                </h1>
                <p className="text-gray-600 mt-0.5 sm:mt-1 text-sm sm:text-base">
                  Resumen del día: <strong>{data.fecha}</strong>
                </p>
              </div>
            </div>
            
            {/* Botones de acción */}
            <div className="flex gap-2 mt-2 sm:mt-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all ${
                  showFilters || hasActiveFilters
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
                aria-label="Mostrar filtros"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveFilters && (
                  <span className="ml-1 w-2 h-2 bg-primary-500 rounded-full"></span>
                )}
              </button>
              
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtros de búsqueda
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Limpiar filtros
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Búsqueda por nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  Producto
                </label>
                <input
                  type="text"
                  value={filters.productName}
                  onChange={(e) => handleFilterChange('productName', e.target.value)}
                  placeholder="Nombre del producto"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>

              {/* Estado de stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  Estado
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock mínimo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Stock mínimo
                </label>
                <input
                  type="number"
                  value={filters.minStock}
                  onChange={(e) => handleFilterChange('minStock', e.target.value)}
                  placeholder="Ej: 10"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>

              {/* Stock máximo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Stock máximo
                </label>
                <input
                  type="number"
                  value={filters.maxStock}
                  onChange={(e) => handleFilterChange('maxStock', e.target.value)}
                  placeholder="Ej: 100"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>
            </div>

            {/* Resumen de filtros activos */}
            {hasActiveFilters && (
              <div className="mt-4 pt-3 border-t flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">Filtros aplicados:</span>
                {(filters.productName || searchTerm) && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full flex items-center gap-1">
                    Producto: {filters.productName || searchTerm}
                    <button onClick={() => {
                      handleFilterChange('productName', '');
                      setSearchTerm('');
                    }} className="hover:text-primary-900">
                      <X className="w-2 h-2" />
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full flex items-center gap-1">
                    Estado: {statusOptions.find(o => o.value === filters.status)?.label}
                    <button onClick={() => handleFilterChange('status', '')} className="hover:text-primary-900">
                      <X className="w-2 h-2" />
                    </button>
                  </span>
                )}
                {filters.minStock && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full flex items-center gap-1">
                    Stock ≥ {filters.minStock}
                    <button onClick={() => handleFilterChange('minStock', '')} className="hover:text-primary-900">
                      <X className="w-2 h-2" />
                    </button>
                  </span>
                )}
                {filters.maxStock && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full flex items-center gap-1">
                    Stock ≤ {filters.maxStock}
                    <button onClick={() => handleFilterChange('maxStock', '')} className="hover:text-primary-900">
                      <X className="w-2 h-2" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Productos</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary-600">
                  {data.resumen.total_productos}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-primary-50 rounded-full">
                <Boxes className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Salidas Hoy</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600">
                  {formatNumber(data.resumen.total_salidas)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-red-50 rounded-full">
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Stock Bajo (&lt;10)</p>
                <p className={`text-2xl sm:text-3xl font-bold ${data.resumen.stock_bajo > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {data.resumen.stock_bajo}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-50 rounded-full">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Productos Agotados</p>
                <p className={`text-2xl sm:text-3xl font-bold ${data.resumen.productos_agotados > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {data.resumen.productos_agotados}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-red-50 rounded-full">
                <CircleOff className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda rápida */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
          <div className="mt-3 text-end">
            <small className="text-gray-500">
              Mostrando {filteredProducts.length} de {data.productos.length} productos
            </small>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6 md:mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Inicial
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salieron Hoy
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Actual
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr key={product.productId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStockIcon(product.actual)}
                          <span className="font-medium text-gray-900">
                            {product.productName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatNumber(product.inicial)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        {formatNumber(product.salieron)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {formatNumber(product.actual)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStockBadge(product.actual)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No se encontraron productos con los filtros aplicados</p>
                      <button
                        onClick={clearFilters}
                        className="mt-2 text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Limpiar filtros
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Información adicional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {/* Tarjeta 1: Interpretación */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-blue-800 text-sm sm:text-base">Interpretación</h3>
            </div>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-blue-700">
              <li className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                <span><strong>Normal:</strong> Stock &gt; 10 unidades</span>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-500 rounded-full flex-shrink-0"></span>
                <span><strong>Stock Bajo:</strong> Entre 1 y 10 unidades</span>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full flex-shrink-0"></span>
                <span><strong>Agotado:</strong> 0 unidades disponibles</span>
              </li>
            </ul>
          </div>
          
          {/* Tarjeta 2: Acciones Recomendadas */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-green-800 text-sm sm:text-base">Recomendaciones</h3>
            </div>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-green-700">
              <li className="flex items-start gap-1.5 sm:gap-2">
                <span className="mt-0.5">•</span>
                <span><strong>Stock Bajo:</strong> Considerar reabastecimiento</span>
              </li>
              <li className="flex items-start gap-1.5 sm:gap-2">
                <span className="mt-0.5">•</span>
                <span><strong>Agotados:</strong> Priorizar compra urgente</span>
              </li>
              <li className="flex items-start gap-1.5 sm:gap-2">
                <span className="mt-0.5">•</span>
                <span><strong>Normal:</strong> Inventario saludable</span>
              </li>
            </ul>
          </div>
          
          {/* Tarjeta 3: Auditoría Rápida */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 sm:p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-purple-800 text-sm sm:text-base">Auditoría Rápida</h3>
            </div>
            <p className="text-xs sm:text-sm text-purple-700 mb-2 sm:mb-3">
              El stock actual se calcula automáticamente: Stock Inicial - Salidas de hoy
            </p>
            <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-xs text-purple-600 font-medium flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" />
                <span>Actualización automática cada 5 minutos</span>
              </p>
            </div>
          </div>
        </div>

        {/* Guía rápida - Solo en móviles */}
        <div className="sm:hidden bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-4 mt-6">
          <h3 className="font-semibold text-primary-800 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            ¿Qué significa cada columna?
          </h3>
          <ol className="text-sm text-primary-700 space-y-1.5 list-decimal pl-4">
            <li><strong>Stock Inicial:</strong> Lo que había al empezar el día</li>
            <li><strong>Salieron Hoy:</strong> Total de unidades escaneadas hoy</li>
            <li><strong>Stock Actual:</strong> Lo que queda disponible ahora</li>
            <li><strong>Estado:</strong> Alerta según cantidad disponible</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
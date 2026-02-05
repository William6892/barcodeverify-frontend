import { useState, useEffect } from 'react';
import { Package, Truck, Play, RefreshCw, AlertCircle, CheckCircle, XCircle, Filter, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { shipmentService } from '../../services/api';
// import { toast } from 'react-hot-toast'; // Eliminado si no se usa
import './ActiveShipments.css';

type ShipmentStatus = 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';

interface Shipment {
  id: number;
  shipmentNumber: string;
  status: ShipmentStatus;
  transportCompany?: {
    name: string;
    driverName: string;
    licensePlate: string;
    phone?: string;
  };
  productCount: number;
  createdAt: string;
  estimatedDeparture?: string;
}

interface ActiveShipmentsProps {
  onSelectShipment: (shipmentId: number, shipmentNumber: string) => void;
  // onRefresh?: () => void; // Eliminado porque no se usa
  showAll?: boolean;
  showFilters?: boolean;
}

export default function ActiveShipments({ onSelectShipment, showAll = false, showFilters = true }: ActiveShipmentsProps) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const loadShipments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data;
      
      if (showAll) {
        try {
          const response = await shipmentService.getAll();
          data = response;
        } catch (error) {
          console.log('getAll no disponible, usando getActive como fallback');
          const response = await shipmentService.getActive();
          data = response;
        }
      } else {
        const response = await shipmentService.getActive();
        data = response;
      }
      
      if (!data) {
        setShipments([]);
        return;
      }
      
      // Normalizar datos
      let normalizedData: any[] = [];
      
      if (Array.isArray(data)) {
        normalizedData = data;
      } else if (data.data && Array.isArray(data.data)) {
        normalizedData = data.data;
      } else if (data.shipments && Array.isArray(data.shipments)) {
        normalizedData = data.shipments;
      } else if (data && typeof data === 'object') {
        normalizedData = [data];
      } else {
        normalizedData = [];
      }
      
      // Filtrar para asegurar que solo tengamos estados válidos
      const validShipments = normalizedData.filter((shipment: any) => 
        shipment && 
        shipment.id && 
        shipment.shipmentNumber &&
        ['Pending', 'InProgress', 'Completed', 'Cancelled'].includes(shipment.status)
      );
      
      // Ordenar por fecha (más reciente primero)
      const sortedData = validShipments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setShipments(sortedData);
      
    } catch (error: any) {
      console.error('Error cargando envíos:', error);
      
      let errorMessage = 'Error de conexión';
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Error ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No se recibió respuesta del servidor';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setShipments([]);
      
      // Solo mostrar toast si el componente toast está disponible
      // if (error.response?.status === 401 && typeof toast !== 'undefined') {
      //   toast.error('Sesión expirada. Por favor inicia sesión nuevamente.');
      // }
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, [showAll]);

  const handleStartScanning = async (shipmentId: number, shipmentNumber: string) => {
    try {
      await shipmentService.start(shipmentNumber);
      // Mostrar mensaje de éxito si toast está disponible
      // if (typeof toast !== 'undefined') {
      //   toast.success(`Escaneo iniciado para ${shipmentNumber}`);
      // } else {
      alert(`Escaneo iniciado para ${shipmentNumber}`);
      // }
      onSelectShipment(shipmentId, shipmentNumber);
      loadShipments();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error iniciando escaneo';
      // if (typeof toast !== 'undefined') {
      //   toast.error(errorMsg);
      // } else {
      alert(errorMsg);
      // }
    }
  };

  const handleCancelShipment = async (shipmentId: number, shipmentNumber: string) => {
    if (!confirm(`¿Estás seguro de cancelar el envío ${shipmentNumber}?`)) {
      return;
    }
    
    try {
      const response = await shipmentService.cancel(shipmentId);
      // Mostrar éxito
      // if (typeof toast !== 'undefined') {
      //   toast.success(response.message || 'Envío cancelado exitosamente');
      // } else {
      alert(response.message || 'Envío cancelado exitosamente');
      // }
      await loadShipments();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error cancelando envío';
      // if (typeof toast !== 'undefined') {
      //   toast.error(errorMsg);
      // } else {
      alert(errorMsg);
      // }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'InProgress': return 'shipment-status-inprogress';
      case 'Pending': return 'shipment-status-pending';
      case 'Completed': return 'shipment-status-completed';
      case 'Cancelled': return 'shipment-status-cancelled';
      default: return 'shipment-status-default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'InProgress': return 'En Progreso';
      case 'Pending': return 'Pendiente';
      case 'Completed': return 'Completado';
      case 'Cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="status-icon" />;
      case 'InProgress': return <Play className="status-icon" />;
      case 'Pending': return <AlertCircle className="status-icon" />;
      case 'Cancelled': return <XCircle className="status-icon" />;
      default: return <Package className="status-icon" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificada';
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const filterShipments = () => {
    let filtered = shipments;
    
    if (filterStatus === 'active') {
      filtered = filtered.filter(s => s.status === 'Pending' || s.status === 'InProgress');
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(s => s.status === 'Completed');
    } else if (filterStatus === 'cancelled') {
      filtered = filtered.filter(s => s.status === 'Cancelled');
    }
    
    if (dateFilter) {
      filtered = filtered.filter(s => {
        const shipDate = new Date(s.createdAt).toISOString().split('T')[0];
        return shipDate === dateFilter;
      });
    }
    
    return filtered;
  };

  const filteredShipments = filterShipments();
  const activeCount = shipments.filter(s => s.status === 'Pending' || s.status === 'InProgress').length;
  const completedCount = shipments.filter(s => s.status === 'Completed').length;
  const cancelledCount = shipments.filter(s => s.status === 'Cancelled').length;

  if (loading) {
    return (
      <div className="shipment-loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Cargando envíos...</p>
      </div>
    );
  }

  if (error && shipments.length === 0) {
    return (
      <div className="shipment-error">
        <AlertCircle className="error-icon" />
        <h3 className="error-title">Error de conexión</h3>
        <p className="error-message">{error}</p>
        <button
          onClick={loadShipments}
          className="error-retry-button"
        >
          <RefreshCw className="retry-icon" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="shipment-container">
      {/* Header */}
      <div className="shipment-header">
        <div className="header-title-container">
          <h2 className="shipment-title">
            {showAll ? 'Todos los Envíos' : 'Envíos Activos'}
          </h2>
          <p className="shipment-subtitle">
            {filteredShipments.length} envío{filteredShipments.length !== 1 ? 's' : ''} encontrado{filteredShipments.length !== 1 ? 's' : ''}
            {!showAll && ` (${activeCount} activos)`}
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={loadShipments}
            className="refresh-button"
            disabled={loading}
          >
            <RefreshCw className={`refresh-icon ${loading ? 'spin' : ''}`} />
            <span className="refresh-text">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && showAll && (
        <div className="filters-container">
          {/* Botón para mostrar/ocultar filtros en móvil */}
          <div className="filters-mobile-toggle">
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="filters-toggle-button"
            >
              <span className="filters-toggle-text">
                <Filter className="filters-toggle-icon" />
                Filtros
              </span>
              {isFiltersOpen ? (
                <ChevronUp className="filters-chevron" />
              ) : (
                <ChevronDown className="filters-chevron" />
              )}
            </button>
          </div>

          {/* Contenido de filtros */}
          <div className={`filters-content ${isFiltersOpen ? 'filters-open' : ''}`}>
            <div className="filters-grid">
              {/* Filtros por estado */}
              <div className="status-filters">
                <label className="filters-label">
                  Filtrar por estado
                </label>
                <div className="filters-buttons">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`filter-button ${filterStatus === 'all' ? 'filter-button-active filter-all' : 'filter-button-inactive'}`}
                  >
                    <span className="filter-button-content">
                      <Filter className="filter-icon" />
                      <span>Todos</span>
                      <span className="filter-count">({shipments.length})</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setFilterStatus('active')}
                    className={`filter-button ${filterStatus === 'active' ? 'filter-button-active filter-active' : 'filter-button-inactive'}`}
                  >
                    <span className="filter-button-content">
                      <Play className="filter-icon" />
                      <span>Activos</span>
                      <span className="filter-count">({activeCount})</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setFilterStatus('completed')}
                    className={`filter-button ${filterStatus === 'completed' ? 'filter-button-active filter-completed' : 'filter-button-inactive'}`}
                  >
                    <span className="filter-button-content">
                      <CheckCircle className="filter-icon" />
                      <span>Complet.</span>
                      <span className="filter-count">({completedCount})</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setFilterStatus('cancelled')}
                    className={`filter-button ${filterStatus === 'cancelled' ? 'filter-button-active filter-cancelled' : 'filter-button-inactive'}`}
                  >
                    <span className="filter-button-content">
                      <XCircle className="filter-icon" />
                      <span>Cancel.</span>
                      <span className="filter-count">({cancelledCount})</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Filtro por fecha */}
              <div className="date-filter">
                <label className="filters-label">
                  Filtrar por fecha
                </label>
                <div className="date-input-container">
                  <Calendar className="date-icon" />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="date-input"
                  />
                  {dateFilter && (
                    <button
                      onClick={() => setDateFilter('')}
                      className="date-clear-button"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de envíos */}
      <div className="shipments-grid">
        {filteredShipments.map((shipment) => (
          <div 
            key={shipment.id} 
            className="shipment-card"
          >
            {/* Header de la tarjeta */}
            <div className="card-header">
              <div className="card-header-info">
                <div className="status-container">
                  <span className={`status-badge ${getStatusColor(shipment.status)}`}>
                    <span className="status-content">
                      {getStatusIcon(shipment.status)}
                      <span className="status-text-full">{getStatusText(shipment.status)}</span>
                      <span className="status-text-short">{getStatusText(shipment.status).charAt(0)}</span>
                    </span>
                  </span>
                  <span className="product-count">
                    {shipment.productCount} producto{shipment.productCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <h3 className="shipment-number">
                  {shipment.shipmentNumber}
                </h3>
              </div>
              
              {/* Botones de acción */}
              <div className="card-actions">
                {shipment.status === 'Pending' || shipment.status === 'InProgress' ? (
                  <>
                    <button
                      onClick={() => handleStartScanning(shipment.id, shipment.shipmentNumber)}
                      className="action-button start-button"
                      title={shipment.status === 'Pending' ? 'Iniciar escaneo' : 'Continuar escaneo'}
                    >
                      <Play className="action-icon" />
                      <span className="action-text-full">
                        {shipment.status === 'Pending' ? 'Iniciar' : 'Continuar'}
                      </span>
                      <span className="action-text-short">▶</span>
                    </button>
                    
                    <button
                      onClick={() => handleCancelShipment(shipment.id, shipment.shipmentNumber)}
                      className="action-button cancel-button"
                      title="Cancelar envío"
                    >
                      <XCircle className="action-icon" />
                      <span className="action-text-full">Cancelar</span>
                      <span className="action-text-short">✕</span>
                    </button>
                  </>
                ) : shipment.status === 'Completed' ? (
                  <span className="status-indicator completed">
                    <CheckCircle className="status-indicator-icon" />
                    <span className="status-indicator-text-full">Completado</span>
                    <span className="status-indicator-text-short">✓</span>
                  </span>
                ) : (
                  <span className="status-indicator cancelled">
                    <XCircle className="status-indicator-icon" />
                    <span className="status-indicator-text-full">Cancelado</span>
                    <span className="status-indicator-text-short">✕</span>
                  </span>
                )}
              </div>
            </div>

            {/* Información de transporte */}
            {shipment.transportCompany && (
              <div className="transport-info">
                <div className="transport-header">
                  <Truck className="transport-icon" />
                  <span className="transport-company">
                    {shipment.transportCompany.name}
                  </span>
                </div>
                <div className="transport-details">
                  <p className="transport-detail">Conductor: {shipment.transportCompany.driverName}</p>
                  <p className="transport-detail">Placa: {shipment.transportCompany.licensePlate}</p>
                  {shipment.transportCompany.phone && (
                    <p className="transport-detail">Tel: {shipment.transportCompany.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Fechas */}
            <div className="dates-container">
              <div className="date-row">
                <span className="date-label">Creado:</span>
                <span className="date-value">
                  {formatDate(shipment.createdAt)}
                </span>
              </div>
              {shipment.estimatedDeparture && (
                <div className="date-row">
                  <span className="date-label">Salida estimada:</span>
                  <span className="date-value estimated">
                    {formatDate(shipment.estimatedDeparture)}
                  </span>
                </div>
              )}
            </div>

            {/* Estado adicional */}
            <div className="additional-status">
              {shipment.status === 'Pending' && (
                <p className="status-message pending-message">
                  <AlertCircle className="status-message-icon" />
                  <span>Esperando inicio de escaneo</span>
                </p>
              )}
              {shipment.status === 'InProgress' && shipment.productCount > 0 && (
                <p className="status-message inprogress-message">
                  ✅ {shipment.productCount} producto{shipment.productCount !== 1 ? 's' : ''} escaneado{shipment.productCount !== 1 ? 's' : ''}
                </p>
              )}
              {shipment.status === 'Completed' && (
                <p className="status-message completed-message">
                  📦 Envío completado
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Estado vacío */}
      {filteredShipments.length === 0 && !error && (
        <div className="empty-state">
          <Package className="empty-icon" />
          <h3 className="empty-title">
            {showAll ? 'No hay envíos' : 'No hay envíos activos'}
          </h3>
          <p className="empty-message">
            {showAll
              ? 'Crea un nuevo envío para comenzar o ajusta los filtros.'
              : 'Crea un nuevo envío para comenzar a escanear productos.'
            }
          </p>
          {showAll && dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="clear-filters-button"
            >
              Limpiar filtro de fecha
            </button>
          )}
        </div>
      )}
    </div>
  );
}
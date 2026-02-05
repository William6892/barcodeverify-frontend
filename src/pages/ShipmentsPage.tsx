// src/pages/ShipmentsPage.tsx
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ActiveShipments from '../components/shipment/ActiveShipments';
import CreateShipmentModal from '../components/shipment/CreateShipmentModal';
import { Truck, Plus, Package, AlertCircle, Zap, Eye, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ShipmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ Optimizado: Manejar éxito de creación
  const handleCreateSuccess = useCallback((shipmentData?: any) => {
    toast.success(shipmentData?.shipmentNumber 
      ? `Envío ${shipmentData.shipmentNumber} creado exitosamente`
      : 'Envío creado exitosamente'
    );
    setIsModalOpen(false);
    setRefreshKey(prev => prev + 1);
  }, []);

  // ✅ Optimizado: Redirigir al scanner
  const handleSelectShipment = useCallback((shipmentId: number, shipmentNumber: string) => {
    navigate(`/scanner?shipment=${shipmentId}`);
    toast.success(`Escaneando: ${shipmentNumber}`);
  }, [navigate]);

  // ✅ Optimizado: Refresh manual (removido ya que no se usa en ActiveShipments)
  // const handleManualRefresh = useCallback(() => {
  //   setRefreshKey(prev => prev + 1);
  // }, []);

  // ✅ Usar useMemo para cálculos derivados
  const isAdmin = useMemo(() => {
    return user?.role === 'Admin';
  }, [user?.role]);

  const userRoleDescription = useMemo(() => {
    return isAdmin 
      ? 'Administra todos los envíos de productos' 
      : 'Gestiona tus envíos y comienza a escanear';
  }, [isAdmin]);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Mejor responsividad */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary-50 rounded-lg">
                <Truck className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
                  Gestión de Envíos
                </h1>
                <p className="text-gray-600 mt-0.5 sm:mt-1 text-sm sm:text-base">
                  {userRoleDescription}
                </p>
              </div>
            </div>
            
            {/* Botón de crear envío - Mejor responsividad */}
            <button
              onClick={handleOpenModal}
              className="btn-primary flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base mt-2 sm:mt-0 w-full sm:w-auto hover:scale-[1.02] transition-transform"
              aria-label="Crear nuevo envío"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Crear Envío</span>
            </button>
          </div>
        </div>

        {/* Contenido principal - Mejor padding responsivo */}
        <div className="bg-white rounded-xl sm:rounded-xl shadow-sm border p-3 sm:p-4 md:p-6 mb-6 md:mb-8">
          <ActiveShipments 
            key={refreshKey}
            onSelectShipment={handleSelectShipment}
            // onRefresh={handleManualRefresh} // Removido: ActiveShipments no tiene esta prop
            showAll={isAdmin}
            showFilters={true}
          />
        </div>

        {/* Información adicional - Mejor grid responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Tarjeta 1: Estados de Envío */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-blue-800 text-sm sm:text-base">Estados de Envío</h3>
            </div>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-blue-700">
              <li className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-500 rounded-full flex-shrink-0"></span>
                <span><strong>Pendiente:</strong> Esperando inicio</span>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                <span><strong>En Progreso:</strong> Escaneando productos</span>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                <span><strong>Completado:</strong> Listo para enviar</span>
              </li>
              <li className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full flex-shrink-0"></span>
                <span><strong>Cancelado:</strong> Envío detenido</span>
              </li>
            </ul>
          </div>
          
          {/* Tarjeta 2: Acciones Rápidas */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-green-800 text-sm sm:text-base">Acciones Rápidas</h3>
            </div>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-green-700">
              <li className="flex items-start gap-1.5 sm:gap-2">
                <span className="mt-0.5">•</span>
                <span><strong>Iniciar:</strong> Comienza a escanear productos</span>
              </li>
              <li className="flex items-start gap-1.5 sm:gap-2">
                <span className="mt-0.5">•</span>
                <span><strong>Continuar:</strong> Retoma un escaneo en progreso</span>
              </li>
              <li className="flex items-start gap-1.5 sm:gap-2">
                <span className="mt-0.5">•</span>
                <span><strong>Completar:</strong> Finaliza el envío</span>
              </li>
              <li className="flex items-start gap-1.5 sm:gap-2">
                <span className="mt-0.5">•</span>
                <span><strong>Cancelar:</strong> Detiene el envío</span>
              </li>
            </ul>
          </div>
          
          {/* Tarjeta 3: Permisos/Escaner */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 sm:p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                {isAdmin ? (
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                ) : (
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                )}
              </div>
              <h3 className="font-semibold text-purple-800 text-sm sm:text-base">
                {isAdmin ? 'Permisos de Admin' : 'Escaneo de Productos'}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-purple-700 mb-2 sm:mb-3">
              {isAdmin 
                ? 'Tienes acceso completo para ver, editar y eliminar todos los envíos del sistema.'
                : 'Usa un lector USB de códigos de barras para escanear productos rápidamente.'}
            </p>
            {!isAdmin && (
              <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-xs text-purple-600 font-medium flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  <span>Consejo: El lector USB funciona como un teclado automático</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Guía rápida - Solo en móviles */}
        <div className="sm:hidden bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-primary-800 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            ¿Cómo empezar?
          </h3>
          <ol className="text-sm text-primary-700 space-y-1.5 list-decimal pl-4">
            <li>Presiona "Crear Envío" para crear uno nuevo</li>
            <li>Selecciona una transportadora disponible</li>
            <li>Agrega los productos manualmente o escanéalos</li>
            <li>Haz clic en "Iniciar" para comenzar a escanear</li>
          </ol>
        </div>
      </div>

      {/* Modal para crear envíos */}
      <CreateShipmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleCreateSuccess}
      />

      {/* Botón flotante para móviles */}
      <button
        onClick={handleOpenModal}
        className="fixed bottom-6 right-6 sm:hidden w-14 h-14 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-700 transition-colors z-40"
        aria-label="Crear nuevo envío"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
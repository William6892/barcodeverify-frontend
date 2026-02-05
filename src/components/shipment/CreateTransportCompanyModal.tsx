// components/shipment/CreateTransportCompanyModal.tsx
import { useState } from 'react';
import { X, Truck, AlertCircle, User, Car } from 'lucide-react';

interface CreateTransportCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<any>;
  isAdmin: boolean;
}

export default function CreateTransportCompanyModal({
  isOpen,
  onClose,
  onSubmit,
  isAdmin
}: CreateTransportCompanyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    driverName: '',
    licensePlate: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones básicas
    if (!formData.name.trim()) {
      setError('El nombre de la empresa es requerido');
      return;
    }
    if (!formData.driverName.trim()) {
      setError('El nombre del conductor es requerido');
      return;
    }
    if (!formData.licensePlate.trim()) {
      setError('La placa del vehículo es requerida');
      return;
    }

    setLoading(true);

    try {
      const dataToSend = {
        name: formData.name.trim(),
        driverName: formData.driverName.trim(),
        licensePlate: formData.licensePlate.trim().toUpperCase(),
        phone: formData.phone.trim() || undefined
      };

      const result = await onSubmit(dataToSend);
      
      if (result.success === false) {
        if (result.error === 'PLACA_DUPLICADA') {
          setError(`Ya existe una transportadora con la placa ${dataToSend.licensePlate}`);
        } else if (result.error === 'UNAUTHORIZED') {
          setError('Debes iniciar sesión para crear una transportadora');
        }
        return;
      }

      // Éxito: limpiar formulario y cerrar modal
      setFormData({ name: '', driverName: '', licensePlate: '', phone: '' });
      onClose();
    } catch (err: any) {
      console.error('Error en modal:', err);
      setError('Error al crear transportadora');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Truck className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-bold text-gray-900">
                {isAdmin ? 'Crear Transportadora (Admin)' : 'Registrar Transportadora'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
              disabled={loading}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Nombre de la empresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ej: Transportes Veloz S.A."
                  disabled={loading}
                />
              </div>

              {/* Nombre del conductor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Nombre del Conductor *
                </label>
                <input
                  type="text"
                  required
                  value={formData.driverName}
                  onChange={(e) => setFormData({...formData, driverName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ej: Juan Pérez"
                  disabled={loading}
                />
              </div>

              {/* Placa del vehículo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Car className="w-4 h-4 inline mr-1" />
                  Placa del Vehículo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({...formData, licensePlate: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono uppercase"
                  placeholder="Ej: ABC123"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  La placa será convertida a mayúsculas automáticamente
                </p>
              </div>

              {/* Teléfono (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono de Contacto (Opcional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ej: 3001234567"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 mt-6 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creando...
                  </>
                ) : (
                  'Crear Transportadora'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
// components/inventory/InventoryModal.tsx
import { useState, useEffect } from 'react';
import { productService } from '../../services/api';

interface CreateInventoryModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'adjust';
  product?: {
    id: number;
    name: string;
    barcode: string;
    quantity: number;
    category?: string;
    brand?: string;
    model?: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

// ✅ SVGs inline — sin depender de lucide-react
const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconTrendingUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export default function CreateInventoryModal({
  isOpen,
  mode,
  product,
  onClose,
  onSuccess
}: CreateInventoryModalProps) {

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    barcode: '',
    name: '',
    quantity: 1,
    category: '',
    brand: '',
    model: ''
  });
  const [adjustData, setAdjustData] = useState({ newStock: 0, reason: '' });

  useEffect(() => {
    if (isOpen && product && mode !== 'create') {
      setFormData({
        id: product.id,
        barcode: product.barcode || '',
        name: product.name,
        quantity: product.quantity,
        category: product.category || '',
        brand: product.brand || '',
        model: product.model || ''
      });
      setAdjustData({ newStock: product.quantity, reason: '' });
    }
    if (mode === 'create') {
      resetForm();
    }
  }, [isOpen, product, mode]);

  const resetForm = () => {
    setFormData({ id: 0, barcode: '', name: '', quantity: 1, category: '', brand: '', model: '' });
    setAdjustData({ newStock: 0, reason: '' });
  };

  const handleCreate = async () => {
    if (!formData.barcode || !formData.name) {
      alert('Código de barras y nombre son requeridos');
      return;
    }
    setLoading(true);
    try {
      await productService.create({
        barcode: formData.barcode,
        name: formData.name,
        quantity: formData.quantity,
        category: formData.category,
        brand: formData.brand,
        model: formData.model
      });
      alert('✅ Producto creado exitosamente');
      onSuccess();
      handleClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al crear producto');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await productService.update(formData.id, {
        name: formData.name,
        quantity: formData.quantity,
        category: formData.category,
        brand: formData.brand,
        model: formData.model
      });
      alert('✅ Producto actualizado exitosamente');
      onSuccess();
      handleClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al actualizar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${formData.name}" permanentemente?`)) return;
    setLoading(true);
    try {
      await productService.delete(formData.id);
      alert('✅ Producto eliminado exitosamente');
      onSuccess();
      handleClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async () => {
    if (adjustData.newStock < 0) {
      alert('El stock no puede ser negativo');
      return;
    }
    if (!adjustData.reason.trim()) {
      alert('Debes especificar una razón para el ajuste');
      return;
    }
    setLoading(true);
    try {
      await productService.update(formData.id, { quantity: adjustData.newStock });
      alert(`✅ Stock ajustado: ${formData.quantity} → ${adjustData.newStock}\n📝 Motivo: ${adjustData.reason}`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al ajustar stock');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">

        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                mode === 'create' ? 'bg-green-100 text-green-600' :
                mode === 'edit'   ? 'bg-yellow-100 text-yellow-600' :
                                    'bg-orange-100 text-orange-600'
              }`}>
                {mode === 'create' && <IconPlus />}
                {mode === 'edit'   && <IconEdit />}
                {mode === 'adjust' && <IconTrendingUp />}
              </div>
              <h2 className="text-lg font-bold">
                {mode === 'create' && 'Nuevo Producto'}
                {mode === 'edit'   && 'Editar Producto'}
                {mode === 'adjust' && 'Ajustar Stock'}
              </h2>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
              <IconX />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Modo Crear / Editar */}
          {(mode === 'create' || mode === 'edit') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Código de barras *</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1234567890"
                  disabled={mode === 'edit'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lavadora Samsung WF100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Cantidad</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Electrónica"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Marca</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Samsung"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Modelo</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="WF100"
                  />
                </div>
              </div>
            </>
          )}

          {/* Modo Ajustar Stock */}
          {mode === 'adjust' && (
            <>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">Producto</p>
                <p className="font-bold text-gray-900">{formData.name}</p>
                <p className="text-sm mt-2">
                  Stock actual: <strong className="text-blue-600">{formData.quantity}</strong> unidades
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nuevo stock</label>
                <input
                  type="number"
                  value={adjustData.newStock}
                  onChange={(e) => setAdjustData({ ...adjustData, newStock: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                />
                {adjustData.newStock !== formData.quantity && (
                  <p className="text-xs text-gray-500 mt-1">
                    {adjustData.newStock > formData.quantity
                      ? `➕ Aumentará en ${adjustData.newStock - formData.quantity} unidades`
                      : `➖ Disminuirá en ${formData.quantity - adjustData.newStock} unidades`}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Motivo del ajuste *</label>
                <textarea
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ej: Ajuste por inventario físico, devolución de cliente, merma, etc."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>

          {mode === 'edit' && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              <IconTrash /> Eliminar
            </button>
          )}

          <button
            onClick={mode === 'create' ? handleCreate : mode === 'edit' ? handleUpdate : handleAdjust}
            disabled={loading}
            className={`flex-1 text-white rounded-lg py-2 transition-colors ${
              mode === 'create' ? 'bg-green-600 hover:bg-green-700' :
              mode === 'edit'   ? 'bg-blue-600 hover:bg-blue-700' :
                                  'bg-orange-600 hover:bg-orange-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Procesando...
              </div>
            ) : (
              mode === 'create' ? 'Crear Producto' :
              mode === 'edit'   ? 'Guardar Cambios' :
                                  'Aplicar Ajuste'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
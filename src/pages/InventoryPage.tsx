// pages/InventoryPage.tsx
import { useState, useEffect } from 'react';
import { Boxes, Plus, RefreshCw, Search, Edit2, TrendingUp } from 'lucide-react';
import { inventoryService } from '../services/api';
import CreateInventoryModal from '../components/inventory/InventoryModal';

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'adjust'>('create');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await inventoryService.getTodayStock();
      setProducts(result.productos);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openModal = (mode: 'create' | 'edit' | 'adjust', product?: any) => {
    if (product) {
      // Transformar el producto al formato que espera el modal
      setSelectedProduct({
        id: product.productId,
        name: product.productName,
        barcode: '',
        quantity: product.actual,
        category: '',
        brand: '',
        model: ''
      });
    } else {
      setSelectedProduct(null);
    }
    setModalMode(mode);
    setModalOpen(true);
  };

  const filteredProducts = products.filter((p: any) =>
    p.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Boxes className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold">Control de Inventario</h1>
              <p className="text-gray-500 text-sm">Gestión de productos y stock</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openModal('create')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Mostrando {filteredProducts.length} de {products.length} productos
          </p>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Producto</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Stock Actual</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p: any) => (
                <tr key={p.productId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.productName}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${
                      p.actual === 0 ? 'text-red-600' : 
                      p.actual < 10 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {p.actual}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => openModal('edit', p)}
                        className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                        title="Editar producto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal('adjust', p)}
                        className="p-1 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                        title="Ajustar stock"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                    </div>
                   </td>
                  </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <CreateInventoryModal
        isOpen={modalOpen}
        mode={modalMode}
        product={selectedProduct}
        onClose={() => setModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
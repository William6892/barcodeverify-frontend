import { useState, useEffect } from 'react';
import BarcodeScanner from '../components/shipment/BarcodeScanner';
import CreateShipmentModal from '../components/shipment/CreateShipmentModal';
import { shipmentService, productService } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  ChevronDown, 
  RefreshCw, 
  AlertCircle, 
  Barcode, 
  Package,
  Check,
  X,
  Search,
  Filter,
  Link as LinkIcon,
  Unlink,
  BarChart3
} from 'lucide-react';
import './css/ScannerPage.css';

// Interfaces mejoradas
interface Product {
  id: number;
  barcode: string;
  name: string;
  quantity: number;
  category?: string;
  scannedQuantity: number;
  isLinked: boolean;
}

interface ScannedItem {
  barcode: string;
  productId?: number;
  productName?: string;
  timestamp: string;
  status: 'linked' | 'unlinked' | 'error';
  message?: string;
}

interface Shipment {
  id: number;
  shipmentNumber: string;
  status: string;
  productCount: number;
}

// Componente principal
export default function ScannerPage() {
  // Estados principales
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLinkedOnly, setShowLinkedOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // ==================== Efectos ====================
  useEffect(() => {
    loadActiveShipments();
  }, []);

  // ==================== Funciones de carga ====================
  const loadActiveShipments = async () => {
    try {
      setLoadingShipments(true);
      const response = await shipmentService.getActive();
      
      const data = extractDataFromResponse(response);
      const formattedShipments: Shipment[] = (Array.isArray(data) ? data : []).map(item => ({
        id: item.id,
        shipmentNumber: item.shipmentNumber,
        status: item.status,
        productCount: item.productCount || 0
      }));
      
      setShipments(formattedShipments);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error cargando envíos');
      setShipments([]);
    } finally {
      setLoadingShipments(false);
    }
  };

  const loadShipmentProducts = async (shipmentId: number) => {
    try {
      const productsResponse = await productService.getByShipment(shipmentId);
      const productsData = extractDataFromResponse(productsResponse);
      
      const formattedProducts: Product[] = (Array.isArray(productsData) ? productsData : []).map((product: any) => ({
        id: product.id,
        barcode: product.barcode,
        name: product.name || `Producto ${product.barcode}`,
        quantity: product.quantity || 1,
        category: product.category || 'General',
        scannedQuantity: product.scannedQuantity || 0,
        isLinked: true
      }));
      
      setProducts(formattedProducts);
      setScannedItems([]);
      setLastScannedCode('');
      
    } catch (error: any) {
      console.error('Error cargando productos:', error);
      setProducts([]);
    }
  };

  // ==================== Handlers principales ====================
  const handleSelectShipment = async (shipment: Shipment) => {
    try {
      setSelectedShipment(shipment);
      setShowDropdown(false);
      setSelectedProduct(null);
      
      await loadShipmentProducts(shipment.id);
      toast.success(`Envío ${shipment.shipmentNumber} seleccionado`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error cargando envío');
    }
  };

  const handleScan = async (barcode: string) => {
    if (!selectedShipment) {
      toast.error('Primero selecciona un envío de la lista');
      return;
    }

    try {
      setLastScannedCode(barcode);
      const existingProduct = products.find(p => p.barcode === barcode);
      
      if (existingProduct) {
        await handleExistingProductScan(barcode, existingProduct);
      } else {
        await handleNewProductScan(barcode);
      }
      
    } catch (error: any) {
      handleScanError(barcode, error);
    }
  };

  const handleExistingProductScan = async (barcode: string, product: Product) => {
    const response = await productService.scanProduct({
      shipmentId: selectedShipment!.id,
      barcode: barcode,
      quantity: 1
    });
    
    updateProductScannedQuantity(product.id);
    
    const newScanned: ScannedItem = {
      barcode,
      productId: product.id,
      productName: product.name,
      timestamp: new Date().toLocaleTimeString(),
      status: 'linked',
      message: `Vinculado a: ${product.name}`
    };
    
    setScannedItems(prev => [newScanned, ...prev]);
    setSelectedProduct(product);
    setTimeout(() => setSelectedProduct(null), 2000);
    toast.success(`✅ ${product.name} escaneado`);
  };

  const handleNewProductScan = (barcode: string) => {
    const newScanned: ScannedItem = {
      barcode,
      timestamp: new Date().toLocaleTimeString(),
      status: 'unlinked',
      message: 'Producto no encontrado en el envío'
    };
    
    setScannedItems(prev => [newScanned, ...prev]);
    
    showProductNotFoundToast(barcode);
  };

  const handleCreateNewProduct = async (barcode: string) => {
    try {
      const productData = {
        barcode: barcode,
        name: `Producto ${barcode}`,
        quantity: 1,
        category: 'General',
        shipmentId: selectedShipment!.id
      };
      
      const response = await productService.create(productData);
      
      const newProduct: Product = {
        id: response.id,
        barcode: barcode,
        name: response.name || `Producto ${barcode}`,
        quantity: response.quantity || 1,
        category: response.category || 'General',
        scannedQuantity: 1,
        isLinked: true
      };
      
      setProducts(prev => [newProduct, ...prev]);
      updateScannedItemStatus(barcode, 'linked', `Nuevo producto creado: ${newProduct.name}`, newProduct.id, newProduct.name);
      toast.success(`✅ Producto creado: ${newProduct.name}`);
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error creando producto');
    }
  };

  const handleLinkToProduct = async (barcode: string, productId: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    updateScannedItemStatus(barcode, 'linked', `Vinculado a: ${product.name}`, product.id, product.name);
    updateProductScannedQuantity(productId);
    toast.success(`✅ Código vinculado a: ${product.name}`);
  };

  const handleCreateSuccess = async (newShipment: any) => {
    const shipment = extractShipmentFromResponse(newShipment);
    if (shipment) {
      await handleSelectShipment(shipment);
      toast.success(`Envío ${shipment.shipmentNumber} creado y seleccionado`);
    }
    loadActiveShipments();
  };

  // ==================== Funciones auxiliares ====================
  const extractDataFromResponse = (response: any): any[] => {
    if (Array.isArray(response)) return response;
    if (response?.data && Array.isArray(response.data)) return response.data;
    if (response?.products && Array.isArray(response.products)) return response.products;
    if (response?.shipments && Array.isArray(response.shipments)) return response.shipments;
    return [];
  };

  const extractShipmentFromResponse = (response: any): Shipment | null => {
    const shipment = response.id ? response : response.data;
    if (!shipment) return null;
    
    return {
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      status: shipment.status || 'Pending',
      productCount: shipment.productCount || 0
    };
  };

  const updateProductScannedQuantity = (productId: number) => {
    setProducts(prev => prev.map(p => 
      p.id === productId 
        ? { ...p, scannedQuantity: p.scannedQuantity + 1 }
        : p
    ));
  };

  const updateScannedItemStatus = (barcode: string, status: ScannedItem['status'], message?: string, productId?: number, productName?: string) => {
    setScannedItems(prev => prev.map(item => 
      item.barcode === barcode 
        ? {
            ...item,
            status,
            productId,
            productName,
            message
          }
        : item
    ));
  };

  const handleScanError = (barcode: string, error: any) => {
    const newScanned: ScannedItem = {
      barcode,
      timestamp: new Date().toLocaleTimeString(),
      status: 'error',
      message: error.response?.data?.message || 'Error al escanear'
    };
    
    setScannedItems(prev => [newScanned, ...prev]);
    toast.error(error.response?.data?.message || 'Error al escanear');
  };

  const showProductNotFoundToast = (barcode: string) => {
    toast.custom((t) => (
      <div className="scanner-toast">
        <div className="scanner-toast-content">
          <div className="scanner-toast-icon">
            <AlertCircle className="scanner-toast-icon-inner" />
          </div>
          <div className="scanner-toast-body">
            <h4 className="scanner-toast-title">Producto no encontrado</h4>
            <p className="scanner-toast-message">
              Código: <span className="scanner-toast-barcode">{barcode}</span>
            </p>
            <div className="scanner-toast-actions">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  handleCreateNewProduct(barcode);
                }}
                className="scanner-toast-btn scanner-toast-btn-create"
              >
                Crear nuevo producto
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="scanner-toast-btn scanner-toast-btn-cancel"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    ), { duration: 5000 });
  };

  // ==================== Funciones de UI helpers ====================
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'InProgress': 'En Progreso',
      'Pending': 'Pendiente',
      'Completed': 'Completado',
      'Cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'InProgress': 'status-color-inprogress',
      'Pending': 'status-color-pending',
      'Completed': 'status-color-completed',
      'Cancelled': 'status-color-cancelled'
    };
    return colorMap[status] || 'status-color-default';
  };

  // ==================== Filtros y cálculos ====================
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = !showLinkedOnly || product.isLinked;
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalProducts: products.length,
    linkedProducts: products.filter(p => p.isLinked).length,
    totalScanned: scannedItems.filter(s => s.status === 'linked').length,
    unlinkedScans: scannedItems.filter(s => s.status === 'unlinked').length,
    pendingScan: products.reduce((total, p) => total + (p.quantity - p.scannedQuantity), 0)
  };

  // ==================== Render ====================
  return (
    <div className="scanner-page">
      {/* Header */}
      <div className="scanner-header">
        <div className="scanner-header-left">
          <h1 className="scanner-title">Escaneo de Productos</h1>
          <p className="scanner-subtitle">
            {selectedShipment 
              ? `Escaneando: ${selectedShipment.shipmentNumber}` 
              : 'Selecciona o crea un envío para comenzar'}
          </p>
        </div>
        
        <div className="scanner-header-right">
          {/* Dropdown de envíos */}
          <div className="scanner-dropdown-container">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="scanner-dropdown-btn"
            >
              {selectedShipment ? (
                <span className="scanner-dropdown-selected">{selectedShipment.shipmentNumber}</span>
              ) : (
                <span>Seleccionar envío</span>
              )}
              <ChevronDown className={`scanner-dropdown-chevron ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showDropdown && (
              <div className="scanner-dropdown-menu">
                <div className="scanner-dropdown-header">
                  <div className="scanner-dropdown-header-content">
                    <span className="scanner-dropdown-header-title">Envíos Activos</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadActiveShipments();
                      }}
                      className="scanner-dropdown-refresh"
                      disabled={loadingShipments}
                    >
                      <RefreshCw className={`scanner-dropdown-refresh-icon ${loadingShipments ? 'spin' : ''}`} />
                    </button>
                  </div>
                  
                  {loadingShipments ? (
                    <div className="scanner-dropdown-loading">
                      <div className="scanner-dropdown-loading-spinner"></div>
                    </div>
                  ) : shipments.length === 0 ? (
                    <div className="scanner-dropdown-empty">
                      <AlertCircle className="scanner-dropdown-empty-icon" />
                      <p>No hay envíos activos</p>
                    </div>
                  ) : (
                    <div className="scanner-dropdown-items">
                      {shipments.map((shipment) => (
                        <div
                          key={shipment.id}
                          className={`scanner-dropdown-item ${
                            selectedShipment?.id === shipment.id ? 'scanner-dropdown-item-selected' : ''
                          }`}
                          onClick={() => handleSelectShipment(shipment)}
                        >
                          <div className="scanner-dropdown-item-content">
                            <div className="scanner-dropdown-item-main">
                              <div className="scanner-dropdown-item-title">{shipment.shipmentNumber}</div>
                              <div className="scanner-dropdown-item-details">
                                <span className={`scanner-dropdown-item-status ${getStatusColor(shipment.status)}`}>
                                  {getStatusText(shipment.status)}
                                </span>
                                <span className="scanner-dropdown-item-count">
                                  {shipment.productCount} productos
                                </span>
                              </div>
                            </div>
                            {(shipment.status === 'Pending' || shipment.status === 'InProgress') && (
                              <span className="scanner-dropdown-item-badge">
                                {shipment.status === 'Pending' ? 'Iniciar' : 'Continuar'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    setShowCreateModal(true);
                    setShowDropdown(false);
                  }}
                  className="scanner-dropdown-create-btn"
                >
                  <Plus className="scanner-dropdown-create-icon" />
                  Crear nuevo envío
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="scanner-new-shipment-btn"
          >
            <Plus className="scanner-new-shipment-icon" />
            Nuevo Envío
          </button>
        </div>
      </div>

      {/* Panel de estadísticas */}
      {selectedShipment && (
        <div className="scanner-stats-grid">
          <div className="scanner-stat-card">
            <div className="scanner-stat-content">
              <div className="scanner-stat-icon-container scanner-stat-icon-blue">
                <Package className="scanner-stat-icon" />
              </div>
              <div>
                <p className="scanner-stat-label">Productos</p>
                <p className="scanner-stat-value">{stats.totalProducts}</p>
              </div>
            </div>
          </div>
          
          <div className="scanner-stat-card">
            <div className="scanner-stat-content">
              <div className="scanner-stat-icon-container scanner-stat-icon-green">
                <Check className="scanner-stat-icon" />
              </div>
              <div>
                <p className="scanner-stat-label">Escaneados</p>
                <p className="scanner-stat-value">{stats.totalScanned}</p>
              </div>
            </div>
          </div>
          
          <div className="scanner-stat-card">
            <div className="scanner-stat-content">
              <div className="scanner-stat-icon-container scanner-stat-icon-yellow">
                <AlertCircle className="scanner-stat-icon" />
              </div>
              <div>
                <p className="scanner-stat-label">Pendientes</p>
                <p className="scanner-stat-value">{stats.pendingScan}</p>
              </div>
            </div>
          </div>
          
          <div className="scanner-stat-card">
            <div className="scanner-stat-content">
              <div className="scanner-stat-icon-container scanner-stat-icon-orange">
                <Unlink className="scanner-stat-icon" />
              </div>
              <div>
                <p className="scanner-stat-label">Sin vincular</p>
                <p className="scanner-stat-value">{stats.unlinkedScans}</p>
              </div>
            </div>
          </div>
          
          <div className="scanner-stat-card">
            <div className="scanner-stat-content">
              <div className="scanner-stat-icon-container scanner-stat-icon-purple">
                <BarChart3 className="scanner-stat-icon" />
              </div>
              <div>
                <p className="scanner-stat-label">Progreso</p>
                <p className="scanner-stat-value">
                  {stats.totalProducts > 0 
                    ? `${Math.round((stats.totalScanned / stats.totalProducts) * 100)}%` 
                    : '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Último código escaneado */}
      {lastScannedCode && (
        <div className={`scanner-last-code ${selectedProduct ? 'scanner-last-code-linked' : 'scanner-last-code-default'}`}>
          <div className="scanner-last-code-content">
            <div className="scanner-last-code-left">
              <div className={`scanner-last-code-icon-container ${selectedProduct ? 'scanner-last-code-icon-linked' : 'scanner-last-code-icon-default'}`}>
                <Barcode className={`scanner-last-code-icon ${selectedProduct ? 'scanner-last-code-icon-linked-inner' : 'scanner-last-code-icon-default-inner'}`} />
              </div>
              <div>
                <p className={`scanner-last-code-title ${selectedProduct ? 'scanner-last-code-title-linked' : 'scanner-last-code-title-default'}`}>
                  {selectedProduct ? '✅ Producto identificado' : 'Último código escaneado'}
                </p>
                <p className="scanner-last-code-barcode">{lastScannedCode}</p>
                <p className="scanner-last-code-time">
                  {new Date().toLocaleTimeString()}
                  {selectedProduct && (
                    <span className="scanner-last-code-product">• {selectedProduct.name}</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setLastScannedCode('');
                setSelectedProduct(null);
              }}
              className="scanner-last-code-hide"
            >
              Ocultar
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="scanner-main-grid">
        {/* Columna izquierda: Scanner y Productos */}
        <div className="scanner-left-column">
          {/* Scanner */}
          <div className="scanner-card">
            <div className="scanner-card-header">
              <div className="scanner-card-header-left">
                <h2 className="scanner-card-title">
                  {selectedShipment ? 'Lector USB' : 'Selecciona un envío'}
                </h2>
              </div>
              {selectedShipment && (
                <button
                  onClick={() => {
                    setSelectedShipment(null);
                    setProducts([]);
                    setScannedItems([]);
                    setLastScannedCode('');
                  }}
                  className="scanner-change-shipment-btn"
                >
                  Cambiar envío
                </button>
              )}
            </div>
            
            {selectedShipment ? (
              <div className="scanner-content">
                <BarcodeScanner onScan={handleScan} />
                <div className="scanner-help">
                  <p>Apunte el código de barras al lector USB</p>
                </div>
              </div>
            ) : (
              <div className="scanner-empty-state">
                <div className="scanner-empty-icon">
                  <Plus className="scanner-empty-icon-inner" />
                </div>
                <h3 className="scanner-empty-title">
                  Sin envío seleccionado
                </h3>
                <p className="scanner-empty-message">
                  Selecciona un envío de la lista o crea uno nuevo
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="scanner-empty-btn"
                >
                  Crear Nuevo Envío
                </button>
              </div>
            )}
          </div>

          {/* Productos del envío */}
          {selectedShipment && (
            <div className="scanner-card">
              <div className="scanner-card-header">
                <h2 className="scanner-card-title">Productos en el Envío</h2>
                <div className="scanner-card-header-right">
                  <span className="scanner-card-count">
                    {filteredProducts.length} de {products.length}
                  </span>
                </div>
              </div>
              
              {/* Filtros */}
              <div className="scanner-filters">
                <div className="scanner-search-container">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por código o nombre..."
                    className="scanner-search-input"
                  />
                  <Search className="scanner-search-icon" />
                </div>
                <button
                  onClick={() => setShowLinkedOnly(!showLinkedOnly)}
                  className={`scanner-filter-btn ${showLinkedOnly ? 'scanner-filter-btn-active' : 'scanner-filter-btn-inactive'}`}
                >
                  <Filter className="scanner-filter-icon" />
                  {showLinkedOnly ? 'Mostrar todos' : 'Solo vinculados'}
                </button>
              </div>
              
              {/* Lista de productos */}
              <div className="scanner-products-list">
                {filteredProducts.length === 0 ? (
                  <div className="scanner-products-empty">
                    <Package className="scanner-products-empty-icon" />
                    <p>No hay productos en este envío</p>
                    <p className="scanner-products-empty-hint">
                      Agrega productos escaneando códigos de barras
                    </p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div 
                      key={product.id}
                      className={`scanner-product-card ${
                        selectedProduct?.id === product.id
                          ? 'scanner-product-card-selected'
                          : 'scanner-product-card-default'
                      }`}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="scanner-product-content">
                        <div className="scanner-product-main">
                          <div className="scanner-product-header">
                            <span className="scanner-product-name">{product.name}</span>
                            {product.category && (
                              <span className="scanner-product-category">
                                {product.category}
                              </span>
                            )}
                          </div>
                          <div className="scanner-product-details">
                            <span className="scanner-product-barcode">{product.barcode}</span>
                            <div className="scanner-product-scanned">
                              <span className="scanner-product-scanned-label">Escaneados: </span>
                              <span className={`scanner-product-scanned-value ${
                                product.scannedQuantity >= product.quantity
                                  ? 'scanner-product-scanned-complete'
                                  : 'scanner-product-scanned-incomplete'
                              }`}>
                                {product.scannedQuantity}/{product.quantity}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="scanner-product-status">
                          {product.isLinked ? (
                            <div className="scanner-product-linked">
                              <LinkIcon className="scanner-product-linked-icon" />
                            </div>
                          ) : (
                            <div className="scanner-product-unlinked">
                              <Unlink className="scanner-product-unlinked-icon" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: Historial de escaneo */}
        {selectedShipment && (
          <div className="scanner-right-column">
            {/* Historial de escaneo */}
            <div className="scanner-card">
              <div className="scanner-card-header">
                <h2 className="scanner-card-title">Historial de Escaneo</h2>
                <div className="scanner-card-header-right">
                  <span className="scanner-card-count">
                    {scannedItems.length} escaneos
                  </span>
                  {scannedItems.length > 0 && (
                    <button
                      onClick={() => {
                        setScannedItems([]);
                        setLastScannedCode('');
                      }}
                      className="scanner-clear-history-btn"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
              
              <div className="scanner-history-list">
                {scannedItems.length === 0 ? (
                  <div className="scanner-history-empty">
                    <Barcode className="scanner-history-empty-icon" />
                    <p>No hay productos escaneados aún</p>
                    <p className="scanner-history-empty-hint">
                      Usa tu lector USB para comenzar
                    </p>
                  </div>
                ) : (
                  scannedItems.map((item, index) => (
                    <div 
                      key={index} 
                      className={`scanner-history-item ${
                        item.status === 'linked' 
                          ? 'scanner-history-item-linked' 
                          : item.status === 'error'
                            ? 'scanner-history-item-error'
                            : 'scanner-history-item-unlinked'
                      }`}
                    >
                      <div className="scanner-history-item-content">
                        <div>
                          <div className="scanner-history-item-header">
                            <span className="scanner-history-item-barcode">{item.barcode}</span>
                            <span className={`scanner-history-item-status ${
                              item.status === 'linked' 
                                ? 'scanner-history-item-status-linked' 
                                : item.status === 'error'
                                  ? 'scanner-history-item-status-error'
                                  : 'scanner-history-item-status-unlinked'
                            }`}>
                              {item.status === 'linked' ? 'Vinculado' : 
                               item.status === 'error' ? 'Error' : 
                               'Sin vincular'}
                            </span>
                          </div>
                          <p className="scanner-history-item-time">{item.timestamp}</p>
                          {item.productName && (
                            <p className="scanner-history-item-product">
                              {item.productName}
                            </p>
                          )}
                          {item.message && (
                            <p className="scanner-history-item-message">{item.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {scannedItems.length > 0 && (
                <div className="scanner-history-footer">
                  <div className="scanner-history-stats">
                    <div className="scanner-history-stat">
                      <span className="scanner-history-stat-label">Vinculados: </span>
                      <span className="scanner-history-stat-value scanner-history-stat-linked">
                        {scannedItems.filter(s => s.status === 'linked').length}
                      </span>
                    </div>
                    <div className="scanner-history-stat">
                      <span className="scanner-history-stat-label">Pendientes: </span>
                      <span className="scanner-history-stat-value scanner-history-stat-pending">
                        {scannedItems.filter(s => s.status === 'unlinked').length}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await shipmentService.complete(selectedShipment.id);
                        toast.success('Envío completado exitosamente');
                        setSelectedShipment(null);
                        setProducts([]);
                        setScannedItems([]);
                        loadActiveShipments();
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || 'Error completando envío');
                      }
                    }}
                    className="scanner-complete-btn"
                  >
                    Completar Envío
                  </button>
                </div>
              )}
            </div>

            {/* Producto seleccionado */}
            {selectedProduct && (
              <div className="scanner-card">
                <div className="scanner-card-header">
                  <h3 className="scanner-card-title">Producto seleccionado</h3>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="scanner-close-selected"
                  >
                    <X className="scanner-close-icon" />
                  </button>
                </div>
                <div className="scanner-product-detail">
                  <div className="scanner-product-detail-field">
                    <p className="scanner-product-detail-label">Nombre</p>
                    <p className="scanner-product-detail-value">{selectedProduct.name}</p>
                  </div>
                  <div className="scanner-product-detail-grid">
                    <div>
                      <p className="scanner-product-detail-label">Código</p>
                      <p className="scanner-product-detail-barcode">{selectedProduct.barcode}</p>
                    </div>
                    {selectedProduct.category && (
                      <div>
                        <p className="scanner-product-detail-label">Categoría</p>
                        <p className="scanner-product-detail-value">{selectedProduct.category}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="scanner-product-detail-label">Progreso de escaneo</p>
                    <div className="scanner-product-progress">
                      <span className="scanner-product-progress-value">
                        {selectedProduct.scannedQuantity}/{selectedProduct.quantity}
                      </span>
                      <span className="scanner-product-progress-percent">
                        {Math.round((selectedProduct.scannedQuantity / selectedProduct.quantity) * 100)}%
                      </span>
                    </div>
                    <div className="scanner-progress-bar">
                      <div 
                        className="scanner-progress-fill"
                        style={{ 
                          width: `${Math.min(100, (selectedProduct.scannedQuantity / selectedProduct.quantity) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para crear envío */}
      <CreateShipmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
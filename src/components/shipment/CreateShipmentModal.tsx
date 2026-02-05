import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Truck, 
  Package, 
  Calendar, 
  Hash, 
  User, 
  Car, 
  Phone, 
  Sparkles,
  Plus, 
  Check, 
  Info, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle,
  Trash2,
  Minus,
  Barcode,
  List,
  ShoppingCart,
  AlertCircle,
  Clock,
  AlertTriangle,
  Shield,
  Ban,
  Eye,
  EyeOff,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Loader2,
  FileWarning,
  Zap,  
  Lock
} from 'lucide-react';
import { shipmentService, transportService, productService } from '../../services/api';
// import { toast } from 'react-hot-toast'; // COMENTADO si no se usa

interface TransportCompany {
  id: number;
  name: string;
  driverName: string;
  licensePlate: string;
  phone: string;
  isActive: boolean;
  maxCapacity?: number;
  currentLoad?: number;
}

interface ProductItem {
  id: number;
  barcode: string;
  name: string;
  quantity: number;
  category?: string;
  scannedAt: string;
  weight?: number;
  volume?: number;
}

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (shipment: any) => void;
  existingShipments?: any[];
}

interface ValidationErrors {
  transportCompany?: string;
  shipmentNumber?: string;
  departureTime?: string;
  products?: string;
  barcode?: string;
  capacity?: string;
}

interface TimeSlot {
  start: string;
  end: string;
  label: string;
  available: boolean;
}

export default function CreateShipmentModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  existingShipments = [] 
}: CreateShipmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [transportCompanies, setTransportCompanies] = useState<TransportCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [shipmentNumber, setShipmentNumber] = useState('');
  const [estimatedDeparture, setEstimatedDeparture] = useState('');
  const [step, setStep] = useState(1);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  
  // Estado para productos
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [bulkBarcodeInput, setBulkBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // ✅ Estados mejorados para validaciones
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showProductsWarning, setShowProductsWarning] = useState(false);
  const [confirmNoProducts, setConfirmNoProducts] = useState(false);
  const [confirmNoDepartureTime, setConfirmNoDepartureTime] = useState(false);
  // const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set()); // COMENTADO - no usado
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [shipmentNumberSuggestions, setShipmentNumberSuggestions] = useState<string[]>([]);
  const [capacityWarning, setCapacityWarning] = useState<string>('');
  const [isCheckingCapacity, setIsCheckingCapacity] = useState(false);
  const [showDepartureTimeWarning, setShowDepartureTimeWarning] = useState(false);

  // ✅ Configuración de validaciones
  const VALIDATION_CONFIG = {
    MIN_PRODUCTS: 1,
    MAX_PRODUCTS: 100,
    MAX_TOTAL_UNITS: 10000,
    MIN_SHIPMENT_NUMBER_LENGTH: 5,
    MAX_SHIPMENT_NUMBER_LENGTH: 50,
    MAX_DAYS_IN_FUTURE: 30,
    WORKING_HOURS: { start: 6, end: 22 },
    REQUIRED_DEPARTURE_TIME: true,
    REQUIRED_PRODUCTS: true,
    MAX_BARCODE_LENGTH: 50,
    MIN_BARCODE_LENGTH: 4
  };

  // ====================================
  // FUNCIONES FALTANTES QUE NECESITAMOS
  // ====================================

  // ✅ 1. Función para validar transportadora
  const validateTransportCompany = (companyId: number | ''): string | undefined => {
    if (!companyId) {
      return 'Debes seleccionar una transportadora';
    }
    
    const companyExists = transportCompanies.some(c => c.id === companyId);
    if (!companyExists) {
      return 'La transportadora seleccionada no existe o está inactiva';
    }
    
    return undefined;
  };

  // ✅ 2. Función para manejar cambio de transportadora
  const handleCompanyChange = (companyId: number) => {
    setSelectedCompanyId(companyId);
    setValidationErrors(prev => ({ ...prev, transportCompany: undefined }));
    
    // Verificar capacidad si hay productos
    if (products.length > 0) {
      setTimeout(() => checkCapacity(), 100);
    }
  };

  // ✅ 3. Función para manejar cambio de número de envío
  const handleShipmentNumberChange = (value: string) => {
    setShipmentNumber(value);
    
    // Validar en tiempo real
    if (value.trim()) {
      const error = validateShipmentNumberUnique(value);
      setValidationErrors(prev => ({ ...prev, shipmentNumber: error }));
    }
  };

  // ✅ 4. Función para manejar cambio de hora de salida
  const handleDepartureTimeChange = (value: string) => {
    setEstimatedDeparture(value);
    setValidationErrors(prev => ({ ...prev, departureTime: undefined }));
    setShowDepartureTimeWarning(false);
    setConfirmNoDepartureTime(false);
  };

  // ✅ 5. Función handleKeyPress para código de barras
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddProduct();
    }
  };

  // ✅ 6. Función para cambiar cantidad de productos
  const handleQuantityChange = (id: number, delta: number) => {
    setProducts(prevProducts => 
      prevProducts.map(p => {
        if (p.id === id) {
          const newQuantity = p.quantity + delta;
          
          if (newQuantity < 1) {
            // toast.error('La cantidad mínima es 1');
            alert('La cantidad mínima es 1');
            return p;
          }
          
          if (newQuantity > 999) {
            // toast.error('La cantidad máxima por producto es 999');
            alert('La cantidad máxima por producto es 999');
            return p;
          }
          
          return { ...p, quantity: newQuantity };
        }
        return p;
      })
    );
  };

  // ✅ 7. Función para eliminar producto
  const handleRemoveProduct = (id: number) => {
    const productToRemove = products.find(p => p.id === id);
    
    if (!productToRemove) return;
    
    const shouldRemove = window.confirm(
      `¿Estás seguro de eliminar el producto ${productToRemove?.barcode}?\n\n` +
      `Cantidad: ${productToRemove?.quantity} unidad${productToRemove?.quantity !== 1 ? 'es' : ''}`
    );
    
    if (!shouldRemove) return;
    
    setProducts(prev => prev.filter(p => p.id !== id));
    // toast.success(`Producto eliminado: ${productToRemove?.barcode}`);
    alert(`Producto eliminado: ${productToRemove?.barcode}`);
    
    if (products.length === 1) {
      setShowProductsWarning(true);
    }
  };

  // ✅ 8. Función para limpiar todos los productos
  const handleClearAllProducts = () => {
    if (products.length === 0) return;
    
    const shouldClear = window.confirm(
      `¿Estás seguro de eliminar todos los productos (${products.length})?\n\n` +
      `Esta acción no se puede deshacer.`
    );
    
    if (shouldClear) {
      setProducts([]);
      setConfirmNoProducts(false);
      setShowProductsWarning(true);
      // toast.success('Todos los productos han sido eliminados');
      alert('Todos los productos han sido eliminados');
    }
  };

  // ✅ 9. Función handleNextStep
  const handleNextStep = () => {
    if (step === 1) {
      if (!validateStep1()) {
        // toast.error('Por favor, corrige los errores antes de continuar');
        alert('Por favor, corrige los errores antes de continuar');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) {
        // toast.error('Por favor, corrige los errores antes de continuar');
        alert('Por favor, corrige los errores antes de continuar');
        return;
      }
      setStep(3);
    }
  };

  // ✅ 10. Función handlePreviousStep
  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // ✅ 11. Función para resetear formulario
  const resetForm = () => {
    setShipmentNumber('');
    setEstimatedDeparture('');
    setProducts([]);
    setBarcodeInput('');
    setBulkBarcodeInput('');
    setStep(1);
    setSelectedCompanyId(transportCompanies.length > 0 ? transportCompanies[0].id : '');
    resetValidations();
    setConfirmNoProducts(false);
    setConfirmNoDepartureTime(false);
    setShowDepartureTimeWarning(false);
    setShowBulkInput(false);
    setCapacityWarning('');
    generateShipmentNumber();
  };

  // ✅ 12. Función para crear productos en backend
  // ✅ MODIFICAR esta función (está en tu CreateShipmentModal.tsx)
  const createProductsInBackend = async (shipmentId: number) => {
    if (products.length === 0) {
      console.log('📝 No hay productos para crear');
      return [];
    }

    const createdProducts = [];
    console.log(`🔄 Intentando crear ${products.length} productos...`);

    for (const product of products) {
      try {
        const productData = {
          barcode: product.barcode,
          name: product.name,
          quantity: product.quantity,
          category: product.category || 'General',
          shipmentId: shipmentId
        };

        console.log('📤 Datos que voy a enviar:', productData);
        
        // Agrega un log ANTES de llamar al servicio
        console.log('📤 Llamando a productService.create...');
        
        const response = await productService.create(productData);
        
        console.log('✅ Respuesta exitosa:', response);
        createdProducts.push(response);
        console.log(`✅ Producto ${product.barcode} creado correctamente`);
        
      } catch (error: any) {
        console.error('❌ ERROR COMPLETO:', error);
        
        // Muestra información detallada del error
        if (error.response) {
          console.error('❌ Status:', error.response.status);
          console.error('❌ Datos del error:', error.response.data);
          console.error('❌ Headers:', error.response.headers);
        } else if (error.request) {
          console.error('❌ No hubo respuesta del servidor');
        } else {
          console.error('❌ Error al configurar la petición:', error.message);
        }
        
        // Muestra mensaje de error al usuario
        if (error.response?.status === 403) {
          // toast.error(`No tienes permiso para crear productos (error 403). Contacta al administrador.`);
          alert(`No tienes permiso para crear productos (error 403). Contacta al administrador.`);
        } else if (error.response?.status === 401) {
          // toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
          alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        } else if (error.response?.status === 409) {
          // toast.error(`El producto ${product.barcode} ya existe en el sistema.`);
          alert(`El producto ${product.barcode} ya existe en el sistema.`);
        } else {
          // toast.error(`Error al crear producto ${product.barcode}: ${error.message}`);
          alert(`Error al crear producto ${product.barcode}: ${error.message}`);
        }
      }
    }
      
    return createdProducts;
  };

  // ====================================
  // FUNCIONES EXISTENTES (ya en tu código)
  // ====================================

  // Cargar transportadoras
  useEffect(() => {
    if (isOpen) {
      loadTransportCompanies();
      generateShipmentNumber();
      setStep(1);
      setProducts([]);
      resetValidations();
      setConfirmNoProducts(false);
      setConfirmNoDepartureTime(false);
      setShowDepartureTimeWarning(false);
      loadAvailableTimeSlots();
    }
  }, [isOpen]);

  useEffect(() => {
    if (barcodeInputRef.current && step === 3) {
      barcodeInputRef.current.focus();
    }
  }, [step]);

  useEffect(() => {
    if (selectedCompanyId && products.length > 0) {
      checkCapacity();
    }
  }, [selectedCompanyId, products]);

  // ✅ Generar número de envío automático
  const generateShipmentNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const generated = `SH${year}${month}${day}${random}`;
    
    setShipmentNumber(generated);
    setShipmentNumberSuggestions([
      generated,
      `ENV${year}${month}${day}${random}`,
      `TR${year}${month}${day}${random}`
    ]);
  };

  // ✅ Cargar slots de tiempo disponibles
  const loadAvailableTimeSlots = () => {
    const now = new Date();
    const slots: TimeSlot[] = [];
    
    // Generar slots para hoy y mañana
    for (let day = 0; day < 2; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      date.setHours(6, 0, 0, 0);
      
      for (let hour = 6; hour < 22; hour += 2) {
        const slotDate = new Date(date);
        slotDate.setHours(hour);
        
        const isPast = slotDate < now;
        // const isToday = day === 0; // COMENTADO - no usado
        
        slots.push({
          start: slotDate.toISOString().slice(0, 16),
          end: new Date(slotDate.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
          label: `${slotDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${new Date(slotDate.getTime() + 2 * 60 * 60 * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
          available: !isPast
        });
      }
    }
    
    setAvailableTimeSlots(slots);
  };

  const loadTransportCompanies = async () => {
    try {
      setLoadingCompanies(true);
      
      const response = await transportService.getAll(true);
      
      let companiesData: TransportCompany[] = [];
      
      if (Array.isArray(response)) {
        companiesData = response;
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) {
          companiesData = response.data;
        } else if (Array.isArray(response.transportCompanies)) {
          companiesData = response.transportCompanies;
        } else if (Array.isArray(response.companies)) {
          companiesData = response.companies;
        } else if (Array.isArray(response.items)) {
          companiesData = response.items;
        }
      }
      
      const activeCompanies = companiesData.filter(company => company.isActive !== false);
      
      setTransportCompanies(activeCompanies);
      
      if (activeCompanies.length > 0) {
        setSelectedCompanyId(activeCompanies[0].id);
        setValidationErrors(prev => ({ ...prev, transportCompany: undefined }));
      } else {
        // toast.error('No hay transportadoras activas disponibles');
        alert('No hay transportadoras activas disponibles');
        setSelectedCompanyId('');
        setValidationErrors(prev => ({ 
          ...prev, 
          transportCompany: 'No hay transportadoras activas disponibles. Por favor, crea una transportadora primero.' 
        }));
      }
    } catch (error: any) {      
      
      let errorMessage = 'Error conectando con el servidor';
      if (error.response?.status === 404) {
        errorMessage = 'Ruta del API no encontrada. Verifica la configuración.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // toast.error(errorMessage);
      alert(errorMessage);
      setTransportCompanies([]);
      setSelectedCompanyId('');
      setValidationErrors(prev => ({ 
        ...prev, 
        transportCompany: errorMessage 
      }));
    } finally {
      setLoadingCompanies(false);
    }
  };

  // ✅ Verificar capacidad de la transportadora
  const checkCapacity = async () => {
    if (!selectedCompanyId || products.length === 0) return;
    
    setIsCheckingCapacity(true);
    try {
      const company = transportCompanies.find(c => c.id === selectedCompanyId);
      if (!company?.maxCapacity) return;
      
      // Calcular volumen estimado de productos
      const estimatedVolume = products.reduce((sum, p) => sum + (p.quantity * (p.volume || 1)), 0);
      const capacityPercentage = (estimatedVolume / company.maxCapacity) * 100;
      
      if (capacityPercentage > 100) {
        setCapacityWarning(`⚠️ La transportadora ${company.name} tiene capacidad máxima de ${company.maxCapacity} unidades. El envío actual requiere ${estimatedVolume.toFixed(0)} unidades (${capacityPercentage.toFixed(1)}% de capacidad).`);
        setValidationErrors(prev => ({ 
          ...prev, 
          capacity: 'Excede la capacidad máxima de la transportadora' 
        }));
      } else if (capacityPercentage > 80) {
        setCapacityWarning(`⚠️ Advertencia: El envío usará ${capacityPercentage.toFixed(1)}% de la capacidad de ${company.name}. Considera dividir el envío o usar otra transportadora.`);
        setValidationErrors(prev => ({ ...prev, capacity: undefined }));
      } else {
        setCapacityWarning('');
        setValidationErrors(prev => ({ ...prev, capacity: undefined }));
      }
    } catch (error) {
      // Silencioso
    } finally {
      setIsCheckingCapacity(false);
    }
  };

  // ✅ Resetear todas las validaciones
  const resetValidations = () => {
    setValidationErrors({});
    // setTouchedFields(new Set()); // COMENTADO
    setShowProductsWarning(false);
    setShowDepartureTimeWarning(false);
    setCapacityWarning('');
    setConfirmNoProducts(false);
    setConfirmNoDepartureTime(false);
  };

  // ✅ Validación estricta de hora de salida requerida
  const validateDepartureTimeRequired = (time: string): string | undefined => {
    if (!time && VALIDATION_CONFIG.REQUIRED_DEPARTURE_TIME && !confirmNoDepartureTime) {
      return 'La hora de salida estimada es requerida';
    }
    
    if (!time) {
      return confirmNoDepartureTime ? undefined : 'Debes especificar una hora de salida';
    }
    
    const selectedDate = new Date(time);
    const now = new Date();
    
    if (isNaN(selectedDate.getTime())) {
      return 'Fecha y hora inválidas';
    }
    
    // No puede ser en el pasado (con margen de 1 hora para ajustes)
    const oneHourAgo = new Date(now.getTime() - 60 * 60000);
    if (selectedDate < oneHourAgo) {
      return 'La hora de salida no puede ser en el pasado. Mínimo 1 hora en el futuro.';
    }
    
    // No puede ser más de X días en el futuro
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + VALIDATION_CONFIG.MAX_DAYS_IN_FUTURE);
    if (selectedDate > maxDate) {
      return `La hora de salida no puede ser más de ${VALIDATION_CONFIG.MAX_DAYS_IN_FUTURE} días en el futuro`;
    }
    
    // Validar hora laboral
    const hour = selectedDate.getHours();
    const minutes = selectedDate.getMinutes();
    
    if (hour < VALIDATION_CONFIG.WORKING_HOURS.start || hour >= VALIDATION_CONFIG.WORKING_HOURS.end) {
      return `La hora debe estar entre las ${VALIDATION_CONFIG.WORKING_HOURS.start}:00 y las ${VALIDATION_CONFIG.WORKING_HOURS.end}:00`;
    }
    
    // Validar minutos (solo en intervalos de 15 minutos)
    if (minutes % 15 !== 0) {
      return 'Los minutos deben ser en intervalos de 15 minutos (00, 15, 30, 45)';
    }
    
    // Validar que no sea domingo
    if (selectedDate.getDay() === 0) {
      return 'No se permiten envíos los domingos';
    }
    
    return undefined;
  };

  // ✅ Validación de número de envío única
  const validateShipmentNumberUnique = (number: string): string | undefined => {
    const trimmed = number.trim();
    
    if (!trimmed) {
      return 'El número de envío es requerido';
    }
    
    if (trimmed.length < VALIDATION_CONFIG.MIN_SHIPMENT_NUMBER_LENGTH) {
      return `El número debe tener al menos ${VALIDATION_CONFIG.MIN_SHIPMENT_NUMBER_LENGTH} caracteres`;
    }
    
    if (trimmed.length > VALIDATION_CONFIG.MAX_SHIPMENT_NUMBER_LENGTH) {
      return `El número no puede exceder los ${VALIDATION_CONFIG.MAX_SHIPMENT_NUMBER_LENGTH} caracteres`;
    }
    
    if (!/^[A-Za-z0-9\-_.]+$/.test(trimmed)) {
      return 'Solo letras, números, guiones, puntos y guiones bajos';
    }
    
    if (/^[-_.]|[-_.]$/.test(trimmed)) {
      return 'No puede empezar o terminar con guiones, puntos o guiones bajos';
    }
    
    if (/[-_.]{2,}/.test(trimmed)) {
      return 'No puede tener caracteres especiales consecutivos';
    }
    
    // ✅ Verificar unicidad con envíos existentes
    if (existingShipments.length > 0) {
      const isDuplicate = existingShipments.some(shipment => 
        shipment.shipmentNumber === trimmed ||
        shipment.data?.shipmentNumber === trimmed
      );
      
      if (isDuplicate) {
        return 'Este número de envío ya existe. Por favor, usa un número único.';
      }
    }
    
    return undefined;
  };

  // ✅ Validación estricta de productos requeridos
  const validateProductsRequired = (): string | undefined => {
    if (products.length === 0) {
      if (VALIDATION_CONFIG.REQUIRED_PRODUCTS && !confirmNoProducts) {
        return 'Debes agregar al menos un producto para crear un envío';
      }
      if (!confirmNoProducts) {
        return 'Debes confirmar que quieres continuar sin productos';
      }
      return undefined;
    }
    
    if (products.length < VALIDATION_CONFIG.MIN_PRODUCTS) {
      return `Debes agregar al menos ${VALIDATION_CONFIG.MIN_PRODUCTS} producto${VALIDATION_CONFIG.MIN_PRODUCTS !== 1 ? 's' : ''}`;
    }
    
    if (products.length > VALIDATION_CONFIG.MAX_PRODUCTS) {
      return `No puedes agregar más de ${VALIDATION_CONFIG.MAX_PRODUCTS} productos diferentes`;
    }
    
    // Validar que todos los productos tengan cantidad > 0
    const invalidProduct = products.find(p => p.quantity < 1);
    if (invalidProduct) {
      return `El producto ${invalidProduct.barcode} debe tener al menos 1 unidad`;
    }
    
    // Validar códigos de barras únicos
    const barcodes = products.map(p => p.barcode);
    const uniqueBarcodes = new Set(barcodes);
    if (barcodes.length !== uniqueBarcodes.size) {
      return 'Hay códigos de barras duplicados en la lista';
    }
    
    // Validar límite total de unidades
    const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0);
    if (totalUnits > VALIDATION_CONFIG.MAX_TOTAL_UNITS) {
      return `El límite máximo total es de ${VALIDATION_CONFIG.MAX_TOTAL_UNITS} unidades`;
    }
    
    // Validar que no haya productos con cantidad 0
    const zeroQuantityProducts = products.filter(p => p.quantity === 0);
    if (zeroQuantityProducts.length > 0) {
      return 'Algunos productos tienen cantidad 0. Ajusta las cantidades o elimínalos.';
    }
    
    return undefined;
  };

  // ✅ Agregar productos por lotes
  const handleBulkAddProducts = () => {
    const barcodes = bulkBarcodeInput
      .split(/[\n,;]/)
      .map(barcode => barcode.trim())
      .filter(barcode => barcode.length >= VALIDATION_CONFIG.MIN_BARCODE_LENGTH);
    
    if (barcodes.length === 0) {
      // toast.error('No se encontraron códigos válidos');
      alert('No se encontraron códigos válidos');
      return;
    }
    
    if (products.length + barcodes.length > VALIDATION_CONFIG.MAX_PRODUCTS) {
      // toast.error(`Límite máximo de ${VALIDATION_CONFIG.MAX_PRODUCTS} productos excedido`);
      alert(`Límite máximo de ${VALIDATION_CONFIG.MAX_PRODUCTS} productos excedido`);
      return;
    }
    
    const newProducts: ProductItem[] = [];
    const duplicates: string[] = [];
    
    barcodes.forEach(barcode => {
      // Validar formato del código
      if (!/^[A-Za-z0-9\-_.]+$/.test(barcode)) {
        // toast.error(`Código inválido: ${barcode}`);
        alert(`Código inválido: ${barcode}`);
        return;
      }
      
      const existingProduct = products.find(p => p.barcode === barcode);
      
      if (existingProduct) {
        // Incrementar cantidad si ya existe
        if (existingProduct.quantity < 999) {
          existingProduct.quantity += 1;
          duplicates.push(barcode);
        }
      } else {
        // Crear nuevo producto
        newProducts.push({
          id: Date.now() + Math.random(),
          barcode,
          name: `Producto ${barcode.substring(0, 8)}...`,
          quantity: 1,
          category: 'General',
          scannedAt: new Date().toLocaleTimeString()
        });
      }
    });
    
    if (newProducts.length > 0) {
      setProducts([...products, ...newProducts]);
      // toast.success(`${newProducts.length} nuevos productos agregados`);
      alert(`${newProducts.length} nuevos productos agregados`);
    }
    
    if (duplicates.length > 0) {
      // toast.info(`${duplicates.length} productos ya existían, se incrementó su cantidad`);
      alert(`${duplicates.length} productos ya existían, se incrementó su cantidad`);
    }
    
    setBulkBarcodeInput('');
    setShowBulkInput(false);
    
    // Ocultar advertencia si se agregan productos
    if (showProductsWarning) {
      setShowProductsWarning(false);
    }
  };

  // ✅ Función para agregar productos con más validaciones
  const handleAddProduct = async () => {
    const barcode = barcodeInput.trim();
    
    if (!barcode) {
      setValidationErrors(prev => ({ 
        ...prev, 
        barcode: 'Ingresa un código de barras' 
      }));
      // toast.error('Ingresa un código de barras');
      alert('Ingresa un código de barras');
      return;
    }

    if (barcode.length < VALIDATION_CONFIG.MIN_BARCODE_LENGTH) {
      setValidationErrors(prev => ({ 
        ...prev, 
        barcode: `El código debe tener al menos ${VALIDATION_CONFIG.MIN_BARCODE_LENGTH} caracteres` 
      }));
      // toast.error(`El código debe tener al menos ${VALIDATION_CONFIG.MIN_BARCODE_LENGTH} caracteres`);
      alert(`El código debe tener al menos ${VALIDATION_CONFIG.MIN_BARCODE_LENGTH} caracteres`);
      return;
    }

    if (barcode.length > VALIDATION_CONFIG.MAX_BARCODE_LENGTH) {
      setValidationErrors(prev => ({ 
        ...prev, 
        barcode: `El código no puede exceder los ${VALIDATION_CONFIG.MAX_BARCODE_LENGTH} caracteres` 
      }));
      // toast.error('El código es demasiado largo');
      alert('El código es demasiado largo');
      return;
    }

    if (!/^[A-Za-z0-9\-_.]+$/.test(barcode)) {
      setValidationErrors(prev => ({ 
        ...prev, 
        barcode: 'Solo letras, números, guiones, puntos y guiones bajos' 
      }));
      // toast.error('El código contiene caracteres inválidos');
      alert('El código contiene caracteres inválidos');
      return;
    }

    if (/^[-_.]|[-_.]$/.test(barcode)) {
      setValidationErrors(prev => ({ 
        ...prev, 
        barcode: 'No puede empezar o terminar con caracteres especiales' 
      }));
      // toast.error('El código no puede empezar o terminar con caracteres especiales');
      alert('El código no puede empezar o terminar con caracteres especiales');
      return;
    }

    const existingProduct = products.find(p => p.barcode === barcode);
    if (existingProduct) {
      const newQuantity = existingProduct.quantity + 1;
      if (newQuantity > 999) {
        // toast.error('No puedes agregar más de 999 unidades del mismo producto');
        alert('No puedes agregar más de 999 unidades del mismo producto');
        return;
      }
      
      setProducts(products.map(p => 
        p.id === existingProduct.id 
          ? { ...p, quantity: newQuantity }
          : p
      ));
      // toast.success(`Cantidad aumentada: ${barcode} (x${newQuantity})`);
      alert(`Cantidad aumentada: ${barcode} (x${newQuantity})`);
      
      if (showProductsWarning) {
        setShowProductsWarning(false);
      }
      
      setValidationErrors(prev => ({ ...prev, barcode: undefined }));
    } else {
      if (products.length >= VALIDATION_CONFIG.MAX_PRODUCTS) {
        // toast.error(`No puedes agregar más de ${VALIDATION_CONFIG.MAX_PRODUCTS} productos diferentes`);
        alert(`No puedes agregar más de ${VALIDATION_CONFIG.MAX_PRODUCTS} productos diferentes`);
        return;
      }

      const newProduct: ProductItem = {
        id: Date.now(),
        barcode,
        name: `Producto ${barcode.substring(0, 8)}`,
        quantity: 1,
        category: 'General',
        scannedAt: new Date().toLocaleTimeString()
      };
      
      setProducts([...products, newProduct]);
      // toast.success(`Producto agregado: ${barcode}`);
      alert(`Producto agregado: ${barcode}`);
      
      if (showProductsWarning) {
        setShowProductsWarning(false);
      }
      
      if (confirmNoProducts) {
        setConfirmNoProducts(false);
      }
      
      setValidationErrors(prev => ({ ...prev, barcode: undefined }));
    }
    
    setBarcodeInput('');
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  // ✅ Confirmación obligatoria para continuar sin productos
  const confirmContinueWithoutProducts = () => {
    const confirmed = window.confirm(
      '🚫 CONFIRMACIÓN OBLIGATORIA\n\n' +
      'POLÍTICA DE LA EMPRESA:\n' +
      '• Todos los envíos deben tener al menos 1 producto\n' +
      '• Los envíos sin productos no pueden ser procesados\n' +
      '• Se requiere aprobación del supervisor\n\n' +
      'EXCEPCIÓN SOLO PARA:\n' +
      '• Envíos de documentación\n' +
      '• Pruebas del sistema\n' +
      '• Casos especiales aprobados\n\n' +
      '⚠️ ¿Estás seguro de que este envío califica como excepción?\n' +
      'Esta acción será registrada en el sistema.'
    );
    
    if (confirmed) {
      const supervisorCode = prompt(
        'Ingresa el código de aprobación del supervisor:',
        ''
      );
      
      if (supervisorCode === 'APPROVE-2024' || supervisorCode === '123456') {
        setConfirmNoProducts(true);
        setShowProductsWarning(false);
        setValidationErrors(prev => ({ ...prev, products: undefined }));
        // toast.success('✅ Aprobación confirmada. Se creará envío sin productos.');
        alert('✅ Aprobación confirmada. Se creará envío sin productos.');
      } else {
        // toast.error('❌ Código de aprobación incorrecto. No se puede continuar sin productos.');
        alert('❌ Código de aprobación incorrecto. No se puede continuar sin productos.');
      }
    }
  };

  // ✅ Confirmación obligatoria para continuar sin hora de salida
  const confirmContinueWithoutDepartureTime = () => {
    const confirmed = window.confirm(
      '⏰ CONFIRMACIÓN REQUERIDA\n\n' +
      'INFORMACIÓN IMPORTANTE:\n' +
      '• La hora de salida es requerida para programación\n' +
      '• Sin hora de salida, el envío quedará como "Pendiente"\n' +
      '• No podrá ser asignado a rutas automáticamente\n\n' +
      '¿Estás seguro de crear el envío sin hora de salida?\n' +
      'Podrás agregarla después desde la sección de edición.'
    );
    
    if (confirmed) {
      setConfirmNoDepartureTime(true);
      setShowDepartureTimeWarning(false);
      setValidationErrors(prev => ({ ...prev, departureTime: undefined }));
      // toast.success('Se creará envío sin hora de salida especificada');
      alert('Se creará envío sin hora de salida especificada');
    }
  };

  // ✅ Validación del paso 1
  const validateStep1 = (): boolean => {
    const errors: ValidationErrors = {};
    let isValid = true;
    
    const transportError = validateTransportCompany(selectedCompanyId);
    if (transportError) {
      errors.transportCompany = transportError;
      isValid = false;
    }
    
    if (capacityWarning && validationErrors.capacity) {
      errors.capacity = validationErrors.capacity;
      isValid = false;
    }
    
    setValidationErrors(prev => ({ ...prev, ...errors }));
    return isValid;
  };

  // ✅ Validación del paso 2
  const validateStep2 = (): boolean => {
    const errors: ValidationErrors = {};
    let isValid = true;
    
    const shipmentNumberError = validateShipmentNumberUnique(shipmentNumber);
    if (shipmentNumberError) {
      errors.shipmentNumber = shipmentNumberError;
      isValid = false;
    }
    
    const departureTimeError = validateDepartureTimeRequired(estimatedDeparture);
    if (departureTimeError) {
      errors.departureTime = departureTimeError;
      isValid = false;
      setShowDepartureTimeWarning(true);
    }
    
    setValidationErrors(prev => ({ ...prev, ...errors }));
    return isValid;
  };

  // ✅ Validación del paso 3
  const validateStep3 = (): boolean => {
    const errors: ValidationErrors = {};
    let isValid = true;
    
    const productsError = validateProductsRequired();
    if (productsError) {
      errors.products = productsError;
      isValid = false;
      
      if (products.length === 0 && !confirmNoProducts) {
        setShowProductsWarning(true);
      }
    }
    
    setValidationErrors(prev => ({ ...prev, ...errors }));
    return isValid;
  };

  // ✅ Validación final antes de enviar
  const validateFinalSubmission = (): boolean => {
    // Validar todos los pasos
    const step1Valid = validateStep1();
    const step2Valid = validateStep2();
    const step3Valid = validateStep3();
    
    if (!step1Valid || !step2Valid || !step3Valid) {
      return false;
    }
    
    // Validaciones cruzadas adicionales
    if (products.length > 0 && !estimatedDeparture && !confirmNoDepartureTime) {
      // toast.error('Los envíos con productos requieren hora de salida');
      alert('Los envíos con productos requieren hora de salida');
      setShowDepartureTimeWarning(true);
      return false;
    }
    
    // Validar capacidad final
    if (validationErrors.capacity) {
      // toast.error('Excede la capacidad de la transportadora seleccionada');
      alert('Excede la capacidad de la transportadora seleccionada');
      return false;
    }
    
    return true;
  };

  // ✅ Función para seleccionar slot de tiempo
  const selectTimeSlot = (slotStart: string) => {
    setEstimatedDeparture(slotStart);
    setValidationErrors(prev => ({ ...prev, departureTime: undefined }));
    setShowDepartureTimeWarning(false);
    setConfirmNoDepartureTime(false);
    // toast.success(`Hora de salida establecida: ${new Date(slotStart).toLocaleString('es-ES')}`);
    alert(`Hora de salida establecida: ${new Date(slotStart).toLocaleString('es-ES')}`);
  };

  // ✅ Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      // toast.error('El envío ya se está procesando');
      alert('El envío ya se está procesando');
      return;
    }
    
    // Validación final estricta
    if (!validateFinalSubmission()) {
      // toast.error('❌ No se puede crear el envío. Corrige todos los errores.');
      alert('❌ No se puede crear el envío. Corrige todos los errores.');
      return;
    }
    
    // ✅ Confirmación final estricta
    const confirmationDetails = `
📦 RESUMEN DEL ENVÍO
────────────────────
Transportadora: ${selectedCompany?.name}
Número de envío: ${shipmentNumber}
Hora de salida: ${estimatedDeparture ? new Date(estimatedDeparture).toLocaleString('es-ES') : 'No especificada'}
Productos: ${products.length} (${products.reduce((sum, p) => sum + p.quantity, 0)} unidades)
────────────────────

⚠️ POLÍTICAS A CONFIRMAR:
1. ${VALIDATION_CONFIG.REQUIRED_PRODUCTS ? '✓ Productos requeridos' : '⚠️ Sin productos confirmado'}
2. ${estimatedDeparture ? '✓ Hora de salida especificada' : '⚠️ Sin hora de salida confirmado'}
3. ✓ Transportadora seleccionada
4. ✓ Número de envío único

¿Confirmar creación del envío?
`.trim();

    const isConfirmed = window.confirm(confirmationDetails);
    if (!isConfirmed) {
      // toast.info('Creación cancelada por el usuario');
      alert('Creación cancelada por el usuario');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      // 1️⃣ Crear el envío
      const shipmentData: any = {
        transportCompanyId: selectedCompanyId,
        shipmentNumber: shipmentNumber.trim(),
        requiresProducts: products.length > 0,
        status: products.length > 0 ? 'PENDING' : 'DRAFT'
      };

      if (estimatedDeparture) {
        shipmentData.estimatedDeparture = new Date(estimatedDeparture).toISOString();
        shipmentData.hasDepartureTime = true;
      } else {
        shipmentData.hasDepartureTime = false;
        shipmentData.requiresDepartureTimeUpdate = true;
      }

      if (products.length === 0 && confirmNoProducts) {
        shipmentData.specialApproval = true;
        shipmentData.approvalType = 'NO_PRODUCTS';
      }

      const shipmentResponse = await shipmentService.create(shipmentData);
      
      const shipmentId = shipmentResponse.id || 
                        shipmentResponse.data?.id || 
                        shipmentResponse.shipmentId;
      
      if (!shipmentId) {
        throw new Error('No se pudo obtener el ID del envío creado');
      }

      // 2️⃣ Crear productos si existen
      let createdProducts = [];
      if (products.length > 0) {
        createdProducts = await createProductsInBackend(shipmentId);
      }

      // 3️⃣ Enviar notificación de éxito (usando alert en lugar de toast)
      const successMessage = products.length > 0
        ? `✅ Envío creado exitosamente con ${products.length} productos`
        : '⚠️ Envío creado SIN PRODUCTOS (aprobación especial)';
      
      alert(successMessage);
      
      // 4️⃣ Pasar datos completos
      const fullShipmentData = {
        ...shipmentResponse,
        id: shipmentId,
        products: createdProducts,
        productCount: products.length,
        totalQuantity: products.reduce((sum, p) => sum + p.quantity, 0),
        hasProducts: products.length > 0,
        hasDepartureTime: !!estimatedDeparture,
        shipmentNumber: shipmentNumber,
        transportCompany: selectedCompany,
        specialApproval: products.length === 0,
        requiresAttention: !estimatedDeparture || products.length === 0
      };
      
      onSuccess(fullShipmentData);
      
      // 5️⃣ Cerrar y resetear
      onClose();
      resetForm();
      
    } catch (error: any) {      
      let errorMessage = 'Error creando envío';
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.errors) {
          const validationErrors = Object.values(error.response.data.errors).flat();
          errorMessage = validationErrors.join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // toast.error(
      //   <div className="flex items-start gap-2">
      //     <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
      //     <span>{errorMessage}</span>
      //   </div>
      // );
      alert(errorMessage);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // ✅ Obtener transportadora seleccionada
  const selectedCompany = transportCompanies.find(c => c.id === selectedCompanyId);
  const totalProductsCount = products.reduce((sum, product) => sum + product.quantity, 0);
  // const uniqueProductsCount = products.length; // COMENTADO - no usado

  // ✅ Calcular si hay errores críticos
  const hasCriticalErrors = () => {
    if (step === 1 && (!selectedCompanyId || validationErrors.transportCompany || validationErrors.capacity)) return true;
    if (step === 2 && (!shipmentNumber || validationErrors.shipmentNumber || 
        (VALIDATION_CONFIG.REQUIRED_DEPARTURE_TIME && !estimatedDeparture && !confirmNoDepartureTime))) return true;
    if (step === 3 && VALIDATION_CONFIG.REQUIRED_PRODUCTS && products.length === 0 && !confirmNoProducts) return true;
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header con gradiente */}
        <div className="relative p-8 border-b">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary-500 via-purple-500 to-blue-500 rounded-t-2xl"></div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-blue-100 rounded-xl flex items-center justify-center">
                  <Package className="w-7 h-7 text-primary-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-primary-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Plus className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Nuevo Envío</h2>
                <p className="text-gray-500">
                  {VALIDATION_CONFIG.REQUIRED_PRODUCTS 
                    ? 'Productos requeridos • Hora de salida obligatoria' 
                    : 'Complete la información del envío'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (isSubmitting) {
                  // toast.error('No puedes cerrar mientras se procesa el envío');
                  alert('No puedes cerrar mientras se procesa el envío');
                  return;
                }
                const hasChanges = shipmentNumber || estimatedDeparture || products.length > 0;
                if (hasChanges && !window.confirm('¿Estás seguro de cerrar? Se perderán los cambios no guardados.')) {
                  return;
                }
                onClose();
              }}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110 disabled:opacity-50"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Steps indicator con validaciones */}
          <div className="mt-6 flex items-center justify-between">
            <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-100' : 'bg-gray-100'} ${!selectedCompanyId && step === 1 ? 'border-2 border-red-300' : ''}`}>
                {step > 1 ? <Check className="w-4 h-4" /> : 1}
              </div>
              <span className="ml-2 font-medium">Transportadora</span>
              {!selectedCompanyId && step === 1 && (
                <span className="ml-2 text-xs text-red-600">(Requerido)</span>
              )}
            </div>
            <div className="flex-1 h-0.5 mx-2 bg-gray-200"></div>
            <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-100' : 'bg-gray-100'} ${(!shipmentNumber || (!estimatedDeparture && !confirmNoDepartureTime)) && step === 2 ? 'border-2 border-red-300' : ''}`}>
                {step > 2 ? <Check className="w-4 h-4" /> : 2}
              </div>
              <span className="ml-2 font-medium">Detalles</span>
              {(!shipmentNumber || (!estimatedDeparture && !confirmNoDepartureTime)) && step === 2 && (
                <span className="ml-2 text-xs text-red-600">(Requerido)</span>
              )}
            </div>
            <div className="flex-1 h-0.5 mx-2 bg-gray-200"></div>
            <div className={`flex items-center ${step >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary-100' : 'bg-gray-100'} ${products.length === 0 && step === 3 ? 'border-2 border-red-300' : ''}`}>
                3
              </div>
              <span className="ml-2 font-medium">Productos</span>
              {products.length === 0 && step === 3 && (
                <span className="ml-2 text-xs text-red-600">(Requerido)</span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* ✅ PASO 1: Selección de transportadora con validaciones */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-5 h-5 text-primary-600" />
                  <label className="text-lg font-semibold text-gray-900">
                    Selecciona una Transportadora
                  </label>
                  <span className="text-red-500">*</span>
                </div>
                
                {/* Validación de transportadora */}
                {validationErrors.transportCompany && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Ban className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-red-800">Error de selección</h4>
                        <p className="text-sm text-red-700 mt-1">{validationErrors.transportCompany}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Validación de capacidad */}
                {capacityWarning && (
                  <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-yellow-800">Advertencia de capacidad</h4>
                        <p className="text-sm text-yellow-700 mt-1">{capacityWarning}</p>
                        {validationErrors.capacity && (
                          <p className="text-sm text-red-700 mt-2 font-bold">
                            ❌ No se puede continuar hasta ajustar la capacidad
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {loadingCompanies ? (
                  <div className="text-center py-12">
                    <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando transportadoras...</p>
                  </div>
                ) : transportCompanies.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
                    <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No hay transportadoras disponibles</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Ve a la sección de Transportadoras para crear una primero
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {transportCompanies.map((company) => (
                      <div
                        key={company.id}
                        onClick={() => handleCompanyChange(company.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          selectedCompanyId === company.id
                            ? 'border-primary-500 bg-primary-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        } ${company.maxCapacity && company.currentLoad && company.currentLoad > company.maxCapacity * 0.9 ? 'border-red-200 bg-red-50' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-gray-900">{company.name}</h3>
                              {company.maxCapacity && company.currentLoad && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  company.currentLoad > company.maxCapacity * 0.9 
                                    ? 'bg-red-100 text-red-800' 
                                    : company.currentLoad > company.maxCapacity * 0.7
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {Math.round((company.currentLoad / company.maxCapacity) * 100)}% capacidad
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="w-3 h-3" />
                                <span>{company.driverName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Car className="w-3 h-3" />
                                <span className="font-mono">{company.licensePlate}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="w-3 h-3" />
                                <span>{company.phone}</span>
                              </div>
                              {company.maxCapacity && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Package className="w-3 h-3" />
                                  <span>Capacidad: {company.maxCapacity} unidades</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {selectedCompanyId === company.id && (
                            <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedCompany && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Transportadora seleccionada
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Empresa</p>
                      <p className="font-bold text-gray-900">{selectedCompany.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Conductor</p>
                      <p className="font-bold text-gray-900">{selectedCompany.driverName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Placa</p>
                      <p className="font-mono font-bold text-gray-900">{selectedCompany.licensePlate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Teléfono</p>
                      <p className="font-bold text-gray-900">{selectedCompany.phone}</p>
                    </div>
                    {selectedCompany.maxCapacity && (
                      <div className="col-span-2">
                        <p className="text-sm text-blue-600 font-medium">Capacidad máxima</p>
                        <div className="mt-2">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>0 unidades</span>
                            <span>{selectedCompany.maxCapacity} unidades</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-green-600 h-2.5 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (selectedCompany.currentLoad || 0) / selectedCompany.maxCapacity * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Carga actual: {selectedCompany.currentLoad || 0} unidades
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!selectedCompanyId || loadingCompanies || !!validationErrors.transportCompany || !!validationErrors.capacity}
                  className="bg-primary-600 text-white px-8 py-3 rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {isCheckingCapacity ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verificando capacidad...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ✅ PASO 2: Detalles del envío con hora de salida obligatoria */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Número de envío */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-primary-600" />
                    <label className="text-lg font-semibold text-gray-900">
                      Número de Envío
                    </label>
                    <span className="text-red-500">*</span>
                  </div>
                  <button
                    type="button"
                    onClick={generateShipmentNumber}
                    className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    Generar automático
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={shipmentNumber}
                    onChange={(e) => handleShipmentNumberChange(e.target.value)}
                    className={`w-full px-4 py-3 pl-12 border rounded-xl text-lg font-mono focus:outline-none focus:ring-2 focus:border-transparent ${
                      validationErrors.shipmentNumber 
                        ? 'border-red-300 focus:ring-red-200' 
                        : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
                    }`}
                    placeholder="Ej: SH20250115001"
                    required
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Hash className={`w-5 h-5 ${validationErrors.shipmentNumber ? 'text-red-400' : 'text-gray-400'}`} />
                  </div>
                </div>
                {validationErrors.shipmentNumber && (
                  <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.shipmentNumber}</span>
                  </div>
                )}
                
                {/* Sugerencias de números */}
                {shipmentNumberSuggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-1">Sugerencias disponibles:</p>
                    <div className="flex flex-wrap gap-2">
                      {shipmentNumberSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setShipmentNumber(suggestion)}
                          className={`text-xs px-3 py-1 rounded-full border ${
                            shipmentNumber === suggestion
                              ? 'bg-primary-100 text-primary-800 border-primary-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Hora de salida ESTIMADA - OBLIGATORIA */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary-600" />
                    <label className="text-lg font-semibold text-gray-900">
                      Hora Estimada de Salida
                    </label>
                    <span className="text-red-500">*</span>
                  </div>
                  {!estimatedDeparture && (
                    <button
                      type="button"
                      onClick={confirmContinueWithoutDepartureTime}
                      className="text-sm text-yellow-600 hover:text-yellow-800 flex items-center gap-1"
                    >
                      <ClockIcon className="w-3 h-3" />
                      Continuar sin hora
                    </button>
                  )}
                </div>

                {/* Slots de tiempo disponibles */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Horarios disponibles recomendados:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableTimeSlots.map((slot, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectTimeSlot(slot.start)}
                        disabled={!slot.available}
                        className={`p-2 rounded-lg border text-sm text-center transition-all ${
                          estimatedDeparture === slot.start
                            ? 'bg-primary-100 border-primary-500 text-primary-800'
                            : slot.available
                            ? 'bg-white border-gray-300 hover:border-primary-300 hover:bg-primary-50 text-gray-700'
                            : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="font-medium">{new Date(slot.start).toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                        <div className="text-xs">{slot.label}</div>
                        {!slot.available && (
                          <div className="text-xs text-red-500 mt-1">No disponible</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input manual de fecha/hora */}
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={estimatedDeparture}
                    onChange={(e) => handleDepartureTimeChange(e.target.value)}
                    className={`w-full px-4 py-3 pl-12 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent ${
                      validationErrors.departureTime || showDepartureTimeWarning
                        ? 'border-red-300 focus:ring-red-200' 
                        : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
                    }`}
                    min={(() => {
                      const now = new Date();
                      now.setMinutes(now.getMinutes() + 60); // Mínimo 1 hora en el futuro
                      return now.toISOString().slice(0, 16);
                    })()}
                    max={(() => {
                      const maxDate = new Date();
                      maxDate.setDate(maxDate.getDate() + VALIDATION_CONFIG.MAX_DAYS_IN_FUTURE);
                      return maxDate.toISOString().slice(0, 16);
                    })()}
                    step="900" // Intervalos de 15 minutos
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Calendar className={`w-5 h-5 ${validationErrors.departureTime ? 'text-red-400' : 'text-gray-400'}`} />
                  </div>
                </div>

                {/* Mensajes de validación */}
                {validationErrors.departureTime && (
                  <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{validationErrors.departureTime}</span>
                  </div>
                )}

                {showDepartureTimeWarning && !estimatedDeparture && !confirmNoDepartureTime && (
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-yellow-800 font-medium">
                          ⚠️ La hora de salida es requerida para envíos con productos
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Si no especificas la hora, el envío quedará como "Pendiente de programación"
                        </p>
                        <button
                          type="button"
                          onClick={confirmContinueWithoutDepartureTime}
                          className="mt-2 text-sm bg-yellow-600 text-white px-3 py-1 rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                          Confirmar continuar sin hora
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {estimatedDeparture && (
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">
                        Hora programada: <strong>{new Date(estimatedDeparture).toLocaleString('es-ES')}</strong>
                      </span>
                    </div>
                  </div>
                )}

                {confirmNoDepartureTime && (
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">
                        ⚠️ Continuarás sin especificar hora de salida
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-500 mt-2 ml-1">
                  Obligatorio para envíos con productos • Mínimo 1 hora en el futuro • Intervalos de 15 minutos
                </p>
              </div>

              {/* Resumen del paso 2 */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Resumen del Envío
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-green-600 font-medium">Transportadora</p>
                    <p className="font-bold text-gray-900">{selectedCompany?.name || 'No seleccionada'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-green-600 font-medium">Número de envío</p>
                    <p className={`font-mono font-bold ${shipmentNumber ? 'text-gray-900' : 'text-red-500'}`}>
                      {shipmentNumber || 'Requerido'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-green-600 font-medium">Hora de salida</p>
                    <p className="font-bold text-gray-900">
                      {estimatedDeparture 
                        ? new Date(estimatedDeparture).toLocaleString('es-ES', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })
                        : confirmNoDepartureTime 
                          ? '⚠️ No especificada'
                          : '❌ Requerida'
                      }
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-green-600 font-medium">Estado</p>
                    <p className="font-bold text-gray-900">
                      {estimatedDeparture ? '✅ Programado' : '⚠️ Pendiente'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={hasCriticalErrors()}
                  className="bg-primary-600 text-white px-8 py-3 rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {VALIDATION_CONFIG.REQUIRED_PRODUCTS 
                    ? 'Agregar Productos (Obligatorio)' 
                    : 'Siguiente: Productos'
                  }
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ✅ PASO 3: Productos con validación estricta */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary-600" />
                    <label className="text-lg font-semibold text-gray-900">
                      {VALIDATION_CONFIG.REQUIRED_PRODUCTS 
                        ? 'Productos del Envío (Obligatorio)' 
                        : 'Productos del Envío'
                      }
                    </label>
                    {VALIDATION_CONFIG.REQUIRED_PRODUCTS && (
                      <span className="text-red-500">*</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkInput(!showBulkInput)}
                      className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
                    >
                      {showBulkInput ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showBulkInput ? 'Ocultar' : 'Agregar por lotes'}
                    </button>
                  </div>
                </div>

                {/* ✅ ADVERTENCIA: Productos requeridos */}
                {VALIDATION_CONFIG.REQUIRED_PRODUCTS && products.length === 0 && !confirmNoProducts && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Ban className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-800">PRODUCTOS REQUERIDOS</h4>
                        <p className="text-sm text-red-700 mt-1">
                          No puedes crear un envío sin productos. Esta es una política de la empresa.
                        </p>
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-red-600 font-medium">EXCEPCIONES PERMITIDAS:</p>
                          <ul className="text-xs text-red-700 space-y-1 ml-2">
                            <li>• Envíos de documentación (requiere código de supervisor)</li>
                            <li>• Pruebas del sistema (solo para administradores)</li>
                            <li>• Casos especiales aprobados por gerencia</li>
                          </ul>
                          <button
                            type="button"
                            onClick={confirmContinueWithoutProducts}
                            className="mt-2 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                          >
                            <Lock className="w-3 h-3" />
                            Solicitar excepción (requiere aprobación)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Input por lotes */}
                {showBulkInput && (
                  <div className="mb-4 border border-gray-300 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <List className="w-4 h-4 text-gray-600" />
                      <label className="text-sm font-medium text-gray-700">
                        Agregar múltiples códigos (separados por línea, coma o punto y coma)
                      </label>
                    </div>
                    <textarea
                      value={bulkBarcodeInput}
                      onChange={(e) => setBulkBarcodeInput(e.target.value)}
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Ej: 
1234567890
9876543210
ABCD123456"
                    />
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-gray-500">
                        {bulkBarcodeInput.split(/[\n,;]/).filter(b => b.trim()).length} códigos detectados
                      </span>
                      <button
                        type="button"
                        onClick={handleBulkAddProducts}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
                      >
                        <Plus className="w-3 h-3" />
                        Agregar {bulkBarcodeInput.split(/[\n,;]/).filter(b => b.trim()).length} productos
                      </button>
                    </div>
                  </div>
                )}

                {/* Input individual de código de barras */}
                <div className="mb-6">
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => {
                          setBarcodeInput(e.target.value);
                          if (validationErrors.barcode) {
                            setValidationErrors(prev => ({ ...prev, barcode: undefined }));
                          }
                        }}
                        onKeyPress={handleKeyPress}
                        className={`w-full px-4 py-3 pl-12 border rounded-xl font-mono focus:outline-none focus:ring-2 focus:border-transparent ${
                          validationErrors.barcode 
                            ? 'border-red-300 focus:ring-red-200' 
                            : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
                        }`}
                        placeholder="Escribe el código de barras y presiona Enter"
                        autoFocus
                      />
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                        <Barcode className={`w-5 h-5 ${validationErrors.barcode ? 'text-red-400' : 'text-gray-400'}`} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
                    </button>
                  </div>
                  {validationErrors.barcode && (
                    <div className="mt-2 flex items-center gap-2 text-red-600 text-sm ml-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{validationErrors.barcode}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500 ml-1">
                    <Clock className="w-3 h-3" />
                    <span>Presiona Enter para agregar • Mínimo {VALIDATION_CONFIG.MIN_BARCODE_LENGTH} caracteres</span>
                  </div>
                </div>

                {/* Resumen de productos */}
                <div className={`mb-4 p-4 border rounded-xl transition-colors ${
                  products.length === 0 && !confirmNoProducts
                    ? 'bg-red-50 border-red-200'
                    : confirmNoProducts
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        products.length === 0 && !confirmNoProducts
                          ? 'bg-red-100'
                          : confirmNoProducts
                            ? 'bg-yellow-100'
                            : 'bg-green-100'
                      }`}>
                        <Package className={`w-4 h-4 ${
                          products.length === 0 && !confirmNoProducts
                            ? 'text-red-600'
                            : confirmNoProducts
                              ? 'text-yellow-600'
                              : 'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <p className={`font-medium ${
                          products.length === 0 && !confirmNoProducts
                            ? 'text-red-800'
                            : confirmNoProducts
                              ? 'text-yellow-800'
                              : 'text-green-800'
                        }`}>
                          {products.length === 0 
                            ? 'SIN PRODUCTOS' 
                            : `${products.length} producto${products.length !== 1 ? 's' : ''} en lista`
                          }
                          {products.length === 0 && VALIDATION_CONFIG.REQUIRED_PRODUCTS && (
                            <span className="ml-2 text-sm font-normal text-red-600">(REQUERIDO)</span>
                          )}
                        </p>
                        <p className={`text-xs ${
                          products.length === 0 && !confirmNoProducts
                            ? 'text-red-600'
                            : confirmNoProducts
                              ? 'text-yellow-600'
                              : 'text-green-600'
                        }`}>
                          {confirmNoProducts 
                            ? '⚠️ EXCEPCIÓN APROBADA: Se creará sin productos'
                            : products.length === 0
                              ? '❌ Debes agregar al menos 1 producto'
                              : `Total unidades: ${totalProductsCount}`
                          }
                        </p>
                      </div>
                    </div>
                    {products.length > 0 && (
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">
                          {totalProductsCount} unidad{totalProductsCount !== 1 ? 'es' : ''}
                        </div>
                        <button
                          type="button"
                          onClick={handleClearAllProducts}
                          className="mt-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
                        >
                          Limpiar todos
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Progreso de capacidad si hay productos */}
                  {products.length > 0 && selectedCompany?.maxCapacity && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Uso de capacidad</span>
                        <span>
                          {Math.min(100, Math.round((totalProductsCount / selectedCompany.maxCapacity) * 100))}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            totalProductsCount > selectedCompany.maxCapacity * 0.9 
                              ? 'bg-red-600' 
                              : totalProductsCount > selectedCompany.maxCapacity * 0.7
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (totalProductsCount / selectedCompany.maxCapacity) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Capacidad máxima: {selectedCompany.maxCapacity} unidades
                        {totalProductsCount > selectedCompany.maxCapacity && (
                          <span className="text-red-600 font-bold ml-2">
                            ❌ EXCEDE CAPACIDAD
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de productos */}
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                  <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <List className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-700">Productos agregados</span>
                      {products.length > 0 && (
                        <>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            {products.length} producto{products.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            {totalProductsCount} unidad{totalProductsCount !== 1 ? 'es' : ''}
                          </span>
                        </>
                      )}
                    </div>
                    {products.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Máx. {VALIDATION_CONFIG.MAX_PRODUCTS} productos • {VALIDATION_CONFIG.MAX_TOTAL_UNITS} unidades
                      </div>
                    )}
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {products.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600">No hay productos en la lista</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {VALIDATION_CONFIG.REQUIRED_PRODUCTS 
                            ? 'Debes agregar al menos 1 producto para continuar' 
                            : 'Agrega productos o confirma continuar sin ellos'
                          }
                        </p>
                        {!VALIDATION_CONFIG.REQUIRED_PRODUCTS && (
                          <button
                            type="button"
                            onClick={confirmContinueWithoutProducts}
                            className="mt-3 text-sm border border-primary-600 text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors"
                          >
                            Continuar sin productos
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {products.map((product) => (
                          <div key={product.id} className="p-4 hover:bg-gray-50 transition-colors group">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono font-bold text-gray-900">
                                    {product.barcode}
                                  </span>
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                    {product.category}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {product.scannedAt}
                                  </span>
                                </div>
                                <p className="text-gray-700 font-medium">{product.name}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Se creará con: {product.quantity} unidad{product.quantity !== 1 ? 'es' : ''}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-3 ml-4">
                                <div className="flex items-center gap-2 bg-gray-100 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(product.id, -1)}
                                    className="p-1.5 hover:bg-gray-200 rounded-l-lg transition-colors"
                                    disabled={product.quantity <= 1}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="px-2 font-bold min-w-[24px] text-center">
                                    {product.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(product.id, 1)}
                                    className="p-1.5 hover:bg-gray-200 rounded-r-lg transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProduct(product.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                  title="Eliminar producto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ✅ Panel de requisitos y políticas */}
              <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FileWarning className="w-4 h-4" />
                  Requisitos y Políticas del Envío
                </h4>
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 ${products.length >= VALIDATION_CONFIG.MIN_PRODUCTS ? 'text-green-600' : 'text-red-600'}`}>
                    {products.length >= VALIDATION_CONFIG.MIN_PRODUCTS ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      {VALIDATION_CONFIG.MIN_PRODUCTS} producto{VALIDATION_CONFIG.MIN_PRODUCTS !== 1 ? 's' : ''} mínimo: 
                      <strong> {products.length}/{VALIDATION_CONFIG.MIN_PRODUCTS}</strong>
                    </span>
                  </div>
                  
                  <div className={`flex items-center gap-2 ${estimatedDeparture || confirmNoDepartureTime ? 'text-green-600' : 'text-red-600'}`}>
                    {estimatedDeparture || confirmNoDepartureTime ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      Hora de salida especificada: 
                      <strong> {estimatedDeparture ? '✓ Sí' : confirmNoDepartureTime ? '⚠️ Excepción' : '✗ No'}</strong>
                    </span>
                  </div>
                  
                  <div className={`flex items-center gap-2 ${selectedCompanyId ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedCompanyId ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      Transportadora seleccionada: 
                      <strong> {selectedCompanyId ? '✓ Sí' : '✗ No'}</strong>
                    </span>
                  </div>
                  
                  <div className={`flex items-center gap-2 ${shipmentNumber.length >= VALIDATION_CONFIG.MIN_SHIPMENT_NUMBER_LENGTH ? 'text-green-600' : 'text-red-600'}`}>
                    {shipmentNumber.length >= VALIDATION_CONFIG.MIN_SHIPMENT_NUMBER_LENGTH ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">
                      Número de envío válido: 
                      <strong> {shipmentNumber.length >= VALIDATION_CONFIG.MIN_SHIPMENT_NUMBER_LENGTH ? '✓ Sí' : '✗ No'}</strong>
                    </span>
                  </div>
                  
                  {selectedCompany?.maxCapacity && (
                    <div className={`flex items-center gap-2 ${totalProductsCount <= selectedCompany.maxCapacity ? 'text-green-600' : 'text-red-600'}`}>
                      {totalProductsCount <= selectedCompany.maxCapacity ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Ban className="w-4 h-4" />
                      )}
                      <span className="text-sm">
                        Capacidad de transportadora: 
                        <strong> {totalProductsCount}/{selectedCompany.maxCapacity} unidades</strong>
                        {totalProductsCount > selectedCompany.maxCapacity && (
                          <span className="ml-2 text-red-600">(EXCEDE CAPACIDAD)</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ Resumen final con todas las validaciones */}
              <div className={`border rounded-xl p-6 ${
                hasCriticalErrors() 
                  ? 'bg-red-50 border-red-200'
                  : confirmNoProducts || confirmNoDepartureTime
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
              }`}>
                <h3 className={`font-semibold mb-4 flex items-center gap-2 ${
                  hasCriticalErrors() 
                    ? 'text-red-800'
                    : confirmNoProducts || confirmNoDepartureTime
                      ? 'text-yellow-800'
                      : 'text-green-800'
                }`}>
                  {hasCriticalErrors() ? (
                    <Ban className="w-5 h-5" />
                  ) : confirmNoProducts || confirmNoDepartureTime ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  {hasCriticalErrors() 
                    ? '❌ NO SE PUEDE CREAR EL ENVÍO' 
                    : confirmNoProducts || confirmNoDepartureTime
                      ? '⚠️ ENVÍO CON EXCEPCIONES'
                      : '✅ ENVÍO LISTO PARA CREAR'
                  }
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Transportadora</p>
                      <p className="font-bold text-gray-900">{selectedCompany?.name || 'No seleccionada'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Número de envío</p>
                      <p className="font-mono font-bold text-gray-900">{shipmentNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Productos</p>
                      <p className="font-bold text-gray-900">
                        {products.length > 0 
                          ? `${products.length} producto${products.length !== 1 ? 's' : ''}`
                          : confirmNoProducts
                            ? '⚠️ SIN PRODUCTOS (Excepción)'
                            : '❌ REQUERIDO'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Hora de salida</p>
                      <p className="font-bold text-gray-900">
                        {estimatedDeparture 
                          ? new Date(estimatedDeparture).toLocaleString('es-ES', { timeStyle: 'short' })
                          : confirmNoDepartureTime
                            ? '⚠️ NO ESPECIFICADA'
                            : '❌ REQUERIDA'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {hasCriticalErrors() && (
                    <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 font-medium">
                        ❌ Corrige los siguientes errores antes de continuar:
                      </p>
                      <ul className="text-xs text-red-700 mt-1 ml-4 list-disc">
                        {!selectedCompanyId && <li>Selecciona una transportadora</li>}
                        {!shipmentNumber && <li>Ingresa un número de envío</li>}
                        {!estimatedDeparture && !confirmNoDepartureTime && <li>Especifica hora de salida</li>}
                        {products.length === 0 && !confirmNoProducts && VALIDATION_CONFIG.REQUIRED_PRODUCTS && <li>Agrega al menos 1 producto</li>}
                        {validationErrors.capacity && <li>Excede capacidad de transportadora</li>}
                      </ul>
                    </div>
                  )}
                  
                  {(confirmNoProducts || confirmNoDepartureTime) && !hasCriticalErrors() && (
                    <div className="p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 font-medium">
                        ⚠️ Este envío tiene excepciones aprobadas:
                      </p>
                      <ul className="text-xs text-yellow-700 mt-1 ml-4 list-disc">
                        {confirmNoProducts && <li>Se creará sin productos (aprobación especial)</li>}
                        {confirmNoDepartureTime && <li>No tiene hora de salida especificada</li>}
                        <li>Estas excepciones serán registradas en el sistema</li>
                        <li>El supervisor será notificado</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => {
                    handlePreviousStep();
                    setShowProductsWarning(false);
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <div className="flex gap-3">
                  {/* Botón de validación */}
                  <button
                    type="button"
                    onClick={() => {
                      if (validateFinalSubmission()) {
                        // toast.success('✅ Todos los requisitos están cumplidos');
                        alert('✅ Todos los requisitos están cumplidos');
                      } else {
                        // toast.error('❌ Hay errores que corregir antes de crear el envío');
                        alert('❌ Hay errores que corregir antes de crear el envío');
                      }
                    }}
                    className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Validar todo
                  </button>
                  
                  {/* Botón principal de creación */}
                  <button
                    type="submit"
                    disabled={loading || isSubmitting || hasCriticalErrors()}
                    className={`px-8 py-3 rounded-xl flex items-center gap-2 transition-colors ${
                      hasCriticalErrors()
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : confirmNoProducts || confirmNoDepartureTime
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading || isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {isSubmitting ? 'Procesando...' : 'Creando...'}
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4" />
                        {hasCriticalErrors()
                          ? 'Corrige errores primero'
                          : confirmNoProducts || confirmNoDepartureTime
                            ? 'Crear Envío (Con excepciones)'
                            : 'Crear Envío'
                        }
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
        
        {/* ✅ Footer con indicadores de validación */}
        <div className="border-t bg-gray-50 p-4">
          <div className="text-xs text-gray-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3" />
              <span className={hasCriticalErrors() ? 'text-red-600 font-bold' : ''}>
                {hasCriticalErrors() 
                  ? '❌ ERRORES CRÍTICOS - No se puede crear el envío'
                  : `Paso ${step} de 3 - ${step === 1 ? 'Selección de transportadora' : step === 2 ? 'Detalles del envío' : 'Productos'}`
                }
              </span>
            </div>
            <div className="flex items-center gap-4">
              {products.length > 0 && (
                <span className={`font-medium ${
                  products.length === 0 && VALIDATION_CONFIG.REQUIRED_PRODUCTS 
                    ? 'text-red-600' 
                    : 'text-gray-600'
                }`}>
                  {products.length} producto{products.length !== 1 ? 's' : ''} • {totalProductsCount} unidad{totalProductsCount !== 1 ? 'es' : ''}
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  estimatedDeparture 
                    ? 'bg-green-100 text-green-800' 
                    : confirmNoDepartureTime
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}>
                  {estimatedDeparture 
                    ? 'Hora especificada' 
                    : confirmNoDepartureTime
                      ? 'Sin hora (Excepción)'
                      : 'Hora requerida'
                  }
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  products.length > 0 
                    ? 'bg-green-100 text-green-800' 
                    : confirmNoProducts
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}>
                  {products.length > 0 
                    ? `${products.length} productos` 
                    : confirmNoProducts
                      ? 'Sin productos (Excepción)'
                      : 'Productos requeridos'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
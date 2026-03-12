// src/services/api.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://barcodeverify-backend.onrender.com';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.status, error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================
// INTERFACES
// ============================

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'User' | 'Admin' | 'Scanner';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  totalScans?: number;
  totalProductsScanned?: number;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role: 'User' | 'Admin' | 'Scanner';
}

export interface UpdateUserRoleDto {
  role: 'User' | 'Admin' | 'Scanner';
}

export interface UpdateUserStatusDto {
  isActive: boolean;
}

// ✅ CORREGIDO: Eliminados driverName, licensePlate, phone
export interface TransportCompany {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  totalShipments?: number;
  totalProducts?: number;
}

// ✅ CORREGIDO: transportCompany solo tiene name
export interface Shipment {
  id: number;
  shipmentNumber: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
  transportCompanyId: number;
  transportCompany?: {
    name: string;
  };
  productCount: number;
  createdAt: string;
  estimatedDeparture?: string;
  actualDeparture?: string;
  updatedAt?: string;
}

export interface Product {
  id: number;
  barcode: string;
  name: string;
  quantity: number;
  category?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  scannedAt: string;
  shipmentId: number;
}

// ============================
// SERVICIOS DE AUTENTICACIÓN
// ============================

export const authService = {
  login: async (credentials: { username: string; password: string }) => {
    try {
      console.log('📤 Enviando login:', { username: credentials.username });
      const response = await api.post('/api/auth/login', {
        username: credentials.username,
        password: credentials.password
      });
      console.log('✅ Login exitoso');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en login:', error.response?.data || error.message);
      throw error;
    }
  },
  
  register: async (data: {
    username: string;
    email: string;
    password: string;
    role?: 'User' | 'Admin' | 'Scanner';
  }) => {
    try {
      const response = await api.post('/api/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role || 'User'
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en registro:', error.response?.data || error.message);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  verifyToken: async () => {
    try {
      const response = await api.get('/api/auth/verify');
      return response.data;
    } catch {
      return null;
    }
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// ============================
// SERVICIOS DE ENVÍOS (SHIPMENTS)
// ============================

export const shipmentService = {
  // Crear nuevo envío
  create: async (data: any) => {
    const response = await api.post('/api/Shipment/create', data);
    return response.data;
  },
  
  // Iniciar escaneo
  start: async (shipmentNumber: string) => {
    const response = await api.post('/api/Shipment/start', { shipmentNumber });
    return response.data;
  },
  
  // Escanear producto
  scanProduct: async (data: any) => {
    const response = await api.post('/api/Shipment/scan', data);
    return response.data;
  },
  
  // Completar envío
  complete: async (shipmentId: number) => {
    const response = await api.post(`/api/Shipment/complete/${shipmentId}`);
    return response.data;
  },
  
  // Obtener envíos activos
  getActive: async () => {
    const response = await api.get('/api/Shipment/active');
    return response.data;
  },
  
  // Obtener TODOS los envíos
  getAll: async () => {
    const response = await api.get('/api/Shipment/all');
    return response.data;
  },
  
  // Obtener envíos completados
  getCompleted: async () => {
    const response = await api.get('/api/Shipment/completed');
    return response.data;
  },
  
  // Obtener envíos cancelados
  getCancelled: async () => {
    const response = await api.get('/api/Shipment/cancelled');
    return response.data;
  },
  
  // Obtener por ID
  getById: async (id: number) => {
    const response = await api.get(`/api/Shipment/${id}`);
    return response.data;
  },
  
  // Obtener por número
  getByNumber: async (shipmentNumber: string) => {
    const response = await api.get(`/api/Shipment/number/${shipmentNumber}`);
    return response.data;
  },
  
  // Buscar envíos
  search: async (params: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    shipmentNumber?: string;
  }) => {
    const response = await api.get('/api/Shipment/search', { params });
    return response.data;
  },
  
  // Actualizar estado
  updateStatus: async (id: number, status: string) => {
    const response = await api.patch(`/api/Shipment/${id}/status`, { status });
    return response.data;
  },
  
  // Cancelar envío (solo admin)
  cancel: async (id: number) => {
    const response = await api.patch(`/api/Shipment/${id}/cancel`);
    return response.data;
  },
  
  // Obtener estadísticas
  getStats: async () => {
    const response = await api.get('/api/Shipment/stats');
    return response.data;
  },
};

// ============================
// SERVICIOS DE PRODUCTOS
// ============================

export const productService = {
  // Escanear producto en un envío (ShipmentController)
  scanProduct: async (data: { 
    shipmentId: number; 
    barcode: string; 
    quantity?: number;
    name?: string;
    category?: string;
    description?: string;
    sku?: string;
    model?: string;
    serialNumber?: string;
  }) => {
    const response = await api.post('/api/Shipment/scan', data);
    return response.data;
  },
  
  // Crear producto para envío
  createForShipment: async (data: {
    barcode: string;
    name: string;
    quantity: number;
    category?: string;
    shipmentId: number;
  }) => {
    console.log('📤 [productService] Enviando:', data);
    try {
      const response = await api.post('/api/Product/create-for-shipment', data);
      console.log('✅ [productService] Respuesta recibida');
      return response.data;
    } catch (error: any) {
      console.error('❌ [productService] Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Obtener productos por envío
  getByShipment: async (shipmentId: number) => {
    const response = await api.get(`/api/Product/shipment/${shipmentId}`);
    return response.data;
  },
  
  // Obtener todos los productos
  getAll: async (params?: any) => {
    const response = await api.get('/api/Product', { params });
    return response.data;
  },
  
  // Buscar productos
  search: async (params: any) => {
    const response = await api.get('/api/Product/search', { params });
    return response.data;
  },
  
  // Obtener por código de barras
  getByBarcode: async (barcode: string) => {
    const response = await api.get(`/api/Product/barcode/${barcode}`);
    return response.data;
  },
  
  // Crear producto (requiere Admin)
  create: async (data: any) => {
    const response = await api.post('/api/Product', data);
    return response.data;
  },
  
  // Obtener producto por ID
  getById: async (id: number) => {
    const response = await api.get(`/api/Product/${id}`);
    return response.data;
  },
  
  // Actualizar producto
  update: async (id: number, data: any) => {
    const response = await api.put(`/api/Product/${id}`, data);
    return response.data;
  },
  
  // Eliminar producto
  delete: async (id: number) => {
    const response = await api.delete(`/api/Product/${id}`);
    return response.data;
  },
  
  // Obtener estadísticas
  getStats: async () => {
    const response = await api.get('/api/Product/stats');
    return response.data;
  },
  
  // Obtener categorías de un envío
  getShipmentCategoryCounts: async (shipmentId: number) => {
    const response = await api.get(`/api/Product/shipment/${shipmentId}/categories`);
    return response.data;
  },
};

// ============================
// SERVICIOS DE TRANSPORTADORAS
// ============================

export const transportService = {
  getAll: async (activeOnly: boolean = true) => {
    const response = await api.get('/api/TransportCompany', { 
      params: { activeOnly } 
    });
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/api/TransportCompany/${id}`);
    return response.data;
  },
  
  // ✅ CORREGIDO: searchByPlate eliminado, ahora searchByName
  searchByName: async (name: string) => {
    const response = await api.get(`/api/TransportCompany/search`, { 
      params: { name } 
    });
    return response.data;
  },
  
  createForUser: async (data: { name: string }) => {
    const response = await api.post('/api/TransportCompany/user', data);
    return response.data;
  },
  
  createForAdmin: async (data: { name: string }) => {
    const response = await api.post('/api/TransportCompany', data);
    return response.data;
  },
  
  update: async (id: number, data: { name?: string; isActive?: boolean }) => {
    const response = await api.put(`/api/TransportCompany/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/api/TransportCompany/${id}`);
    return response.data;
  },
  
  toggleStatus: async (id: number) => {
    const response = await api.patch(`/api/TransportCompany/${id}/toggle-status`);
    return response.data;
  },
  
  // Alias para crear
  create: async (data: { name: string }) => {
    return await transportService.createForUser(data);
  },
};

// ============================
// SERVICIOS DE ADMINISTRACIÓN
// ============================

export const adminService = {
  // Dashboard
  getDashboardStats: async (startDate?: Date, endDate?: Date) => {
    const params: any = {};
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();
    
    const response = await api.get('/api/admin/dashboard/stats', { params });
    return response.data;
  },
  
  getQuickStats: async () => {
    const response = await api.get('/api/admin/stats/quick');
    return response.data;
  },
  
  // Usuarios
  getUsers: async () => {
    const response = await api.get('/api/admin/users');
    return response.data;
  },
  
  createUser: async (data: CreateUserDto) => {
    const response = await api.post('/api/admin/users', data);
    return response.data;
  },
  
  updateUserRole: async (id: number, role: string) => {
    const response = await api.put(`/api/admin/users/${id}/role`, { role });
    return response.data;
  },
  
  updateUserStatus: async (id: number, isActive: boolean) => {
    const response = await api.put(`/api/admin/users/${id}/status`, { isActive });
    return response.data;
  },
  
  // Transportadoras — ✅ CORREGIDO: solo campo name
  getTransportCompanies: async () => {
    const response = await api.get('/api/Admin/transport-companies');
    return response.data;
  },
  
  createTransportCompany: async (data: { name: string }) => {
    const response = await api.post('/api/Admin/transport-companies', data);
    return response.data;
  },
  
  // Productos
  searchProducts: async (params: {
    barcode?: string;
    name?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const response = await api.get('/api/Admin/products/search', { params });
    return response.data;
  },
  
  // Reportes
  generateShipmentReport: async (startDate?: Date, endDate?: Date) => {
    const params: any = {};
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();
    
    const response = await api.get('/api/Admin/reports/shipments', { params });
    return response.data;
  },
};

// ============================
// SERVICIO PARA USERS MANAGEMENT
// ============================

export const userManagementService = {
  getUsers: adminService.getUsers,
  
  createUser: async (userData: {
    username: string;
    email: string;
    password: string;
    role: 'User' | 'Admin' | 'Scanner';
  }) => {
    const response = await api.post('/api/Admin/users', userData);
    return response.data;
  },
  
  updateUserRole: async (userId: number, role: 'User' | 'Admin' | 'Scanner') => {
    const response = await api.put(`/api/Admin/users/${userId}/role`, { role });
    return response.data;
  },
  
  updateUserStatus: async (userId: number, isActive: boolean) => {
    const response = await api.put(`/api/Admin/users/${userId}/status`, { isActive });
    return response.data;
  },
  
  activateUser: async (userId: number) => {
    return adminService.updateUserStatus(userId, true);
  },
  
  deactivateUser: async (userId: number) => {
    return adminService.updateUserStatus(userId, false);
  },
};

// ============================
// FUNCIÓN PARA MANEJAR ERRORES
// ============================

export const handleApiError = (error: any): string => {
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || error.response.data;
    
    switch (status) {
      case 400:
        return message || 'Datos inválidos';
      case 401:
        return 'No autorizado. Por favor inicia sesión nuevamente.';
      case 403:
        return 'No tienes permisos para realizar esta acción';
      case 404:
        return 'Recurso no encontrado';
      case 409:
        return message || 'Conflicto de datos';
      case 422:
        return message || 'Datos de entrada inválidos';
      case 500:
        return 'Error interno del servidor';
      default:
        return message || `Error ${status}`;
    }
  } else if (error.request) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
  } else {
    return error.message || 'Error desconocido';
  }
};

// ============================
// FUNCIONES UTILES
// ============================

export const formatToColombiaTime = (dateString: string): string => {
  if (!dateString) return 'Nunca';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Fecha inválida';
  }
};

export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return 'Nunca';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Hace unos segundos';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    
    return formatToColombiaTime(dateString);
  } catch (error) {
    return 'Fecha inválida';
  }
};

export default {
  api,
  authService,
  shipmentService,
  productService,
  transportService,
  adminService,
  userManagementService,
  handleApiError,
  formatToColombiaTime,
  formatRelativeTime,
};
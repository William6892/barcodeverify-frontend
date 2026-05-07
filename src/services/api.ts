// src/services/api.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5034/api';

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

export interface TransportCompany {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  totalShipments?: number;
  totalProducts?: number;
}

export interface Driver {
  id: number;
  identificationNumber: string;
  fullName: string;
  transportCompanyId: number;
  transportCompanyName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Vehicle {
  id: number;
  plateNumber: string;
  trailerPlate?: string;
  vehicleType?: string;
  transportCompanyId: number;
  transportCompanyName?: string;
  isActive: boolean;
  createdAt: string;
  displayText: string;
}

export interface Shipment {
  id: number;
  shipmentNumber: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
  transportCompanyId: number;
  transportCompany?: {
    name: string;
  };
  driverId?: number;
  driver?: Driver;
  vehicleId?: number;
  vehicle?: Vehicle;
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
      const response = await api.post('/auth/login', {
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
      const response = await api.post('/auth/register', {
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
      const response = await api.get('/auth/verify');
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
  create: async (data: { 
    transportCompanyId: number;
    driverId?: number;
    vehicleId?: number;
    shipmentNumber: string;
    estimatedDeparture?: string;
    notes?: string;
  }) => {
    const response = await api.post('/Shipment/create', data);
    return response.data;
  },
  
  start: async (shipmentNumber: string) => {
    const response = await api.post('/Shipment/start', { shipmentNumber });
    return response.data;
  },
  
  scanProduct: async (data: any) => {
    const response = await api.post('/Shipment/scan', data);
    return response.data;
  },
  
  complete: async (shipmentId: number) => {
    const response = await api.post(`/Shipment/complete/${shipmentId}`);
    return response.data;
  },
  
  getActive: async () => {
    const response = await api.get('/Shipment/active');
    return response.data;
  },
  
  getAll: async () => {
    const response = await api.get('/Shipment/all');
    return response.data;
  },
  
  getCompleted: async () => {
    const response = await api.get('/Shipment/completed');
    return response.data;
  },
  
  getCancelled: async () => {
    const response = await api.get('/Shipment/cancelled');
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/Shipment/${id}`);
    return response.data;
  },
  
  getByNumber: async (shipmentNumber: string) => {
    const response = await api.get(`/Shipment/number/${shipmentNumber}`);
    return response.data;
  },
  
  search: async (params: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    shipmentNumber?: string;
  }) => {
    const response = await api.get('/Shipment/search', { params });
    return response.data;
  },
  
  updateStatus: async (id: number, status: string) => {
    const response = await api.patch(`/Shipment/${id}/status`, { status });
    return response.data;
  },
  
  cancel: async (id: number) => {
    const response = await api.patch(`/Shipment/${id}/cancel`);
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get('/Shipment/stats');
    return response.data;
  },
};

// ============================
// SERVICIOS DE PRODUCTOS
// ============================

export const productService = {
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
    const response = await api.post('/Shipment/scan', data);
    return response.data;
  },
  
  createForShipment: async (data: {
    barcode: string;
    name: string;
    quantity: number;
    category?: string;
    shipmentId: number;
  }) => {
    console.log('📤 [productService] Enviando:', data);
    try {
      const response = await api.post('/Product/create-for-shipment', data);
      console.log('✅ [productService] Respuesta recibida');
      return response.data;
    } catch (error: any) {
      console.error('❌ [productService] Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  getByShipment: async (shipmentId: number) => {
    const response = await api.get(`/Product/shipment/${shipmentId}`);
    return response.data;
  },
  
  getAll: async (params?: any) => {
    const response = await api.get('/Product', { params });
    return response.data;
  },
  
  search: async (params: any) => {
    const response = await api.get('/Product/search', { params });
    return response.data;
  },
  
  getByBarcode: async (barcode: string) => {
    const response = await api.get(`/Product/barcode/${barcode}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/Product', data);
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/Product/${id}`);
    return response.data;
  },
  
  update: async (id: number, data: any) => {
    const response = await api.put(`/Product/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/Product/${id}`);
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get('/Product/stats');
    return response.data;
  },
  
  getShipmentCategoryCounts: async (shipmentId: number) => {
    const response = await api.get(`/Product/shipment/${shipmentId}/categories`);
    return response.data;
  },
};

// ============================
// SERVICIOS DE TRANSPORTADORAS
// ============================

export const transportService = {
  getAll: async (activeOnly: boolean = true) => {
    const response = await api.get('/TransportCompany', { 
      params: { activeOnly } 
    });
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/TransportCompany/${id}`);
    return response.data;
  },
  
  searchByName: async (name: string) => {
    const response = await api.get('/TransportCompany/search', { 
      params: { name } 
    });
    return response.data;
  },
  
  createForUser: async (data: { name: string }) => {
    const response = await api.post('/TransportCompany/user', data);
    return response.data;
  },
  
  createForAdmin: async (data: { name: string }) => {
    const response = await api.post('/TransportCompany', data);
    return response.data;
  },
  
  update: async (id: number, data: { name?: string; isActive?: boolean }) => {
    const response = await api.put(`/TransportCompany/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/TransportCompany/${id}`);
    return response.data;
  },
  
  toggleStatus: async (id: number) => {
    const response = await api.patch(`/TransportCompany/${id}/toggle-status`);
    return response.data;
  },
  
  create: async (data: { name: string }) => {
    return await transportService.createForUser(data);
  },
};

// ============================
// SERVICIOS DE CONDUCTORES
// ============================

export const driverService = {
  getByCompany: async (companyId: number): Promise<Driver[]> => {
    const response = await api.get(`/Driver/company/${companyId}`);
    return response.data;
  },
  
  getAll: async (): Promise<Driver[]> => {
    const response = await api.get('/Driver');
    return response.data;
  },
  
  getById: async (id: number): Promise<Driver> => {
    const response = await api.get(`/Driver/${id}`);
    return response.data;
  },
  
  create: async (data: { 
    identificationNumber: string; 
    fullName: string; 
    transportCompanyId: number 
  }): Promise<Driver> => {
    const response = await api.post('/Driver', data);
    return response.data;
  },
  
  update: async (id: number, data: { 
    identificationNumber?: string; 
    fullName?: string; 
    transportCompanyId?: number;
    isActive?: boolean;
  }): Promise<Driver> => {
    const response = await api.put(`/Driver/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/Driver/${id}`);
  },
};

// ============================
// SERVICIOS DE VEHÍCULOS
// ============================

export const vehicleService = {
  getByCompany: async (companyId: number): Promise<Vehicle[]> => {
    const response = await api.get(`/Vehicle/company/${companyId}`);
    return response.data.map((vehicle: Vehicle) => ({
      ...vehicle,
      displayText: vehicle.trailerPlate && vehicle.vehicleType === 'Mula'
        ? `${vehicle.plateNumber} + ${vehicle.trailerPlate}`
        : vehicle.plateNumber
    }));
  },
  
  getAll: async (): Promise<Vehicle[]> => {
    const response = await api.get('/Vehicle');
    return response.data.map((vehicle: Vehicle) => ({
      ...vehicle,
      displayText: vehicle.trailerPlate && vehicle.vehicleType === 'Mula'
        ? `${vehicle.plateNumber} + ${vehicle.trailerPlate}`
        : vehicle.plateNumber
    }));
  },
  
  getById: async (id: number): Promise<Vehicle> => {
    const response = await api.get(`/Vehicle/${id}`);
    const vehicle = response.data;
    return {
      ...vehicle,
      displayText: vehicle.trailerPlate && vehicle.vehicleType === 'Mula'
        ? `${vehicle.plateNumber} + ${vehicle.trailerPlate}`
        : vehicle.plateNumber
    };
  },
  
  create: async (data: { 
    plateNumber: string; 
    trailerPlate?: string; 
    vehicleType?: string; 
    transportCompanyId: number 
  }): Promise<Vehicle> => {
    const response = await api.post('/Vehicle', data);
    return response.data;
  },
  
  update: async (id: number, data: { 
    plateNumber?: string; 
    trailerPlate?: string; 
    vehicleType?: string; 
    transportCompanyId?: number;
    isActive?: boolean;
  }): Promise<Vehicle> => {
    const response = await api.put(`/Vehicle/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/Vehicle/${id}`);
  },
};

// ============================
// SERVICIOS DE ADMINISTRACIÓN
// ============================

export const adminService = {
  getDashboardStats: async (startDate?: Date, endDate?: Date) => {
    const params: any = {};
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();
    
    const response = await api.get('/admin/dashboard/stats', { params });
    return response.data;
  },
  
  getQuickStats: async () => {
    const response = await api.get('/admin/stats/quick');
    return response.data;
  },
  
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  
  createUser: async (data: CreateUserDto) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },
  
  updateUserRole: async (id: number, role: string) => {
    const response = await api.put(`/admin/users/${id}/role`, { role });
    return response.data;
  },
  
  updateUserStatus: async (id: number, isActive: boolean) => {
    const response = await api.put(`/admin/users/${id}/status`, { isActive });
    return response.data;
  },
  
  getTransportCompanies: async () => {
    const response = await api.get('/admin/transport-companies');
    return response.data;
  },
  
  createTransportCompany: async (data: { name: string }) => {
    const response = await api.post('/admin/transport-companies', data);
    return response.data;
  },
  
  searchProducts: async (params: {
    barcode?: string;
    name?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const response = await api.get('/admin/products/search', { params });
    return response.data;
  },
  
  generateShipmentReport: async (startDate?: Date, endDate?: Date) => {
    const params: any = {};
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();
    
    const response = await api.get('/admin/reports/shipments', { params });
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
    const response = await api.post('/admin/users', userData);
    return response.data;
  },
  
  updateUserRole: async (userId: number, role: 'User' | 'Admin' | 'Scanner') => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },
  
  updateUserStatus: async (userId: number, isActive: boolean) => {
    const response = await api.put(`/admin/users/${userId}/status`, { isActive });
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
  driverService,
  vehicleService,
  adminService,
  userManagementService,
  handleApiError,
  formatToColombiaTime,
  formatRelativeTime,
};
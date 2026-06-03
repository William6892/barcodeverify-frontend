// types/index.ts - VERSIÓN COMPLETA CON INVENTARIO

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'User' | 'Admin';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Driver {
  id: number;
  identificationNumber: string;  // Cédula
  fullName: string;               // Nombre completo
  transportCompanyId: number;
  transportCompanyName?: string;
  isActive: boolean;
}

export interface Vehicle {
  id: number;
  plateNumber: string;            
  trailerPlate?: string;         
  vehicleType?: string;          
  transportCompanyId: number;
  transportCompanyName?: string;
  isActive: boolean;
  displayText: string;           
}

export interface TransportCompany {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: number;
  barcode: string;
  name: string;
  quantity: number;
  category: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  scannedAt: string;
}

export interface Shipment {
  id: number;
  shipmentNumber: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
  transportCompanyId: number;
  transportCompany?: TransportCompany;
  driverId?: number;              
  driver?: Driver;                
  vehicleId?: number;             
  vehicle?: Vehicle;              
  products: Product[];
  createdAt: string;
  estimatedDeparture?: string;
  actualDeparture?: string;
  startedAt?: string;
}

export interface ScanOperation {
  id: number;
  shipmentId: number;
  userId: number;
  productCount: number;
  startTime: string;
  endTime?: string;
  status: string;
}

// ==================== NUEVOS TIPOS DE INVENTARIO ====================

export interface DailyStock {
  productId: number;
  productName: string;
  inicial: number;
  salieron: number;
  actual: number;
}

export interface StockSummary {
  fecha: string;
  productos: DailyStock[];
  resumen: {
    total_productos: number;
    total_salidas: number;
    productos_agotados: number;
    stock_bajo: number;
  };
}

export interface ProductStock {
  productId: number;
  productName: string;
  currentStock: number;
  lastUpdated: string;
}

export interface InventoryTransaction {
  id: number;
  productId: number;
  type: 'IN' | 'OUT';
  quantity: number;
  referenceId?: number;
  referenceType?: string;
  notes?: string;
  createdAt: string;
  userId?: number;
}
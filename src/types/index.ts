export interface User {
  id: number;
  username: string;
  email: string;
  role: 'User' | 'Admin';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Product {
  id: number;
  barcode: string;
  name: string;
  quantity: number;
  category: string;
  brand: string;
  model?: string;
  serialNumber?: string;
  scannedAt: string;
}

export interface Shipment {
  id: number;
  shipmentNumber: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
  transportCompany?: TransportCompany;
  products: Product[];
  createdAt: string;
  estimatedDeparture?: string;
  actualDeparture?: string;
}

export interface TransportCompany {
  id: number;
  name: string;
  driverName: string;
  licensePlate: string;
  phone: string;
  isActive: boolean;
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
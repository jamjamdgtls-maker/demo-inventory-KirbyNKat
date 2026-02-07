// User types
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'USER';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  colorId?: string;
  sizeId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SKU {
  id: string;
  productId: string;
  skuCode: string;
  sizeId?: string;
  colorId?: string;
  price: number;
  cost: number;
  reorderPoint: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Master data types
export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Color {
  id: string;
  name: string;
  hexCode: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Size {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Supplier & Platform types
export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Platform {
  id: string;
  name: string;
  feePercentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction types
export type TransactionDirection = 'IN' | 'OUT' | 'ADJUSTMENT';
export type SourceType = 'SUPPLIER' | 'RTS' | 'MANUAL';

export interface ReasonCategory {
  id: string;
  name: string;
  direction: TransactionDirection;
  requiresPlatform: boolean;
  requiresSupplier: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionLineItem {
  skuId: string;
  skuCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalPrice: number;
}

export interface InventoryTransaction {
  id: string;
  direction: TransactionDirection;
  sourceType?: SourceType;
  reasonCategoryId: string;
  supplierId?: string;
  platformId?: string;
  lineItems: TransactionLineItem[];
  totalQuantity: number;
  totalAmount: number;
  platformFee?: number;
  netAmount?: number;
  referenceNumber?: string;
  customerName?: string;
  notes?: string;
  transactionDate: Date;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
}

// Settings types
export interface SystemSettings {
  businessName: string;
  currency: string;
  currencySymbol: string;
  defaultReorderPoint: number;
  enableLowStockAlerts: boolean;
  enableNegativeStock: boolean;
  lowStockThreshold: number;
}

// Dashboard types
export interface DashboardStats {
  totalProducts: number;
  totalSKUs: number;
  totalOnHand: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  todayRevenue: number;
  todayTransactions: number;
}

export interface StockStatus {
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'CRITICAL';
  label: string;
  color: string;
}

// Filter types
export interface InventoryFilters {
  dateFrom?: Date;
  dateTo?: Date;
  categoryId?: string;
  stockStatus?: string;
  search?: string;
}

export interface TransactionFilters {
  dateFrom?: Date;
  dateTo?: Date;
  direction?: TransactionDirection | 'ALL';
  userId?: string;
  productId?: string;
  skuId?: string;
  reasonCategoryId?: string;
  platformId?: string;
  supplierId?: string;
  search?: string;
}

// Utility types
export interface SelectOption {
  value: string;
  label: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

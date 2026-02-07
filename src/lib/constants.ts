// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  PRODUCTS: 'products',
  SKUS: 'skus',
  CATEGORIES: 'categories',
  COLORS: 'colors',
  SIZES: 'sizes',
  SUPPLIERS: 'suppliers',
  PLATFORMS: 'platforms',
  TRANSACTIONS: 'inventoryTransactions',
  REASON_CATEGORIES: 'reasonCategories',
  SETTINGS: 'settings',
} as const;

// Stock status thresholds
export const STOCK_STATUS = {
  IN_STOCK: { label: 'In Stock', color: 'bg-green-500' },
  LOW_STOCK: { label: 'Low Stock', color: 'bg-yellow-500' },
  OUT_OF_STOCK: { label: 'Out of Stock', color: 'bg-red-500' },
  CRITICAL: { label: 'Critical', color: 'bg-red-700' },
} as const;

// Default settings
export const DEFAULT_SETTINGS = {
  businessName: 'My Inventory',
  currency: 'PHP',
  currencySymbol: '₱',
  defaultReorderPoint: 10,
  enableLowStockAlerts: true,
  enableNegativeStock: false,
  lowStockThreshold: 5,
};

// Pagination
export const PAGE_SIZES = {
  SMALL: 10,
  MEDIUM: 20,
  LARGE: 50,
} as const;

// Date formats
export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';

// Navigation items
export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/products', label: 'Products', icon: 'Package' },
  { path: '/skus', label: 'SKUs', icon: 'Barcode' },
  { path: '/stock-in', label: 'Stock In', icon: 'ArrowDownToLine' },
  { path: '/stock-out', label: 'Stock Out', icon: 'ArrowUpFromLine' },
  { path: '/inventory-report', label: 'Inventory', icon: 'ClipboardList' },
  { path: '/category-breakdown', label: 'Category Report', icon: 'BarChart3' },
  { path: '/transactions', label: 'Transactions', icon: 'History' },
  { path: '/suppliers', label: 'Suppliers', icon: 'Truck' },
  { path: '/platforms', label: 'Platforms', icon: 'Store' },
  { path: '/categories', label: 'Categories', icon: 'Layers' },
  { path: '/colors', label: 'Colors', icon: 'Palette' },
  { path: '/sizes', label: 'Sizes', icon: 'Ruler' },
  { path: '/reasons', label: 'Reasons', icon: 'Tag' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
] as const;

// Admin-only nav items
export const ADMIN_NAV_ITEMS = [
  { path: '/users', label: 'Users', icon: 'Users' },
] as const;

// SuperAdmin-only nav items
export const SUPERADMIN_NAV_ITEMS = [
  { path: '/audit-logs', label: 'Audit Logs', icon: 'FileText' },
] as const;

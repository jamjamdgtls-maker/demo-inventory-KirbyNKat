import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, DEFAULT_SETTINGS } from '@/lib/constants';
import { useAuth } from './AuthContext';
import { 
  Product, 
  SKU, 
  Category, 
  Color, 
  Size, 
  Supplier, 
  Platform, 
  ReasonCategory,
  SystemSettings 
} from '@/types';

interface DataContextType {
  // Data
  products: Product[];
  skus: SKU[];
  categories: Category[];
  colors: Color[];
  sizes: Size[];
  suppliers: Supplier[];
  platforms: Platform[];
  reasonCategories: ReasonCategory[];
  settings: SystemSettings;
  
  // Loading states
  loading: boolean;
  
  // Helpers
  getProductById: (id: string) => Product | undefined;
  getSKUById: (id: string) => SKU | undefined;
  getSKUsByProductId: (productId: string) => SKU[];
  getCategoryById: (id: string) => Category | undefined;
  getColorById: (id: string) => Color | undefined;
  getSizeById: (id: string) => Size | undefined;
  getSupplierById: (id: string) => Supplier | undefined;
  getPlatformById: (id: string) => Platform | undefined;
  getReasonCategoryById: (id: string) => ReasonCategory | undefined;
  
  // Computed values
  getStockStatus: (stock: number, reorderPoint: number) => { status: string; label: string; colorClass: string };
  formatCurrency: (amount: number) => string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { isApproved } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [reasonCategories, setReasonCategories] = useState<ReasonCategory[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Subscribe to collections when user is approved
  useEffect(() => {
    if (!isApproved) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribers: (() => void)[] = [];

    // Products
    const productsQuery = query(
      collection(db, COLLECTIONS.PRODUCTS),
      orderBy('name', 'asc')
    );
    unsubscribers.push(
      onSnapshot(productsQuery, (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as Product)));
      })
    );

    // SKUs
    const skusQuery = query(
      collection(db, COLLECTIONS.SKUS),
      orderBy('skuCode', 'asc')
    );
    unsubscribers.push(
      onSnapshot(skusQuery, (snapshot) => {
        setSKUs(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as SKU)));
      })
    );

    // Categories
    const categoriesQuery = query(
      collection(db, COLLECTIONS.CATEGORIES),
      orderBy('sortOrder', 'asc')
    );
    unsubscribers.push(
      onSnapshot(categoriesQuery, (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as Category)));
      })
    );

    // Colors
    const colorsQuery = query(
      collection(db, COLLECTIONS.COLORS),
      orderBy('sortOrder', 'asc')
    );
    unsubscribers.push(
      onSnapshot(colorsQuery, (snapshot) => {
        setColors(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as Color)));
      })
    );

    // Sizes
    const sizesQuery = query(
      collection(db, COLLECTIONS.SIZES),
      orderBy('sortOrder', 'asc')
    );
    unsubscribers.push(
      onSnapshot(sizesQuery, (snapshot) => {
        setSizes(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as Size)));
      })
    );

    // Suppliers
    const suppliersQuery = query(
      collection(db, COLLECTIONS.SUPPLIERS),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
    unsubscribers.push(
      onSnapshot(suppliersQuery, (snapshot) => {
        setSuppliers(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as Supplier)));
      })
    );

    // Platforms
    const platformsQuery = query(
      collection(db, COLLECTIONS.PLATFORMS),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
    unsubscribers.push(
      onSnapshot(platformsQuery, (snapshot) => {
        setPlatforms(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as Platform)));
      })
    );

    // Reason Categories
    const reasonCategoriesQuery = query(
      collection(db, COLLECTIONS.REASON_CATEGORIES),
      where('isActive', '==', true),
      orderBy('sortOrder', 'asc')
    );
    unsubscribers.push(
      onSnapshot(reasonCategoriesQuery, (snapshot) => {
        setReasonCategories(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as ReasonCategory)));
      })
    );

    // Settings
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'general'));
        if (settingsDoc.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...settingsDoc.data() } as SystemSettings);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
      setLoading(false);
    };
    loadSettings();

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [isApproved]);

  // Helper functions
  const getProductById = useCallback((id: string) => products.find(p => p.id === id), [products]);
  const getSKUById = useCallback((id: string) => skus.find(s => s.id === id), [skus]);
  const getSKUsByProductId = useCallback((productId: string) => skus.filter(s => s.productId === productId), [skus]);
  const getCategoryById = useCallback((id: string) => categories.find(c => c.id === id), [categories]);
  const getColorById = useCallback((id: string) => colors.find(c => c.id === id), [colors]);
  const getSizeById = useCallback((id: string) => sizes.find(s => s.id === id), [sizes]);
  const getSupplierById = useCallback((id: string) => suppliers.find(s => s.id === id), [suppliers]);
  const getPlatformById = useCallback((id: string) => platforms.find(p => p.id === id), [platforms]);
  const getReasonCategoryById = useCallback((id: string) => reasonCategories.find(r => r.id === id), [reasonCategories]);

  const getStockStatus = useCallback((stock: number, reorderPoint: number) => {
    if (stock < 0) {
      return { status: 'CRITICAL', label: 'Critical', colorClass: 'bg-red-700 text-white' };
    }
    if (stock === 0) {
      return { status: 'OUT_OF_STOCK', label: 'Out of Stock', colorClass: 'bg-red-500 text-white' };
    }
    if (stock <= reorderPoint) {
      return { status: 'LOW_STOCK', label: 'Low Stock', colorClass: 'bg-yellow-500 text-black' };
    }
    return { status: 'IN_STOCK', label: 'In Stock', colorClass: 'bg-green-500 text-white' };
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return `${settings.currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [settings.currencySymbol]);

  return (
    <DataContext.Provider value={{
      products,
      skus,
      categories,
      colors,
      sizes,
      suppliers,
      platforms,
      reasonCategories,
      settings,
      loading,
      getProductById,
      getSKUById,
      getSKUsByProductId,
      getCategoryById,
      getColorById,
      getSizeById,
      getSupplierById,
      getPlatformById,
      getReasonCategoryById,
      getStockStatus,
      formatCurrency,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

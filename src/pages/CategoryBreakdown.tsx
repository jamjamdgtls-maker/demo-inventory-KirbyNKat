import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Search, Filter, Download, BarChart3 } from 'lucide-react';
import { useEffect } from 'react';

interface TransactionSummary {
  skuId: string;
  productId: string;
  productName: string;
  skuCode: string;
  categoryId: string;
  categoryName: string;
  sizeName: string;
  colorName: string;
  currentStock: number;
  totalStockIn: number;
  totalStockOut: number;
  platformBreakdown: Record<string, { stockIn: number; stockOut: number }>;
}

export default function CategoryBreakdown() {
  const { 
    products, 
    skus, 
    categories, 
    platforms,
    getCategoryById,
    getProductById,
    getSizeById,
    getColorById,
    loading: dataLoading,
    formatCurrency
  } = useData();

  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch transactions within date range
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);

        const q = query(
          collection(db, COLLECTIONS.TRANSACTIONS),
          where('transactionDate', '>=', Timestamp.fromDate(fromDate)),
          where('transactionDate', '<=', Timestamp.fromDate(toDate))
        );

        const snapshot = await getDocs(q);
        const txns = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTransactions(txns);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [dateFrom, dateTo]);

  // Build summary data
  const summaryData = useMemo(() => {
    const summary: Record<string, TransactionSummary> = {};

    // Initialize with all SKUs
    skus.forEach(sku => {
      const product = getProductById(sku.productId);
      const category = product ? getCategoryById(product.categoryId) : null;
      const size = getSizeById(sku.sizeId || '');
      const color = getColorById(sku.colorId || '');

      summary[sku.id] = {
        skuId: sku.id,
        productId: sku.productId,
        productName: product?.name || 'Unknown',
        skuCode: sku.skuCode,
        categoryId: product?.categoryId || '',
        categoryName: category?.name || 'Uncategorized',
        sizeName: size?.name || '-',
        colorName: color?.name || '-',
        currentStock: sku.stock,
        totalStockIn: 0,
        totalStockOut: 0,
        platformBreakdown: {},
      };

      // Initialize platform breakdown
      platforms.forEach(platform => {
        summary[sku.id].platformBreakdown[platform.id] = { stockIn: 0, stockOut: 0 };
      });
      // Add "No Platform" entry
      summary[sku.id].platformBreakdown['none'] = { stockIn: 0, stockOut: 0 };
    });

    // Process transactions
    transactions.forEach(txn => {
      const lineItems = txn.lineItems || [];
      const platformId = txn.platformId || 'none';
      const direction = txn.direction;

      lineItems.forEach((item: any) => {
        const skuId = item.skuId;
        if (!summary[skuId]) return;

        const qty = item.quantity || 0;

        if (direction === 'IN') {
          summary[skuId].totalStockIn += qty;
          if (summary[skuId].platformBreakdown[platformId]) {
            summary[skuId].platformBreakdown[platformId].stockIn += qty;
          }
        } else if (direction === 'OUT') {
          summary[skuId].totalStockOut += qty;
          if (summary[skuId].platformBreakdown[platformId]) {
            summary[skuId].platformBreakdown[platformId].stockOut += qty;
          }
        }
      });
    });

    return Object.values(summary);
  }, [skus, transactions, platforms, getProductById, getCategoryById, getSizeById, getColorById]);

  // Filter and search
  const filteredData = useMemo(() => {
    return summaryData.filter(item => {
      const matchesCategory = categoryFilter === 'all' || item.categoryId === categoryFilter;
      const matchesSearch = 
        item.productName.toLowerCase().includes(search.toLowerCase()) ||
        item.skuCode.toLowerCase().includes(search.toLowerCase()) ||
        item.sizeName.toLowerCase().includes(search.toLowerCase()) ||
        item.colorName.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [summaryData, categoryFilter, search]);

  // Group by category for display
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, TransactionSummary[]> = {};
    filteredData.forEach(item => {
      const catName = item.categoryName;
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(item);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredData]);

  // Get active platforms for columns
  const activePlatforms = platforms.filter(p => p.isActive);

  if (dataLoading) {
    return (
      <MainLayout title="Category Breakdown">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Category Breakdown">
      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="space-y-2">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.filter(c => c.isActive).map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search product, SKU, size, color..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filteredData.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Stock In</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                +{filteredData.reduce((sum, item) => sum + item.totalStockIn, 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Stock Out</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                -{filteredData.reduce((sum, item) => sum + item.totalStockOut, 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {filteredData.reduce((sum, item) => sum + item.currentStock, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          groupedByCategory.map(([categoryName, items]) => (
            <Card key={categoryName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {categoryName}
                  <Badge variant="secondary">{items.length} SKUs</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead className="text-center text-green-600">Total In</TableHead>
                        <TableHead className="text-center text-red-600">Total Out</TableHead>
                        {activePlatforms.map(platform => (
                          <TableHead key={platform.id} className="text-center min-w-[120px]">
                            <div className="flex flex-col">
                              <span>{platform.name}</span>
                              <span className="text-xs text-muted-foreground">(In | Out)</span>
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="text-center min-w-[100px]">
                          <div className="flex flex-col">
                            <span>No Platform</span>
                            <span className="text-xs text-muted-foreground">(In | Out)</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.skuId}>
                          <TableCell className="sticky left-0 bg-background font-medium">
                            {item.productName}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.skuCode}</TableCell>
                          <TableCell>{item.sizeName}</TableCell>
                          <TableCell>{item.colorName}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={item.currentStock <= 0 ? 'destructive' : 'outline'}>
                              {item.currentStock}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-green-600 font-medium">
                            +{item.totalStockIn}
                          </TableCell>
                          <TableCell className="text-center text-red-600 font-medium">
                            -{item.totalStockOut}
                          </TableCell>
                          {activePlatforms.map(platform => {
                            const breakdown = item.platformBreakdown[platform.id] || { stockIn: 0, stockOut: 0 };
                            return (
                              <TableCell key={platform.id} className="text-center">
                                <span className="text-green-600">+{breakdown.stockIn}</span>
                                {' | '}
                                <span className="text-red-600">-{breakdown.stockOut}</span>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            <span className="text-green-600">+{item.platformBreakdown['none']?.stockIn || 0}</span>
                            {' | '}
                            <span className="text-red-600">-{item.platformBreakdown['none']?.stockOut || 0}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {filteredData.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No data found for the selected filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

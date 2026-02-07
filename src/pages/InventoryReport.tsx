import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Download, Printer, Package, AlertTriangle, DollarSign, Boxes } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { format, subDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventoryReport() {
  const { 
    products, 
    skus, 
    categories,
    getCategoryById, 
    getProductById,
    getSizeById,
    getColorById,
    getStockStatus,
    formatCurrency,
    loading 
  } = useData();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<'stock' | 'value' | 'name'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter and sort SKUs
  const filteredSKUs = useMemo(() => {
    let result = skus.filter(sku => {
      const product = getProductById(sku.productId);
      if (!product) return false;
      
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        product.name.toLowerCase().includes(searchLower) ||
        sku.skuCode.toLowerCase().includes(searchLower);
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter;
      
      // Stock status filter
      const status = getStockStatus(sku.stock, sku.reorderPoint);
      const matchesStatus = statusFilter === 'all' || status.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
      const productA = getProductById(a.productId);
      const productB = getProductById(b.productId);
      
      let comparison = 0;
      switch (sortField) {
        case 'stock':
          comparison = a.stock - b.stock;
          break;
        case 'value':
          comparison = (a.stock * a.cost) - (b.stock * b.cost);
          break;
        case 'name':
        default:
          comparison = (productA?.name || '').localeCompare(productB?.name || '');
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [skus, search, categoryFilter, statusFilter, sortField, sortDirection, getProductById, getStockStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeProducts = new Set(filteredSKUs.map(s => s.productId)).size;
    const totalSKUs = filteredSKUs.length;
    const totalOnHand = filteredSKUs.reduce((sum, s) => sum + s.stock, 0);
    const totalValue = filteredSKUs.reduce((sum, s) => sum + (s.stock * s.cost), 0);
    const lowStock = filteredSKUs.filter(s => s.stock > 0 && s.stock <= s.reorderPoint).length;
    const outOfStock = filteredSKUs.filter(s => s.stock <= 0).length;

    return { activeProducts, totalSKUs, totalOnHand, totalValue, lowStock, outOfStock };
  }, [filteredSKUs]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const exportCSV = () => {
    const headers = ['SKU', 'Product', 'Category', 'Size', 'Color', 'Stock', 'Reorder Point', 'Cost', 'Price', 'Value', 'Status'];
    const rows = filteredSKUs.map(sku => {
      const product = getProductById(sku.productId);
      const category = product ? getCategoryById(product.categoryId) : null;
      const size = getSizeById(sku.sizeId || '');
      const color = getColorById(sku.colorId || '');
      const status = getStockStatus(sku.stock, sku.reorderPoint);
      
      return [
        sku.skuCode,
        product?.name || '',
        category?.name || '',
        size?.name || '',
        color?.name || '',
        sku.stock,
        sku.reorderPoint,
        sku.cost,
        sku.price,
        sku.stock * sku.cost,
        status.label
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <MainLayout title="Inventory Report">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Inventory Report">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <StatCard title="Products" value={stats.activeProducts} icon={Package} />
          <StatCard title="SKUs" value={stats.totalSKUs} icon={Boxes} />
          <StatCard title="On Hand" value={stats.totalOnHand.toLocaleString()} icon={Package} />
          <StatCard title="Value" value={formatCurrency(stats.totalValue)} icon={DollarSign} />
          <StatCard 
            title="Low Stock" 
            value={stats.lowStock} 
            icon={AlertTriangle}
            iconClassName={stats.lowStock > 0 ? "text-yellow-500" : ""}
          />
          <StatCard 
            title="Out of Stock" 
            value={stats.outOfStock} 
            icon={AlertTriangle}
            iconClassName={stats.outOfStock > 0 ? "text-red-500" : ""}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
          <div className="flex flex-1 gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products or SKUs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.filter(c => c.isActive).map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="IN_STOCK">In Stock</SelectItem>
                <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Inventory Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                  >
                    Product {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('stock')}
                  >
                    Stock {sortField === 'stock' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-right">Reorder</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('value')}
                  >
                    Value {sortField === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSKUs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <p className="text-muted-foreground">No inventory items found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSKUs.map(sku => {
                    const product = getProductById(sku.productId);
                    const category = product ? getCategoryById(product.categoryId) : null;
                    const size = getSizeById(sku.sizeId || '');
                    const color = getColorById(sku.colorId || '');
                    const status = getStockStatus(sku.stock, sku.reorderPoint);
                    const value = sku.stock * sku.cost;
                    
                    return (
                      <TableRow key={sku.id}>
                        <TableCell className="font-mono text-sm">{sku.skuCode}</TableCell>
                        <TableCell className="font-medium">{product?.name || '-'}</TableCell>
                        <TableCell>{category?.name || '-'}</TableCell>
                        <TableCell>{size?.name || '-'}</TableCell>
                        <TableCell>
                          {color && (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: color.hexCode }}
                              />
                              {color.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">{sku.stock}</TableCell>
                        <TableCell className="text-right">{sku.reorderPoint}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sku.cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(sku.price)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(value)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={status.colorClass}>
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

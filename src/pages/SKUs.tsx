import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Download, 
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  Barcode
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { SKU } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function SKUs() {
  const { 
    skus, 
    products, 
    colors, 
    sizes, 
    getProductById, 
    getColorById, 
    getSizeById,
    getStockStatus,
    formatCurrency,
    loading 
  } = useData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSKU, setEditingSKU] = useState<SKU | null>(null);
  const [formData, setFormData] = useState({
    productId: '',
    skuCode: '',
    sizeId: '',
    colorId: '',
    price: 0,
    cost: 0,
    stock: 0,
    reorderPoint: 10,
    isActive: true
  });
  const [saving, setSaving] = useState(false);

  // Filter SKUs
  const filteredSKUs = useMemo(() => {
    return skus.filter(sku => {
      const product = getProductById(sku.productId);
      const matchesSearch = 
        sku.skuCode.toLowerCase().includes(search.toLowerCase()) ||
        (product?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesProduct = productFilter === 'all' || sku.productId === productFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && sku.isActive) ||
        (statusFilter === 'inactive' && !sku.isActive);
      return matchesSearch && matchesProduct && matchesStatus;
    });
  }, [skus, search, productFilter, statusFilter, getProductById]);

  // Active products for form
  const activeProducts = useMemo(() => {
    return products.filter(p => p.isActive);
  }, [products]);

  // Generate SKU code suggestion
  const generateSKUCode = (productId: string, sizeId: string, colorId: string) => {
    const product = getProductById(productId);
    const size = getSizeById(sizeId);
    const color = getColorById(colorId);
    
    const parts = [];
    if (product) parts.push(product.name.substring(0, 3).toUpperCase());
    if (color) parts.push(color.name.substring(0, 3).toUpperCase());
    if (size) parts.push(size.name.toUpperCase());
    parts.push(Date.now().toString().slice(-4));
    
    return parts.join('-');
  };

  const handleOpenModal = (sku?: SKU) => {
    if (sku) {
      setEditingSKU(sku);
      setFormData({
        productId: sku.productId,
        skuCode: sku.skuCode,
        sizeId: sku.sizeId || '',
        colorId: sku.colorId || '',
        price: sku.price,
        cost: sku.cost,
        stock: sku.stock,
        reorderPoint: sku.reorderPoint,
        isActive: sku.isActive
      });
    } else {
      setEditingSKU(null);
      setFormData({
        productId: activeProducts[0]?.id || '',
        skuCode: '',
        sizeId: '',
        colorId: '',
        price: 0,
        cost: 0,
        stock: 0,
        reorderPoint: 10,
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.productId || !formData.skuCode.trim()) {
      toast({ title: 'Error', description: 'Product and SKU Code are required', variant: 'destructive' });
      return;
    }

    // Check for duplicate SKU code
    const isDuplicate = skus.some(s => 
      s.skuCode.toLowerCase() === formData.skuCode.toLowerCase() && 
      s.id !== editingSKU?.id
    );
    if (isDuplicate) {
      toast({ title: 'Error', description: 'SKU code already exists', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        productId: formData.productId,
        skuCode: formData.skuCode.trim().toUpperCase(),
        sizeId: formData.sizeId || null,
        colorId: formData.colorId || null,
        price: Number(formData.price),
        cost: Number(formData.cost),
        stock: Number(formData.stock),
        reorderPoint: Number(formData.reorderPoint),
        isActive: formData.isActive
      };

      if (editingSKU) {
        await updateDoc(doc(db, COLLECTIONS.SKUS, editingSKU.id), {
          ...dataToSave,
          updatedAt: serverTimestamp()
        });
        toast({ title: 'Success', description: 'SKU updated successfully' });
      } else {
        await addDoc(collection(db, COLLECTIONS.SKUS), {
          ...dataToSave,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast({ title: 'Success', description: 'SKU created successfully' });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving SKU:', error);
      toast({ title: 'Error', description: 'Failed to save SKU', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (skuId: string) => {
    if (!confirm('Are you sure? This cannot be undone if there are no transactions for this SKU.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, COLLECTIONS.SKUS, skuId));
      toast({ title: 'Success', description: 'SKU deleted successfully' });
    } catch (error) {
      console.error('Error deleting SKU:', error);
      toast({ title: 'Error', description: 'Failed to delete SKU', variant: 'destructive' });
    }
  };

  const exportCSV = () => {
    const headers = ['SKU Code', 'Product', 'Size', 'Color', 'Price', 'Cost', 'Stock', 'Reorder Point', 'Status'];
    const rows = filteredSKUs.map(sku => [
      sku.skuCode,
      getProductById(sku.productId)?.name || '',
      getSizeById(sku.sizeId || '')?.name || '',
      getColorById(sku.colorId || '')?.name || '',
      sku.price,
      sku.cost,
      sku.stock,
      sku.reorderPoint,
      sku.isActive ? 'Active' : 'Inactive'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skus_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <MainLayout title="SKUs">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="SKU Management">
      <div className="space-y-4">
        {/* Info Banner */}
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <Barcode className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">What is a SKU?</p>
              <p className="text-sm text-muted-foreground">
                SKU (Stock Keeping Unit) represents a specific variant of a product that you track inventory for. 
                For example, if you sell a "T-Shirt" product, you might have separate SKUs for "T-Shirt Red Large" 
                and "T-Shirt Blue Small". Stock In/Out operations work with SKUs.
              </p>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search SKU code or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {activeProducts.map(product => (
                  <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add SKU
            </Button>
          </div>
        </div>

        {/* SKUs Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU Code</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSKUs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No SKUs found</p>
                      <p className="text-sm text-muted-foreground">
                        Add a SKU to start tracking inventory
                      </p>
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal()}>
                        Add your first SKU
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSKUs.map(sku => {
                  const product = getProductById(sku.productId);
                  const size = getSizeById(sku.sizeId || '');
                  const color = getColorById(sku.colorId || '');
                  const stockStatus = getStockStatus(sku.stock, sku.reorderPoint);
                  
                  return (
                    <TableRow key={sku.id}>
                      <TableCell className="font-mono font-medium">{sku.skuCode}</TableCell>
                      <TableCell>{product?.name || 'Unknown'}</TableCell>
                      <TableCell>{size?.name || '-'}</TableCell>
                      <TableCell>
                        {color ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border" 
                              style={{ backgroundColor: color.hexCode }} 
                            />
                            <span>{color.name}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(sku.price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sku.cost)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={stockStatus.colorClass}>
                          {sku.stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={sku.isActive ? 'default' : 'secondary'}>
                          {sku.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenModal(sku)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(sku.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Add/Edit SKU Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSKU ? 'Edit SKU' : 'Add SKU'}
            </DialogTitle>
            <DialogDescription>
              {editingSKU ? 'Update SKU details' : 'Create a new SKU for inventory tracking'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select 
                value={formData.productId} 
                onValueChange={(value) => {
                  setFormData({ ...formData, productId: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {activeProducts.map(product => (
                    <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select 
                  value={formData.sizeId || 'none'} 
                  onValueChange={(value) => setFormData({ ...formData, sizeId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {sizes.filter(s => s.isActive).map(size => (
                      <SelectItem key={size.id} value={size.id}>{size.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Select 
                  value={formData.colorId || 'none'} 
                  onValueChange={(value) => setFormData({ ...formData, colorId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {colors.filter(c => c.isActive).map(color => (
                      <SelectItem key={color.id} value={color.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: color.hexCode }} />
                          {color.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="skuCode">SKU Code *</Label>
                {!editingSKU && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const code = generateSKUCode(formData.productId, formData.sizeId, formData.colorId);
                      setFormData({ ...formData, skuCode: code });
                    }}
                  >
                    Generate
                  </Button>
                )}
              </div>
              <Input
                id="skuCode"
                value={formData.skuCode}
                onChange={(e) => setFormData({ ...formData, skuCode: e.target.value.toUpperCase() })}
                placeholder="e.g., TSHIRT-RED-L"
                className="font-mono"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Selling Price</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost Price</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stock">Initial Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  disabled={!!editingSKU}
                />
                {editingSKU && (
                  <p className="text-xs text-muted-foreground">
                    Use Stock In/Out to adjust stock
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  min="0"
                  value={formData.reorderPoint}
                  onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingSKU ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

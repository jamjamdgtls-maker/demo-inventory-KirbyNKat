import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  collection, 
  doc, 
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { createAuditLogger } from '@/lib/auditLog';
import { Plus, Trash2, ArrowUpFromLine, Save, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { TransactionLineItem } from '@/types';

interface LineItem {
  id: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
}

export default function StockOut() {
  const { 
    products, 
    skus, 
    platforms, 
    reasonCategories, 
    getProductById, 
    getSKUById,
    getSizeById,
    getColorById,
    getPlatformById,
    formatCurrency,
    settings
  } = useData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [platformId, setPlatformId] = useState('');
  const [reasonCategoryId, setReasonCategoryId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [lineItems, setLineItems] = useState<LineItem[]>([{ id: '1', skuId: '', quantity: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Filter reason categories for OUT direction
  const outReasonCategories = useMemo(() => {
    return reasonCategories.filter(r => r.direction === 'OUT' && r.isActive);
  }, [reasonCategories]);

  // Check if selected reason requires platform
  const selectedReason = useMemo(() => {
    return reasonCategories.find(r => r.id === reasonCategoryId);
  }, [reasonCategories, reasonCategoryId]);

  // Get active SKUs with product info
  const activeSKUs = useMemo(() => {
    return skus
      .filter(s => s.isActive)
      .map(sku => {
        const product = getProductById(sku.productId);
        const size = getSizeById(sku.sizeId || '');
        const color = getColorById(sku.colorId || '');
        return {
          ...sku,
          productName: product?.name || 'Unknown',
          sizeName: size?.name || '',
          colorName: color?.name || '',
          displayName: `${product?.name || 'Unknown'} - ${sku.skuCode}${size ? ` (${size.name})` : ''}${color ? ` - ${color.name}` : ''}`
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [skus, getProductById, getSizeById, getColorById]);

  const addLineItem = () => {
    setLineItems([...lineItems, { 
      id: Date.now().toString(), 
      skuId: '', 
      quantity: 1, 
      unitPrice: 0 
    }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-fill price from SKU
        if (field === 'skuId' && value) {
          const sku = getSKUById(value);
          if (sku) {
            updated.unitPrice = sku.price;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  // Check for low stock warnings
  const stockWarnings = useMemo(() => {
    const warnings: { skuId: string; message: string; severity: 'warning' | 'error' }[] = [];
    
    lineItems.forEach(item => {
      if (!item.skuId) return;
      const sku = getSKUById(item.skuId);
      if (!sku) return;

      const availableStock = sku.stock;
      const requestedQty = item.quantity;

      if (requestedQty > availableStock) {
        warnings.push({
          skuId: item.skuId,
          message: `Insufficient stock: Requesting ${requestedQty} but only ${availableStock} available`,
          severity: 'error'
        });
      } else if (availableStock - requestedQty <= sku.reorderPoint) {
        warnings.push({
          skuId: item.skuId,
          message: `Low stock warning: ${availableStock - requestedQty} will remain after this transaction`,
          severity: 'warning'
        });
      }
    });

    return warnings;
  }, [lineItems, getSKUById]);

  const hasOverselling = stockWarnings.some(w => w.severity === 'error');

  const totalQuantity = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [lineItems]);

  const grossRevenue = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
  }, [lineItems]);

  const platformFee = useMemo(() => {
    if (!platformId) return 0;
    const platform = getPlatformById(platformId);
    if (!platform) return 0;
    return grossRevenue * (platform.feePercentage / 100);
  }, [platformId, grossRevenue, getPlatformById]);

  const netRevenue = grossRevenue - platformFee;

  const isValid = useMemo(() => {
    if (!reasonCategoryId) return false;
    if (selectedReason?.requiresPlatform && !platformId) return false;
    if (lineItems.length === 0) return false;
    if (hasOverselling && !settings.enableNegativeStock) return false;
    return lineItems.every(item => item.skuId && item.quantity > 0);
  }, [reasonCategoryId, selectedReason, platformId, lineItems, hasOverselling, settings.enableNegativeStock]);

  const handleSubmit = async () => {
    if (!isValid) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);

      // Create transaction line items
      const transactionLineItems: TransactionLineItem[] = lineItems.map(item => {
        const sku = getSKUById(item.skuId);
        const product = sku ? getProductById(sku.productId) : null;
        return {
          skuId: item.skuId,
          skuCode: sku?.skuCode || '',
          productName: product?.name || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: sku?.cost || 0,
          totalPrice: item.quantity * item.unitPrice
        };
      });

      // Create transaction
      const transactionRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
      batch.set(transactionRef, {
        direction: 'OUT',
        reasonCategoryId,
        platformId: platformId || null,
        lineItems: transactionLineItems,
        totalQuantity,
        totalAmount: grossRevenue,
        platformFee: platformFee || null,
        netAmount: netRevenue,
        referenceNumber: referenceNumber || null,
        customerName: customerName || null,
        notes: notes || null,
        transactionDate: new Date(transactionDate),
        createdAt: serverTimestamp(),
        createdBy: user?.id,
        createdByName: user?.displayName
      });

      // Update SKU stock levels
      for (const item of lineItems) {
        const sku = getSKUById(item.skuId);
        if (sku) {
          const skuRef = doc(db, COLLECTIONS.SKUS, item.skuId);
          batch.update(skuRef, {
            stock: sku.stock - item.quantity,
            updatedAt: serverTimestamp()
          });
        }
      }

      await batch.commit();

      // Log audit entry
      if (user) {
        const auditLogger = createAuditLogger(user.id, user.displayName, user.email);
        const platform = platformId ? getPlatformById(platformId) : null;
        await auditLogger.logStockOut(
          transactionRef.id, 
          `Stock Out: ${totalQuantity} items, Revenue: ${formatCurrency(netRevenue)}${platform ? `, Platform: ${platform.name}` : ''}${customerName ? `, Customer: ${customerName}` : ''}`
        );
      }

      toast({ 
        title: 'Success', 
        description: `Stock Out completed: ${totalQuantity} items • Revenue: ${formatCurrency(netRevenue)}` 
      });
      
      // Reset form
      setLineItems([{ id: '1', skuId: '', quantity: 1, unitPrice: 0 }]);
      setReferenceNumber('');
      setCustomerName('');
      setNotes('');
      setPlatformId('');
      setShowConfirmation(false);
    } catch (error) {
      console.error('Stock Out error:', error);
      toast({ title: 'Error', description: 'Failed to process Stock Out', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Stock Out">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5" />
              Record Sale / Stock Out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select value={reasonCategoryId} onValueChange={setReasonCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {outReasonCategories.map(reason => (
                      <SelectItem key={reason.id} value={reason.id}>{reason.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Platform {selectedReason?.requiresPlatform && '*'}</Label>
                <Select value={platformId} onValueChange={setPlatformId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map(platform => (
                      <SelectItem key={platform.id} value={platform.id}>
                        {platform.name} ({platform.feePercentage}% fee)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Transaction Date</Label>
                <Input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Order#, Receipt#, etc."
                />
              </div>

              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Warnings */}
        {stockWarnings.length > 0 && (
          <Alert variant={hasOverselling ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {stockWarnings.map((warning, i) => (
                  <li key={i}>{warning.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button size="sm" onClick={addLineItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">SKU</TableHead>
                    <TableHead className="w-24">Stock</TableHead>
                    <TableHead className="w-24">Qty *</TableHead>
                    <TableHead className="w-32">Unit Price</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => {
                    const selectedSKU = item.skuId ? activeSKUs.find(s => s.id === item.skuId) : null;
                    const warning = stockWarnings.find(w => w.skuId === item.skuId);
                    
                    return (
                      <TableRow key={item.id} className={warning?.severity === 'error' ? 'bg-destructive/10' : ''}>
                        <TableCell>
                          <Select 
                            value={item.skuId} 
                            onValueChange={(v) => updateLineItem(item.id, 'skuId', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select SKU" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeSKUs.map(sku => (
                                <SelectItem key={sku.id} value={sku.id}>
                                  {sku.displayName} ({sku.stock} in stock)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={selectedSKU && selectedSKU.stock <= selectedSKU.reorderPoint ? 'border-yellow-500 text-yellow-600' : ''}
                          >
                            {selectedSKU?.stock ?? '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(item.id)}
                            disabled={lineItems.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary & Submit */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Summary</p>
                <div className="space-y-1">
                  <p className="font-medium">{totalQuantity} items</p>
                  <p className="text-sm">Gross: {formatCurrency(grossRevenue)}</p>
                  {platformFee > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Platform Fee: -{formatCurrency(platformFee)}
                    </p>
                  )}
                  <p className="text-lg font-bold text-green-600">
                    Net: {formatCurrency(netRevenue)}
                  </p>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={() => setShowConfirmation(true)}
                disabled={!isValid}
              >
                <Save className="h-4 w-4 mr-2" />
                Submit Stock Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Stock Out</DialogTitle>
            <DialogDescription>
              Please review the transaction details before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p><strong>Total Items:</strong> {totalQuantity}</p>
              <p><strong>Gross Revenue:</strong> {formatCurrency(grossRevenue)}</p>
              {platformFee > 0 && (
                <p><strong>Platform Fee:</strong> -{formatCurrency(platformFee)}</p>
              )}
              <p className="text-lg font-bold">
                <strong>Net Revenue:</strong> {formatCurrency(netRevenue)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Processing...' : 'Confirm Stock Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

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
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { createAuditLogger } from '@/lib/auditLog';
import { Plus, Trash2, ArrowDownToLine, Save, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { TransactionLineItem } from '@/types';

interface LineItem {
  id: string;
  skuId: string;
  quantity: number;
  unitCost: number;
}

export default function StockIn() {
  const { 
    products, 
    skus, 
    suppliers, 
    reasonCategories, 
    getProductById, 
    getSKUById,
    getSizeById,
    getColorById,
    formatCurrency 
  } = useData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sourceType, setSourceType] = useState<'SUPPLIER' | 'RTS' | 'MANUAL'>('SUPPLIER');
  const [supplierId, setSupplierId] = useState('');
  const [reasonCategoryId, setReasonCategoryId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [lineItems, setLineItems] = useState<LineItem[]>([{ id: '1', skuId: '', quantity: 1, unitCost: 0 }]);
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Filter reason categories for IN direction
  const inReasonCategories = useMemo(() => {
    return reasonCategories.filter(r => r.direction === 'IN' && r.isActive);
  }, [reasonCategories]);

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
      unitCost: 0 
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
        // Auto-fill cost from SKU
        if (field === 'skuId' && value) {
          const sku = getSKUById(value);
          if (sku) {
            updated.unitCost = sku.cost;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const totalQuantity = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [lineItems]);

  const totalCost = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitCost || 0)), 0);
  }, [lineItems]);

  const isValid = useMemo(() => {
    if (!reasonCategoryId) return false;
    if (sourceType === 'SUPPLIER' && !supplierId) return false;
    if (lineItems.length === 0) return false;
    return lineItems.every(item => item.skuId && item.quantity > 0);
  }, [reasonCategoryId, sourceType, supplierId, lineItems]);

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
          unitPrice: sku?.price || 0,
          unitCost: item.unitCost,
          totalPrice: item.quantity * item.unitCost
        };
      });

      // Create transaction
      const transactionRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
      batch.set(transactionRef, {
        direction: 'IN',
        sourceType,
        reasonCategoryId,
        supplierId: sourceType === 'SUPPLIER' ? supplierId : null,
        lineItems: transactionLineItems,
        totalQuantity,
        totalAmount: totalCost,
        referenceNumber: referenceNumber || null,
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
            stock: sku.stock + item.quantity,
            cost: item.unitCost, // Update cost to latest
            updatedAt: serverTimestamp()
          });
        }
      }

      await batch.commit();

      // Log audit entry
      if (user) {
        const auditLogger = createAuditLogger(user.id, user.displayName, user.email);
        await auditLogger.logStockIn(
          transactionRef.id, 
          `Stock In: ${totalQuantity} items, Total Cost: ${formatCurrency(totalCost)}${referenceNumber ? `, Ref: ${referenceNumber}` : ''}`
        );
      }

      toast({ title: 'Success', description: `Stock In completed: ${totalQuantity} items received` });
      
      // Reset form
      setLineItems([{ id: '1', skuId: '', quantity: 1, unitCost: 0 }]);
      setReferenceNumber('');
      setNotes('');
      setShowConfirmation(false);
    } catch (error) {
      console.error('Stock In error:', error);
      toast({ title: 'Error', description: 'Failed to process Stock In', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Stock In">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Receive Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Source Type *</Label>
                <Select value={sourceType} onValueChange={(v) => setSourceType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPPLIER">Supplier</SelectItem>
                    <SelectItem value="RTS">Return to Stock (RTS)</SelectItem>
                    <SelectItem value="MANUAL">Manual Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select value={reasonCategoryId} onValueChange={setReasonCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {inReasonCategories.map(reason => (
                      <SelectItem key={reason.id} value={reason.id}>{reason.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sourceType === 'SUPPLIER' && (
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                  placeholder="PO#, Invoice#, etc."
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <TableHead className="w-24">Current</TableHead>
                    <TableHead className="w-24">Qty *</TableHead>
                    <TableHead className="w-32">Unit Cost</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => {
                    const selectedSKU = item.skuId ? activeSKUs.find(s => s.id === item.skuId) : null;
                    return (
                      <TableRow key={item.id}>
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
                                  {sku.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
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
                            value={item.unitCost}
                            onChange={(e) => updateLineItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(item.quantity * item.unitCost)}
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
                <p className="text-lg font-semibold">
                  {totalQuantity} items • Total Cost: {formatCurrency(totalCost)}
                </p>
              </div>
              <Button 
                size="lg" 
                onClick={() => setShowConfirmation(true)}
                disabled={!isValid}
              >
                <Save className="h-4 w-4 mr-2" />
                Submit Stock In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Stock In</DialogTitle>
            <DialogDescription>
              Please review the transaction details before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p><strong>Total Items:</strong> {totalQuantity}</p>
              <p><strong>Total Cost:</strong> {formatCurrency(totalCost)}</p>
              <p><strong>Line Items:</strong> {lineItems.filter(i => i.skuId).length}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Processing...' : 'Confirm Stock In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

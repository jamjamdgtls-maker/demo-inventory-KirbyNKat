import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { Plus, Edit, Tag } from 'lucide-react';
import { ReasonCategory, TransactionDirection } from '@/types';

export default function Reasons() {
  const { reasonCategories } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReasonCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    direction: 'IN' as TransactionDirection,
    requiresPlatform: false,
    requiresSupplier: false,
    sortOrder: 0,
    isActive: true
  });
  const [saving, setSaving] = useState(false);

  const handleOpen = (reason?: ReasonCategory) => {
    if (reason) {
      setEditing(reason);
      setFormData({
        name: reason.name,
        direction: reason.direction,
        requiresPlatform: reason.requiresPlatform,
        requiresSupplier: reason.requiresSupplier,
        sortOrder: reason.sortOrder,
        isActive: reason.isActive
      });
    } else {
      setEditing(null);
      setFormData({
        name: '',
        direction: 'IN',
        requiresPlatform: false,
        requiresSupplier: false,
        sortOrder: reasonCategories.length,
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, COLLECTIONS.REASON_CATEGORIES, editing.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, COLLECTIONS.REASON_CATEGORIES), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      toast({ title: 'Success', description: `Reason ${editing ? 'updated' : 'created'}` });
      setIsModalOpen(false);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getDirectionBadge = (direction: TransactionDirection) => {
    const variants: Record<TransactionDirection, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      IN: { variant: 'default', label: 'Stock In' },
      OUT: { variant: 'secondary', label: 'Stock Out' },
      ADJUSTMENT: { variant: 'outline', label: 'Adjustment' }
    };
    const { variant, label } = variants[direction];
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <MainLayout title="Reason Categories">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => handleOpen()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Reason
          </Button>
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Requires</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reasonCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Tag className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">No reason categories</p>
                  </TableCell>
                </TableRow>
              ) : (
                reasonCategories.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{getDirectionBadge(r.direction)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.requiresPlatform && <Badge variant="outline" className="text-xs">Platform</Badge>}
                        {r.requiresSupplier && <Badge variant="outline" className="text-xs">Supplier</Badge>}
                        {!r.requiresPlatform && !r.requiresSupplier && <span className="text-muted-foreground">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>{r.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? 'default' : 'secondary'}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(r)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Reason Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sales, Returns, Damage"
              />
            </div>
            <div className="space-y-2">
              <Label>Direction *</Label>
              <Select
                value={formData.direction}
                onValueChange={(v) => setFormData({ ...formData, direction: v as TransactionDirection })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Stock In</SelectItem>
                  <SelectItem value="OUT">Stock Out</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="requiresPlatform"
                  checked={formData.requiresPlatform}
                  onCheckedChange={c => setFormData({ ...formData, requiresPlatform: !!c })}
                />
                <Label htmlFor="requiresPlatform">Requires Platform</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="requiresSupplier"
                  checked={formData.requiresSupplier}
                  onCheckedChange={c => setFormData({ ...formData, requiresSupplier: !!c })}
                />
                <Label htmlFor="requiresSupplier">Requires Supplier</Label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={c => setFormData({ ...formData, isActive: !!c })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

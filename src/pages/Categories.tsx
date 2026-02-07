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
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { Plus, Edit, Layers } from 'lucide-react';
import { Category } from '@/types';

export default function Categories() {
  const { categories } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', sortOrder: 0, isActive: true });
  const [saving, setSaving] = useState(false);

  const handleOpen = (cat?: Category) => {
    if (cat) { setEditing(cat); setFormData({ name: cat.name, sortOrder: cat.sortOrder, isActive: cat.isActive }); }
    else { setEditing(null); setFormData({ name: '', sortOrder: categories.length, isActive: true }); }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast({ title: 'Error', description: 'Name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editing) { await updateDoc(doc(db, COLLECTIONS.CATEGORIES, editing.id), { ...formData, updatedAt: serverTimestamp() }); }
      else { await addDoc(collection(db, COLLECTIONS.CATEGORIES), { ...formData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); }
      toast({ title: 'Success', description: `Category ${editing ? 'updated' : 'created'}` });
      setIsModalOpen(false);
    } catch (e) { toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return (
    <MainLayout title="Categories">
      <div className="space-y-4">
        <div className="flex justify-end"><Button onClick={() => handleOpen()}><Plus className="h-4 w-4 mr-2" />Add Category</Button></div>
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Sort Order</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {categories.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8"><Layers className="h-8 w-8 mx-auto text-muted-foreground" /><p className="text-muted-foreground mt-2">No categories</p></TableCell></TableRow> :
                categories.map(c => <TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.sortOrder}</TableCell><TableCell><Badge variant={c.isActive ? 'default' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => handleOpen(c)}><Edit className="h-4 w-4" /></Button></TableCell></TableRow>)}
            </TableBody>
          </Table>
        </Card>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><Label>Sort Order</Label><Input type="number" value={formData.sortOrder} onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})} /></div>
            <div className="flex items-center gap-2"><Checkbox id="isActive" checked={formData.isActive} onCheckedChange={c => setFormData({...formData, isActive: !!c})} /><Label htmlFor="isActive">Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

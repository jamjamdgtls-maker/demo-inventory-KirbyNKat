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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { Plus, Edit, Truck } from 'lucide-react';
import { Supplier } from '@/types';

export default function Suppliers() {
  const { suppliers, loading } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: '', contactName: '', email: '', phone: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleOpen = (supplier?: Supplier) => {
    if (supplier) {
      setEditing(supplier);
      setFormData({ name: supplier.name, contactName: supplier.contactName || '', email: supplier.email || '', phone: supplier.phone || '', address: supplier.address || '', notes: supplier.notes || '' });
    } else {
      setEditing(null);
      setFormData({ name: '', contactName: '', email: '', phone: '', address: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast({ title: 'Error', description: 'Name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, COLLECTIONS.SUPPLIERS, editing.id), { ...formData, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, COLLECTIONS.SUPPLIERS), { ...formData, isActive: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      toast({ title: 'Success', description: `Supplier ${editing ? 'updated' : 'created'}` });
      setIsModalOpen(false);
    } catch (e) { toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return (
    <MainLayout title="Suppliers">
      <div className="space-y-4">
        <div className="flex justify-end"><Button onClick={() => handleOpen()}><Plus className="h-4 w-4 mr-2" />Add Supplier</Button></div>
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {suppliers.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8"><Truck className="h-8 w-8 mx-auto text-muted-foreground" /><p className="text-muted-foreground mt-2">No suppliers</p></TableCell></TableRow> :
                suppliers.map(s => <TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.contactName || '-'}</TableCell><TableCell>{s.email || '-'}</TableCell><TableCell>{s.phone || '-'}</TableCell><TableCell><Badge variant={s.isActive ? 'default' : 'secondary'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => handleOpen(s)}><Edit className="h-4 w-4" /></Button></TableCell></TableRow>)}
            </TableBody>
          </Table>
        </Card>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Supplier</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><Label>Contact Name</Label><Input value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div><Label>Phone</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
            <div><Label>Address</Label><Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

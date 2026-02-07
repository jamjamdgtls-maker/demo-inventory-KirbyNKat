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
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { Plus, Edit, Store } from 'lucide-react';
import { Platform } from '@/types';

export default function Platforms() {
  const { platforms } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Platform | null>(null);
  const [formData, setFormData] = useState({ name: '', feePercentage: 0 });
  const [saving, setSaving] = useState(false);

  const handleOpen = (platform?: Platform) => {
    if (platform) { setEditing(platform); setFormData({ name: platform.name, feePercentage: platform.feePercentage }); }
    else { setEditing(null); setFormData({ name: '', feePercentage: 0 }); }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast({ title: 'Error', description: 'Name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editing) { await updateDoc(doc(db, COLLECTIONS.PLATFORMS, editing.id), { ...formData, updatedAt: serverTimestamp() }); }
      else { await addDoc(collection(db, COLLECTIONS.PLATFORMS), { ...formData, isActive: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); }
      toast({ title: 'Success', description: `Platform ${editing ? 'updated' : 'created'}` });
      setIsModalOpen(false);
    } catch (e) { toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return (
    <MainLayout title="Platforms">
      <div className="space-y-4">
        <div className="flex justify-end"><Button onClick={() => handleOpen()}><Plus className="h-4 w-4 mr-2" />Add Platform</Button></div>
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Fee %</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {platforms.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8"><Store className="h-8 w-8 mx-auto text-muted-foreground" /><p className="text-muted-foreground mt-2">No platforms</p></TableCell></TableRow> :
                platforms.map(p => <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.feePercentage}%</TableCell><TableCell><Badge variant={p.isActive ? 'default' : 'secondary'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => handleOpen(p)}><Edit className="h-4 w-4" /></Button></TableCell></TableRow>)}
            </TableBody>
          </Table>
        </Card>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Platform</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><Label>Fee Percentage</Label><Input type="number" min="0" max="100" step="0.1" value={formData.feePercentage} onChange={e => setFormData({...formData, feePercentage: parseFloat(e.target.value) || 0})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

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
import { Plus, Edit, Palette } from 'lucide-react';
import { Color } from '@/types';

export default function Colors() {
  const { colors } = useData();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Color | null>(null);
  const [formData, setFormData] = useState({ name: '', hexCode: '#000000', sortOrder: 0, isActive: true });
  const [saving, setSaving] = useState(false);

  const handleOpen = (color?: Color) => {
    if (color) { setEditing(color); setFormData({ name: color.name, hexCode: color.hexCode, sortOrder: color.sortOrder, isActive: color.isActive }); }
    else { setEditing(null); setFormData({ name: '', hexCode: '#000000', sortOrder: colors.length, isActive: true }); }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast({ title: 'Error', description: 'Name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editing) { await updateDoc(doc(db, COLLECTIONS.COLORS, editing.id), { ...formData, updatedAt: serverTimestamp() }); }
      else { await addDoc(collection(db, COLLECTIONS.COLORS), { ...formData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); }
      toast({ title: 'Success', description: `Color ${editing ? 'updated' : 'created'}` });
      setIsModalOpen(false);
    } catch (e) { toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return (
    <MainLayout title="Colors">
      <div className="space-y-4">
        <div className="flex justify-end"><Button onClick={() => handleOpen()}><Plus className="h-4 w-4 mr-2" />Add Color</Button></div>
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Color</TableHead><TableHead>Name</TableHead><TableHead>Hex</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {colors.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8"><Palette className="h-8 w-8 mx-auto text-muted-foreground" /><p className="text-muted-foreground mt-2">No colors</p></TableCell></TableRow> :
                colors.map(c => <TableRow key={c.id}><TableCell><div className="w-6 h-6 rounded-full border" style={{backgroundColor: c.hexCode}} /></TableCell><TableCell className="font-medium">{c.name}</TableCell><TableCell className="font-mono">{c.hexCode}</TableCell><TableCell><Badge variant={c.isActive ? 'default' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => handleOpen(c)}><Edit className="h-4 w-4" /></Button></TableCell></TableRow>)}
            </TableBody>
          </Table>
        </Card>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Color</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><Label>Hex Code</Label><div className="flex gap-2"><Input type="color" value={formData.hexCode} onChange={e => setFormData({...formData, hexCode: e.target.value})} className="w-16 h-10 p-1" /><Input value={formData.hexCode} onChange={e => setFormData({...formData, hexCode: e.target.value})} /></div></div>
            <div className="flex items-center gap-2"><Checkbox id="isActive" checked={formData.isActive} onCheckedChange={c => setFormData({...formData, isActive: !!c})} /><Label htmlFor="isActive">Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { User, UserRole, UserStatus } from '@/types';
import { Check, X, Users as UsersIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function Users() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.USERS), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date(), updatedAt: doc.data().updatedAt?.toDate() || new Date(), lastLoginAt: doc.data().lastLoginAt?.toDate() } as User)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateUser = async (userId: string, updates: Partial<User>) => {
    if (userId === currentUser?.id) { toast({ title: 'Error', description: "Can't modify yourself", variant: 'destructive' }); return; }
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), { ...updates, updatedAt: serverTimestamp() });
      toast({ title: 'Success', description: 'User updated' });
    } catch (e) { toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' }); }
  };

  const getStatusBadge = (status: UserStatus) => {
    const variants: Record<UserStatus, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      APPROVED: { variant: 'default', label: 'Approved' },
      PENDING: { variant: 'secondary', label: 'Pending' },
      REJECTED: { variant: 'destructive', label: 'Rejected' }
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <MainLayout title="User Management">
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last Login</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {users.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8"><UsersIcon className="h-8 w-8 mx-auto text-muted-foreground" /></TableCell></TableRow> :
              users.map(u => (
                <TableRow key={u.id}>
                  <TableCell><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarImage src={u.photoURL} /><AvatarFallback>{u.displayName?.charAt(0)}</AvatarFallback></Avatar><span className="font-medium">{u.displayName}</span></div></TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => updateUser(u.id, { role: v as UserRole })} disabled={u.id === currentUser?.id}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="USER">User</SelectItem><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="SUPERADMIN">SuperAdmin</SelectItem></SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{getStatusBadge(u.status)}</TableCell>
                  <TableCell>{u.lastLoginAt ? format(u.lastLoginAt, 'MMM dd, yyyy') : '-'}</TableCell>
                  <TableCell>
                    {u.status === 'PENDING' && u.id !== currentUser?.id && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => updateUser(u.id, { status: 'APPROVED' })}><Check className="h-4 w-4 text-green-600" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => updateUser(u.id, { status: 'REJECTED' })}><X className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
    </MainLayout>
  );
}

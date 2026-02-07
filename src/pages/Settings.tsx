import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { SystemSettings } from '@/types';

export default function Settings() {
  const { settings } = useData();
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async () => {
    if (!isSuperAdmin) return;
    setSaving(true);
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'general'), {
        ...formData,
        updatedAt: serverTimestamp()
      });
      toast({ title: 'Success', description: 'Settings updated successfully' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>
              {isSuperAdmin ? 'Configure your inventory system' : 'View system configuration'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  disabled={!isSuperAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency Code</Label>
                <Input
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  disabled={!isSuperAdmin}
                  placeholder="e.g., PHP, USD"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency Symbol</Label>
                <Input
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                  disabled={!isSuperAdmin}
                  placeholder="e.g., ₱, $"
                />
              </div>
              <div className="space-y-2">
                <Label>Default Reorder Point</Label>
                <Input
                  type="number"
                  value={formData.defaultReorderPoint}
                  onChange={(e) => setFormData({ ...formData, defaultReorderPoint: parseInt(e.target.value) || 0 })}
                  disabled={!isSuperAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Low Stock Threshold</Label>
                <Input
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                  disabled={!isSuperAdmin}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="enableLowStockAlerts"
                  checked={formData.enableLowStockAlerts}
                  onCheckedChange={(c) => setFormData({ ...formData, enableLowStockAlerts: !!c })}
                  disabled={!isSuperAdmin}
                />
                <Label htmlFor="enableLowStockAlerts">Enable Low Stock Alerts</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="enableNegativeStock"
                  checked={formData.enableNegativeStock}
                  onCheckedChange={(c) => setFormData({ ...formData, enableNegativeStock: !!c })}
                  disabled={!isSuperAdmin}
                />
                <Label htmlFor="enableNegativeStock">Allow Negative Stock</Label>
              </div>
            </div>

            {isSuperAdmin ? (
              <div className="pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only SuperAdmins can modify settings.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

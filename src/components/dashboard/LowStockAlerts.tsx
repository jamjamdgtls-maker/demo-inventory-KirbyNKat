import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SKU } from '@/types';
import { useData } from '@/contexts/DataContext';
import { AlertTriangle } from 'lucide-react';

interface LowStockAlertsProps {
  skus: SKU[];
  className?: string;
}

export function LowStockAlerts({ skus, className }: LowStockAlertsProps) {
  const { getProductById, getStockStatus, getSizeById, getColorById } = useData();

  const alertSKUs = skus
    .filter(sku => sku.stock <= sku.reorderPoint && sku.isActive)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Low Stock Alerts
        </CardTitle>
        <CardDescription>Items that need restocking</CardDescription>
      </CardHeader>
      <CardContent>
        {alertSKUs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            All items are well stocked
          </p>
        ) : (
          <div className="space-y-3">
            {alertSKUs.map((sku) => {
              const product = getProductById(sku.productId);
              const status = getStockStatus(sku.stock, sku.reorderPoint);
              const size = getSizeById(sku.sizeId || '');
              const color = getColorById(sku.colorId || '');
              
              return (
                <div 
                  key={sku.id} 
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {product?.name || 'Unknown Product'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sku.skuCode}
                      {size && ` • ${size.name}`}
                      {color && ` • ${color.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {sku.stock}
                    </span>
                    <Badge className={status.colorClass}>
                      {status.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

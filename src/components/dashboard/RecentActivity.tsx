import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InventoryTransaction } from '@/types';
import { useData } from '@/contexts/DataContext';
import { format } from 'date-fns';
import { ArrowDownToLine, ArrowUpFromLine, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentActivityProps {
  transactions: InventoryTransaction[];
  className?: string;
}

export function RecentActivity({ transactions, className }: RecentActivityProps) {
  const { formatCurrency, getReasonCategoryById } = useData();

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'IN':
        return <ArrowDownToLine className="h-4 w-4 text-green-600" />;
      case 'OUT':
        return <ArrowUpFromLine className="h-4 w-4 text-red-600" />;
      default:
        return <Settings2 className="h-4 w-4 text-blue-600" />;
    }
  };

  const getDirectionBadge = (direction: string) => {
    switch (direction) {
      case 'IN':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">IN</Badge>;
      case 'OUT':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">OUT</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">ADJ</Badge>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest inventory transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent transactions
          </p>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => {
              const reason = getReasonCategoryById(tx.reasonCategoryId);
              return (
                <div 
                  key={tx.id} 
                  className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {getDirectionIcon(tx.direction)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getDirectionBadge(tx.direction)}
                      <span className="text-sm font-medium truncate">
                        {reason?.name || 'Unknown'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tx.totalQuantity} items • {tx.createdByName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-medium",
                      tx.direction === 'OUT' ? "text-green-600" : ""
                    )}>
                      {tx.direction === 'OUT' ? formatCurrency(tx.totalAmount) : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(tx.transactionDate, 'MMM dd, HH:mm')}
                    </p>
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

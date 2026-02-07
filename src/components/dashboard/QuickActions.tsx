import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, Package, ClipboardList } from 'lucide-react';

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  const actions = [
    { 
      label: 'Stock In', 
      icon: ArrowDownToLine, 
      path: '/stock-in',
      description: 'Receive inventory',
      variant: 'default' as const
    },
    { 
      label: 'Stock Out', 
      icon: ArrowUpFromLine, 
      path: '/stock-out',
      description: 'Sell or remove items',
      variant: 'outline' as const
    },
    { 
      label: 'Add Product', 
      icon: Package, 
      path: '/products?action=add',
      description: 'Create new product',
      variant: 'outline' as const
    },
    { 
      label: 'Inventory Report', 
      icon: ClipboardList, 
      path: '/inventory-report',
      description: 'View stock levels',
      variant: 'outline' as const
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common inventory tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.path}
              variant={action.variant}
              className="h-auto flex-col gap-2 py-4"
              asChild
            >
              <Link to={action.path}>
                <action.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

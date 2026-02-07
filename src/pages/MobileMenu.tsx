import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ClipboardList,
  History,
  Truck,
  Store,
  Settings,
  Users,
  BarChart3,
  Package,
  Layers,
  Palette,
  Ruler
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { 
    path: '/inventory-report', 
    label: 'Inventory Report', 
    icon: ClipboardList,
    description: 'View stock levels and values'
  },
  { 
    path: '/transactions', 
    label: 'Transactions', 
    icon: History,
    description: 'Transaction history'
  },
  { 
    path: '/suppliers', 
    label: 'Suppliers', 
    icon: Truck,
    description: 'Manage suppliers'
  },
  { 
    path: '/platforms', 
    label: 'Platforms', 
    icon: Store,
    description: 'Sales channels'
  },
  { 
    path: '/categories', 
    label: 'Categories', 
    icon: Layers,
    description: 'Product categories'
  },
  { 
    path: '/colors', 
    label: 'Colors', 
    icon: Palette,
    description: 'Color options'
  },
  { 
    path: '/sizes', 
    label: 'Sizes', 
    icon: Ruler,
    description: 'Size options'
  },
  { 
    path: '/settings', 
    label: 'Settings', 
    icon: Settings,
    description: 'System configuration'
  },
  { 
    path: '/users', 
    label: 'User Management', 
    icon: Users,
    description: 'Manage user access',
    adminOnly: true
  },
  { 
    path: '/platform-report', 
    label: 'Platform Report', 
    icon: BarChart3,
    description: 'Sales by platform',
    adminOnly: true
  },
];

export default function MobileMenu() {
  const { isAdmin } = useAuth();

  const visibleItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <MainLayout title="Menu">
      <div className="grid gap-3 sm:grid-cols-2">
        {visibleItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <Card className="hover:bg-accent transition-colors">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </MainLayout>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Menu
} from 'lucide-react';

const mobileNavItems = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/stock-in', label: 'Stock In', icon: ArrowDownToLine },
  { path: '/stock-out', label: 'Stock Out', icon: ArrowUpFromLine },
  { path: '/menu', label: 'More', icon: Menu },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/menu' 
            ? !['/products', '/stock-in', '/stock-out', '/'].includes(location.pathname)
            : location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

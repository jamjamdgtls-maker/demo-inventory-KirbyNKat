import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_ITEMS, ADMIN_NAV_ITEMS, SUPERADMIN_NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Package, 
  Barcode,
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ClipboardList,
  History,
  Truck,
  Store,
  Settings,
  Users,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Layers,
  Palette,
  Ruler,
  Tag,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Package,
  Barcode,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  History,
  Truck,
  Store,
  Settings,
  Users,
  BarChart3,
  Layers,
  Palette,
  Ruler,
  Tag,
  FileText,
};

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user, signOut, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const allNavItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? ADMIN_NAV_ITEMS : []),
    ...(isSuperAdmin ? SUPERADMIN_NAV_ITEMS : [])
  ];

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center border-b p-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-sidebar-primary" />
            <span className="font-semibold text-sidebar-foreground">Inventory</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {allNavItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {Icon && <Icon className="h-5 w-5 shrink-0" />}
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className={cn(
        "border-t p-4",
        collapsed ? "flex flex-col items-center gap-2" : ""
      )}>
        <div className={cn(
          "flex items-center gap-3",
          collapsed ? "flex-col" : ""
        )}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL} alt={user?.displayName} />
            <AvatarFallback>
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.displayName}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user?.role}
              </p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={signOut}
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "mt-2" : "w-full mt-3"
          )}
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}

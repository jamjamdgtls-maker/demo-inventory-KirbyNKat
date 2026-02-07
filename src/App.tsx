import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { LoginPage, PendingApproval, AccessDenied } from "@/components/auth";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import SKUs from "@/pages/SKUs";
import MobileMenu from "@/pages/MobileMenu";
import StockIn from "@/pages/StockIn";
import StockOut from "@/pages/StockOut";
import InventoryReport from "@/pages/InventoryReport";
import CategoryBreakdown from "@/pages/CategoryBreakdown";
import Transactions from "@/pages/Transactions";
import Suppliers from "@/pages/Suppliers";
import Platforms from "@/pages/Platforms";
import Categories from "@/pages/Categories";
import Colors from "@/pages/Colors";
import Sizes from "@/pages/Sizes";
import Reasons from "@/pages/Reasons";
import Settings from "@/pages/Settings";
import Users from "@/pages/Users";
import AuditLogs from "@/pages/AuditLogs";
import NotFound from "@/pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, isApproved, isPending, isRejected } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (isPending) {
    return <PendingApproval />;
  }

  if (isRejected) {
    return <AccessDenied />;
  }

  if (!isApproved) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AuthenticatedRoute><Dashboard /></AuthenticatedRoute>} />
      <Route path="/products" element={<AuthenticatedRoute><Products /></AuthenticatedRoute>} />
      <Route path="/skus" element={<AuthenticatedRoute><SKUs /></AuthenticatedRoute>} />
      <Route path="/stock-in" element={<AuthenticatedRoute><StockIn /></AuthenticatedRoute>} />
      <Route path="/stock-out" element={<AuthenticatedRoute><StockOut /></AuthenticatedRoute>} />
      <Route path="/inventory-report" element={<AuthenticatedRoute><InventoryReport /></AuthenticatedRoute>} />
      <Route path="/category-breakdown" element={<AuthenticatedRoute><CategoryBreakdown /></AuthenticatedRoute>} />
      <Route path="/transactions" element={<AuthenticatedRoute><Transactions /></AuthenticatedRoute>} />
      <Route path="/suppliers" element={<AuthenticatedRoute><Suppliers /></AuthenticatedRoute>} />
      <Route path="/platforms" element={<AuthenticatedRoute><Platforms /></AuthenticatedRoute>} />
      <Route path="/categories" element={<AuthenticatedRoute><Categories /></AuthenticatedRoute>} />
      <Route path="/colors" element={<AuthenticatedRoute><Colors /></AuthenticatedRoute>} />
      <Route path="/sizes" element={<AuthenticatedRoute><Sizes /></AuthenticatedRoute>} />
      <Route path="/reasons" element={<AuthenticatedRoute><Reasons /></AuthenticatedRoute>} />
      <Route path="/settings" element={<AuthenticatedRoute><Settings /></AuthenticatedRoute>} />
      <Route path="/menu" element={<AuthenticatedRoute><MobileMenu /></AuthenticatedRoute>} />
      <Route path="/users" element={
        <AuthenticatedRoute>
          <AdminRoute>
            <Users />
          </AdminRoute>
        </AuthenticatedRoute>
      } />
      <Route path="/audit-logs" element={
        <AuthenticatedRoute>
          <SuperAdminRoute>
            <AuditLogs />
          </SuperAdminRoute>
        </AuthenticatedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <AppRoutes />
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

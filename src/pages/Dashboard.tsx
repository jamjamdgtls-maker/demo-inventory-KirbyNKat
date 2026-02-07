import { useEffect, useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { 
  StatCard, 
  RecentActivity, 
  LowStockAlerts, 
  QuickActions,
  SalesChart 
} from '@/components/dashboard';
import { useData } from '@/contexts/DataContext';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { InventoryTransaction } from '@/types';
import { 
  Package, 
  Boxes, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp,
  ShoppingCart
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { products, skus, formatCurrency, settings, loading: dataLoading } = useData();
  const [recentTransactions, setRecentTransactions] = useState<InventoryTransaction[]>([]);
  const [salesData, setSalesData] = useState<{ date: string; revenue: number; count: number }[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Calculate stats
  const stats = useMemo(() => {
    const activeProducts = products.filter(p => p.isActive).length;
    const activeSKUs = skus.filter(s => s.isActive);
    const totalOnHand = activeSKUs.reduce((sum, s) => sum + s.stock, 0);
    const totalValue = activeSKUs.reduce((sum, s) => sum + (s.stock * s.cost), 0);
    const lowStock = activeSKUs.filter(s => s.stock > 0 && s.stock <= s.reorderPoint).length;
    const outOfStock = activeSKUs.filter(s => s.stock <= 0).length;

    return {
      activeProducts,
      totalSKUs: activeSKUs.length,
      totalOnHand,
      totalValue,
      lowStock,
      outOfStock
    };
  }, [products, skus]);

  // Fetch recent transactions and sales data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Recent transactions
        const recentQuery = query(
          collection(db, COLLECTIONS.TRANSACTIONS),
          orderBy('transactionDate', 'desc'),
          limit(10)
        );
        const recentSnapshot = await getDocs(recentQuery);
        const transactions = recentSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          transactionDate: doc.data().transactionDate?.toDate() || new Date(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        } as InventoryTransaction));
        setRecentTransactions(transactions);

        // Today's revenue
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const todayQuery = query(
          collection(db, COLLECTIONS.TRANSACTIONS),
          where('direction', '==', 'OUT'),
          where('transactionDate', '>=', Timestamp.fromDate(todayStart)),
          where('transactionDate', '<=', Timestamp.fromDate(todayEnd))
        );
        const todaySnapshot = await getDocs(todayQuery);
        const todayTotal = todaySnapshot.docs.reduce(
          (sum, doc) => sum + (doc.data().totalAmount || 0), 
          0
        );
        setTodayRevenue(todayTotal);

        // Last 7 days sales
        const salesByDay: { [key: string]: { revenue: number; count: number } } = {};
        for (let i = 6; i >= 0; i--) {
          const date = format(subDays(new Date(), i), 'EEE');
          salesByDay[date] = { revenue: 0, count: 0 };
        }

        const weekStart = startOfDay(subDays(new Date(), 6));
        const weekQuery = query(
          collection(db, COLLECTIONS.TRANSACTIONS),
          where('direction', '==', 'OUT'),
          where('transactionDate', '>=', Timestamp.fromDate(weekStart))
        );
        const weekSnapshot = await getDocs(weekQuery);
        weekSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const date = format(data.transactionDate?.toDate() || new Date(), 'EEE');
          if (salesByDay[date]) {
            salesByDay[date].revenue += data.totalAmount || 0;
            salesByDay[date].count += 1;
          }
        });

        setSalesData(
          Object.entries(salesByDay).map(([date, data]) => ({
            date,
            ...data
          }))
        );
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (dataLoading || loading) {
    return (
      <MainLayout title="Dashboard">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="Products"
            value={stats.activeProducts}
            icon={Package}
            description="Active products"
          />
          <StatCard
            title="SKUs"
            value={stats.totalSKUs}
            icon={Boxes}
            description="Active variants"
          />
          <StatCard
            title="On Hand"
            value={stats.totalOnHand.toLocaleString()}
            icon={ShoppingCart}
            description="Total units"
          />
          <StatCard
            title="Inventory Value"
            value={formatCurrency(stats.totalValue)}
            icon={DollarSign}
            description="At cost"
          />
          <StatCard
            title="Low Stock"
            value={stats.lowStock}
            icon={AlertTriangle}
            iconClassName={stats.lowStock > 0 ? "text-yellow-500" : ""}
            description="Need restocking"
          />
          <StatCard
            title="Today's Revenue"
            value={formatCurrency(todayRevenue)}
            icon={TrendingUp}
            iconClassName="text-green-500"
            description="Sales today"
          />
        </div>

        {/* Charts and Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SalesChart data={salesData} />
          <QuickActions />
        </div>

        {/* Alerts and Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <LowStockAlerts skus={skus} />
          <RecentActivity transactions={recentTransactions} />
        </div>
      </div>
    </MainLayout>
  );
}

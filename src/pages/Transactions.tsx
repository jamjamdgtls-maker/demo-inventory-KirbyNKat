import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Download, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Settings2,
  Calendar 
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { InventoryTransaction } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function Transactions() {
  const { 
    getReasonCategoryById, 
    getPlatformById,
    getSupplierById,
    formatCurrency,
    loading: dataLoading 
  } = useData();

  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [directionFilter, setDirectionFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        let q = query(
          collection(db, COLLECTIONS.TRANSACTIONS),
          where('transactionDate', '>=', Timestamp.fromDate(startOfDay(new Date(dateFrom)))),
          where('transactionDate', '<=', Timestamp.fromDate(endOfDay(new Date(dateTo)))),
          orderBy('transactionDate', 'desc')
        );

        const snapshot = await getDocs(q);
        const txs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          transactionDate: doc.data().transactionDate?.toDate() || new Date(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        } as InventoryTransaction));

        setTransactions(txs);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [dateFrom, dateTo]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesDirection = directionFilter === 'all' || tx.direction === directionFilter;
      const matchesSearch = !search || 
        tx.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
        tx.notes?.toLowerCase().includes(search.toLowerCase()) ||
        tx.lineItems.some(item => 
          item.skuCode.toLowerCase().includes(search.toLowerCase()) ||
          item.productName.toLowerCase().includes(search.toLowerCase())
        );
      return matchesDirection && matchesSearch;
    });
  }, [transactions, directionFilter, search]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalIn = filteredTransactions
      .filter(tx => tx.direction === 'IN')
      .reduce((sum, tx) => sum + tx.totalQuantity, 0);
    
    const totalOut = filteredTransactions
      .filter(tx => tx.direction === 'OUT')
      .reduce((sum, tx) => sum + tx.totalQuantity, 0);
    
    const totalRevenue = filteredTransactions
      .filter(tx => tx.direction === 'OUT')
      .reduce((sum, tx) => sum + tx.totalAmount, 0);

    return {
      total: filteredTransactions.length,
      totalIn,
      totalOut,
      netMovement: totalIn - totalOut,
      totalRevenue
    };
  }, [filteredTransactions]);

  const setQuickRange = (days: number) => {
    setDateTo(format(new Date(), 'yyyy-MM-dd'));
    setDateFrom(format(subDays(new Date(), days), 'yyyy-MM-dd'));
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

  const exportCSV = () => {
    const headers = ['Date', 'Direction', 'SKU', 'Product', 'Qty', 'Amount', 'Platform', 'Supplier', 'Reason', 'Reference', 'User', 'Notes'];
    const rows: string[][] = [];

    filteredTransactions.forEach(tx => {
      const reason = getReasonCategoryById(tx.reasonCategoryId);
      const platform = tx.platformId ? getPlatformById(tx.platformId) : null;
      const supplier = tx.supplierId ? getSupplierById(tx.supplierId) : null;

      tx.lineItems.forEach(item => {
        rows.push([
          format(tx.transactionDate, 'yyyy-MM-dd HH:mm'),
          tx.direction,
          item.skuCode,
          item.productName,
          String(item.quantity),
          String(item.totalPrice),
          platform?.name || '',
          supplier?.name || '',
          reason?.name || '',
          tx.referenceNumber || '',
          tx.createdByName,
          tx.notes || ''
        ]);
      });
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${dateFrom}_to_${dateTo}.csv`;
    a.click();
  };

  if (dataLoading || loading) {
    return (
      <MainLayout title="Transaction History">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Transaction History">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <StatCard title="Transactions" value={stats.total} icon={Calendar} />
          <StatCard title="Total IN" value={stats.totalIn} icon={ArrowDownToLine} iconClassName="text-green-500" />
          <StatCard title="Total OUT" value={stats.totalOut} icon={ArrowUpFromLine} iconClassName="text-red-500" />
          <StatCard 
            title="Net Movement" 
            value={stats.netMovement > 0 ? `+${stats.netMovement}` : stats.netMovement} 
            icon={Settings2}
            iconClassName={stats.netMovement >= 0 ? "text-green-500" : "text-red-500"}
          />
          <StatCard title="Revenue" value={formatCurrency(stats.totalRevenue)} icon={ArrowUpFromLine} />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuickRange(0)}
                >
                  Today
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuickRange(7)}
                >
                  Last 7 Days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuickRange(30)}
                >
                  Last 30 Days
                </Button>
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex gap-2">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">From</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">To</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
                
                <Select value={directionFilter} onValueChange={setDirectionFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="IN">IN</SelectItem>
                    <SelectItem value="OUT">OUT</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search ref, notes, SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Button variant="outline" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Platform / Supplier</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <p className="text-muted-foreground">No transactions found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map(tx => {
                    const reason = getReasonCategoryById(tx.reasonCategoryId);
                    const platform = tx.platformId ? getPlatformById(tx.platformId) : null;
                    const supplier = tx.supplierId ? getSupplierById(tx.supplierId) : null;
                    
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{format(tx.transactionDate, 'MMM dd, yyyy')}</p>
                            <p className="text-xs text-muted-foreground">{format(tx.transactionDate, 'HH:mm')}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getDirectionBadge(tx.direction)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            {tx.lineItems.slice(0, 2).map((item, i) => (
                              <p key={i} className="text-sm truncate">
                                {item.productName} ({item.skuCode})
                              </p>
                            ))}
                            {tx.lineItems.length > 2 && (
                              <p className="text-xs text-muted-foreground">
                                +{tx.lineItems.length - 2} more
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={cn(
                            tx.direction === 'IN' ? 'text-green-600' : 
                            tx.direction === 'OUT' ? 'text-red-600' : ''
                          )}>
                            {tx.direction === 'IN' ? '+' : tx.direction === 'OUT' ? '-' : ''}
                            {tx.totalQuantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.direction === 'OUT' && (
                            <span className="font-medium text-green-600">
                              {formatCurrency(tx.totalAmount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {platform?.name || supplier?.name || '-'}
                        </TableCell>
                        <TableCell>{reason?.name || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {tx.referenceNumber || '-'}
                        </TableCell>
                        <TableCell>{tx.createdByName}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

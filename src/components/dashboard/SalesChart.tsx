import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { useMemo } from 'react';

interface SalesChartProps {
  data: { date: string; revenue: number; count: number }[];
  className?: string;
}

export function SalesChart({ data, className }: SalesChartProps) {
  const { formatCurrency } = useData();

  const maxRevenue = useMemo(() => {
    return Math.max(...data.map(d => d.revenue), 1);
  }, [data]);

  const totalRevenue = useMemo(() => {
    return data.reduce((sum, d) => sum + d.revenue, 0);
  }, [data]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
        <CardDescription>Last 7 days • Total: {formatCurrency(totalRevenue)}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No sales data available
          </p>
        ) : (
          <div className="flex items-end justify-between gap-2 h-32">
            {data.map((day, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-1">
                <div className="relative w-full flex justify-center">
                  <div 
                    className="w-8 max-w-full bg-primary rounded-t transition-all duration-300 hover:bg-primary/80"
                    style={{ 
                      height: `${Math.max((day.revenue / maxRevenue) * 100, 4)}px`,
                      minHeight: '4px'
                    }}
                    title={`${formatCurrency(day.revenue)} (${day.count} orders)`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {day.date}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

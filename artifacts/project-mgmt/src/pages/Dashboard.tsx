import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetAgingAnalysis, getGetAgingAnalysisQueryKey, useGetMonthlyStats, getGetMonthlyStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWanYuan } from "@/lib/format";
import { AlertCircle, ArrowUpRight, CheckCircle2, Clock, FileText, Banknote, Receipt, Wrench, CloudRain } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  
  const { data: agingData } = useGetAgingAnalysis({
    query: { queryKey: getGetAgingAnalysisQueryKey() }
  });

  const { data: monthlyStats } = useGetMonthlyStats(undefined, {
    query: { queryKey: getGetMonthlyStatsQueryKey() }
  });

  const chartData = [
    { name: '未到期', value: agingData?.current || 0 },
    { name: '30天内', value: agingData?.days30 || 0 },
    { name: '31-60天', value: agingData?.days60 || 0 },
    { name: '61-90天', value: agingData?.days90 || 0 },
    { name: '90天以上', value: agingData?.over90 || 0 },
  ];

  const monthlyChartData = monthlyStats?.map(stat => ({
    name: `${stat.year}-${String(stat.month).padStart(2, '0')}`,
    回款: stat.payments / 10000,
    开票: stat.invoiced / 10000,
    应收: stat.receivables / 10000
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">全局概览</h1>
      </div>
      {isLoadingSummary ? (
        <div className="text-muted-foreground">加载中...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">合同总额</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatWanYuan(summary?.totalContractValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">本年: {formatWanYuan(summary?.currentYearContractValue)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">累计回款</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatWanYuan(summary?.totalPaymentsReceived)}</div>
                <p className="text-xs text-muted-foreground mt-1">本年: {formatWanYuan(summary?.currentYearPayments)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">开票总额</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatWanYuan(summary?.totalInvoiced)}</div>
                <p className="text-xs text-muted-foreground mt-1">剩余未开票: {formatWanYuan((summary?.totalContractValue || 0) - (summary?.totalInvoiced || 0))}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">应收余额</CardTitle>
                <Clock className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatWanYuan(summary?.totalOutstanding)}</div>
                <p className="text-xs text-muted-foreground mt-1">逾期笔数: {summary?.overdueCount} 笔</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold">年度财务趋势 (万元)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(2)} 万`} />
                    <Legend />
                    <Area type="monotone" dataKey="回款" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorPayments)" />
                    <Area type="monotone" dataKey="开票" stroke="hsl(var(--chart-3))" fillOpacity={1} fill="url(#colorInvoiced)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">账龄分析 (万元)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                    <YAxis fontSize={12} tickFormatter={(val) => (val/10000).toFixed(0)} />
                    <Tooltip formatter={(value) => `${(Number(value)/10000).toFixed(2)} 万`} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-chart-4" /> 数值天气服务预警
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <span className="text-sm">即将到期服务</span>
                  <span className="font-bold text-chart-4">{summary?.weatherServicesExpiringSoon} 项</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-chart-5" /> 开工申请异常
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <span className="text-sm">无合同开工</span>
                  <span className="font-bold text-destructive">{summary?.workOrdersWithoutContract} 项</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" /> 预警动态
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[200px] overflow-y-auto">
                  {summary?.recentAlerts?.length ? (
                    summary.recentAlerts.map((alert, i) => (
                      <div key={i} className="p-3 text-sm border-b border-border flex gap-3">
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{alert.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-center text-muted-foreground">暂无预警信息</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

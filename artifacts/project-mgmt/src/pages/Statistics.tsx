import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Search, RefreshCw, TrendingUp, ArrowDown, ArrowUp } from "lucide-react";
import { formatWanYuan, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useStats<T>(path: string, params: Record<string, string>, deps: unknown[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v)).toString();
      const res = await fetch(`${BASE}/api/stats/${path}?${qs}`);
      const json = await res.json();
      setData(json);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, deps);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];
const fmt = (v: number) => formatWanYuan(v);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

type StatRow = Record<string, unknown>;

/* ─── Sub-components ─────────────────────────────── */
function StatTable({ rows, cols }: { rows: StatRow[]; cols: { key: string; label: string; right?: boolean; format?: (v: unknown) => string }[] }) {
  if (!rows.length) return <p className="text-center py-8 text-muted-foreground text-sm">暂无数据</p>;
  return (
    <div className="overflow-auto rounded border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            {cols.map(c => <TableHead key={c.key} className={c.right ? "text-right" : ""}>{c.label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} className="hover:bg-muted/30">
              {cols.map(c => (
                <TableCell key={c.key} className={c.right ? "text-right font-medium" : ""}>
                  {c.format ? c.format(row[c.key]) : String(row[c.key] ?? "-")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GroupBySelector({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm whitespace-nowrap">分组维度</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function YearSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value || "all"} onValueChange={v => onChange(v === "all" ? "" : v)}>
      <SelectTrigger className="w-[110px] h-8"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部年份</SelectItem>
        {[2026,2025,2024,2023,2022].map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/* ─── Main Component ─────────────────────────────── */
export default function Statistics() {
  const [activeTab, setActiveTab] = useState("annual");

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">统计分析</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 flex-wrap h-auto gap-1">
          <TabsTrigger value="annual">年度综合</TabsTrigger>
          <TabsTrigger value="contracts">合同分析</TabsTrigger>
          <TabsTrigger value="payments">回款分析</TabsTrigger>
          <TabsTrigger value="invoices">开票分析</TabsTrigger>
          <TabsTrigger value="receivables">应收分析</TabsTrigger>
          <TabsTrigger value="weather">数值天气到期</TabsTrigger>
          <TabsTrigger value="managers">销售经理排行</TabsTrigger>
          <TabsTrigger value="contract-track">合同回款追踪</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto pt-4">
          <TabsContent value="annual" className="mt-0 h-full"><AnnualTab /></TabsContent>
          <TabsContent value="contracts" className="mt-0 h-full"><ContractsTab /></TabsContent>
          <TabsContent value="payments" className="mt-0 h-full"><PaymentsTab /></TabsContent>
          <TabsContent value="invoices" className="mt-0 h-full"><InvoicesTab /></TabsContent>
          <TabsContent value="receivables" className="mt-0 h-full"><ReceivablesTab /></TabsContent>
          <TabsContent value="weather" className="mt-0 h-full"><WeatherTab /></TabsContent>
          <TabsContent value="managers" className="mt-0 h-full"><ManagersTab /></TabsContent>
          <TabsContent value="contract-track" className="mt-0 h-full"><ContractTrackTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/* ─── 年度综合 ────────────────────────────────────── */
function AnnualTab() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [manager, setManager] = useState("");

  const { data, loading } = useStats<any>("monthly-report", { year, salesManager: manager }, [year, manager]);

  const totals = useMemo(() => ({
    payments: data.reduce((s, r) => s + r.totalPayments, 0),
    invoiced: data.reduce((s, r) => s + r.totalInvoiced, 0),
    receivable: data.reduce((s, r) => s + r.totalReceivable, 0),
    contracts: data.reduce((s, r) => s + r.totalContracts, 0),
  }), [data]);

  const handleExport = () => {
    exportToCsv(`${year}年月度综合`, data, [
      { header: "月份", accessor: r => r.month },
      { header: "回款额(万)", accessor: r => (r.totalPayments / 10000).toFixed(2) },
      { header: "回款笔数", accessor: r => r.paymentCount },
      { header: "开票额(万)", accessor: r => (r.totalInvoiced / 10000).toFixed(2) },
      { header: "应收额(万)", accessor: r => (r.totalReceivable / 10000).toFixed(2) },
      { header: "新签合同(万)", accessor: r => (r.totalContracts / 10000).toFixed(2) },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Label className="text-sm">年份</Label>
        <YearSelector value={year} onChange={setYear} />
        <div className="flex items-center gap-2">
          <Label className="text-sm">销售经理</Label>
          <Input className="h-8 w-36" value={manager} onChange={e => setManager(e.target.value)} placeholder="全部" />
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1.5" />导出月度报表</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "年度回款", value: formatWanYuan(totals.payments) },
          { label: "年度开票", value: formatWanYuan(totals.invoiced) },
          { label: "年度应收", value: formatWanYuan(totals.receivable) },
          { label: "年度新签合同", value: formatWanYuan(totals.contracts) },
        ].map(s => (
          <div key={s.label} className="bg-card border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-lg font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-lg p-4">
        <p className="text-sm font-medium mb-3">{year}年 月度趋势（万元）</p>
        {loading ? <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">加载中...</div> : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `${(v/10000).toFixed(0)}万`} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => formatWanYuan(v)} />
              <Legend />
              <Line type="monotone" dataKey="totalPayments" name="回款" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="totalInvoiced" name="开票" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="totalContracts" name="新签合同" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <StatTable rows={data} cols={[
        { key: "month", label: "月份" },
        { key: "totalPayments", label: "回款额", right: true, format: v => formatWanYuan(v as number) },
        { key: "paymentCount", label: "回款笔数", right: true },
        { key: "totalInvoiced", label: "开票额", right: true, format: v => formatWanYuan(v as number) },
        { key: "invoiceCount", label: "开票张数", right: true },
        { key: "totalReceivable", label: "应收额", right: true, format: v => formatWanYuan(v as number) },
        { key: "overdueReceivable", label: "逾期应收", right: true, format: v => formatWanYuan(v as number) },
        { key: "totalContracts", label: "新签合同", right: true, format: v => formatWanYuan(v as number) },
        { key: "contractCount", label: "合同数", right: true },
      ]} />
    </div>
  );
}

/* ─── 合同分析 ────────────────────────────────────── */
function ContractsTab() {
  const [groupBy, setGroupBy] = useState("year");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [province, setProvince] = useState("");
  const [salesManager, setSalesManager] = useState("");

  const { data, loading, refetch } = useStats<any>("contracts", { groupBy, startDate, endDate, province, salesManager }, [groupBy, startDate, endDate, province, salesManager]);

  const totalWithTax = useMemo(() => data.reduce((s: number, r: any) => s + r.totalWithTax, 0), [data]);
  const totalWithoutTax = useMemo(() => data.reduce((s: number, r: any) => s + r.totalWithoutTax, 0), [data]);

  const handleExport = () => {
    exportToCsv("合同统计", data, [
      { header: "维度", accessor: r => r.label },
      { header: "合同数", accessor: r => r.count },
      { header: "含税总额(万)", accessor: r => (r.totalWithTax / 10000).toFixed(2) },
      { header: "不含税总额(万)", accessor: r => (r.totalWithoutTax / 10000).toFixed(2) },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <GroupBySelector value={groupBy} onChange={setGroupBy} options={[
          { value: "year", label: "按年度" },
          { value: "quarter", label: "按季度" },
          { value: "month", label: "按月份" },
          { value: "province", label: "按省份" },
          { value: "manager", label: "按销售经理" },
          { value: "type", label: "按合同类型" },
          { value: "product", label: "按产品类型" },
          { value: "status", label: "按状态" },
        ]} />
        <Input placeholder="省份" className="h-8 w-24" value={province} onChange={e => setProvince(e.target.value)} />
        <Input placeholder="销售经理" className="h-8 w-28" value={salesManager} onChange={e => setSalesManager(e.target.value)} />
        <Input type="date" className="h-8 w-36" value={startDate} onChange={e => setStartDate(e.target.value)} title="开始日期" />
        <span className="text-muted-foreground text-sm">至</span>
        <Input type="date" className="h-8 w-36" value={endDate} onChange={e => setEndDate(e.target.value)} title="结束日期" />
        <Button variant="outline" size="sm" className="h-8" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1.5" />导出</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">含税合同总额</p>
          <p className="text-lg font-bold">{formatWanYuan(totalWithTax)}</p>
          <p className="text-xs text-muted-foreground">共 {data.length} 个分组</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">不含税合同总额</p>
          <p className="text-lg font-bold">{formatWanYuan(totalWithoutTax)}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">合同笔数</p>
          <p className="text-lg font-bold">{data.reduce((s: number, r: any) => s + r.count, 0)}</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4">
        {loading ? <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">加载中...</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
              <YAxis tickFormatter={v => `${(v/10000).toFixed(0)}万`} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => formatWanYuan(v)} />
              <Legend />
              <Bar dataKey="totalWithTax" name="含税额" fill="#3b82f6" radius={[3,3,0,0]} />
              <Bar dataKey="totalWithoutTax" name="不含税额" fill="#10b981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <StatTable rows={data} cols={[
        { key: "label", label: "维度" },
        { key: "count", label: "合同数", right: true },
        { key: "totalWithTax", label: "含税总额", right: true, format: v => formatWanYuan(v as number) },
        { key: "totalWithoutTax", label: "不含税总额", right: true, format: v => formatWanYuan(v as number) },
        { key: "avgWithTax", label: "平均含税额", right: true, format: v => formatWanYuan(v as number) },
      ]} />
    </div>
  );
}

/* ─── 回款分析 ────────────────────────────────────── */
function PaymentsTab() {
  const [groupBy, setGroupBy] = useState("year");
  const [year, setYear] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [province, setProvince] = useState("");
  const [salesManager, setSalesManager] = useState("");
  const [payer, setPayer] = useState("");

  const { data, loading } = useStats<any>("payments", { groupBy, year, startDate, endDate, province, salesManager, payer }, [groupBy, year, startDate, endDate, province, salesManager, payer]);

  const grandTotal = useMemo(() => data.reduce((s: number, r: any) => s + r.total, 0), [data]);
  const totalCount = useMemo(() => data.reduce((s: number, r: any) => s + r.count, 0), [data]);

  const handleExport = () => {
    exportToCsv("回款统计", data, [
      { header: "维度", accessor: r => r.label },
      { header: "笔数", accessor: r => r.count },
      { header: "回款总额(万)", accessor: r => (r.total / 10000).toFixed(2) },
      { header: "平均额(万)", accessor: r => (r.avgAmount / 10000).toFixed(2) },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <GroupBySelector value={groupBy} onChange={setGroupBy} options={[
          { value: "year", label: "按年度" },
          { value: "quarter", label: "按季度" },
          { value: "month", label: "按月份" },
          { value: "manager", label: "按销售经理" },
          { value: "province", label: "按省份" },
          { value: "payer", label: "按付款单位" },
          { value: "contract", label: "按合同号" },
        ]} />
        <YearSelector value={year} onChange={setYear} />
        <Input placeholder="省份" className="h-8 w-24" value={province} onChange={e => setProvince(e.target.value)} />
        <Input placeholder="销售经理" className="h-8 w-28" value={salesManager} onChange={e => setSalesManager(e.target.value)} />
        <Input placeholder="付款单位" className="h-8 w-32" value={payer} onChange={e => setPayer(e.target.value)} />
        <Input type="date" className="h-8 w-36" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <span className="text-muted-foreground text-sm">至</span>
        <Input type="date" className="h-8 w-36" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <Button variant="outline" size="sm" className="h-8" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1.5" />导出</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">回款总额</p>
          <p className="text-lg font-bold text-emerald-600">{formatWanYuan(grandTotal)}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">回款笔数</p>
          <p className="text-lg font-bold">{totalCount}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">平均每笔</p>
          <p className="text-lg font-bold">{totalCount > 0 ? formatWanYuan(grandTotal / totalCount) : "-"}</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4">
        {loading ? <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">加载中...</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
              <YAxis tickFormatter={v => `${(v/10000).toFixed(0)}万`} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => formatWanYuan(v)} />
              <Bar dataKey="total" name="回款额" fill="#10b981" radius={[3,3,0,0]}>
                {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <StatTable rows={data} cols={[
        { key: "label", label: "维度" },
        { key: "count", label: "笔数", right: true },
        { key: "total", label: "回款总额", right: true, format: v => formatWanYuan(v as number) },
        { key: "avgAmount", label: "平均额", right: true, format: v => formatWanYuan(v as number) },
        { key: "maxAmount", label: "最大单笔", right: true, format: v => formatWanYuan(v as number) },
      ]} />
    </div>
  );
}

/* ─── 开票分析 ────────────────────────────────────── */
function InvoicesTab() {
  const [groupBy, setGroupBy] = useState("month");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [province, setProvince] = useState("");
  const [salesManager, setSalesManager] = useState("");

  const { data, loading } = useStats<any>("invoices", { groupBy, year, startDate, endDate, province, salesManager }, [groupBy, year, startDate, endDate, province, salesManager]);

  const totalWithTax = useMemo(() => data.reduce((s: number, r: any) => s + r.totalWithTax, 0), [data]);
  const totalWithoutTax = useMemo(() => data.reduce((s: number, r: any) => s + r.totalWithoutTax, 0), [data]);
  const totalOutstanding = useMemo(() => data.reduce((s: number, r: any) => s + r.totalOutstanding, 0), [data]);

  const handleExport = () => {
    exportToCsv("开票统计", data, [
      { header: "维度", accessor: r => r.label },
      { header: "张数", accessor: r => r.count },
      { header: "含税开票额(万)", accessor: r => (r.totalWithTax / 10000).toFixed(2) },
      { header: "不含税开票额(万)", accessor: r => (r.totalWithoutTax / 10000).toFixed(2) },
      { header: "应收未回款(万)", accessor: r => (r.totalOutstanding / 10000).toFixed(2) },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <GroupBySelector value={groupBy} onChange={setGroupBy} options={[
          { value: "year", label: "按年度" },
          { value: "quarter", label: "按季度" },
          { value: "month", label: "按月份" },
          { value: "province", label: "按省份" },
          { value: "manager", label: "按销售经理" },
          { value: "status", label: "按状态" },
        ]} />
        <YearSelector value={year} onChange={setYear} />
        <Input placeholder="省份" className="h-8 w-24" value={province} onChange={e => setProvince(e.target.value)} />
        <Input placeholder="销售经理" className="h-8 w-28" value={salesManager} onChange={e => setSalesManager(e.target.value)} />
        <Input type="date" className="h-8 w-36" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <span className="text-muted-foreground text-sm">至</span>
        <Input type="date" className="h-8 w-36" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <Button variant="outline" size="sm" className="h-8" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1.5" />导出</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">含税开票总额</p>
          <p className="text-lg font-bold">{formatWanYuan(totalWithTax)}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">不含税开票总额</p>
          <p className="text-lg font-bold">{formatWanYuan(totalWithoutTax)}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">待回款总额（应收）</p>
          <p className="text-lg font-bold text-amber-600">{formatWanYuan(totalOutstanding)}</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4">
        {loading ? <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">加载中...</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
              <YAxis tickFormatter={v => `${(v/10000).toFixed(0)}万`} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => formatWanYuan(v)} />
              <Legend />
              <Bar dataKey="totalWithTax" name="含税开票额" fill="#3b82f6" radius={[3,3,0,0]} />
              <Bar dataKey="totalOutstanding" name="应收未回款" fill="#f59e0b" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <StatTable rows={data} cols={[
        { key: "label", label: "维度" },
        { key: "count", label: "张数", right: true },
        { key: "totalWithTax", label: "含税开票额", right: true, format: v => formatWanYuan(v as number) },
        { key: "totalWithoutTax", label: "不含税开票额", right: true, format: v => formatWanYuan(v as number) },
        { key: "totalOutstanding", label: "应收未回款", right: true, format: v => formatWanYuan(v as number) },
      ]} />
    </div>
  );
}

/* ─── 应收分析 ────────────────────────────────────── */
function ReceivablesTab() {
  const [groupBy, setGroupBy] = useState("aging");
  const [province, setProvince] = useState("");
  const [salesManager, setSalesManager] = useState("");
  const [year, setYear] = useState("");

  const { data, loading } = useStats<any>("receivables", { groupBy, province, salesManager, year }, [groupBy, province, salesManager, year]);

  const grandTotal = useMemo(() => data.reduce((s: number, r: any) => s + r.total, 0), [data]);
  const totalPending = useMemo(() => data.reduce((s: number, r: any) => s + r.pending, 0), [data]);
  const totalBad = useMemo(() => data.reduce((s: number, r: any) => s + r.badDebt, 0), [data]);

  const handleExport = () => {
    exportToCsv("应收分析", data, [
      { header: "维度", accessor: r => r.label },
      { header: "笔数", accessor: r => r.count },
      { header: "应收总额(万)", accessor: r => (r.total / 10000).toFixed(2) },
      { header: "待收(万)", accessor: r => (r.pending / 10000).toFixed(2) },
      { header: "坏账(万)", accessor: r => (r.badDebt / 10000).toFixed(2) },
    ]);
  };

  const AGING_ORDER = ["未到期","1-30天","31-60天","61-90天","90天以上","已回款"];
  const sortedData = useMemo(() => {
    if (groupBy !== "aging") return data;
    return [...data].sort((a: any, b: any) => AGING_ORDER.indexOf(a.label) - AGING_ORDER.indexOf(b.label));
  }, [data, groupBy]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <GroupBySelector value={groupBy} onChange={setGroupBy} options={[
          { value: "aging", label: "账龄分析" },
          { value: "status", label: "按状态" },
          { value: "province", label: "按省份" },
          { value: "manager", label: "按销售经理" },
          { value: "type", label: "按收款类型" },
          { value: "month", label: "按月份" },
        ]} />
        <YearSelector value={year} onChange={setYear} />
        <Input placeholder="省份" className="h-8 w-24" value={province} onChange={e => setProvince(e.target.value)} />
        <Input placeholder="销售经理" className="h-8 w-28" value={salesManager} onChange={e => setSalesManager(e.target.value)} />
        <Button variant="outline" size="sm" className="h-8" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1.5" />导出</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">应收总额</p>
          <p className="text-lg font-bold">{formatWanYuan(grandTotal)}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">待回款</p>
          <p className="text-lg font-bold text-amber-600">{formatWanYuan(totalPending)}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">坏账金额</p>
          <p className="text-lg font-bold text-destructive">{formatWanYuan(totalBad)}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">已回款</p>
          <p className="text-lg font-bold text-emerald-600">{formatWanYuan(grandTotal - totalPending)}</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-card border rounded-lg p-4">
          {loading ? <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">加载中...</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sortedData} margin={{ top: 5, right: 20, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                <YAxis tickFormatter={v => `${(v/10000).toFixed(0)}万`} tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v: number) => formatWanYuan(v)} />
                <Legend />
                <Bar dataKey="total" name="应收总额" fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="pending" name="待回款" fill="#f59e0b" radius={[3,3,0,0]} />
                <Bar dataKey="badDebt" name="坏账" fill="#ef4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="col-span-2 bg-card border rounded-lg p-4">
          <p className="text-sm font-medium mb-2">应收结构</p>
          {loading ? <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">加载中...</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sortedData} dataKey="total" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={({ label, percent }: any) => `${label} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {sortedData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatWanYuan(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <StatTable rows={sortedData} cols={[
        { key: "label", label: "维度" },
        { key: "count", label: "笔数", right: true },
        { key: "total", label: "应收总额", right: true, format: v => formatWanYuan(v as number) },
        { key: "pending", label: "待回款", right: true, format: v => formatWanYuan(v as number) },
        { key: "badDebt", label: "坏账", right: true, format: v => formatWanYuan(v as number) },
      ]} />
    </div>
  );
}

/* ─── 数值天气到期 ─────────────────────────────────── */
function WeatherTab() {
  const [groupBy, setGroupBy] = useState("alert");
  const [province, setProvince] = useState("");

  const { data, loading } = useStats<any>("weather", { groupBy, province }, [groupBy, province]);

  const handleExport = () => {
    exportToCsv("数值天气到期分析", data, [
      { header: "维度", accessor: r => r.label },
      { header: "场站数", accessor: r => r.count },
      { header: "服务中", accessor: r => r.activeCount },
    ]);
  };

  const ALERT_SORT = ["已过期","1个月内","2个月内","3个月内","正常","无截止日期"];
  const ALERT_COLORS_MAP: Record<string, string> = {
    "已过期": "bg-red-500 text-white",
    "1个月内": "bg-orange-500 text-white",
    "2个月内": "bg-yellow-500 text-white",
    "3个月内": "bg-blue-500 text-white",
    "正常": "bg-green-500 text-white",
    "无截止日期": "bg-muted",
  };

  const sortedData = useMemo(() => {
    if (groupBy !== "alert") return data;
    return [...data].sort((a: any, b: any) => ALERT_SORT.indexOf(a.label) - ALERT_SORT.indexOf(b.label));
  }, [data, groupBy]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <GroupBySelector value={groupBy} onChange={setGroupBy} options={[
          { value: "alert", label: "按预警级别" },
          { value: "province", label: "按省份" },
          { value: "status", label: "按状态" },
        ]} />
        <Input placeholder="省份" className="h-8 w-24" value={province} onChange={e => setProvince(e.target.value)} />
        <Button variant="outline" size="sm" className="h-8" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1.5" />导出</Button>
      </div>

      {groupBy === "alert" && (
        <div className="flex flex-wrap gap-3">
          {sortedData.map((r: any) => (
            <div key={r.label} className="bg-card border rounded-lg p-4 flex items-center gap-3 min-w-[160px]">
              <Badge className={`${ALERT_COLORS_MAP[r.label] ?? "bg-muted"} font-normal`}>{r.label}</Badge>
              <div>
                <p className="text-xl font-bold">{r.count}</p>
                <p className="text-xs text-muted-foreground">服务中 {r.activeCount}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border rounded-lg p-4">
        {loading ? <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">加载中...</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sortedData} margin={{ top: 5, right: 20, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="场站总数" fill="#3b82f6" radius={[3,3,0,0]} />
              <Bar dataKey="activeCount" name="服务中" fill="#10b981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <StatTable rows={sortedData} cols={[
        { key: "label", label: "维度" },
        { key: "count", label: "场站数", right: true },
        { key: "activeCount", label: "服务中", right: true },
      ]} />
    </div>
  );
}

/* ─── 销售经理排行 ─────────────────────────────────── */
function ManagersTab() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const { data, loading } = useStats<any>("manager-ranking", { year }, [year]);

  const handleExport = () => {
    exportToCsv("销售经理排行", data, [
      { header: "销售经理", accessor: r => r.manager },
      { header: "回款总额(万)", accessor: r => (r.totalPayments / 10000).toFixed(2) },
      { header: "回款笔数", accessor: r => r.paymentCount },
      { header: "合同总额(万)", accessor: r => (r.totalContracts / 10000).toFixed(2) },
      { header: "合同数", accessor: r => r.contractCount },
    ]);
  };

  const maxPayment = useMemo(() => Math.max(...data.map((r: any) => r.totalPayments), 1), [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm">年份</Label>
        <YearSelector value={year} onChange={setYear} />
        <Button variant="outline" size="sm" className="h-8" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1.5" />导出</Button>
      </div>

      <div className="bg-card border rounded-lg p-4">
        {loading ? <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">加载中...</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={v => `${(v/10000).toFixed(0)}万`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="manager" tick={{ fontSize: 12 }} width={60} />
              <Tooltip formatter={(v: number) => formatWanYuan(v)} />
              <Legend />
              <Bar dataKey="totalPayments" name="回款额" fill="#10b981" radius={[0,3,3,0]} />
              <Bar dataKey="totalContracts" name="合同额" fill="#3b82f6" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="overflow-auto rounded border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-8">排名</TableHead>
              <TableHead>销售经理</TableHead>
              <TableHead className="text-right">回款总额</TableHead>
              <TableHead className="text-right">回款笔数</TableHead>
              <TableHead className="text-right">合同总额</TableHead>
              <TableHead className="text-right">合同数</TableHead>
              <TableHead>回款占比</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r: any, i: number) => (
              <TableRow key={r.manager} className="hover:bg-muted/30">
                <TableCell>
                  {i === 0 ? <Badge className="bg-yellow-500 text-white">1</Badge> :
                   i === 1 ? <Badge className="bg-gray-400 text-white">2</Badge> :
                   i === 2 ? <Badge className="bg-amber-600 text-white">3</Badge> :
                   <span className="text-muted-foreground text-sm">{i + 1}</span>}
                </TableCell>
                <TableCell className="font-medium">{r.manager}</TableCell>
                <TableCell className="text-right font-medium text-emerald-600">{formatWanYuan(r.totalPayments)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{r.paymentCount}</TableCell>
                <TableCell className="text-right font-medium">{formatWanYuan(r.totalContracts)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{r.contractCount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-1.5 max-w-[80px]">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (r.totalPayments / maxPayment) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{((r.totalPayments / maxPayment) * 100).toFixed(0)}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ─── 合同回款追踪 ─────────────────────────────────── */
function ContractTrackTab() {
  const [contractNo, setContractNo] = useState("");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/stats/contract-payments?contractNo=${encodeURIComponent(input.trim())}`);
      const data = await res.json();
      setResult(data);
      setContractNo(input.trim());
    } catch {
      setError("查询失败，请检查合同号");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!result?.payments) return;
    exportToCsv(`${contractNo}_回款记录`, result.payments, [
      { header: "回款日期", accessor: p => formatDate(p.paymentDate) },
      { header: "回款金额(万)", accessor: p => (p.amount / 10000).toFixed(2) },
      { header: "付款单位", accessor: p => p.payer },
      { header: "备注", accessor: p => p.notes ?? "" },
    ]);
  };

  const cumulativePaid = useMemo(() => {
    if (!result?.payments) return [];
    let cumulative = 0;
    return result.payments.map((p: any) => {
      cumulative += p.amount;
      return { ...p, cumulative, label: formatDate(p.paymentDate) };
    });
  }, [result]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">合同编号</Label>
        <div className="relative flex-1 max-w-sm">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="输入合同编号查询回款历史..."
            className="h-9 pr-10"
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button size="sm" onClick={handleSearch} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          查询
        </Button>
        {result?.payments?.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1.5" />导出</Button>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {result && (
        <div className="space-y-4">
          {result.contract ? (
            <div className="bg-card border rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">合同名称</p>
                <p className="font-medium">{result.contract.contractName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">客户</p>
                <p className="font-medium">{result.contract.customer}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">合同含税金额</p>
                <p className="font-bold text-lg">{formatWanYuan(result.contract.amountWithTax)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">状态</p>
                <Badge>{result.contract.status}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">已回款</p>
                <p className="font-bold text-lg text-emerald-600">{formatWanYuan(result.totalPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">待回款</p>
                <p className={`font-bold text-lg ${result.remaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>{formatWanYuan(result.remaining)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">回款进度</p>
                <div className="bg-muted rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, result.paymentRatio * 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{(result.paymentRatio * 100).toFixed(1)}% 已回款</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">未找到合同信息，仅显示回款记录</p>
          )}

          {result.payments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">该合同暂无回款记录</p>
          ) : (
            <>
              {cumulativePaid.length > 1 && (
                <div className="bg-card border rounded-lg p-4">
                  <p className="text-sm font-medium mb-3">累计回款趋势</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={cumulativePaid}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => `${(v/10000).toFixed(0)}万`} tick={{ fontSize: 11 }} width={60} />
                      <Tooltip formatter={(v: number) => formatWanYuan(v)} />
                      <Line type="monotone" dataKey="cumulative" name="累计回款" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="overflow-auto rounded border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>回款日期</TableHead>
                      <TableHead className="text-right">回款金额</TableHead>
                      <TableHead className="text-right">累计金额</TableHead>
                      <TableHead>付款单位</TableHead>
                      <TableHead>备注</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cumulativePaid.map((p: any, i: number) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell>{formatDate(p.paymentDate)}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">{formatWanYuan(p.amount)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatWanYuan(p.cumulative)}</TableCell>
                        <TableCell>{p.payer}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{p.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}

      {!result && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">输入合同编号查询该合同的完整回款历史</p>
          <p className="text-xs mt-1">可查看首笔至末笔的所有回款日期、金额及累计进度</p>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import {
  useListWeatherServices, getListWeatherServicesQueryKey,
  useCreateWeatherService, useUpdateWeatherService, useDeleteWeatherService,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, Trash2, Pencil, Upload, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomFieldDefs } from "@/hooks/use-custom-fields";
import { CustomFieldsManager } from "@/components/crud/CustomFieldsManager";
import { CustomFieldsSection } from "@/components/crud/CustomFieldsSection";
import { ImportDialog } from "@/components/crud/ImportDialog";

type WSItem = { id: number; contractNo: string | null; province: string; group: string; station: string; serviceStartDate: string | null; serviceEndDate: string | null; status: string; stoppedDate: string | null; notes: string | null; expiryAlertLevel: string | null; customFields: Record<string, unknown> | null };

const EMPTY = {
  contractNo: "", province: "", group: "", station: "", serviceStartDate: "", serviceEndDate: "",
  status: "服务中", stoppedDate: "", notes: "", customFields: {} as Record<string, unknown> | null,
};

const STATUSES = ["服务中", "已停止", "已到期"];
const ALERT_COLORS: Record<string, string> = {
  expired: "bg-red-500 text-white hover:bg-red-600",
  "1m": "bg-orange-500 text-white hover:bg-orange-600",
  "2m": "bg-yellow-500 text-white hover:bg-yellow-600",
  "3m": "bg-blue-500 text-white hover:bg-blue-600",
};
const ALERT_LABELS: Record<string, string> = {
  expired: "已过期", "1m": "1个月内过期", "2m": "2个月内过期", "3m": "3个月内过期",
};

export default function WeatherServices() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { defs, addDef, deleteDef } = useCustomFieldDefs("weather_services");

  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [alertFilter, setAlertFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<WSItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCF, setShowCF] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean | number>>({});

  const qp = {
    province: provinceFilter !== "all" ? provinceFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    expiryAlert: alertFilter !== "all" ? alertFilter : undefined,
  };
  const { data: services, isLoading } = useListWeatherServices(qp, { query: { queryKey: getListWeatherServicesQueryKey(qp) } });

  const filtered = useMemo(() => {
    if (!services) return [];
    if (!search) return services;
    return services.filter(s => s.province.includes(search) || s.station.includes(search) || (s.contractNo ?? "").includes(search) || s.group?.includes(search));
  }, [services, search]);

  const provinces = useMemo(() => [...new Set((services ?? []).map(s => s.province).filter(Boolean))].sort(), [services]);
  const expiredCount = useMemo(() => filtered.filter(s => s.expiryAlertLevel === "expired").length, [filtered]);
  const expiringCount = useMemo(() => filtered.filter(s => ["1m", "2m", "3m"].includes(s.expiryAlertLevel ?? "")).length, [filtered]);
  const activeCount = useMemo(() => filtered.filter(s => s.status === "服务中").length, [filtered]);

  useEffect(() => {
    if (editItem) {
      setForm({ contractNo: editItem.contractNo ?? "", province: editItem.province, group: editItem.group, station: editItem.station, serviceStartDate: editItem.serviceStartDate ?? "", serviceEndDate: editItem.serviceEndDate ?? "", status: editItem.status, stoppedDate: editItem.stoppedDate ?? "", notes: editItem.notes ?? "", customFields: {} });
      setCustomFieldValues((editItem.customFields ?? {}) as Record<string, string | boolean | number>);
    } else {
      setForm({ ...EMPTY });
      setCustomFieldValues({});
    }
  }, [editItem]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListWeatherServicesQueryKey() });

  const createMutation = useCreateWeatherService({ mutation: { onSuccess: () => { invalidate(); setShowCreate(false); toast({ title: "服务记录已创建" }); }, onError: () => toast({ title: "操作失败", variant: "destructive" }) } });
  const updateMutation = useUpdateWeatherService({ mutation: { onSuccess: () => { invalidate(); setEditItem(null); toast({ title: "已更新" }); }, onError: () => toast({ title: "操作失败", variant: "destructive" }) } });
  const deleteMutation = useDeleteWeatherService({ mutation: { onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "已删除" }); }, onError: () => toast({ title: "删除失败", variant: "destructive" }) } });

  const handleSubmit = () => {
    if (!form.province || !form.station) {
      toast({ title: "省份和场站为必填项", variant: "destructive" }); return;
    }
    const data = { ...form, contractNo: form.contractNo || undefined, serviceStartDate: form.serviceStartDate || undefined, serviceEndDate: form.serviceEndDate || undefined, stoppedDate: form.stoppedDate || undefined, notes: form.notes || undefined };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: { ...data, customFields: customFieldValues } as any });
    } else {
      createMutation.mutate({ data: { ...data, customFields: customFieldValues } as any });
    }
  };

  const f = (k: keyof typeof EMPTY, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleExport = () => {
    exportToCsv("数值天气服务", filtered, [
      { header: "省份", accessor: s => s.province },
      { header: "集团", accessor: s => s.group },
      { header: "场站", accessor: s => s.station },
      { header: "关联合同", accessor: s => s.contractNo ?? "" },
      { header: "服务开始", accessor: s => formatDate(s.serviceStartDate) },
      { header: "服务结束", accessor: s => formatDate(s.serviceEndDate) },
      { header: "状态", accessor: s => s.status },
      { header: "预警级别", accessor: s => ALERT_LABELS[s.expiryAlertLevel ?? ""] ?? "正常" },
    ]);
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">数值天气</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="自定义字段" onClick={() => setShowCF(true)}><Settings className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="w-4 h-4 mr-2" /> 批量导入</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> 导出 CSV</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setShowCreate(true); }}><Plus className="w-4 h-4 mr-2" /> 新增服务</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "服务中", value: String(activeCount), sub: `共 ${filtered.length} 条` },
          { label: "即将到期", value: String(expiringCount), sub: "3个月内" },
          { label: "已过期", value: String(expiredCount), sub: "需续签" },
        ].map(stat => (
          <div key={stat.label} className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索省份、场站、合同..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {[
          { label: "省份", value: provinceFilter, onChange: setProvinceFilter, options: [{ v: "all", l: "全部省份" }, ...provinces.map(p => ({ v: p, l: p }))] },
          { label: "状态", value: statusFilter, onChange: setStatusFilter, options: [{ v: "all", l: "全部状态" }, ...STATUSES.map(s => ({ v: s, l: s }))] },
          { label: "预警", value: alertFilter, onChange: setAlertFilter, options: [{ v: "all", l: "全部预警" }, { v: "expired", l: "已过期" }, { v: "1m", l: "1个月内" }, { v: "2m", l: "2个月内" }, { v: "3m", l: "3个月内" }] },
        ].map(sel => (
          <Select key={sel.label} value={sel.value} onValueChange={sel.onChange}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder={sel.label} /></SelectTrigger>
            <SelectContent>{sel.options.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
          </Select>
        ))}
        {(search || provinceFilter !== "all" || statusFilter !== "all" || alertFilter !== "all") && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setProvinceFilter("all"); setStatusFilter("all"); setAlertFilter("all"); }}>清除筛选</Button>
        )}
      </div>

      <div className="bg-card rounded-lg border shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead>省份</TableHead>
                <TableHead>集团</TableHead>
                <TableHead>场站</TableHead>
                <TableHead>关联合同</TableHead>
                <TableHead>服务开始</TableHead>
                <TableHead>服务结束</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>预警</TableHead>
                {defs.map(d => <TableHead key={d.fieldName}>{d.fieldLabel}</TableHead>)}
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9 + defs.length} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : !filtered.length ? (
                <TableRow><TableCell colSpan={9 + defs.length} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id} className="hover:bg-muted/50">
                  <TableCell>{s.province}</TableCell>
                  <TableCell className="text-muted-foreground">{s.group || "-"}</TableCell>
                  <TableCell className="font-medium">{s.station}</TableCell>
                  <TableCell className="text-muted-foreground">{s.contractNo || "-"}</TableCell>
                  <TableCell>{formatDate(s.serviceStartDate)}</TableCell>
                  <TableCell>{formatDate(s.serviceEndDate)}</TableCell>
                  <TableCell><Badge variant={s.status === "服务中" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell>
                    {s.expiryAlertLevel ? (
                      <Badge className={`font-normal ${ALERT_COLORS[s.expiryAlertLevel] ?? ""}`}>{ALERT_LABELS[s.expiryAlertLevel]}</Badge>
                    ) : (
                      <Badge className="bg-green-500 text-white hover:bg-green-600 font-normal">正常</Badge>
                    )}
                  </TableCell>
                  {defs.map(d => <TableCell key={d.fieldName} className="text-sm text-muted-foreground">{String((s.customFields ?? {})[d.fieldName] ?? "")}</TableCell>)}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditItem(s as any)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showCreate || editItem !== null} onOpenChange={v => { if (!v) { setShowCreate(false); setEditItem(null); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "编辑服务记录" : "新增数值天气服务"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5"><Label>省份 <span className="text-destructive">*</span></Label><Input value={form.province} onChange={e => f("province", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>场站 <span className="text-destructive">*</span></Label><Input value={form.station} onChange={e => f("station", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>集团</Label><Input value={form.group} onChange={e => f("group", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>关联合同号</Label><Input value={form.contractNo} onChange={e => f("contractNo", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>服务开始日期</Label><Input type="date" value={form.serviceStartDate} onChange={e => f("serviceStartDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>服务结束日期</Label><Input type="date" value={form.serviceEndDate} onChange={e => f("serviceEndDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>状态</Label>
              <Select value={form.status} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>停止日期</Label><Input type="date" value={form.stoppedDate} onChange={e => f("stoppedDate", e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>备注</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} /></div>
            <div className="col-span-2"><CustomFieldsSection defs={defs} values={customFieldValues} onChange={setCustomFieldValues} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditItem(null); }}>取消</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{editItem ? "保存" : "创建"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认删除</AlertDialogTitle><AlertDialogDescription>确定要删除此服务记录吗？</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog open={showImport} onOpenChange={setShowImport} title="数值天气服务" templateFilename="天气服务导入模板.csv"
        columns={[
          { key: "province", label: "省份", required: true },
          { key: "station", label: "场站", required: true },
          { key: "group", label: "集团" },
          { key: "contractNo", label: "关联合同号" },
          { key: "serviceStartDate", label: "服务开始日期" },
          { key: "serviceEndDate", label: "服务结束日期" },
          { key: "status", label: "状态" },
        ]}
        onImportRow={async (row) => { await createMutation.mutateAsync({ data: row as any }); invalidate(); }}
      />
      <CustomFieldsManager open={showCF} onOpenChange={setShowCF} defs={defs} onAdd={addDef} onDelete={deleteDef} />
    </div>
  );
}

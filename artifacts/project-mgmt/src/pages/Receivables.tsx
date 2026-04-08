import { useState, useEffect, useMemo } from "react";
import {
  useListReceivables, getListReceivablesQueryKey,
  useCreateReceivable, useUpdateReceivable, useDeleteReceivable,
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
import { Checkbox } from "@/components/ui/checkbox";
import { formatWanYuan, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, Trash2, Pencil, Upload, Settings, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomFieldDefs } from "@/hooks/use-custom-fields";
import { CustomFieldsManager } from "@/components/crud/CustomFieldsManager";
import { CustomFieldsSection } from "@/components/crud/CustomFieldsSection";
import { ImportDialog } from "@/components/crud/ImportDialog";

type ReceivableItem = { id: number; contractNo: string | null; customer: string; province: string; station: string; salesManager: string; receivableType: string; amount: number; expectedDate: string | null; deliveryDate: string | null; acceptanceDate: string | null; invoiceDate: string | null; actualPaymentDate: string | null; daysLate: number | null; status: string; isBadDebt: boolean; notes: string | null; customFields: Record<string, unknown> | null };

const EMPTY_FORM = {
  contractNo: "", customer: "", province: "", station: "", salesManager: "", receivableType: "进度款",
  amount: 0, expectedDate: "", deliveryDate: "", acceptanceDate: "", invoiceDate: "",
  actualPaymentDate: "", status: "待收", isBadDebt: false, notes: "",
};

const TYPES = ["进度款", "质保款", "验收款", "预付款", "尾款", "其他"];
const STATUSES = ["待收", "逾期", "已回款", "坏账"];

export default function Receivables() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { defs, addDef, deleteDef } = useCustomFieldDefs("receivables");

  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [managerFilter, setManagerFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<ReceivableItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCF, setShowCF] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean | number>>({});

  const qp = {
    contractNo: search || undefined,
    province: provinceFilter !== "all" ? provinceFilter : undefined,
    salesManager: managerFilter !== "all" ? managerFilter : undefined,
    overdueOnly: overdueOnly || undefined,
  };
  const { data: receivables, isLoading } = useListReceivables(qp, { query: { queryKey: getListReceivablesQueryKey(qp) } });

  const filtered = useMemo(() => {
    if (!receivables) return [];
    let result = receivables;
    if (typeFilter !== "all") result = result.filter(r => r.receivableType === typeFilter);
    if (statusFilter !== "all") result = result.filter(r => r.status === statusFilter);
    return result;
  }, [receivables, typeFilter, statusFilter]);

  const provinces = useMemo(() => [...new Set((receivables ?? []).map(r => r.province).filter(Boolean))].sort(), [receivables]);
  const managers = useMemo(() => [...new Set((receivables ?? []).map(r => r.salesManager).filter(Boolean))].sort(), [receivables]);
  const totalAmount = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered]);
  const pendingAmount = useMemo(() => filtered.filter(r => r.status !== "已回款").reduce((s, r) => s + r.amount, 0), [filtered]);
  const overdueAmount = useMemo(() => filtered.filter(r => (r.daysLate ?? 0) > 0 && r.status !== "已回款").reduce((s, r) => s + r.amount, 0), [filtered]);

  useEffect(() => {
    if (editItem) {
      setForm({ contractNo: editItem.contractNo ?? "", customer: editItem.customer, province: editItem.province, station: editItem.station, salesManager: editItem.salesManager, receivableType: editItem.receivableType, amount: editItem.amount, expectedDate: editItem.expectedDate ?? "", deliveryDate: editItem.deliveryDate ?? "", acceptanceDate: editItem.acceptanceDate ?? "", invoiceDate: editItem.invoiceDate ?? "", actualPaymentDate: editItem.actualPaymentDate ?? "", status: editItem.status, isBadDebt: editItem.isBadDebt, notes: editItem.notes ?? "" });
      setCustomFieldValues((editItem.customFields ?? {}) as Record<string, string | boolean | number>);
    } else {
      setForm({ ...EMPTY_FORM });
      setCustomFieldValues({});
    }
  }, [editItem]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListReceivablesQueryKey() });

  const createMutation = useCreateReceivable({ mutation: { onSuccess: () => { invalidate(); setShowCreate(false); toast({ title: "应收记录已创建" }); }, onError: () => toast({ title: "操作失败", variant: "destructive" }) } });
  const updateMutation = useUpdateReceivable({ mutation: { onSuccess: () => { invalidate(); setEditItem(null); toast({ title: "已更新" }); }, onError: () => toast({ title: "操作失败", variant: "destructive" }) } });
  const deleteMutation = useDeleteReceivable({ mutation: { onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "已删除" }); }, onError: () => toast({ title: "删除失败", variant: "destructive" }) } });

  const handleSubmit = () => {
    if (!form.customer || !form.province || !form.salesManager) {
      toast({ title: "请填写必填项", variant: "destructive" }); return;
    }
    const data = {
      ...form, amount: Number(form.amount),
      contractNo: form.contractNo || undefined,
      expectedDate: form.expectedDate || undefined, deliveryDate: form.deliveryDate || undefined,
      acceptanceDate: form.acceptanceDate || undefined, invoiceDate: form.invoiceDate || undefined,
      actualPaymentDate: form.actualPaymentDate || undefined, notes: form.notes || undefined,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: { ...data, customFields: customFieldValues } as any });
    } else {
      createMutation.mutate({ data: { ...data, customFields: customFieldValues } as any });
    }
  };

  const f = (k: keyof typeof EMPTY_FORM, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleExport = () => {
    exportToCsv("应收款管理", filtered, [
      { header: "客户名称", accessor: r => r.customer },
      { header: "关联合同", accessor: r => r.contractNo ?? "" },
      { header: "收款类型", accessor: r => r.receivableType },
      { header: "金额", accessor: r => r.amount },
      { header: "预计收款日", accessor: r => formatDate(r.expectedDate) },
      { header: "实际收款日", accessor: r => formatDate(r.actualPaymentDate) },
      { header: "状态", accessor: r => r.status },
      { header: "逾期天数", accessor: r => r.daysLate ?? 0 },
      { header: "是否坏账", accessor: r => r.isBadDebt ? "是" : "否" },
    ]);
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">应收款管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="自定义字段" onClick={() => setShowCF(true)}><Settings className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="w-4 h-4 mr-2" /> 批量导入</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> 导出 CSV</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setShowCreate(true); }}><Plus className="w-4 h-4 mr-2" /> 新增应收记录</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "应收总额", value: formatWanYuan(totalAmount), sub: `共 ${filtered.length} 条` },
          { label: "待收金额", value: formatWanYuan(pendingAmount), sub: "未收回款" },
          { label: "逾期金额", value: formatWanYuan(overdueAmount), sub: "需重点跟进" },
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
          <Input placeholder="搜索合同编号、客户..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {[
          { label: "省份", value: provinceFilter, onChange: setProvinceFilter, options: [{ v: "all", l: "全部省份" }, ...provinces.map(p => ({ v: p, l: p }))] },
          { label: "销售经理", value: managerFilter, onChange: setManagerFilter, options: [{ v: "all", l: "全部经理" }, ...managers.map(m => ({ v: m, l: m }))] },
          { label: "收款类型", value: typeFilter, onChange: setTypeFilter, options: [{ v: "all", l: "全部类型" }, ...TYPES.map(t => ({ v: t, l: t }))] },
          { label: "状态", value: statusFilter, onChange: setStatusFilter, options: [{ v: "all", l: "全部状态" }, ...STATUSES.map(s => ({ v: s, l: s }))] },
        ].map(sel => (
          <Select key={sel.label} value={sel.value} onValueChange={sel.onChange}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder={sel.label} /></SelectTrigger>
            <SelectContent>{sel.options.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
          </Select>
        ))}
        <div className="flex items-center gap-2">
          <Checkbox id="overdueR" checked={overdueOnly} onCheckedChange={v => setOverdueOnly(!!v)} />
          <label htmlFor="overdueR" className="text-sm cursor-pointer">仅逾期</label>
        </div>
        {(search || provinceFilter !== "all" || managerFilter !== "all" || typeFilter !== "all" || statusFilter !== "all" || overdueOnly) && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setProvinceFilter("all"); setManagerFilter("all"); setTypeFilter("all"); setStatusFilter("all"); setOverdueOnly(false); }}>清除筛选</Button>
        )}
      </div>

      <div className="bg-card rounded-lg border shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead>客户名称</TableHead>
                <TableHead>关联合同</TableHead>
                <TableHead>收款类型</TableHead>
                <TableHead className="text-right">应收金额</TableHead>
                <TableHead>预计收款日</TableHead>
                <TableHead>实际收款日</TableHead>
                <TableHead>销售经理</TableHead>
                <TableHead>状态</TableHead>
                {defs.map(d => <TableHead key={d.fieldName}>{d.fieldLabel}</TableHead>)}
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9 + defs.length} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : !filtered.length ? (
                <TableRow><TableCell colSpan={9 + defs.length} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id} className="hover:bg-muted/50">
                  <TableCell className="max-w-[160px] truncate" title={r.customer}>{r.customer}</TableCell>
                  <TableCell className="text-muted-foreground">{r.contractNo || "-"}</TableCell>
                  <TableCell><Badge variant="outline">{r.receivableType}</Badge></TableCell>
                  <TableCell className="text-right font-medium text-destructive">{formatWanYuan(r.amount)}</TableCell>
                  <TableCell>{formatDate(r.expectedDate)}</TableCell>
                  <TableCell className="text-emerald-600">{formatDate(r.actualPaymentDate)}</TableCell>
                  <TableCell>{r.salesManager}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant={r.status === "已回款" ? "outline" : "default"}>{r.status}</Badge>
                      {r.isBadDebt && <Badge variant="destructive">坏账</Badge>}
                      {(r.daysLate ?? 0) > 0 && r.status !== "已回款" && (
                        <span className="text-xs text-destructive flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />{r.daysLate}天</span>
                      )}
                    </div>
                  </TableCell>
                  {defs.map(d => <TableCell key={d.fieldName} className="text-sm text-muted-foreground">{String((r.customFields ?? {})[d.fieldName] ?? "")}</TableCell>)}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditItem(r as any)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showCreate || editItem !== null} onOpenChange={v => { if (!v) { setShowCreate(false); setEditItem(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "编辑应收记录" : "新增应收记录"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5"><Label>客户名称 <span className="text-destructive">*</span></Label><Input value={form.customer} onChange={e => f("customer", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>关联合同号</Label><Input value={form.contractNo} onChange={e => f("contractNo", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>收款类型</Label>
              <Select value={form.receivableType} onValueChange={v => f("receivableType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>省份 <span className="text-destructive">*</span></Label><Input value={form.province} onChange={e => f("province", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>场站</Label><Input value={form.station} onChange={e => f("station", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>销售经理 <span className="text-destructive">*</span></Label><Input value={form.salesManager} onChange={e => f("salesManager", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>状态</Label>
              <Select value={form.status} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>应收金额（元）</Label><Input type="number" value={form.amount} onChange={e => f("amount", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>预计收款日</Label><Input type="date" value={form.expectedDate} onChange={e => f("expectedDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>实际收款日</Label><Input type="date" value={form.actualPaymentDate} onChange={e => f("actualPaymentDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>交付日期</Label><Input type="date" value={form.deliveryDate} onChange={e => f("deliveryDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>验收日期</Label><Input type="date" value={form.acceptanceDate} onChange={e => f("acceptanceDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>开票日期</Label><Input type="date" value={form.invoiceDate} onChange={e => f("invoiceDate", e.target.value)} /></div>
            <div className="flex items-center gap-2 pt-5">
              <Checkbox id="badDebt" checked={form.isBadDebt} onCheckedChange={v => f("isBadDebt", !!v)} />
              <Label htmlFor="badDebt" className="cursor-pointer">标记为坏账</Label>
            </div>
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
          <AlertDialogHeader><AlertDialogTitle>确认删除</AlertDialogTitle><AlertDialogDescription>确定要删除此应收记录吗？</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog open={showImport} onOpenChange={setShowImport} title="应收款管理" templateFilename="应收款导入模板.csv"
        columns={[
          { key: "customer", label: "客户名称", required: true },
          { key: "contractNo", label: "关联合同号" },
          { key: "province", label: "省份", required: true },
          { key: "salesManager", label: "销售经理", required: true },
          { key: "receivableType", label: "收款类型" },
          { key: "amount", label: "应收金额", required: true, transform: v => parseFloat(v) || 0 },
          { key: "expectedDate", label: "预计收款日" },
          { key: "status", label: "状态" },
        ]}
        onImportRow={async (row) => { await createMutation.mutateAsync({ data: row as any }); invalidate(); }}
      />
      <CustomFieldsManager open={showCF} onOpenChange={setShowCF} defs={defs} onAdd={addDef} onDelete={deleteDef} />
    </div>
  );
}

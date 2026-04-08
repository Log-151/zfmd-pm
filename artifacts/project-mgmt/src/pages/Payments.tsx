import { useState, useEffect, useMemo } from "react";
import {
  useListPayments, getListPaymentsQueryKey,
  useCreatePayment, useUpdatePayment, useDeletePayment,
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
import { formatWanYuan, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, Trash2, Pencil, Upload, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomFieldDefs } from "@/hooks/use-custom-fields";
import { CustomFieldsManager } from "@/components/crud/CustomFieldsManager";
import { CustomFieldsSection } from "@/components/crud/CustomFieldsSection";
import { ImportDialog } from "@/components/crud/ImportDialog";

type PaymentItem = { id: number; payer: string; contractNo: string | null; province: string; group: string; station: string; salesManager: string; paymentDate: string; amount: number; paymentRatio: number | null; notes: string | null; customFields: Record<string, unknown> | null };

const EMPTY = {
  payer: "", contractNo: "", province: "", group: "", station: "",
  salesManager: "", paymentDate: "", amount: 0, notes: "", customFields: {} as Record<string, unknown> | null,
};

export default function Payments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { defs, addDef, deleteDef } = useCustomFieldDefs("payments");

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<PaymentItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCF, setShowCF] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean | number>>({});

  const qp = {
    payer: search || undefined,
    year: yearFilter !== "all" ? parseInt(yearFilter) : undefined,
    province: provinceFilter !== "all" ? provinceFilter : undefined,
    salesManager: managerFilter !== "all" ? managerFilter : undefined,
  };
  const { data: payments, isLoading } = useListPayments(qp, { query: { queryKey: getListPaymentsQueryKey(qp) } });

  const provinces = useMemo(() => [...new Set((payments ?? []).map(p => p.province).filter(Boolean))].sort(), [payments]);
  const managers = useMemo(() => [...new Set((payments ?? []).map(p => p.salesManager).filter(Boolean))].sort(), [payments]);
  const totalAmount = useMemo(() => (payments ?? []).reduce((s, p) => s + p.amount, 0), [payments]);
  const avgAmount = useMemo(() => payments?.length ? totalAmount / payments.length : 0, [totalAmount, payments]);

  useEffect(() => {
    if (editItem) {
      setForm({ payer: editItem.payer, contractNo: editItem.contractNo ?? "", province: editItem.province, group: editItem.group, station: editItem.station, salesManager: editItem.salesManager, paymentDate: editItem.paymentDate, amount: editItem.amount, notes: editItem.notes ?? "", customFields: {} });
      setCustomFieldValues((editItem.customFields ?? {}) as Record<string, string | boolean | number>);
    } else {
      setForm({ ...EMPTY });
      setCustomFieldValues({});
    }
  }, [editItem]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });

  const createMutation = useCreatePayment({ mutation: { onSuccess: () => { invalidate(); setShowCreate(false); toast({ title: "回款已登记" }); }, onError: () => toast({ title: "操作失败", variant: "destructive" }) } });
  const updateMutation = useUpdatePayment({ mutation: { onSuccess: () => { invalidate(); setEditItem(null); toast({ title: "已更新" }); }, onError: () => toast({ title: "操作失败", variant: "destructive" }) } });
  const deleteMutation = useDeletePayment({ mutation: { onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "已删除" }); }, onError: () => toast({ title: "删除失败", variant: "destructive" }) } });

  const handleSubmit = () => {
    if (!form.payer || !form.paymentDate || !form.province || !form.salesManager) {
      toast({ title: "请填写必填项", variant: "destructive" }); return;
    }
    const data = { ...form, amount: Number(form.amount), contractNo: form.contractNo || undefined, notes: form.notes || undefined };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: { ...data, customFields: customFieldValues } as any });
    } else {
      createMutation.mutate({ data: { ...data, customFields: customFieldValues } as any });
    }
  };

  const f = (k: keyof typeof EMPTY, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleExport = () => {
    if (!payments) return;
    exportToCsv("回款记录", payments, [
      { header: "付款单位", accessor: p => p.payer },
      { header: "关联合同", accessor: p => p.contractNo ?? "" },
      { header: "省份", accessor: p => p.province },
      { header: "销售经理", accessor: p => p.salesManager },
      { header: "回款金额", accessor: p => p.amount },
      { header: "回款日期", accessor: p => formatDate(p.paymentDate) },
      { header: "备注", accessor: p => p.notes ?? "" },
    ]);
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">回款管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="自定义字段" onClick={() => setShowCF(true)}><Settings className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="w-4 h-4 mr-2" /> 批量导入</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> 导出 CSV</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setShowCreate(true); }}><Plus className="w-4 h-4 mr-2" /> 登记回款</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "总回款金额", value: formatWanYuan(totalAmount), sub: `共 ${payments?.length ?? 0} 笔` },
          { label: "平均每笔", value: formatWanYuan(avgAmount), sub: `含税` },
          { label: "本年回款", value: formatWanYuan((payments ?? []).filter(p => p.paymentDate?.startsWith(String(new Date().getFullYear()))).reduce((s, p) => s + p.amount, 0)), sub: `${new Date().getFullYear()} 年` },
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
          <Input placeholder="搜索付款单位..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {[
          { label: "年份", value: yearFilter, onChange: setYearFilter, options: [{ v: "all", l: "全部年份" }, ...[2026,2025,2024,2023,2022].map(y => ({ v: String(y), l: String(y) }))] },
          { label: "省份", value: provinceFilter, onChange: setProvinceFilter, options: [{ v: "all", l: "全部省份" }, ...provinces.map(p => ({ v: p, l: p }))] },
          { label: "销售经理", value: managerFilter, onChange: setManagerFilter, options: [{ v: "all", l: "全部经理" }, ...managers.map(m => ({ v: m, l: m }))] },
        ].map(sel => (
          <Select key={sel.label} value={sel.value} onValueChange={sel.onChange}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder={sel.label} /></SelectTrigger>
            <SelectContent>{sel.options.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
          </Select>
        ))}
        {(search || yearFilter !== "all" || provinceFilter !== "all" || managerFilter !== "all") && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setYearFilter("all"); setProvinceFilter("all"); setManagerFilter("all"); }}>清除筛选</Button>
        )}
      </div>

      <div className="bg-card rounded-lg border shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead>付款单位</TableHead>
                <TableHead>关联合同</TableHead>
                <TableHead>省份</TableHead>
                <TableHead>销售经理</TableHead>
                <TableHead className="text-right">回款金额</TableHead>
                <TableHead className="text-right">回款比例</TableHead>
                <TableHead>回款日期</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : !payments?.length ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : payments.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium max-w-[160px] truncate" title={p.payer}>{p.payer}</TableCell>
                  <TableCell className="text-muted-foreground">{p.contractNo || "-"}</TableCell>
                  <TableCell>{p.province}</TableCell>
                  <TableCell>{p.salesManager}</TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">+{formatWanYuan(p.amount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{p.paymentRatio ? `${(p.paymentRatio * 100).toFixed(1)}%` : "-"}</TableCell>
                  <TableCell>{formatDate(p.paymentDate)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditItem(p as any)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{editItem ? "编辑回款" : "登记回款"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5"><Label>付款单位 <span className="text-destructive">*</span></Label><Input value={form.payer} onChange={e => f("payer", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>关联合同号</Label><Input value={form.contractNo} onChange={e => f("contractNo", e.target.value)} placeholder="如 HT-2024-001" /></div>
            <div className="space-y-1.5"><Label>省份 <span className="text-destructive">*</span></Label><Input value={form.province} onChange={e => f("province", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>集团</Label><Input value={form.group} onChange={e => f("group", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>场站</Label><Input value={form.station} onChange={e => f("station", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>销售经理 <span className="text-destructive">*</span></Label><Input value={form.salesManager} onChange={e => f("salesManager", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>回款日期 <span className="text-destructive">*</span></Label><Input type="date" value={form.paymentDate} onChange={e => f("paymentDate", e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>回款金额（元）</Label><Input type="number" value={form.amount} onChange={e => f("amount", e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>备注</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} /></div>
            <div className="col-span-2"><CustomFieldsSection defs={defs} values={customFieldValues} onChange={setCustomFieldValues} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditItem(null); }}>取消</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{editItem ? "保存" : "登记"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认删除</AlertDialogTitle><AlertDialogDescription>删除后无法恢复，确定要删除此回款记录吗？</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog open={showImport} onOpenChange={setShowImport} title="回款管理" templateFilename="回款导入模板.csv"
        columns={[
          { key: "payer", label: "付款单位", required: true },
          { key: "contractNo", label: "关联合同号" },
          { key: "province", label: "省份", required: true },
          { key: "group", label: "集团" },
          { key: "station", label: "场站" },
          { key: "salesManager", label: "销售经理", required: true },
          { key: "paymentDate", label: "回款日期", required: true },
          { key: "amount", label: "回款金额", required: true, transform: v => parseFloat(v) || 0 },
          { key: "notes", label: "备注" },
        ]}
        onImportRow={async (row) => { await createMutation.mutateAsync({ data: row as any }); invalidate(); }}
      />
      <CustomFieldsManager open={showCF} onOpenChange={setShowCF} defs={defs} onAdd={addDef} onDelete={deleteDef} />
    </div>
  );
}

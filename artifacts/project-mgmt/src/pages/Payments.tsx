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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatWanYuan, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, Trash2, Pencil, Upload, Settings, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomFieldDefs } from "@/hooks/use-custom-fields";
import { useColumnOrder, type ColDef } from "@/hooks/use-column-order";
import { CustomFieldsManager } from "@/components/crud/CustomFieldsManager";
import { CustomFieldsSection } from "@/components/crud/CustomFieldsSection";
import { ImportDialog } from "@/components/crud/ImportDialog";

type PaymentItem = {
  id: number; paymentDate: string; payer: string; province: string;
  group: string; station: string; productLine: string | null; projectContent: string | null;
  contractNo: string | null; billAmount: number | null; cashAmount: number | null;
  paymentRatio: number | null; paymentItemName: string | null;
  salesManager: string; salesContact: string | null;
  notes: string | null; paymentType: string | null; amount: number;
  customFields: Record<string, unknown> | null;
};

const EMPTY = {
  paymentDate: "", payer: "", province: "", group: "", station: "",
  productLine: "", projectContent: "", contractNo: "", billAmount: 0, cashAmount: 0,
  paymentRatio: 0, paymentItemName: "",
  salesManager: "", salesContact: "",
  notes: "", paymentType: "", amount: 0,
  customFields: {} as Record<string, unknown> | null,
};

const PAYMENTS_COLS: ColDef<PaymentItem>[] = [
  { key: "paymentDate", header: "回款日期", render: p => formatDate(p.paymentDate), csvValue: p => p.paymentDate, className: "text-xs whitespace-nowrap" },
  { key: "payer", header: "付款单位", render: p => p.payer, className: "text-xs max-w-[120px] truncate" },
  { key: "province", header: "省（区）", render: p => p.province, className: "text-xs whitespace-nowrap" },
  { key: "group", header: "集团", render: p => p.group || "", className: "text-xs whitespace-nowrap" },
  { key: "station", header: "场站名称", render: p => p.station || "", className: "text-xs whitespace-nowrap" },
  { key: "productLine", header: "产品线", render: p => p.productLine || "", className: "text-xs whitespace-nowrap" },
  { key: "projectContent", header: "合同项目内容", render: p => p.projectContent || "", className: "text-xs max-w-[120px] truncate" },
  { key: "contractNo", header: "合同号", render: p => p.contractNo || "", className: "text-xs whitespace-nowrap" },
  { key: "billAmount", header: "汇票回款(元)", render: p => p.billAmount || "", csvValue: p => p.billAmount ?? "", className: "text-xs text-right" },
  { key: "cashAmount", header: "现金回款(元)", render: p => p.cashAmount || "", csvValue: p => p.cashAmount ?? "", className: "text-xs text-right" },
  { key: "paymentRatio", header: "回款比例", render: p => p.paymentRatio ? `${(p.paymentRatio * 100).toFixed(1)}%` : "", csvValue: p => p.paymentRatio ?? "", className: "text-xs text-right" },
  { key: "paymentItemName", header: "款项名称", render: p => p.paymentItemName || "", className: "text-xs whitespace-nowrap" },
  { key: "salesManager", header: "签订合同销售经理", render: p => p.salesManager, className: "text-xs whitespace-nowrap" },
  { key: "salesContact", header: "销售联系人", render: p => p.salesContact || "", className: "text-xs whitespace-nowrap" },
  { key: "notes", header: "备注", render: p => p.notes || "", className: "text-xs max-w-[100px] truncate" },
  { key: "paymentType", header: "类型", render: p => p.paymentType || "", className: "text-xs whitespace-nowrap" },
  { key: "amount", header: "合同金额(元)", render: p => p.amount, csvValue: p => p.amount, className: "text-xs text-right font-medium text-emerald-600" },
];

export default function Payments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { defs = [], addDef, deleteDef, reorderDefs } = useCustomFieldDefs("payments");
  const { orderedCols, save: saveCols, getDragProps } = useColumnOrder("payments", PAYMENTS_COLS);

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
      setForm({
        paymentDate: editItem.paymentDate, payer: editItem.payer,
        province: editItem.province, group: editItem.group, station: editItem.station,
        productLine: editItem.productLine ?? "", projectContent: editItem.projectContent ?? "",
        contractNo: editItem.contractNo ?? "", billAmount: editItem.billAmount ?? 0,
        cashAmount: editItem.cashAmount ?? 0, paymentRatio: editItem.paymentRatio ?? 0,
        paymentItemName: editItem.paymentItemName ?? "",
        salesManager: editItem.salesManager, salesContact: editItem.salesContact ?? "",
        notes: editItem.notes ?? "", paymentType: editItem.paymentType ?? "",
        amount: editItem.amount, customFields: {},
      });
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
    const data = {
      paymentDate: form.paymentDate,
      payer: form.payer,
      province: form.province,
      group: form.group,
      station: form.station || undefined,
      productLine: form.productLine || undefined,
      projectContent: form.projectContent || undefined,
      contractNo: form.contractNo || undefined,
      billAmount: Number(form.billAmount) || undefined,
      cashAmount: Number(form.cashAmount) || undefined,
      paymentRatio: Number(form.paymentRatio) || undefined,
      paymentItemName: form.paymentItemName || undefined,
      salesManager: form.salesManager,
      salesContact: form.salesContact || undefined,
      notes: form.notes || undefined,
      paymentType: form.paymentType || undefined,
      amount: Number(form.amount),
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: { ...data, customFields: customFieldValues } as any });
    } else {
      createMutation.mutate({ data: { ...data, customFields: customFieldValues } as any });
    }
  };

  const f = (k: keyof typeof EMPTY, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleExport = () => {
    if (!payments) return;
    exportToCsv("回款台账", payments as any, orderedCols.map(col => ({
      header: col.header,
      accessor: (row: any) => { const cv = col.csvValue; if (cv) return cv(row as PaymentItem); const v = col.render(row as PaymentItem); return typeof v === "string" || typeof v === "number" ? v : String(v ?? ""); },
    })));
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">回款管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={saveCols}><Save className="w-4 h-4 mr-1" />保存列顺序</Button>
          <Button variant="outline" size="sm" onClick={() => setShowCF(true)}><Settings className="w-4 h-4 mr-1" />自定义字段</Button>
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
          { label: "年份", value: yearFilter, onChange: setYearFilter, options: [{ v: "all", l: "全部年份" }, ...[2026,2025,2024,2023,2022,2021,2020,2019,2018].map(y => ({ v: String(y), l: String(y) }))] },
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
                <TableHead className="text-xs whitespace-nowrap">序号</TableHead>
                {orderedCols.map((col, idx) => (
                  <TableHead key={col.key} {...getDragProps(idx)} className="text-xs whitespace-nowrap">{col.header}</TableHead>
                ))}
                {defs.map(d => <TableHead key={d.fieldName} className="text-xs whitespace-nowrap">{d.fieldLabel}</TableHead>)}
                <TableHead className="text-xs w-[60px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={orderedCols.length + 2 + defs.length} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : !payments?.length ? (
                <TableRow><TableCell colSpan={orderedCols.length + 2 + defs.length} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : (payments as unknown as PaymentItem[]).map((p, idx) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-center">{idx + 1}</TableCell>
                  {orderedCols.map(col => (
                    <TableCell key={col.key} className={col.className}>{col.render(p)}</TableCell>
                  ))}
                  {defs.map(d => <TableCell key={d.fieldName} className="text-xs">{String(((p as any).customFields ?? {})[d.fieldName] ?? "")}</TableCell>)}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditItem(p)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3 w-3" /></Button>
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
          <DialogHeader><DialogTitle>{editItem ? "编辑回款" : "登记回款"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5"><Label>回款日期 *</Label><Input type="date" value={form.paymentDate} onChange={e => f("paymentDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>付款单位 *</Label><Input value={form.payer} onChange={e => f("payer", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>省（区）*</Label><Input value={form.province} onChange={e => f("province", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>集团</Label><Input value={form.group} onChange={e => f("group", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>场站名称</Label><Input value={form.station} onChange={e => f("station", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>产品线</Label><Input value={form.productLine} onChange={e => f("productLine", e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>合同项目内容</Label><Input value={form.projectContent} onChange={e => f("projectContent", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>合同号</Label><Input value={form.contractNo} onChange={e => f("contractNo", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>汇票回款(元)</Label><Input type="number" value={form.billAmount} onChange={e => f("billAmount", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>现金回款(元)</Label><Input type="number" value={form.cashAmount} onChange={e => f("cashAmount", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>回款比例</Label><Input type="number" step="0.01" value={form.paymentRatio} onChange={e => f("paymentRatio", e.target.value)} placeholder="0~1，如 0.5" /></div>
            <div className="space-y-1.5"><Label>款项名称</Label><Input value={form.paymentItemName} onChange={e => f("paymentItemName", e.target.value)} placeholder="如：进度款、首付款" /></div>
            <div className="space-y-1.5"><Label>签订合同销售经理 *</Label><Input value={form.salesManager} onChange={e => f("salesManager", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>销售联系人</Label><Input value={form.salesContact} onChange={e => f("salesContact", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>备注</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>类型</Label><Input value={form.paymentType} onChange={e => f("paymentType", e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>合同金额(元) *</Label><Input type="number" value={form.amount} onChange={e => f("amount", e.target.value)} /></div>
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
        templateColumns={orderedCols.map(c => ({ key: c.key, label: c.header }))}
        columns={[
          { key: "paymentDate", label: "回款日期", required: true },
          { key: "payer", label: "付款单位", required: true },
          { key: "province", label: "省（区）", required: true },
          { key: "group", label: "集团" },
          { key: "station", label: "场站名称" },
          { key: "productLine", label: "产品线" },
          { key: "projectContent", label: "合同项目内容" },
          { key: "contractNo", label: "合同号" },
          { key: "billAmount", label: "汇票回款(元)", transform: v => parseFloat(v) || undefined },
          { key: "cashAmount", label: "现金回款(元)", transform: v => parseFloat(v) || undefined },
          { key: "paymentRatio", label: "回款比例", transform: v => parseFloat(v) || undefined },
          { key: "paymentItemName", label: "款项名称" },
          { key: "salesManager", label: "签订合同销售经理", required: true },
          { key: "salesContact", label: "销售联系人" },
          { key: "notes", label: "备注" },
          { key: "paymentType", label: "类型" },
          { key: "amount", label: "合同金额(元)", required: true, transform: v => parseFloat(v) || 0 },
        ]}
        onImportRow={async (row) => { await createMutation.mutateAsync({ data: row as any }); invalidate(); }}
      />
      <CustomFieldsManager open={showCF} onOpenChange={setShowCF} defs={defs} onAdd={addDef} onDelete={deleteDef} onReorder={reorderDefs} />
    </div>
  );
}

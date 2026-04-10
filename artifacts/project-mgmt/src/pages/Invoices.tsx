import { useState, useEffect, useMemo } from "react";
import {
  useListInvoices, getListInvoicesQueryKey,
  useCreateInvoice, useUpdateInvoice, useDeleteInvoice,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type InvoiceItem = {
  id: number;
  invoiceNo: string | null;
  customer: string;
  contractNo: string | null;
  province: string;
  group: string | null;
  station: string;
  productLine: string | null;
  projectContent: string | null;
  salesManager: string;
  salesContact: string | null;
  contractAmount: number | null;
  applicationDate: string | null;
  invoiceDate: string;
  amountWithTax: number;
  amountWithoutTax: number;
  taxRate: string | null;
  expectedPaymentDate: string | null;
  expectedPaymentAmount: number | null;
  actualPaymentDate: string | null;
  actualPaymentAmount: number | null;
  courierNo: string | null;
  voidDate: string | null;
  status: string;
  notes: string | null;
  outstandingAmount: number;
  isOverdue: boolean;
  customFields: Record<string, unknown> | null;
};

const EMPTY_FORM = {
  invoiceNo: "", customer: "", contractNo: "", province: "", group: "",
  station: "", productLine: "", projectContent: "",
  salesManager: "", salesContact: "",
  contractAmount: 0, applicationDate: "", invoiceDate: "",
  amountWithTax: 0, amountWithoutTax: 0, taxRate: "税率6%",
  expectedPaymentDate: "", expectedPaymentAmount: 0,
  actualPaymentDate: "", actualPaymentAmount: 0,
  courierNo: "", voidDate: "", status: "有效", notes: "",
};

export default function Invoices() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { defs, addDef, deleteDef } = useCustomFieldDefs("invoices");

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<InvoiceItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCF, setShowCF] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean | number>>({});

  const qp = {
    contractNo: search || undefined,
    year: yearFilter !== "all" ? parseInt(yearFilter) : undefined,
    province: provinceFilter !== "all" ? provinceFilter : undefined,
    overdueOnly: overdueOnly || undefined,
  };
  const { data: invoices, isLoading } = useListInvoices(qp, { query: { queryKey: getListInvoicesQueryKey(qp) } });

  const filtered = useMemo(() => {
    if (!invoices) return [];
    return statusFilter !== "all" ? invoices.filter(i => i.status === statusFilter) : invoices;
  }, [invoices, statusFilter]);

  const provinces = useMemo(() => [...new Set((invoices ?? []).map(i => i.province).filter(Boolean))].sort(), [invoices]);
  const totalInvoiced = useMemo(() => filtered.reduce((s, i) => s + i.amountWithTax, 0), [filtered]);
  const totalOutstanding = useMemo(() => filtered.reduce((s, i) => s + (i.outstandingAmount ?? 0), 0), [filtered]);
  const overdueCount = useMemo(() => filtered.filter(i => i.isOverdue).length, [filtered]);

  useEffect(() => {
    if (editItem) {
      setForm({
        invoiceNo: editItem.invoiceNo ?? "",
        customer: editItem.customer,
        contractNo: editItem.contractNo ?? "",
        province: editItem.province,
        group: editItem.group ?? "",
        station: editItem.station,
        productLine: editItem.productLine ?? "",
        projectContent: editItem.projectContent ?? "",
        salesManager: editItem.salesManager,
        salesContact: editItem.salesContact ?? "",
        contractAmount: editItem.contractAmount ?? 0,
        applicationDate: editItem.applicationDate ?? "",
        invoiceDate: editItem.invoiceDate,
        amountWithTax: editItem.amountWithTax,
        amountWithoutTax: editItem.amountWithoutTax,
        taxRate: editItem.taxRate ?? "税率6%",
        expectedPaymentDate: editItem.expectedPaymentDate ?? "",
        expectedPaymentAmount: editItem.expectedPaymentAmount ?? 0,
        actualPaymentDate: editItem.actualPaymentDate ?? "",
        actualPaymentAmount: editItem.actualPaymentAmount ?? 0,
        courierNo: editItem.courierNo ?? "",
        voidDate: editItem.voidDate ?? "",
        status: editItem.status,
        notes: editItem.notes ?? "",
      });
      setCustomFieldValues((editItem.customFields ?? {}) as Record<string, string | boolean | number>);
    } else {
      setForm({ ...EMPTY_FORM });
      setCustomFieldValues({});
    }
  }, [editItem]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });

  const createMutation = useCreateInvoice({ mutation: { onSuccess: () => { invalidate(); setShowCreate(false); toast({ title: "开票记录已创建" }); }, onError: () => toast({ title: "操作失败", variant: "destructive" }) } });
  const updateMutation = useUpdateInvoice({ mutation: { onSuccess: () => { invalidate(); setEditItem(null); toast({ title: "已更新" }); }, onError: () => toast({ title: "操作失败", variant: "destructive" }) } });
  const deleteMutation = useDeleteInvoice({ mutation: { onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "已删除" }); }, onError: () => toast({ title: "删除失败", variant: "destructive" }) } });

  const handleSubmit = () => {
    if (!form.customer || !form.invoiceDate || !form.province || !form.salesManager) {
      toast({ title: "请填写必填项", variant: "destructive" }); return;
    }
    const data = {
      ...form,
      amountWithTax: Number(form.amountWithTax),
      amountWithoutTax: Number(form.amountWithoutTax),
      contractAmount: Number(form.contractAmount) || undefined,
      expectedPaymentAmount: Number(form.expectedPaymentAmount) || undefined,
      actualPaymentAmount: Number(form.actualPaymentAmount) || undefined,
      invoiceNo: form.invoiceNo || undefined,
      contractNo: form.contractNo || undefined,
      group: form.group || undefined,
      productLine: form.productLine || undefined,
      projectContent: form.projectContent || undefined,
      salesContact: form.salesContact || undefined,
      applicationDate: form.applicationDate || undefined,
      expectedPaymentDate: form.expectedPaymentDate || undefined,
      actualPaymentDate: form.actualPaymentDate || undefined,
      courierNo: form.courierNo || undefined,
      voidDate: form.voidDate || undefined,
      notes: form.notes || undefined,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: { ...data, customFields: customFieldValues } as any });
    } else {
      createMutation.mutate({ data: { ...data, customFields: customFieldValues } as any });
    }
  };

  const f = (k: keyof typeof EMPTY_FORM, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleExport = () => {
    if (!filtered) return;
    exportToCsv("开票记录", filtered, [
      { header: "开票日期", accessor: i => formatDate(i.invoiceDate) },
      { header: "申请开票日期", accessor: i => formatDate(i.applicationDate) },
      { header: "合同号", accessor: i => i.contractNo ?? "" },
      { header: "开票单位", accessor: i => i.customer },
      { header: "省份", accessor: i => i.province },
      { header: "集团", accessor: i => (i as any).group ?? "" },
      { header: "场站名称", accessor: i => i.station },
      { header: "产品线", accessor: i => (i as any).productLine ?? "" },
      { header: "合同项目内容", accessor: i => (i as any).projectContent ?? "" },
      { header: "销售经理", accessor: i => i.salesManager },
      { header: "销售联系人", accessor: i => (i as any).salesContact ?? "" },
      { header: "合同金额（元）", accessor: i => (i as any).contractAmount ?? "" },
      { header: "发票金额（元）", accessor: i => i.amountWithTax },
      { header: "税率", accessor: i => (i as any).taxRate ?? "" },
      { header: "不含税金额（元）", accessor: i => i.amountWithoutTax },
      { header: "承诺回款日期", accessor: i => formatDate(i.expectedPaymentDate) },
      { header: "承诺回款金额", accessor: i => i.expectedPaymentAmount ?? "" },
      { header: "实际回款日期", accessor: i => formatDate(i.actualPaymentDate) },
      { header: "实际回款金额", accessor: i => i.actualPaymentAmount ?? "" },
      { header: "发票快递单号", accessor: i => (i as any).courierNo ?? "" },
      { header: "作废时间", accessor: i => formatDate((i as any).voidDate) },
      { header: "状态", accessor: i => i.status },
      { header: "备注", accessor: i => i.notes ?? "" },
    ]);
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">开票管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="自定义字段" onClick={() => setShowCF(true)}><Settings className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="w-4 h-4 mr-2" /> 批量导入</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> 导出 CSV</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setShowCreate(true); }}><Plus className="w-4 h-4 mr-2" /> 申请开票</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "总开票金额", value: formatWanYuan(totalInvoiced), sub: `共 ${filtered.length} 张` },
          { label: "待结清金额", value: formatWanYuan(totalOutstanding), sub: "未收回款" },
          { label: "逾期张数", value: String(overdueCount), sub: "超过预计收款日" },
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
          { label: "年份", value: yearFilter, onChange: setYearFilter, options: [{ v: "all", l: "全部年份" }, ...[2026,2025,2024,2023,2022,2021,2020,2019].map(y => ({ v: String(y), l: String(y) }))] },
          { label: "省份", value: provinceFilter, onChange: setProvinceFilter, options: [{ v: "all", l: "全部省份" }, ...provinces.map(p => ({ v: p, l: p }))] },
          { label: "状态", value: statusFilter, onChange: setStatusFilter, options: [{ v: "all", l: "全部状态" }, { v: "有效", l: "有效" }, { v: "已回款", l: "已回款" }, { v: "作废", l: "作废" }] },
        ].map(sel => (
          <Select key={sel.label} value={sel.value} onValueChange={sel.onChange}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder={sel.label} /></SelectTrigger>
            <SelectContent>{sel.options.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
          </Select>
        ))}
        <div className="flex items-center gap-2">
          <Checkbox id="overdue" checked={overdueOnly} onCheckedChange={v => setOverdueOnly(!!v)} />
          <label htmlFor="overdue" className="text-sm cursor-pointer">仅逾期</label>
        </div>
        {(search || yearFilter !== "all" || provinceFilter !== "all" || statusFilter !== "all" || overdueOnly) && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setYearFilter("all"); setProvinceFilter("all"); setStatusFilter("all"); setOverdueOnly(false); }}>清除筛选</Button>
        )}
      </div>

      <div className="bg-card rounded-lg border shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead>开票日期</TableHead>
                <TableHead>开票单位</TableHead>
                <TableHead>省份</TableHead>
                <TableHead>集团</TableHead>
                <TableHead>场站名称</TableHead>
                <TableHead>产品线</TableHead>
                <TableHead>合同项目内容</TableHead>
                <TableHead>合同号</TableHead>
                <TableHead>销售经理</TableHead>
                <TableHead>销售联系人</TableHead>
                <TableHead className="text-right">合同金额</TableHead>
                <TableHead className="text-right">发票金额</TableHead>
                <TableHead>税率</TableHead>
                <TableHead className="text-right">不含税</TableHead>
                <TableHead>承诺回款日</TableHead>
                <TableHead>实际回款日</TableHead>
                <TableHead className="text-right">未结清</TableHead>
                <TableHead>快递单号</TableHead>
                <TableHead>状态</TableHead>
                {defs.map(d => <TableHead key={d.fieldName}>{d.fieldLabel}</TableHead>)}
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={20 + defs.length} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : !filtered.length ? (
                <TableRow><TableCell colSpan={20 + defs.length} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : filtered.map(inv => (
                <TableRow key={inv.id} className="hover:bg-muted/50">
                  <TableCell className="text-sm">{formatDate(inv.invoiceDate)}</TableCell>
                  <TableCell className="max-w-[140px] truncate text-sm" title={inv.customer}>{inv.customer}</TableCell>
                  <TableCell className="text-sm">{inv.province}</TableCell>
                  <TableCell className="text-sm">{(inv as any).group || "-"}</TableCell>
                  <TableCell className="text-sm">{inv.station || "-"}</TableCell>
                  <TableCell className="text-sm">{(inv as any).productLine || "-"}</TableCell>
                  <TableCell className="max-w-[120px] truncate text-sm" title={(inv as any).projectContent ?? ""}>{(inv as any).projectContent || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{inv.contractNo || "-"}</TableCell>
                  <TableCell className="text-sm">{inv.salesManager}</TableCell>
                  <TableCell className="text-sm">{(inv as any).salesContact || "-"}</TableCell>
                  <TableCell className="text-right text-sm">{(inv as any).contractAmount ? formatWanYuan((inv as any).contractAmount) : "-"}</TableCell>
                  <TableCell className="text-right font-medium text-sm">{formatWanYuan(inv.amountWithTax)}</TableCell>
                  <TableCell className="text-sm">{(inv as any).taxRate || "-"}</TableCell>
                  <TableCell className="text-right text-sm">{formatWanYuan(inv.amountWithoutTax)}</TableCell>
                  <TableCell className="text-sm">{formatDate(inv.expectedPaymentDate)}</TableCell>
                  <TableCell className="text-sm">{formatDate(inv.actualPaymentDate)}</TableCell>
                  <TableCell className="text-right font-medium text-amber-600 text-sm">{inv.outstandingAmount > 0 ? formatWanYuan(inv.outstandingAmount) : "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(inv as any).courierNo || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant={inv.status === "已回款" ? "default" : inv.status === "作废" ? "secondary" : "outline"}>{inv.status}</Badge>
                      {inv.isOverdue && (
                        <TooltipProvider>
                          <Tooltip><TooltipTrigger><AlertCircle className="w-4 h-4 text-destructive" /></TooltipTrigger><TooltipContent>已逾期</TooltipContent></Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  {defs.map(d => <TableCell key={d.fieldName} className="text-sm text-muted-foreground">{String((inv.customFields ?? {})[d.fieldName] ?? "")}</TableCell>)}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditItem(inv as any)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(inv.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showCreate || editItem !== null} onOpenChange={v => { if (!v) { setShowCreate(false); setEditItem(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "编辑发票" : "申请开票"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5"><Label>发票号码</Label><Input value={form.invoiceNo} onChange={e => f("invoiceNo", e.target.value)} placeholder="如：电子发票" /></div>
            <div className="space-y-1.5"><Label>状态</Label>
              <Select value={form.status} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["有效","已回款","作废"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>开票单位 <span className="text-destructive">*</span></Label><Input value={form.customer} onChange={e => f("customer", e.target.value)} placeholder="付款方公司名称" /></div>
            <div className="space-y-1.5"><Label>关联合同号</Label><Input value={form.contractNo} onChange={e => f("contractNo", e.target.value)} placeholder="如：25041" /></div>
            <div className="space-y-1.5"><Label>省份 <span className="text-destructive">*</span></Label><Input value={form.province} onChange={e => f("province", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>集团</Label><Input value={form.group} onChange={e => f("group", e.target.value)} placeholder="如：国电投、华能" /></div>
            <div className="space-y-1.5"><Label>场站名称</Label><Input value={form.station} onChange={e => f("station", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>产品线</Label><Input value={form.productLine} onChange={e => f("productLine", e.target.value)} placeholder="如：风电功率预测" /></div>
            <div className="col-span-2 space-y-1.5"><Label>合同项目内容</Label><Input value={form.projectContent} onChange={e => f("projectContent", e.target.value)} placeholder="如：技术服务（电力交易系统转发）" /></div>
            <div className="space-y-1.5"><Label>销售经理 <span className="text-destructive">*</span></Label><Input value={form.salesManager} onChange={e => f("salesManager", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>销售联系人</Label><Input value={form.salesContact} onChange={e => f("salesContact", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>申请开票日期</Label><Input type="date" value={form.applicationDate} onChange={e => f("applicationDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>开票日期 <span className="text-destructive">*</span></Label><Input type="date" value={form.invoiceDate} onChange={e => f("invoiceDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>合同金额（元）</Label><Input type="number" value={form.contractAmount} onChange={e => f("contractAmount", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>发票金额（元）</Label><Input type="number" value={form.amountWithTax} onChange={e => f("amountWithTax", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>税率</Label>
              <Select value={form.taxRate} onValueChange={v => f("taxRate", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["税率6%","税率9%","税率13%"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>不含税金额（元）</Label><Input type="number" value={form.amountWithoutTax} onChange={e => f("amountWithoutTax", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>承诺回款日期</Label><Input type="date" value={form.expectedPaymentDate} onChange={e => f("expectedPaymentDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>承诺回款金额（元）</Label><Input type="number" value={form.expectedPaymentAmount} onChange={e => f("expectedPaymentAmount", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>实际回款日期</Label><Input type="date" value={form.actualPaymentDate} onChange={e => f("actualPaymentDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>实际回款金额（元）</Label><Input type="number" value={form.actualPaymentAmount} onChange={e => f("actualPaymentAmount", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>发票快递单号</Label><Input value={form.courierNo} onChange={e => f("courierNo", e.target.value)} placeholder="如：电子发票 / 顺丰..." /></div>
            <div className="space-y-1.5"><Label>作废时间</Label><Input type="date" value={form.voidDate} onChange={e => f("voidDate", e.target.value)} /></div>
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
          <AlertDialogHeader><AlertDialogTitle>确认删除</AlertDialogTitle><AlertDialogDescription>删除后无法恢复，确定要删除此开票记录吗？</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog open={showImport} onOpenChange={setShowImport} title="开票管理" templateFilename="开票导入模板.csv"
        columns={[
          { key: "invoiceDate", label: "开票日期", required: true },
          { key: "applicationDate", label: "申请开票日期" },
          { key: "contractNo", label: "合同号" },
          { key: "customer", label: "开票单位", required: true },
          { key: "province", label: "省份", required: true },
          { key: "group", label: "集团" },
          { key: "station", label: "场站名称" },
          { key: "productLine", label: "产品线" },
          { key: "projectContent", label: "合同项目内容" },
          { key: "salesManager", label: "销售经理", required: true },
          { key: "salesContact", label: "销售联系人" },
          { key: "contractAmount", label: "合同金额(元)", transform: v => parseFloat(v) || undefined },
          { key: "amountWithTax", label: "发票金额(元)", required: true, transform: v => parseFloat(v) || 0 },
          { key: "taxRate", label: "税率" },
          { key: "amountWithoutTax", label: "不含税金额(元)", transform: v => parseFloat(v) || 0 },
          { key: "expectedPaymentDate", label: "承诺回款日期" },
          { key: "expectedPaymentAmount", label: "承诺回款金额", transform: v => parseFloat(v) || undefined },
          { key: "actualPaymentDate", label: "实际回款日期" },
          { key: "actualPaymentAmount", label: "实际回款金额", transform: v => parseFloat(v) || undefined },
          { key: "courierNo", label: "发票快递单号" },
          { key: "voidDate", label: "作废时间" },
          { key: "status", label: "状态" },
          { key: "notes", label: "备注" },
        ]}
        onImportRow={async (row) => { await createMutation.mutateAsync({ data: row as any }); invalidate(); }}
      />
      <CustomFieldsManager open={showCF} onOpenChange={setShowCF} defs={defs} onAdd={addDef} onDelete={deleteDef} />
    </div>
  );
}

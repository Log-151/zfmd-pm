import { useState, useEffect, useMemo } from "react";
import {
  useListWorkOrders, getListWorkOrdersQueryKey,
  useCreateWorkOrder, useUpdateWorkOrder, useDeleteWorkOrder,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, Trash2, Pencil, Upload, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomFieldDefs } from "@/hooks/use-custom-fields";
import { useColumnOrder, type ColDef } from "@/hooks/use-column-order";
import { CustomFieldsManager } from "@/components/crud/CustomFieldsManager";
import { CustomFieldsSection } from "@/components/crud/CustomFieldsSection";
import { ImportDialog } from "@/components/crud/ImportDialog";

type WorkOrderItem = {
  id: number;
  workOrderNo: string;
  changeNo: string | null;
  contractId: number | null;
  contractNo: string | null;
  cancelTime: string | null;
  costIncurred: string | null;
  costHandling: string | null;
  circulationTime: string | null;
  customer: string;
  province: string;
  group: string;
  station: string;
  stationType: string | null;
  productType: string;
  projectContent: string | null;
  salesManager: string;
  briefingTime: string | null;
  estimatedAmount: number | null;
  estimatedCost: number | null;
  actualAmount: number | null;
  deliveryDept: string | null;
  projectManager: string | null;
  deliveryTime: string | null;
  acceptanceTime: string | null;
  applyDate: string;
  startDate: string | null;
  notes: string | null;
  hasContract: boolean;
  customFields: Record<string, unknown> | null;
};

const EMPTY = {
  workOrderNo: "", changeNo: "", contractNo: "", customer: "",
  cancelTime: "", costIncurred: "", costHandling: "",
  circulationTime: "", province: "", group: "", station: "",
  stationType: "", productType: "风电功率预测", projectContent: "",
  salesManager: "", briefingTime: "",
  estimatedAmount: "", estimatedCost: "", actualAmount: "",
  deliveryDept: "", projectManager: "", deliveryTime: "", acceptanceTime: "",
  applyDate: "", startDate: "", notes: "",
};

const PRODUCT_TYPES = ["风电功率预测", "光伏功率预测", "数值天气预报", "网络安全监测装置", "综合预测平台", "其他"];

const fmtAmt = (v: number | null | undefined) => v != null ? `${v.toFixed(2)}万` : "-";

const WORKORDERS_COLS: ColDef<WorkOrderItem>[] = [
  { key: "workOrderNo", header: "开工申请编号", render: w => w.workOrderNo, className: "font-medium text-sm" },
  { key: "changeNo", header: "变更编号", render: w => w.changeNo || "-", className: "text-sm text-muted-foreground" },
  { key: "contractNo", header: "对应合同编号", render: w => w.contractNo || "-", className: "text-sm text-muted-foreground" },
  { key: "province", header: "省（区）", render: w => w.province, className: "text-sm" },
  { key: "group", header: "集团", render: w => w.group || "-", className: "text-sm" },
  { key: "station", header: "场站名称", render: w => w.station || "-", className: "text-sm" },
  { key: "stationType", header: "场站类型", render: w => w.stationType || "-", className: "text-sm" },
  { key: "productType", header: "产品线", render: w => w.productType, className: "text-sm" },
  { key: "projectContent", header: "开工项目内容", render: w => w.projectContent || "-", className: "text-sm max-w-[130px] truncate" },
  { key: "salesManager", header: "销售经理", render: w => w.salesManager, className: "text-sm" },
  { key: "circulationTime", header: "流转时间", render: w => w.circulationTime || "-", className: "text-sm" },
  { key: "estimatedAmount", header: "预计合同额", render: w => fmtAmt(w.estimatedAmount), csvValue: w => w.estimatedAmount ?? "", className: "text-right text-sm" },
  { key: "estimatedCost", header: "预计成本", render: w => fmtAmt(w.estimatedCost), csvValue: w => w.estimatedCost ?? "", className: "text-right text-sm" },
  { key: "actualAmount", header: "实际合同额", render: w => fmtAmt(w.actualAmount), csvValue: w => w.actualAmount ?? "", className: "text-right text-sm" },
  { key: "deliveryDept", header: "交付部门", render: w => w.deliveryDept || "-", className: "text-sm" },
  { key: "projectManager", header: "项目经理", render: w => w.projectManager || "-", className: "text-sm" },
  { key: "deliveryTime", header: "到货时间", render: w => w.deliveryTime || "-", className: "text-sm" },
  { key: "acceptanceTime", header: "验收时间", render: w => w.acceptanceTime || "-", className: "text-sm" },
];

export default function WorkOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { defs, addDef, deleteDef, reorderDefs } = useCustomFieldDefs("work_orders");
  const { orderedCols, reset: resetCols, getDragProps } = useColumnOrder("work_orders", WORKORDERS_COLS);

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<WorkOrderItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCF, setShowCF] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean | number>>({});

  const queryParams = {
    year: yearFilter !== "all" ? parseInt(yearFilter) : undefined,
    province: provinceFilter !== "all" ? provinceFilter : undefined,
  };
  const { data: workOrders, isLoading } = useListWorkOrders(queryParams, {
    query: { queryKey: getListWorkOrdersQueryKey(queryParams) },
  });

  const filtered = useMemo(() => {
    let items = workOrders ?? [];
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(w =>
        w.workOrderNo.toLowerCase().includes(s) ||
        (w.contractNo ?? "").toLowerCase().includes(s) ||
        w.customer.toLowerCase().includes(s) ||
        w.station.toLowerCase().includes(s) ||
        (w.projectContent ?? "").toLowerCase().includes(s)
      );
    }
    if (productFilter !== "all") items = items.filter(w => w.productType === productFilter);
    return items;
  }, [workOrders, search, productFilter]);

  const provinces = useMemo(() => [...new Set((workOrders ?? []).map(w => w.province).filter(Boolean))].sort(), [workOrders]);
  const totalEstimated = useMemo(() => filtered.reduce((s, w) => s + (w.estimatedAmount ?? 0), 0), [filtered]);
  const totalCost = useMemo(() => filtered.reduce((s, w) => s + (w.estimatedCost ?? 0), 0), [filtered]);

  useEffect(() => {
    if (editItem) {
      setForm({
        workOrderNo: editItem.workOrderNo,
        changeNo: editItem.changeNo ?? "",
        contractNo: editItem.contractNo ?? "",
        customer: editItem.customer ?? "",
        cancelTime: editItem.cancelTime ?? "",
        costIncurred: editItem.costIncurred ?? "",
        costHandling: editItem.costHandling ?? "",
        circulationTime: editItem.circulationTime ?? "",
        province: editItem.province,
        group: editItem.group,
        station: editItem.station,
        stationType: editItem.stationType ?? "",
        productType: editItem.productType,
        projectContent: editItem.projectContent ?? "",
        salesManager: editItem.salesManager,
        briefingTime: editItem.briefingTime ?? "",
        estimatedAmount: editItem.estimatedAmount != null ? String(editItem.estimatedAmount) : "",
        estimatedCost: editItem.estimatedCost != null ? String(editItem.estimatedCost) : "",
        actualAmount: editItem.actualAmount != null ? String(editItem.actualAmount) : "",
        deliveryDept: editItem.deliveryDept ?? "",
        projectManager: editItem.projectManager ?? "",
        deliveryTime: editItem.deliveryTime ?? "",
        acceptanceTime: editItem.acceptanceTime ?? "",
        applyDate: editItem.applyDate ?? "",
        startDate: editItem.startDate ?? "",
        notes: editItem.notes ?? "",
      });
      setCustomFieldValues((editItem.customFields ?? {}) as Record<string, string | boolean | number>);
    } else {
      setForm({ ...EMPTY });
      setCustomFieldValues({});
    }
  }, [editItem]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListWorkOrdersQueryKey() });

  const createMutation = useCreateWorkOrder({
    mutation: {
      onSuccess: () => { invalidate(); setShowCreate(false); toast({ title: "开工申请已创建" }); },
      onError: () => toast({ title: "创建失败", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateWorkOrder({
    mutation: {
      onSuccess: () => { invalidate(); setEditItem(null); toast({ title: "开工申请已更新" }); },
      onError: () => toast({ title: "更新失败", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteWorkOrder({
    mutation: {
      onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "开工申请已删除" }); },
      onError: () => toast({ title: "删除失败", variant: "destructive" }),
    },
  });

  const buildPayload = () => ({
    ...form,
    estimatedAmount: form.estimatedAmount ? parseFloat(form.estimatedAmount) : undefined,
    estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
    actualAmount: form.actualAmount ? parseFloat(form.actualAmount) : undefined,
    changeNo: form.changeNo || undefined,
    contractNo: form.contractNo || undefined,
    cancelTime: form.cancelTime || undefined,
    costIncurred: form.costIncurred || undefined,
    costHandling: form.costHandling || undefined,
    circulationTime: form.circulationTime || undefined,
    stationType: form.stationType || undefined,
    projectContent: form.projectContent || undefined,
    briefingTime: form.briefingTime || undefined,
    deliveryDept: form.deliveryDept || undefined,
    projectManager: form.projectManager || undefined,
    deliveryTime: form.deliveryTime || undefined,
    acceptanceTime: form.acceptanceTime || undefined,
    startDate: form.startDate || undefined,
    notes: form.notes || undefined,
    customFields: customFieldValues,
  });

  const handleSubmit = () => {
    if (!form.workOrderNo || !form.province || !form.salesManager) {
      toast({ title: "请填写必填项（开工申请编号、省份、销售经理）", variant: "destructive" });
      return;
    }
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: buildPayload() as any });
    } else {
      createMutation.mutate({ data: buildPayload() as any });
    }
  };

  const f = (k: keyof typeof EMPTY, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleExport = () => {
    exportToCsv("开工申请列表", filtered as any, orderedCols.map(col => ({
      header: col.header,
      accessor: (row: any) => { const cv = col.csvValue; if (cv) return cv(row as WorkOrderItem); const v = col.render(row as WorkOrderItem); return typeof v === "string" || typeof v === "number" ? v : String(v ?? ""); },
    })));
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">开工申请</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="重置列顺序" onClick={resetCols}><span className="text-xs">重置列</span></Button>
          <Button variant="ghost" size="icon" title="自定义字段" onClick={() => setShowCF(true)}><Settings className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="w-4 h-4 mr-2" /> 批量导入</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> 导出 CSV</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setShowCreate(true); }}><Plus className="w-4 h-4 mr-2" /> 新建开工申请</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "开工申请数", value: String(filtered.length), sub: `共 ${workOrders?.length ?? 0} 条记录` },
          { label: "预计合同总额", value: `${totalEstimated.toFixed(2)} 万`, sub: "当前筛选" },
          { label: "预计成本合计", value: `${totalCost.toFixed(2)} 万`, sub: "当前筛选" },
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
          <Input placeholder="搜索编号、场站、内容..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {[
          { label: "年份", value: yearFilter, onChange: setYearFilter, options: [{ v: "all", l: "全部年份" }, ...[2026,2025,2024,2023,2022,2021,2020,2019,2018,2017].map(y => ({ v: String(y), l: String(y) }))] },
          { label: "省份", value: provinceFilter, onChange: setProvinceFilter, options: [{ v: "all", l: "全部省份" }, ...provinces.map(p => ({ v: p, l: p }))] },
          { label: "产品线", value: productFilter, onChange: setProductFilter, options: [{ v: "all", l: "全部产品线" }, ...PRODUCT_TYPES.map(t => ({ v: t, l: t }))] },
        ].map(sel => (
          <Select key={sel.label} value={sel.value} onValueChange={sel.onChange}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder={sel.label} /></SelectTrigger>
            <SelectContent>{sel.options.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
          </Select>
        ))}
        {(search || yearFilter !== "all" || provinceFilter !== "all" || productFilter !== "all") && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setYearFilter("all"); setProvinceFilter("all"); setProductFilter("all"); }}>清除筛选</Button>
        )}
      </div>

      <div className="bg-card rounded-lg border shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                {orderedCols.map((col, idx) => (
                  <TableHead key={col.key} {...getDragProps(idx)}>{col.header}</TableHead>
                ))}
                {defs.map(d => <TableHead key={d.fieldName}>{d.fieldLabel}</TableHead>)}
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={orderedCols.length + 1 + defs.length} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : !filtered.length ? (
                <TableRow><TableCell colSpan={orderedCols.length + 1 + defs.length} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : (
                filtered.map(wo => (
                  <TableRow key={wo.id} className="hover:bg-muted/50">
                    {orderedCols.map(col => (
                      <TableCell key={col.key} className={col.className}>{col.render(wo as unknown as WorkOrderItem)}</TableCell>
                    ))}
                    {defs.map(d => <TableCell key={d.fieldName} className="text-sm text-muted-foreground">{String(((wo as any).customFields ?? {})[d.fieldName] ?? "")}</TableCell>)}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditItem(wo as any)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(wo.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showCreate || editItem !== null} onOpenChange={v => { if (!v) { setShowCreate(false); setEditItem(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "编辑开工申请" : "新建开工申请"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5"><Label>开工申请编号 <span className="text-destructive">*</span></Label><Input value={form.workOrderNo} onChange={e => f("workOrderNo", e.target.value)} placeholder="如 ZFMD/KGSQ-26001" /></div>
            <div className="space-y-1.5"><Label>开工变更申请表编号</Label><Input value={form.changeNo} onChange={e => f("changeNo", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>对应合同编号</Label><Input value={form.contractNo} onChange={e => f("contractNo", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>开工申请取消时间</Label><Input value={form.cancelTime} onChange={e => f("cancelTime", e.target.value)} placeholder="如 2026.1.15" /></div>
            <div className="space-y-1.5"><Label>是否发生成本费用</Label>
              <Select value={form.costIncurred || "none"} onValueChange={v => f("costIncurred", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {["是", "否"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>成本费用处理</Label><Input value={form.costHandling} onChange={e => f("costHandling", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>开工申请流转时间</Label><Input value={form.circulationTime} onChange={e => f("circulationTime", e.target.value)} placeholder="如 2026.1.17" /></div>
            <div className="space-y-1.5"><Label>省（区）<span className="text-destructive">*</span></Label><Input value={form.province} onChange={e => f("province", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>集团</Label><Input value={form.group} onChange={e => f("group", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>场站名称</Label><Input value={form.station} onChange={e => f("station", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>场站类型</Label>
              <Select value={form.stationType || "none"} onValueChange={v => f("stationType", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {["风电场", "光伏电站", "其他"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>产品线</Label>
              <Select value={form.productType} onValueChange={v => f("productType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>开工项目内容</Label><Input value={form.projectContent} onChange={e => f("projectContent", e.target.value)} placeholder="如：短期软件；超短期软件；系统硬件；预测服务2年" /></div>
            <div className="space-y-1.5"><Label>销售经理 <span className="text-destructive">*</span></Label><Input value={form.salesManager} onChange={e => f("salesManager", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>项目交底会时间</Label><Input value={form.briefingTime} onChange={e => f("briefingTime", e.target.value)} placeholder="如 2026.1.20" /></div>
            <div className="space-y-1.5"><Label>预计合同金额（万元）</Label><Input type="number" step="0.01" value={form.estimatedAmount} onChange={e => f("estimatedAmount", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>预计成本（万元）</Label><Input type="number" step="0.01" value={form.estimatedCost} onChange={e => f("estimatedCost", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>实际合同金额（万元）</Label><Input type="number" step="0.01" value={form.actualAmount} onChange={e => f("actualAmount", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>交付部门</Label><Input value={form.deliveryDept} onChange={e => f("deliveryDept", e.target.value)} placeholder="如：工程项目部" /></div>
            <div className="space-y-1.5"><Label>项目经理</Label><Input value={form.projectManager} onChange={e => f("projectManager", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>到货时间</Label><Input value={form.deliveryTime} onChange={e => f("deliveryTime", e.target.value)} placeholder="如 2026.2.7" /></div>
            <div className="space-y-1.5"><Label>验收时间</Label><Input value={form.acceptanceTime} onChange={e => f("acceptanceTime", e.target.value)} placeholder="如 2026.2.7" /></div>
            <div className="col-span-2 space-y-1.5"><Label>备注</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} /></div>
            <div className="col-span-2"><CustomFieldsSection defs={defs} values={customFieldValues} onChange={setCustomFieldValues} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditItem(null); }}>取消</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? "保存中..." : editItem ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认删除</AlertDialogTitle><AlertDialogDescription>删除后无法恢复，确定要删除该开工申请吗？</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog open={showImport} onOpenChange={setShowImport} title="开工申请" templateFilename="开工申请导入模板.csv"
        columns={[
          { key: "workOrderNo", label: "开工申请编号", required: true },
          { key: "changeNo", label: "开工变更申请表编号" },
          { key: "contractNo", label: "对应合同编号" },
          { key: "cancelTime", label: "开工申请取消时间" },
          { key: "costIncurred", label: "是否发生成本费用" },
          { key: "costHandling", label: "成本费用处理" },
          { key: "circulationTime", label: "开工申请流转时间" },
          { key: "province", label: "省（区）", required: true },
          { key: "group", label: "集团" },
          { key: "station", label: "场站名称" },
          { key: "stationType", label: "场站类型" },
          { key: "productType", label: "产品线" },
          { key: "projectContent", label: "开工项目内容" },
          { key: "salesManager", label: "销售经理", required: true },
          { key: "briefingTime", label: "项目交底会时间" },
          { key: "estimatedAmount", label: "预计合同金额(万元)", transform: v => parseFloat(v) || undefined },
          { key: "estimatedCost", label: "预计成本(万元)", transform: v => parseFloat(v) || undefined },
          { key: "actualAmount", label: "实际合同金额(万元)", transform: v => parseFloat(v) || undefined },
          { key: "deliveryDept", label: "交付部门" },
          { key: "projectManager", label: "项目经理" },
          { key: "deliveryTime", label: "到货时间" },
          { key: "acceptanceTime", label: "验收时间" },
          { key: "notes", label: "备注" },
        ]}
        onImportRow={async (row) => { await createMutation.mutateAsync({ data: row as any }); invalidate(); }}
      />
      <CustomFieldsManager open={showCF} onOpenChange={setShowCF} defs={defs} onAdd={addDef} onDelete={deleteDef} onReorder={reorderDefs} />
    </div>
  );
}

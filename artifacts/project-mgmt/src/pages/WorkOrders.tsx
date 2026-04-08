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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, Trash2, Pencil, Upload, Settings, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomFieldDefs } from "@/hooks/use-custom-fields";
import { CustomFieldsManager } from "@/components/crud/CustomFieldsManager";
import { CustomFieldsSection } from "@/components/crud/CustomFieldsSection";
import { ImportDialog } from "@/components/crud/ImportDialog";

type WorkOrderItem = { id: number; workOrderNo: string; contractId: number | null; contractNo: string | null; customer: string; province: string; group: string; station: string; salesManager: string; productType: string; applyDate: string; startDate: string | null; notes: string | null; hasContract: boolean; customFields: Record<string, unknown> | null };

const EMPTY = {
  workOrderNo: "", contractNo: "", customer: "", province: "", group: "", station: "",
  salesManager: "", productType: "数值天气预报", applyDate: "", startDate: "", notes: "", customFields: {} as Record<string, unknown> | null,
};

const PRODUCT_TYPES = ["数值天气预报", "功率预测系统", "综合预测平台", "其他"];

export default function WorkOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { defs, addDef, deleteDef } = useCustomFieldDefs("work_orders");

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [noContractOnly, setNoContractOnly] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<WorkOrderItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCF, setShowCF] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean | number>>({});

  const qp = {
    province: provinceFilter !== "all" ? provinceFilter : undefined,
    year: yearFilter !== "all" ? parseInt(yearFilter) : undefined,
    noContract: noContractOnly || undefined,
  };
  const { data: workOrders, isLoading } = useListWorkOrders(qp, { query: { queryKey: getListWorkOrdersQueryKey(qp) } });

  const filtered = useMemo(() => {
    if (!workOrders) return [];
    let result = workOrders;
    if (search) result = result.filter(w => w.workOrderNo.includes(search) || w.customer.includes(search) || w.station?.includes(search));
    if (productFilter !== "all") result = result.filter(w => w.productType === productFilter);
    return result;
  }, [workOrders, search, productFilter]);

  const provinces = useMemo(() => [...new Set((workOrders ?? []).map(w => w.province).filter(Boolean))].sort(), [workOrders]);
  const withContractCount = useMemo(() => filtered.filter(w => w.hasContract).length, [filtered]);
  const withoutContractCount = useMemo(() => filtered.filter(w => !w.hasContract).length, [filtered]);

  useEffect(() => {
    if (editItem) {
      setForm({ workOrderNo: editItem.workOrderNo, contractNo: editItem.contractNo ?? "", customer: editItem.customer, province: editItem.province, group: editItem.group, station: editItem.station, salesManager: editItem.salesManager, productType: editItem.productType, applyDate: editItem.applyDate, startDate: editItem.startDate ?? "", notes: editItem.notes ?? "", customFields: {} });
      setCustomFieldValues((editItem.customFields ?? {}) as Record<string, string | boolean | number>);
    } else {
      setForm({ ...EMPTY });
      setCustomFieldValues({});
    }
  }, [editItem]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListWorkOrdersQueryKey() });

  const createMutation = useCreateWorkOrder({ mutation: { onSuccess: () => { invalidate(); setShowCreate(false); toast({ title: "开工申请已创建" }); }, onError: () => toast({ title: "操作失败", variant: "destructive" }) } });
  const updateMutation = useUpdateWorkOrder({ mutation: { onSuccess: () => { invalidate(); setEditItem(null); toast({ title: "已更新" }); }, onError: () => toast({ title: "操作失败", variant: "destructive" }) } });
  const deleteMutation = useDeleteWorkOrder({ mutation: { onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "已删除" }); }, onError: () => toast({ title: "删除失败", variant: "destructive" }) } });

  const handleSubmit = () => {
    if (!form.workOrderNo || !form.customer || !form.province || !form.salesManager || !form.applyDate) {
      toast({ title: "请填写必填项", variant: "destructive" }); return;
    }
    const data = { ...form, contractNo: form.contractNo || undefined, startDate: form.startDate || undefined, notes: form.notes || undefined };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: { ...data, customFields: customFieldValues } as any });
    } else {
      createMutation.mutate({ data: { ...data, customFields: customFieldValues } as any });
    }
  };

  const f = (k: keyof typeof EMPTY, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleExport = () => {
    exportToCsv("开工申请", filtered, [
      { header: "申请单号", accessor: w => w.workOrderNo },
      { header: "客户名称", accessor: w => w.customer },
      { header: "产品类型", accessor: w => w.productType },
      { header: "省份", accessor: w => w.province },
      { header: "销售经理", accessor: w => w.salesManager },
      { header: "申请日期", accessor: w => formatDate(w.applyDate) },
      { header: "关联合同", accessor: w => w.contractNo || "无" },
      { header: "有无合同", accessor: w => w.hasContract ? "有" : "无" },
    ]);
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">开工申请</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="自定义字段" onClick={() => setShowCF(true)}><Settings className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="w-4 h-4 mr-2" /> 批量导入</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> 导出 CSV</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setShowCreate(true); }}><Plus className="w-4 h-4 mr-2" /> 新建开工申请</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "申请总数", value: String(filtered.length), sub: "条开工申请" },
          { label: "已有合同", value: String(withContractCount), sub: `占比 ${filtered.length ? Math.round(withContractCount / filtered.length * 100) : 0}%` },
          { label: "无合同风险", value: String(withoutContractCount), sub: "需跟进" },
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
          <Input placeholder="搜索申请单号、客户、场站..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {[
          { label: "年份", value: yearFilter, onChange: setYearFilter, options: [{ v: "all", l: "全部年份" }, ...[2026,2025,2024,2023,2022].map(y => ({ v: String(y), l: String(y) }))] },
          { label: "省份", value: provinceFilter, onChange: setProvinceFilter, options: [{ v: "all", l: "全部省份" }, ...provinces.map(p => ({ v: p, l: p }))] },
          { label: "产品类型", value: productFilter, onChange: setProductFilter, options: [{ v: "all", l: "全部类型" }, ...PRODUCT_TYPES.map(t => ({ v: t, l: t }))] },
        ].map(sel => (
          <Select key={sel.label} value={sel.value} onValueChange={sel.onChange}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder={sel.label} /></SelectTrigger>
            <SelectContent>{sel.options.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
          </Select>
        ))}
        <div className="flex items-center gap-2">
          <Checkbox id="noContract" checked={noContractOnly} onCheckedChange={v => setNoContractOnly(!!v)} />
          <label htmlFor="noContract" className="text-sm cursor-pointer">仅无合同</label>
        </div>
        {(search || yearFilter !== "all" || provinceFilter !== "all" || productFilter !== "all" || noContractOnly) && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setYearFilter("all"); setProvinceFilter("all"); setProductFilter("all"); setNoContractOnly(false); }}>清除筛选</Button>
        )}
      </div>

      <div className="bg-card rounded-lg border shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead>申请单号</TableHead>
                <TableHead>客户名称</TableHead>
                <TableHead>产品类型</TableHead>
                <TableHead>省份</TableHead>
                <TableHead>销售经理</TableHead>
                <TableHead>申请日期</TableHead>
                <TableHead>关联合同</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : !filtered.length ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : filtered.map(wo => (
                <TableRow key={wo.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{wo.workOrderNo}</TableCell>
                  <TableCell className="max-w-[160px] truncate" title={wo.customer}>{wo.customer}</TableCell>
                  <TableCell><Badge variant="outline">{wo.productType}</Badge></TableCell>
                  <TableCell>{wo.province}</TableCell>
                  <TableCell>{wo.salesManager}</TableCell>
                  <TableCell>{formatDate(wo.applyDate)}</TableCell>
                  <TableCell>
                    {wo.hasContract ? (
                      <span className="text-muted-foreground text-sm">{wo.contractNo}</span>
                    ) : (
                      <Badge variant="destructive" className="gap-1 flex w-fit text-xs"><AlertTriangle className="w-3 h-3" /> 无合同</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditItem(wo as any)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(wo.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{editItem ? "编辑开工申请" : "新建开工申请"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5"><Label>申请单号 <span className="text-destructive">*</span></Label><Input value={form.workOrderNo} onChange={e => f("workOrderNo", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>产品类型</Label>
              <Select value={form.productType} onValueChange={v => f("productType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>客户名称 <span className="text-destructive">*</span></Label><Input value={form.customer} onChange={e => f("customer", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>省份 <span className="text-destructive">*</span></Label><Input value={form.province} onChange={e => f("province", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>集团</Label><Input value={form.group} onChange={e => f("group", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>场站</Label><Input value={form.station} onChange={e => f("station", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>销售经理 <span className="text-destructive">*</span></Label><Input value={form.salesManager} onChange={e => f("salesManager", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>申请日期 <span className="text-destructive">*</span></Label><Input type="date" value={form.applyDate} onChange={e => f("applyDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>开始日期</Label><Input type="date" value={form.startDate} onChange={e => f("startDate", e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>关联合同号</Label><Input value={form.contractNo} onChange={e => f("contractNo", e.target.value)} /></div>
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
          <AlertDialogHeader><AlertDialogTitle>确认删除</AlertDialogTitle><AlertDialogDescription>确定要删除此开工申请吗？</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog open={showImport} onOpenChange={setShowImport} title="开工申请" templateFilename="开工申请导入模板.csv"
        columns={[
          { key: "workOrderNo", label: "申请单号", required: true },
          { key: "customer", label: "客户名称", required: true },
          { key: "province", label: "省份", required: true },
          { key: "group", label: "集团" },
          { key: "station", label: "场站" },
          { key: "salesManager", label: "销售经理", required: true },
          { key: "productType", label: "产品类型" },
          { key: "applyDate", label: "申请日期", required: true },
          { key: "contractNo", label: "关联合同号" },
        ]}
        onImportRow={async (row) => { await createMutation.mutateAsync({ data: row as any }); invalidate(); }}
      />
      <CustomFieldsManager open={showCF} onOpenChange={setShowCF} defs={defs} onAdd={addDef} onDelete={deleteDef} />
    </div>
  );
}

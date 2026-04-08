import { useState, useEffect, useMemo } from "react";
import {
  useListContracts,
  getListContractsQueryKey,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatWanYuan, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, Trash2, Pencil, Upload, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCustomFieldDefs } from "@/hooks/use-custom-fields";
import { CustomFieldsManager } from "@/components/crud/CustomFieldsManager";
import { CustomFieldsSection } from "@/components/crud/CustomFieldsSection";
import { ImportDialog } from "@/components/crud/ImportDialog";

type ContractItem = { id: number; contractNo: string; contractName: string; contractType: string; status: string; customer: string; province: string; group: string; station: string; salesManager: string; signDate: string | null; startDate: string | null; endDate: string | null; amountWithTax: number; amountWithoutTax: number; productType: string; workOrderNo: string | null; afterSaleNo: string | null; notes: string | null; isSpecial: boolean; customFields: Record<string, unknown> | null };

const EMPTY_FORM = {
  contractNo: "", contractName: "", contractType: "销售合同", status: "执行中",
  customer: "", province: "", group: "", station: "", salesManager: "",
  signDate: "", startDate: "", endDate: "",
  amountWithTax: "", amountWithoutTax: "",
  productType: "数值天气预报", workOrderNo: "", afterSaleNo: "", notes: "", isSpecial: false,
};

export default function Contracts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { defs, addDef, deleteDef } = useCustomFieldDefs("contracts");

  const [search, setSearch] = useState("");
  const [year, setYear] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<ContractItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCF, setShowCF] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean | number>>({});

  const queryParams = {
    search: search || undefined,
    year: year === "all" ? undefined : parseInt(year),
    status: statusFilter !== "all" ? statusFilter : undefined,
    province: provinceFilter !== "all" ? provinceFilter : undefined,
  };
  const { data: contracts, isLoading } = useListContracts(queryParams, {
    query: { queryKey: getListContractsQueryKey(queryParams) },
  });

  const provinces = useMemo(() => [...new Set((contracts ?? []).map(c => c.province).filter(Boolean))].sort(), [contracts]);
  const totalWithTax = useMemo(() => (contracts ?? []).reduce((s, c) => s + c.amountWithTax, 0), [contracts]);
  const activeCount = useMemo(() => (contracts ?? []).filter(c => c.status === "执行中").length, [contracts]);

  useEffect(() => {
    if (editItem) {
      setForm({
        contractNo: editItem.contractNo, contractName: editItem.contractName, contractType: editItem.contractType,
        status: editItem.status, customer: editItem.customer, province: editItem.province,
        group: editItem.group, station: editItem.station, salesManager: editItem.salesManager,
        signDate: editItem.signDate ?? "", startDate: editItem.startDate ?? "", endDate: editItem.endDate ?? "",
        amountWithTax: String(editItem.amountWithTax), amountWithoutTax: String(editItem.amountWithoutTax),
        productType: editItem.productType, workOrderNo: editItem.workOrderNo ?? "",
        afterSaleNo: editItem.afterSaleNo ?? "", notes: editItem.notes ?? "", isSpecial: editItem.isSpecial,
      });
      setCustomFieldValues((editItem.customFields ?? {}) as Record<string, string | boolean | number>);
    } else {
      setForm({ ...EMPTY_FORM });
      setCustomFieldValues({});
    }
  }, [editItem]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });

  const createMutation = useCreateContract({
    mutation: {
      onSuccess: () => { invalidate(); setShowCreate(false); toast({ title: "合同已创建" }); },
      onError: () => toast({ title: "创建失败", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateContract({
    mutation: {
      onSuccess: () => { invalidate(); setEditItem(null); toast({ title: "合同已更新" }); },
      onError: () => toast({ title: "更新失败", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteContract({
    mutation: {
      onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "合同已删除" }); },
      onError: () => toast({ title: "删除失败", variant: "destructive" }),
    },
  });

  const handleSubmit = () => {
    if (!form.contractNo || !form.contractName || !form.customer || !form.province || !form.salesManager) {
      toast({ title: "请填写必填项（合同编号、名称、客户、省份、销售经理）", variant: "destructive" });
      return;
    }
    const data = {
      ...form,
      amountWithTax: parseFloat(form.amountWithTax) || 0,
      amountWithoutTax: parseFloat(form.amountWithoutTax) || 0,
      signDate: form.signDate || undefined, startDate: form.startDate || undefined, endDate: form.endDate || undefined,
      workOrderNo: form.workOrderNo || undefined, afterSaleNo: form.afterSaleNo || undefined, notes: form.notes || undefined,
      customFields: customFieldValues,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: data as any });
    } else {
      createMutation.mutate({ data: data as any });
    }
  };

  const f = (k: keyof typeof EMPTY_FORM, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleExport = () => {
    if (!contracts) return;
    exportToCsv("合同列表", contracts, [
      { header: "合同编号", accessor: c => c.contractNo },
      { header: "合同名称", accessor: c => c.contractName },
      { header: "客户名称", accessor: c => c.customer },
      { header: "省份", accessor: c => c.province },
      { header: "集团", accessor: c => c.group },
      { header: "场站", accessor: c => c.station },
      { header: "销售经理", accessor: c => c.salesManager },
      { header: "含税金额", accessor: c => c.amountWithTax },
      { header: "不含税金额", accessor: c => c.amountWithoutTax },
      { header: "产品类型", accessor: c => c.productType },
      { header: "签订日期", accessor: c => formatDate(c.signDate) },
      { header: "开始日期", accessor: c => formatDate(c.startDate) },
      { header: "结束日期", accessor: c => formatDate(c.endDate) },
      { header: "状态", accessor: c => c.status },
    ]);
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">合同管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="自定义字段" onClick={() => setShowCF(true)}><Settings className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="w-4 h-4 mr-2" /> 批量导入</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> 导出 CSV</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setShowCreate(true); }}><Plus className="w-4 h-4 mr-2" /> 新建合同</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "合同总金额", value: formatWanYuan(totalWithTax), sub: `共 ${contracts?.length ?? 0} 份` },
          { label: "执行中", value: String(activeCount), sub: "当前有效合同" },
          { label: "本年新签", value: String((contracts ?? []).filter(c => c.signDate?.startsWith(String(new Date().getFullYear()))).length), sub: `${new Date().getFullYear()} 年` },
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
          <Input placeholder="搜索合同编号、名称、客户..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {[
          { label: "年份", value: year, onChange: setYear, options: [{ v: "all", l: "全部年份" }, ...[2026,2025,2024,2023,2022,2021].map(y => ({ v: String(y), l: String(y) }))] },
          { label: "省份", value: provinceFilter, onChange: setProvinceFilter, options: [{ v: "all", l: "全部省份" }, ...provinces.map(p => ({ v: p, l: p }))] },
          { label: "状态", value: statusFilter, onChange: setStatusFilter, options: [{ v: "all", l: "全部状态" }, { v: "执行中", l: "执行中" }, { v: "已完成", l: "已完成" }, { v: "已终止", l: "已终止" }] },
        ].map(sel => (
          <Select key={sel.label} value={sel.value} onValueChange={sel.onChange}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder={sel.label} /></SelectTrigger>
            <SelectContent>{sel.options.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
          </Select>
        ))}
        {(search || year !== "all" || provinceFilter !== "all" || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setYear("all"); setProvinceFilter("all"); setStatusFilter("all"); }}>清除筛选</Button>
        )}
      </div>

      <div className="bg-card rounded-lg border shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead>合同编号</TableHead>
                <TableHead>合同名称</TableHead>
                <TableHead>客户名称</TableHead>
                <TableHead>省份</TableHead>
                <TableHead>销售经理</TableHead>
                <TableHead className="text-right">含税金额</TableHead>
                <TableHead>签订日期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : !contracts?.length ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : (
                contracts.map(contract => (
                  <TableRow key={contract.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{contract.contractNo}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={contract.contractName}>{contract.contractName}</TableCell>
                    <TableCell className="max-w-[150px] truncate" title={contract.customer}>{contract.customer}</TableCell>
                    <TableCell>{contract.province}</TableCell>
                    <TableCell>{contract.salesManager}</TableCell>
                    <TableCell className="text-right font-medium">{formatWanYuan(contract.amountWithTax)}</TableCell>
                    <TableCell>{formatDate(contract.signDate)}</TableCell>
                    <TableCell>
                      <Badge variant={contract.status === "执行中" ? "default" : "secondary"}>{contract.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditItem(contract as any)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(contract.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "编辑合同" : "新建合同"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5"><Label>合同编号 <span className="text-destructive">*</span></Label><Input value={form.contractNo} onChange={e => f("contractNo", e.target.value)} placeholder="如 HT-2024-001" /></div>
            <div className="space-y-1.5"><Label>合同类型</Label>
              <Select value={form.contractType} onValueChange={v => f("contractType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["销售合同","续签合同","框架合同"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>合同名称 <span className="text-destructive">*</span></Label><Input value={form.contractName} onChange={e => f("contractName", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>客户名称 <span className="text-destructive">*</span></Label><Input value={form.customer} onChange={e => f("customer", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>销售经理 <span className="text-destructive">*</span></Label><Input value={form.salesManager} onChange={e => f("salesManager", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>省份 <span className="text-destructive">*</span></Label><Input value={form.province} onChange={e => f("province", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>集团</Label><Input value={form.group} onChange={e => f("group", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>场站</Label><Input value={form.station} onChange={e => f("station", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>产品类型</Label>
              <Select value={form.productType} onValueChange={v => f("productType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["数值天气预报","功率预测系统","综合预测平台","其他"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>状态</Label>
              <Select value={form.status} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["执行中","已完成","已终止"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>含税金额（元）</Label><Input type="number" value={form.amountWithTax} onChange={e => f("amountWithTax", e.target.value)} placeholder="0.00" /></div>
            <div className="space-y-1.5"><Label>不含税金额（元）</Label><Input type="number" value={form.amountWithoutTax} onChange={e => f("amountWithoutTax", e.target.value)} placeholder="0.00" /></div>
            <div className="space-y-1.5"><Label>签订日期</Label><Input type="date" value={form.signDate} onChange={e => f("signDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>开始日期</Label><Input type="date" value={form.startDate} onChange={e => f("startDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>结束日期</Label><Input type="date" value={form.endDate} onChange={e => f("endDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>开工号</Label><Input value={form.workOrderNo} onChange={e => f("workOrderNo", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>售后号</Label><Input value={form.afterSaleNo} onChange={e => f("afterSaleNo", e.target.value)} /></div>
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
          <AlertDialogHeader><AlertDialogTitle>确认删除</AlertDialogTitle><AlertDialogDescription>删除后无法恢复，确定要删除该合同吗？</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog open={showImport} onOpenChange={setShowImport} title="合同管理" templateFilename="合同导入模板.csv"
        columns={[
          { key: "contractNo", label: "合同编号", required: true },
          { key: "contractName", label: "合同名称", required: true },
          { key: "customer", label: "客户名称", required: true },
          { key: "province", label: "省份", required: true },
          { key: "salesManager", label: "销售经理", required: true },
          { key: "contractType", label: "合同类型" },
          { key: "productType", label: "产品类型" },
          { key: "amountWithTax", label: "含税金额", transform: v => parseFloat(v) || 0 },
          { key: "amountWithoutTax", label: "不含税金额", transform: v => parseFloat(v) || 0 },
          { key: "signDate", label: "签订日期" },
          { key: "startDate", label: "开始日期" },
          { key: "endDate", label: "结束日期" },
          { key: "status", label: "状态" },
        ]}
        onImportRow={async (row) => { await createMutation.mutateAsync({ data: row as any }); invalidate(); }}
      />
      <CustomFieldsManager open={showCF} onOpenChange={setShowCF} defs={defs} onAdd={addDef} onDelete={deleteDef} />
    </div>
  );
}

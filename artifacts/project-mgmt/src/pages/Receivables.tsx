import { useState, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, Trash2, Pencil, Upload, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomFieldDefs } from "@/hooks/use-custom-fields";
import { CustomFieldsManager } from "@/components/crud/CustomFieldsManager";
import { CustomFieldsSection } from "@/components/crud/CustomFieldsSection";
import { ImportDialog } from "@/components/crud/ImportDialog";

type RItem = {
  id: number;
  salesManager: string;
  salesContact?: string | null;
  province: string;
  group?: string | null;
  station?: string | null;
  contractNo?: string | null;
  productLine?: string | null;
  projectContent?: string | null;
  contractAmount?: number | null;
  receivableName?: string | null;
  amount: number;
  receivableDate?: string | null;
  pendingDate?: string | null;
  committedPeriodDate?: string | null;
  committedPaymentDate?: string | null;
  committedAmount?: number | null;
  actualPaymentDate?: string | null;
  actualAmount?: number | null;
  overdueMonths?: string | null;
  actualInvoiceDate?: string | null;
  actualDeliveryDate?: string | null;
  actualAcceptanceDate?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  customFields?: Record<string, unknown> | null;
};

const EMPTY: Omit<RItem, "id"> = {
  salesManager: "", salesContact: "", province: "", group: "", station: "", contractNo: "",
  productLine: "", projectContent: "", contractAmount: null, receivableName: "", amount: 0,
  receivableDate: "", pendingDate: "", committedPeriodDate: "", committedPaymentDate: "",
  committedAmount: null, actualPaymentDate: "", actualAmount: null, overdueMonths: "",
  actualInvoiceDate: "", actualDeliveryDate: "", actualAcceptanceDate: "",
  paymentTerms: "", notes: "", customFields: {},
};


export default function Receivables() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { defs = [], addDef, deleteDef, reorderDefs } = useCustomFieldDefs("receivables");

  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<RItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCF, setShowCF] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean | number>>({});

  const qp = {
    province: provinceFilter !== "all" ? provinceFilter : undefined,
    salesManager: managerFilter !== "all" ? managerFilter : undefined,
  };

  const { data: items = [], isLoading } = useListReceivables(qp);
  const createMut = useCreateReceivable();
  const updateMut = useUpdateReceivable();
  const deleteMut = useDeleteReceivable();

  const filtered = useMemo(() => {
    if (!search) return items as RItem[];
    const s = search.toLowerCase();
    return (items as RItem[]).filter(r =>
      r.salesManager?.toLowerCase().includes(s) ||
      r.station?.toLowerCase().includes(s) ||
      r.contractNo?.toLowerCase().includes(s) ||
      r.receivableName?.toLowerCase().includes(s) ||
      r.group?.toLowerCase().includes(s)
    );
  }, [items, search]);

  const provinces = useMemo(() => [...new Set((items as RItem[]).map(r => r.province).filter(Boolean))].sort(), [items]);
  const managers = useMemo(() => [...new Set((items as RItem[]).map(r => r.salesManager).filter(Boolean))].sort(), [items]);
  const totalAmount = useMemo(() => filtered.reduce((s, r) => s + (r.amount ?? 0), 0), [filtered]);
  const totalActual = useMemo(() => filtered.reduce((s, r) => s + (r.actualAmount ?? 0), 0), [filtered]);

  function openCreate() { setForm({ ...EMPTY }); setCustomFieldValues({}); setShowCreate(true); }
  function openEdit(item: RItem) {
    setForm({ ...item, customFields: item.customFields ?? {} });
    setCustomFieldValues(Object.fromEntries(Object.entries(item.customFields ?? {}).map(([k, v]) => [k, v as string])));
    setEditItem(item);
  }

  function buildPayload() {
    const cf: Record<string, unknown> = {};
    defs.forEach(d => { if (customFieldValues[d.fieldName] !== undefined) cf[d.fieldName] = customFieldValues[d.fieldName]; });
    return {
      salesManager: form.salesManager || "",
      salesContact: form.salesContact || undefined,
      province: form.province || "",
      group: form.group || undefined,
      station: form.station || undefined,
      contractNo: form.contractNo || undefined,
      productLine: form.productLine || undefined,
      projectContent: form.projectContent || undefined,
      contractAmount: form.contractAmount != null ? form.contractAmount : undefined,
      receivableName: form.receivableName || undefined,
      amount: form.amount ?? 0,
      receivableDate: form.receivableDate || undefined,
      pendingDate: form.pendingDate || undefined,
      committedPeriodDate: form.committedPeriodDate || undefined,
      committedPaymentDate: form.committedPaymentDate || undefined,
      committedAmount: form.committedAmount != null ? form.committedAmount : undefined,
      actualPaymentDate: form.actualPaymentDate || undefined,
      actualAmount: form.actualAmount != null ? form.actualAmount : undefined,
      overdueMonths: form.overdueMonths || undefined,
      actualInvoiceDate: form.actualInvoiceDate || undefined,
      actualDeliveryDate: form.actualDeliveryDate || undefined,
      actualAcceptanceDate: form.actualAcceptanceDate || undefined,
      paymentTerms: form.paymentTerms || undefined,
      notes: form.notes || undefined,
      customFields: cf,
    };
  }

  async function handleSave() {
    if (!form.salesManager || !form.province) {
      toast({ title: "请填写必填字段", variant: "destructive" }); return;
    }
    try {
      const payload = buildPayload();
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem.id, data: payload });
        toast({ title: "更新成功" });
        setEditItem(null);
      } else {
        await createMut.mutateAsync({ data: payload as Parameters<typeof createMut.mutateAsync>[0]["data"] });
        toast({ title: "创建成功" });
        setShowCreate(false);
      }
      queryClient.invalidateQueries({ queryKey: getListReceivablesQueryKey() });
    } catch (e: unknown) {
      toast({ title: "操作失败", description: String(e), variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (deleteId == null) return;
    try {
      await deleteMut.mutateAsync({ id: deleteId });
      toast({ title: "删除成功" });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: getListReceivablesQueryKey() });
    } catch (e: unknown) {
      toast({ title: "删除失败", description: String(e), variant: "destructive" });
    }
  }

  function handleExport() {
    exportToCsv(filtered.map(r => ({
      "签订合同销售经理": r.salesManager, "销售联系人": r.salesContact ?? "",
      "省（区）": r.province, "集团": r.group ?? "", "场站名称": r.station ?? "",
      "合同编号": r.contractNo ?? "", "产品线": r.productLine ?? "",
      "合同项目内容": r.projectContent ?? "", "合同金额（万元）": r.contractAmount ?? "",
      "应收款项名称": r.receivableName ?? "", "应收款金额": r.amount ?? "",
      "应收时间": r.receivableDate ?? "", "待工程实施进展确定回款时间": r.pendingDate ?? "",
      "销售经理承诺进入回款期时间": r.committedPeriodDate ?? "", "销售经理承诺回款时间": r.committedPaymentDate ?? "",
      "销售经理承诺回款金额": r.committedAmount ?? "", "实际回款时间": r.actualPaymentDate ?? "",
      "实际回款金额": r.actualAmount ?? "", "超期时间（月）": r.overdueMonths ?? "",
      "实际开票时间": r.actualInvoiceDate ?? "", "实际到货时间": r.actualDeliveryDate ?? "",
      "实际验收时间": r.actualAcceptanceDate ?? "", "合同约定付款条件": r.paymentTerms ?? "",
      "备注": r.notes ?? "",
      ...Object.fromEntries(defs.map(d => [d.fieldLabel, String((r.customFields ?? {})[d.fieldName] ?? "")])),
    })), "执行中合同应收款明细台账");
  }

  const NumInput = ({ label, field }: { label: string; field: keyof typeof EMPTY }) => (
    <div>
      <Label>{label}</Label>
      <Input type="number" step="0.01" value={form[field] != null ? String(form[field]) : ""}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value ? parseFloat(e.target.value) : null }))} />
    </div>
  );
  const TxtInput = ({ label, field }: { label: string; field: keyof typeof EMPTY }) => (
    <div>
      <Label>{label}</Label>
      <Input value={String(form[field] ?? "")} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
    </div>
  );

  const isOpen = showCreate || editItem !== null;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold">执行中合同应收款明细台账</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-48" /></div>
          <Select value={provinceFilter} onValueChange={setProvinceFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="省份" /></SelectTrigger>
            <SelectContent><SelectItem value="all">全部省份</SelectItem>{provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={managerFilter} onValueChange={setManagerFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="销售经理" /></SelectTrigger>
            <SelectContent><SelectItem value="all">全部销售经理</SelectItem>{managers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="h-4 w-4 mr-1" />批量导入</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />导出 CSV</Button>
          <Button variant="outline" size="sm" onClick={() => setShowCF(true)}><Settings className="h-4 w-4 mr-1" />自定义字段</Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />新增</Button>
        </div>
      </div>

      <div className="flex gap-6 text-sm">
        <span>共 <strong>{filtered.length}</strong> 条</span>
        <span>应收款合计：<strong>{totalAmount.toFixed(2)}</strong> 万元</span>
        <span>实际回款合计：<strong>{totalActual.toFixed(2)}</strong> 万元</span>
      </div>

      <div className="overflow-x-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs whitespace-nowrap">序号</TableHead>
              <TableHead className="text-xs whitespace-nowrap">签订合同销售经理</TableHead>
              <TableHead className="text-xs whitespace-nowrap">销售联系人</TableHead>
              <TableHead className="text-xs whitespace-nowrap">省（区）</TableHead>
              <TableHead className="text-xs whitespace-nowrap">集团</TableHead>
              <TableHead className="text-xs whitespace-nowrap">场站名称</TableHead>
              <TableHead className="text-xs whitespace-nowrap">合同编号</TableHead>
              <TableHead className="text-xs whitespace-nowrap">产品线</TableHead>
              <TableHead className="text-xs whitespace-nowrap">合同项目内容</TableHead>
              <TableHead className="text-xs whitespace-nowrap">合同金额（万元）</TableHead>
              <TableHead className="text-xs whitespace-nowrap">应收款项名称</TableHead>
              <TableHead className="text-xs whitespace-nowrap">应收款金额</TableHead>
              <TableHead className="text-xs whitespace-nowrap">应收时间</TableHead>
              <TableHead className="text-xs whitespace-nowrap">待工程实施进展确定回款时间</TableHead>
              <TableHead className="text-xs whitespace-nowrap">销售经理承诺进入回款期时间</TableHead>
              <TableHead className="text-xs whitespace-nowrap">销售经理承诺回款时间</TableHead>
              <TableHead className="text-xs whitespace-nowrap">销售经理承诺回款金额</TableHead>
              <TableHead className="text-xs whitespace-nowrap">实际回款时间</TableHead>
              <TableHead className="text-xs whitespace-nowrap">实际回款金额</TableHead>
              <TableHead className="text-xs whitespace-nowrap">超期时间（月）</TableHead>
              <TableHead className="text-xs whitespace-nowrap">实际开票时间</TableHead>
              <TableHead className="text-xs whitespace-nowrap">实际到货时间</TableHead>
              <TableHead className="text-xs whitespace-nowrap">实际验收时间</TableHead>
              <TableHead className="text-xs whitespace-nowrap">合同约定付款条件</TableHead>
              <TableHead className="text-xs whitespace-nowrap">备注</TableHead>
              {defs.map(d => <TableHead key={d.fieldName} className="text-xs whitespace-nowrap">{d.fieldLabel}</TableHead>)}
              <TableHead className="text-xs">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={26 + defs.length} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={26 + defs.length} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
            ) : filtered.map((r, idx) => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="text-xs text-center">{idx + 1}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.salesManager}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.salesContact ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.province}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.group ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.station ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.contractNo ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.productLine ?? ""}</TableCell>
                <TableCell className="text-xs max-w-[120px] truncate">{r.projectContent ?? ""}</TableCell>
                <TableCell className="text-xs text-right">{r.contractAmount != null ? r.contractAmount.toFixed(2) : ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.receivableName ?? ""}</TableCell>
                <TableCell className="text-xs text-right font-medium">{r.amount?.toFixed(2) ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.receivableDate ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.pendingDate ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.committedPeriodDate ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.committedPaymentDate ?? ""}</TableCell>
                <TableCell className="text-xs text-right">{r.committedAmount != null ? r.committedAmount.toFixed(2) : ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.actualPaymentDate ?? ""}</TableCell>
                <TableCell className="text-xs text-right">{r.actualAmount != null ? r.actualAmount.toFixed(2) : ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.overdueMonths ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.actualInvoiceDate ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.actualDeliveryDate ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.actualAcceptanceDate ?? ""}</TableCell>
                <TableCell className="text-xs max-w-[150px] truncate">{r.paymentTerms ?? ""}</TableCell>
                <TableCell className="text-xs max-w-[100px] truncate">{r.notes ?? ""}</TableCell>
                {defs.map(d => <TableCell key={d.fieldName} className="text-xs">{String((r.customFields ?? {})[d.fieldName] ?? "")}</TableCell>)}
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={o => { if (!o) { setShowCreate(false); setEditItem(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "编辑记录" : "新增应收款记录"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <TxtInput label="签订合同销售经理 *" field="salesManager" />
            <TxtInput label="销售联系人" field="salesContact" />
            <TxtInput label="省（区）*" field="province" />
            <TxtInput label="集团" field="group" />
            <TxtInput label="场站名称" field="station" />
            <TxtInput label="合同编号" field="contractNo" />
            <TxtInput label="产品线" field="productLine" />
            <div className="col-span-2"><Label>合同项目内容</Label><Input value={String(form.projectContent ?? "")} onChange={e => setForm(f => ({ ...f, projectContent: e.target.value }))} /></div>
            <NumInput label="合同金额（万元）" field="contractAmount" />
            <TxtInput label="应收款项名称" field="receivableName" />
            <NumInput label="应收款金额 *" field="amount" />
            <TxtInput label="应收时间" field="receivableDate" />
            <TxtInput label="待工程实施进展确定回款时间" field="pendingDate" />
            <TxtInput label="销售经理承诺进入回款期时间" field="committedPeriodDate" />
            <TxtInput label="销售经理承诺回款时间" field="committedPaymentDate" />
            <NumInput label="销售经理承诺回款金额" field="committedAmount" />
            <TxtInput label="实际回款时间" field="actualPaymentDate" />
            <NumInput label="实际回款金额" field="actualAmount" />
            <TxtInput label="超期时间（月）" field="overdueMonths" />
            <TxtInput label="实际开票时间" field="actualInvoiceDate" />
            <TxtInput label="实际到货时间" field="actualDeliveryDate" />
            <TxtInput label="实际验收时间" field="actualAcceptanceDate" />
            <div className="col-span-2"><Label>合同约定付款条件</Label><Input value={String(form.paymentTerms ?? "")} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} /></div>
            <div className="col-span-2"><Label>备注</Label><Input value={String(form.notes ?? "")} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          {defs.length > 0 && <CustomFieldsSection defs={defs} values={customFieldValues} onChange={(k, v) => setCustomFieldValues(prev => ({ ...prev, [k]: v }))} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditItem(null); }}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认删除</AlertDialogTitle><AlertDialogDescription>此操作不可撤销，确认删除该记录？</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        title="应收款明细"
        templateFilename="应收款明细导入模板.csv"
        columns={[
          { key: "salesManager", label: "签订合同销售经理", required: true },
          { key: "salesContact", label: "销售联系人" },
          { key: "province", label: "省（区）", required: true },
          { key: "group", label: "集团" },
          { key: "station", label: "场站名称" },
          { key: "contractNo", label: "合同编号" },
          { key: "productLine", label: "产品线" },
          { key: "projectContent", label: "合同项目内容" },
          { key: "contractAmount", label: "合同金额（万元）", transform: v => v ? parseFloat(v) : undefined },
          { key: "receivableName", label: "应收款项名称" },
          { key: "amount", label: "应收款金额", required: true, transform: v => parseFloat(v) || 0 },
          { key: "receivableDate", label: "应收时间" },
          { key: "pendingDate", label: "待工程实施进展确定回款时间" },
          { key: "committedPeriodDate", label: "销售经理承诺进入回款期时间" },
          { key: "committedPaymentDate", label: "销售经理承诺回款时间" },
          { key: "committedAmount", label: "销售经理承诺回款金额", transform: v => v ? parseFloat(v) : undefined },
          { key: "actualPaymentDate", label: "实际回款时间" },
          { key: "actualAmount", label: "实际回款金额", transform: v => v ? parseFloat(v) : undefined },
          { key: "overdueMonths", label: "超期时间（月）" },
          { key: "actualInvoiceDate", label: "实际开票时间" },
          { key: "actualDeliveryDate", label: "实际到货时间" },
          { key: "actualAcceptanceDate", label: "实际验收时间" },
          { key: "paymentTerms", label: "合同约定付款条件" },
          { key: "notes", label: "备注" },
        ]}
        onImportRow={async (row) => {
          await createMut.mutateAsync({ data: row as Parameters<typeof createMut.mutateAsync>[0]["data"] });
          queryClient.invalidateQueries({ queryKey: getListReceivablesQueryKey() });
        }}
      />
      <CustomFieldsManager open={showCF} onOpenChange={setShowCF} defs={defs} onAdd={addDef} onDelete={deleteDef} onReorder={reorderDefs} />
    </div>
  );
}

import { useState, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, Trash2, Pencil, Upload, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomFieldDefs } from "@/hooks/use-custom-fields";
import { CustomFieldsManager } from "@/components/crud/CustomFieldsManager";
import { CustomFieldsSection } from "@/components/crud/CustomFieldsSection";
import { ImportDialog } from "@/components/crud/ImportDialog";

type WSItem = {
  id: number;
  contractSalesManager: string;
  salesManager?: string | null;
  province: string;
  group: string;
  station: string;
  stationType?: string | null;
  forecastStartDate?: string | null;
  officialForecastDate?: string | null;
  serviceEndDate?: string | null;
  overdueMonths?: string | null;
  isOverdue?: string | null;
  estimatedContractAmount?: number | null;
  estimatedContractDate?: string | null;
  renewalNotes?: string | null;
  notes?: string | null;
  customFields?: Record<string, unknown> | null;
};

const EMPTY: Omit<WSItem, "id"> = {
  contractSalesManager: "", salesManager: "", province: "", group: "", station: "",
  stationType: "", forecastStartDate: "", officialForecastDate: "", serviceEndDate: "",
  overdueMonths: "", isOverdue: "", estimatedContractAmount: null, estimatedContractDate: "",
  renewalNotes: "", notes: "", customFields: {},
};


export default function WeatherServices() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { defs = [], addDef, deleteDef, reorderDefs } = useCustomFieldDefs("weather_services");

  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<WSItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCF, setShowCF] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean | number>>({});

  const { data: items = [], isLoading } = useListWeatherServices({ province: provinceFilter !== "all" ? provinceFilter : undefined });
  const createMut = useCreateWeatherService();
  const updateMut = useUpdateWeatherService();
  const deleteMut = useDeleteWeatherService();

  const filtered = useMemo(() => {
    if (!search) return items as WSItem[];
    const s = search.toLowerCase();
    return (items as WSItem[]).filter(w =>
      w.contractSalesManager?.toLowerCase().includes(s) ||
      w.station?.toLowerCase().includes(s) ||
      w.province?.toLowerCase().includes(s) ||
      w.group?.toLowerCase().includes(s) ||
      w.renewalNotes?.toLowerCase().includes(s)
    );
  }, [items, search]);

  const provinces = useMemo(() => [...new Set((items as WSItem[]).map(w => w.province).filter(Boolean))].sort(), [items]);

  function openCreate() { setForm({ ...EMPTY }); setCustomFieldValues({}); setShowCreate(true); }
  function openEdit(item: WSItem) {
    setForm({ ...item, customFields: item.customFields ?? {} });
    setCustomFieldValues(Object.fromEntries(Object.entries(item.customFields ?? {}).map(([k, v]) => [k, v as string])));
    setEditItem(item);
  }

  function buildPayload() {
    const cf: Record<string, unknown> = {};
    defs.forEach(d => { if (customFieldValues[d.fieldName] !== undefined) cf[d.fieldName] = customFieldValues[d.fieldName]; });
    return {
      contractSalesManager: form.contractSalesManager || "",
      salesManager: form.salesManager || undefined,
      province: form.province || "",
      group: form.group || "",
      station: form.station || "",
      stationType: form.stationType || undefined,
      forecastStartDate: form.forecastStartDate || undefined,
      officialForecastDate: form.officialForecastDate || undefined,
      serviceEndDate: form.serviceEndDate || undefined,
      overdueMonths: form.overdueMonths || undefined,
      isOverdue: form.isOverdue || undefined,
      estimatedContractAmount: form.estimatedContractAmount != null && form.estimatedContractAmount !== 0 ? form.estimatedContractAmount : undefined,
      estimatedContractDate: form.estimatedContractDate || undefined,
      renewalNotes: form.renewalNotes || undefined,
      notes: form.notes || undefined,
      customFields: cf,
    };
  }

  async function handleSave() {
    if (!form.contractSalesManager || !form.province || !form.group || !form.station) {
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
      queryClient.invalidateQueries({ queryKey: getListWeatherServicesQueryKey() });
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
      queryClient.invalidateQueries({ queryKey: getListWeatherServicesQueryKey() });
    } catch (e: unknown) {
      toast({ title: "删除失败", description: String(e), variant: "destructive" });
    }
  }

  async function handleImportRow(row: Record<string, unknown>) {
    const body: Record<string, unknown> = {
      contractSalesManager: row["contractSalesManager"] || row["签订合同销售经理"] || "",
      salesManager: row["salesManager"] || row["销售经理"] || undefined,
      province: row["province"] || row["省（区）"] || "",
      group: row["group"] || row["集团"] || "",
      station: row["station"] || row["场站名称"] || "",
      stationType: row["stationType"] || row["场站类别"] || undefined,
      forecastStartDate: row["forecastStartDate"] || row["开始预报时间"] || undefined,
      officialForecastDate: row["officialForecastDate"] || row["正式预报时间"] || undefined,
      serviceEndDate: row["serviceEndDate"] || row["服务合同到期时间"] || undefined,
      overdueMonths: row["overdueMonths"] || row["超期时间（月）"] || undefined,
      isOverdue: row["isOverdue"] || row["是否超期（是/否）"] || undefined,
      estimatedContractAmount: row["estimatedContractAmount"] ? parseFloat(String(row["estimatedContractAmount"])) : undefined,
      estimatedContractDate: row["estimatedContractDate"] || row["预计签订服务合同时间"] || undefined,
      renewalNotes: row["renewalNotes"] || row["续签服务合同情况说明"] || undefined,
      notes: row["notes"] || row["备注"] || undefined,
    };
    await createMut.mutateAsync({ data: body as Parameters<typeof createMut.mutateAsync>[0]["data"] });
    queryClient.invalidateQueries({ queryKey: getListWeatherServicesQueryKey() });
  }

  function handleExport() {
    exportToCsv(filtered.map(w => ({
      "签订合同销售经理": w.contractSalesManager, "销售经理": w.salesManager ?? "",
      "省（区）": w.province, "集团": w.group, "场站名称": w.station, "场站类别": w.stationType ?? "",
      "开始预报时间": w.forecastStartDate ?? "", "正式预报时间": w.officialForecastDate ?? "",
      "服务合同到期时间": w.serviceEndDate ?? "", "超期时间（月）": w.overdueMonths ?? "",
      "是否超期（是/否）": w.isOverdue ?? "", "预计签订服务合同金额（万元）": w.estimatedContractAmount ?? "",
      "预计签订服务合同时间": w.estimatedContractDate ?? "", "续签服务合同情况说明": w.renewalNotes ?? "",
      "备注": w.notes ?? "",
      ...Object.fromEntries(defs.map(d => [d.fieldLabel, String((w.customFields ?? {})[d.fieldName] ?? "")])),
    })), "数值天气预报服务台账");
  }

  const FormField = ({ label, field, type = "text" }: { label: string; field: keyof typeof EMPTY; type?: string }) => (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={String(form[field] ?? "")}
        onChange={e => setForm(f => ({ ...f, [field]: type === "number" ? (e.target.value ? parseFloat(e.target.value) : null) : e.target.value }))} />
    </div>
  );

  const isOpen = showCreate || editItem !== null;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold">数值天气预报服务台账</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-48" /></div>
          <Select value={provinceFilter} onValueChange={setProvinceFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="省份" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部省份</SelectItem>
              {provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}><Upload className="h-4 w-4 mr-1" />批量导入</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />导出 CSV</Button>
          <Button variant="outline" size="sm" onClick={() => setShowCF(true)}><Settings className="h-4 w-4 mr-1" />自定义字段</Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />新增</Button>
        </div>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>共 <strong>{filtered.length}</strong> 条记录</span>
      </div>

      <div className="overflow-x-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs whitespace-nowrap">序号</TableHead>
              <TableHead className="text-xs whitespace-nowrap">签订合同销售经理</TableHead>
              <TableHead className="text-xs whitespace-nowrap">销售经理</TableHead>
              <TableHead className="text-xs whitespace-nowrap">省（区）</TableHead>
              <TableHead className="text-xs whitespace-nowrap">集团</TableHead>
              <TableHead className="text-xs whitespace-nowrap">场站名称</TableHead>
              <TableHead className="text-xs whitespace-nowrap">场站类别</TableHead>
              <TableHead className="text-xs whitespace-nowrap">开始预报时间</TableHead>
              <TableHead className="text-xs whitespace-nowrap">正式预报时间</TableHead>
              <TableHead className="text-xs whitespace-nowrap">服务合同到期时间</TableHead>
              <TableHead className="text-xs whitespace-nowrap">超期时间（月）</TableHead>
              <TableHead className="text-xs whitespace-nowrap">是否超期（是/否）</TableHead>
              <TableHead className="text-xs whitespace-nowrap">预计签订服务合同金额（万元）</TableHead>
              <TableHead className="text-xs whitespace-nowrap">预计签订服务合同时间</TableHead>
              <TableHead className="text-xs whitespace-nowrap">续签服务合同情况说明</TableHead>
              <TableHead className="text-xs whitespace-nowrap">备注</TableHead>
              {defs.map(d => <TableHead key={d.fieldName} className="text-xs whitespace-nowrap">{d.fieldLabel}</TableHead>)}
              <TableHead className="text-xs">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={17 + defs.length} className="text-center text-muted-foreground py-8">加载中...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={17 + defs.length} className="text-center text-muted-foreground py-8">暂无数据</TableCell></TableRow>
            ) : filtered.map((w, idx) => (
              <TableRow key={w.id} className="hover:bg-muted/30">
                <TableCell className="text-xs text-center">{idx + 1}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{w.contractSalesManager}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{w.salesManager ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{w.province}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{w.group}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{w.station}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{w.stationType ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{w.forecastStartDate ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{w.officialForecastDate ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{w.serviceEndDate ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{w.overdueMonths ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{w.isOverdue ?? ""}</TableCell>
                <TableCell className="text-xs text-right">{w.estimatedContractAmount ?? ""}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{w.estimatedContractDate ?? ""}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{w.renewalNotes ?? ""}</TableCell>
                <TableCell className="text-xs max-w-[120px] truncate">{w.notes ?? ""}</TableCell>
                {defs.map(d => <TableCell key={d.fieldName} className="text-xs">{String((w.customFields ?? {})[d.fieldName] ?? "")}</TableCell>)}
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(w)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(w.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditItem(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "编辑记录" : "新增数值天气预报服务"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <FormField label="签订合同销售经理 *" field="contractSalesManager" />
            <FormField label="销售经理" field="salesManager" />
            <FormField label="省（区）*" field="province" />
            <FormField label="集团 *" field="group" />
            <FormField label="场站名称 *" field="station" />
            <FormField label="场站类别" field="stationType" />
            <FormField label="开始预报时间" field="forecastStartDate" />
            <FormField label="正式预报时间" field="officialForecastDate" />
            <FormField label="服务合同到期时间" field="serviceEndDate" />
            <FormField label="超期时间（月）" field="overdueMonths" />
            <FormField label="是否超期（是/否）" field="isOverdue" />
            <FormField label="预计签订服务合同金额（万元）" field="estimatedContractAmount" type="number" />
            <FormField label="预计签订服务合同时间" field="estimatedContractDate" />
            <div className="col-span-2"><Label>续签服务合同情况说明</Label><Input value={String(form.renewalNotes ?? "")} onChange={e => setForm(f => ({ ...f, renewalNotes: e.target.value }))} /></div>
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
        title="数值天气预报服务"
        templateFilename="数值天气预报服务导入模板.csv"
        columns={[
          { key: "contractSalesManager", label: "签订合同销售经理", required: true },
          { key: "salesManager", label: "销售经理" },
          { key: "province", label: "省（区）", required: true },
          { key: "group", label: "集团", required: true },
          { key: "station", label: "场站名称", required: true },
          { key: "stationType", label: "场站类别" },
          { key: "forecastStartDate", label: "开始预报时间" },
          { key: "officialForecastDate", label: "正式预报时间" },
          { key: "serviceEndDate", label: "服务合同到期时间" },
          { key: "overdueMonths", label: "超期时间（月）" },
          { key: "isOverdue", label: "是否超期（是/否）" },
          { key: "estimatedContractAmount", label: "预计签订服务合同金额（万元）", transform: v => v ? parseFloat(v) : undefined },
          { key: "estimatedContractDate", label: "预计签订服务合同时间" },
          { key: "renewalNotes", label: "续签服务合同情况说明" },
          { key: "notes", label: "备注" },
        ]}
        onImportRow={handleImportRow}
      />

      <CustomFieldsManager open={showCF} onOpenChange={setShowCF} defs={defs} onAdd={addDef} onDelete={deleteDef} onReorder={reorderDefs} />
    </div>
  );
}

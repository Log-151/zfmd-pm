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
import { Plus, Download, Search, Trash2, Pencil, Upload, Settings, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useCustomFieldDefs } from "@/hooks/use-custom-fields";
import { useColumnOrder, type ColDef } from "@/hooks/use-column-order";
import { CustomFieldsManager } from "@/components/crud/CustomFieldsManager";
import { CustomFieldsSection } from "@/components/crud/CustomFieldsSection";
import { ImportDialog } from "@/components/crud/ImportDialog";

type ContractItem = {
  id: number;
  contractNo: string;
  changeNo: string | null;
  workOrderNo: string | null;
  afterSaleNo: string | null;
  contractName: string;
  contractType: string;
  status: string;
  customer: string;
  company1: string | null;
  company2: string | null;
  company3: string | null;
  province: string;
  group: string;
  station: string;
  otherName: string | null;
  stationType: string | null;
  stationCapacity: string | null;
  productType: string;
  projectContent: string | null;
  projectNo: string | null;
  salesManager: string;
  salesContact: string | null;
  archiveDate: string | null;
  signDate: string | null;
  archiveType: string | null;
  archiveCopies: string | null;
  startDate: string | null;
  endDate: string | null;
  installFee: number | null;
  serviceFee: number | null;
  amountWithTax: number;
  amountWithoutTax: number;
  excludeRevenue: boolean;
  excludePerformance: boolean;
  guaranteeLetter: string | null;
  deliveryDept: string | null;
  projectManager: string | null;
  briefingDate: string | null;
  thirdPartyFee: number | null;
  isSpecial: boolean;
  notes: string | null;
  customFields: Record<string, unknown> | null;
};

const EMPTY_FORM = {
  contractNo: "", changeNo: "", workOrderNo: "", afterSaleNo: "",
  contractName: "", contractType: "销售合同", status: "执行中",
  customer: "", company1: "", company2: "", company3: "",
  province: "", group: "", station: "", otherName: "",
  stationType: "", stationCapacity: "",
  productType: "风电功率预测", projectContent: "", projectNo: "",
  salesManager: "", salesContact: "",
  archiveDate: "", signDate: "", archiveType: "", archiveCopies: "",
  startDate: "", endDate: "",
  installFee: "", serviceFee: "",
  amountWithTax: "", amountWithoutTax: "",
  excludeRevenue: false, excludePerformance: false,
  guaranteeLetter: "", deliveryDept: "", projectManager: "",
  briefingDate: "", thirdPartyFee: "",
  isSpecial: false, notes: "",
};

const CONTRACTS_COLS: ColDef<ContractItem>[] = [
  { key: "contractNo", header: "合同编号", render: c => c.contractNo, className: "font-medium text-sm" },
  { key: "changeNo", header: "合同变更号", render: c => (c as any).changeNo || "-", className: "text-sm" },
  { key: "workOrderNo", header: "开工申请编号", render: c => c.workOrderNo || "-", className: "text-sm" },
  { key: "afterSaleNo", header: "售后服务编号", render: c => (c as any).afterSaleNo || "-", className: "text-sm" },
  { key: "customer", header: "客户名称", render: c => c.customer, className: "max-w-[130px] truncate text-sm" },
  { key: "contractName", header: "合同名称", render: c => (c as any).contractName || "-", className: "max-w-[150px] truncate text-sm" },
  { key: "company1", header: "一级公司", render: c => (c as any).company1 || "-", className: "text-sm" },
  { key: "company2", header: "二级公司", render: c => (c as any).company2 || "-", className: "text-sm" },
  { key: "company3", header: "三级公司", render: c => (c as any).company3 || "-", className: "text-sm" },
  { key: "province", header: "省份", render: c => c.province, className: "text-sm" },
  { key: "group", header: "集团", render: c => c.group || "-", className: "text-sm" },
  { key: "station", header: "场站名称", render: c => c.station || "-", className: "text-sm" },
  { key: "otherName", header: "其他名称", render: c => (c as any).otherName || "-", className: "text-sm" },
  { key: "stationType", header: "场站类别", render: c => (c as any).stationType || "-", className: "text-sm" },
  { key: "stationCapacity", header: "场站容量", render: c => (c as any).stationCapacity || "-", className: "text-sm" },
  { key: "productType", header: "产品线", render: c => c.productType, className: "text-sm" },
  { key: "projectContent", header: "合同项目内容", render: c => (c as any).projectContent || "-", className: "max-w-[120px] truncate text-sm" },
  { key: "projectNo", header: "项目编号", render: c => (c as any).projectNo || "-", className: "text-sm" },
  { key: "salesManager", header: "销售经理", render: c => c.salesManager, className: "text-sm" },
  { key: "salesContact", header: "销售联系人", render: c => (c as any).salesContact || "-", className: "text-sm" },
  { key: "archiveDate", header: "合同存档日期", render: c => formatDate((c as any).archiveDate), csvValue: c => (c as any).archiveDate ?? "", className: "text-sm" },
  { key: "signDate", header: "合同签订日期", render: c => formatDate(c.signDate), csvValue: c => c.signDate ?? "", className: "text-sm" },
  { key: "archiveType", header: "合同存档原件/复印件", render: c => (c as any).archiveType || "-", className: "text-sm" },
  { key: "archiveCopies", header: "合同存档份数", render: c => (c as any).archiveCopies || "-", className: "text-sm" },
  { key: "startDate", header: "服务收费起始时间", render: c => formatDate(c.startDate), csvValue: c => c.startDate ?? "", className: "text-sm" },
  { key: "endDate", header: "服务收费终止时间", render: c => formatDate(c.endDate), csvValue: c => c.endDate ?? "", className: "text-sm" },
  { key: "installFee", header: "初装费(万元)", render: c => (c as any).installFee != null ? formatWanYuan((c as any).installFee) : "-", csvValue: c => (c as any).installFee ?? "", className: "text-right text-sm" },
  { key: "serviceFee", header: "预测服务费(万元)", render: c => (c as any).serviceFee != null ? formatWanYuan((c as any).serviceFee) : "-", csvValue: c => (c as any).serviceFee ?? "", className: "text-right text-sm" },
  { key: "amountWithTax", header: "合同总额(万元)", render: c => formatWanYuan(c.amountWithTax), csvValue: c => c.amountWithTax, className: "text-right font-medium text-sm" },
  { key: "amountWithoutTax", header: "不含税合同金额(万元)", render: c => formatWanYuan(c.amountWithoutTax), csvValue: c => c.amountWithoutTax, className: "text-right text-sm" },
  { key: "excludeRevenue", header: "不算销售收入", render: c => (c as any).excludeRevenue ? "是" : "-", csvValue: c => (c as any).excludeRevenue ? "是" : "", className: "text-sm" },
  { key: "excludePerformance", header: "不算销售业绩", render: c => (c as any).excludePerformance ? "是" : "-", csvValue: c => (c as any).excludePerformance ? "是" : "", className: "text-sm" },
  { key: "guaranteeLetter", header: "保函开具情况", render: c => (c as any).guaranteeLetter || "-", className: "text-sm" },
  { key: "deliveryDept", header: "交付部门", render: c => (c as any).deliveryDept || "-", className: "text-sm" },
  { key: "projectManager", header: "项目经理", render: c => (c as any).projectManager || "-", className: "text-sm" },
  { key: "briefingDate", header: "合同交底会时间", render: c => formatDate((c as any).briefingDate), csvValue: c => (c as any).briefingDate ?? "", className: "text-sm" },
  { key: "thirdPartyFee", header: "第三方接口费(万元)", render: c => (c as any).thirdPartyFee != null ? formatWanYuan((c as any).thirdPartyFee) : "-", csvValue: c => (c as any).thirdPartyFee ?? "", className: "text-right text-sm" },
  { key: "notes", header: "备注", render: c => c.notes || "-", className: "max-w-[120px] truncate text-sm" },
  { key: "status", header: "状态", render: c => <Badge variant={c.status === "执行中" ? "default" : "secondary"}>{c.status}</Badge>, csvValue: c => c.status },
];

export default function Contracts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { defs, addDef, deleteDef, reorderDefs } = useCustomFieldDefs("contracts");
  const { orderedCols, save: saveCols, getDragProps } = useColumnOrder("contracts", CONTRACTS_COLS);

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
        contractNo: editItem.contractNo,
        changeNo: editItem.changeNo ?? "",
        workOrderNo: editItem.workOrderNo ?? "",
        afterSaleNo: editItem.afterSaleNo ?? "",
        contractName: editItem.contractName,
        contractType: editItem.contractType,
        status: editItem.status,
        customer: editItem.customer,
        company1: editItem.company1 ?? "",
        company2: editItem.company2 ?? "",
        company3: editItem.company3 ?? "",
        province: editItem.province,
        group: editItem.group,
        station: editItem.station,
        otherName: editItem.otherName ?? "",
        stationType: editItem.stationType ?? "",
        stationCapacity: editItem.stationCapacity ?? "",
        productType: editItem.productType,
        projectContent: editItem.projectContent ?? "",
        projectNo: editItem.projectNo ?? "",
        salesManager: editItem.salesManager,
        salesContact: editItem.salesContact ?? "",
        archiveDate: editItem.archiveDate ?? "",
        signDate: editItem.signDate ?? "",
        archiveType: editItem.archiveType ?? "",
        archiveCopies: editItem.archiveCopies ?? "",
        startDate: editItem.startDate ?? "",
        endDate: editItem.endDate ?? "",
        installFee: editItem.installFee != null ? String(editItem.installFee) : "",
        serviceFee: editItem.serviceFee != null ? String(editItem.serviceFee) : "",
        amountWithTax: String(editItem.amountWithTax),
        amountWithoutTax: String(editItem.amountWithoutTax),
        excludeRevenue: editItem.excludeRevenue,
        excludePerformance: editItem.excludePerformance,
        guaranteeLetter: editItem.guaranteeLetter ?? "",
        deliveryDept: editItem.deliveryDept ?? "",
        projectManager: editItem.projectManager ?? "",
        briefingDate: editItem.briefingDate ?? "",
        thirdPartyFee: editItem.thirdPartyFee != null ? String(editItem.thirdPartyFee) : "",
        isSpecial: editItem.isSpecial,
        notes: editItem.notes ?? "",
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
      installFee: form.installFee ? parseFloat(form.installFee) : undefined,
      serviceFee: form.serviceFee ? parseFloat(form.serviceFee) : undefined,
      thirdPartyFee: form.thirdPartyFee ? parseFloat(form.thirdPartyFee) : undefined,
      changeNo: form.changeNo || undefined,
      workOrderNo: form.workOrderNo || undefined,
      afterSaleNo: form.afterSaleNo || undefined,
      company1: form.company1 || undefined,
      company2: form.company2 || undefined,
      company3: form.company3 || undefined,
      otherName: form.otherName || undefined,
      stationType: form.stationType || undefined,
      stationCapacity: form.stationCapacity || undefined,
      projectContent: form.projectContent || undefined,
      projectNo: form.projectNo || undefined,
      salesContact: form.salesContact || undefined,
      archiveDate: form.archiveDate || undefined,
      signDate: form.signDate || undefined,
      archiveType: form.archiveType || undefined,
      archiveCopies: form.archiveCopies || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      guaranteeLetter: form.guaranteeLetter || undefined,
      deliveryDept: form.deliveryDept || undefined,
      projectManager: form.projectManager || undefined,
      briefingDate: form.briefingDate || undefined,
      notes: form.notes || undefined,
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
    exportToCsv("合同列表", contracts as any, orderedCols.map(col => ({
      header: col.header,
      accessor: (row: any) => { const cv = col.csvValue; if (cv) return cv(row as ContractItem); const v = col.render(row as ContractItem); return typeof v === "string" || typeof v === "number" ? v : String(v ?? ""); },
    })));
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">合同管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCF(true)}><Settings className="w-4 h-4 mr-1" />自定义字段</Button>
          <Button variant="outline" size="sm" onClick={saveCols}><Save className="w-4 h-4 mr-1" />保存列顺序</Button>
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
          { label: "年份", value: year, onChange: setYear, options: [{ v: "all", l: "全部年份" }, ...[2026,2025,2024,2023,2022,2021,2020,2019,2018,2017].map(y => ({ v: String(y), l: String(y) }))] },
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
                {orderedCols.map((col, idx) => (
                  <TableHead key={col.key} className="whitespace-nowrap select-none" {...getDragProps(idx)}>{col.header}</TableHead>
                ))}
                {defs.map(d => <TableHead key={d.fieldName}>{d.fieldLabel}</TableHead>)}
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={orderedCols.length + 1 + defs.length} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
              ) : !contracts?.length ? (
                <TableRow><TableCell colSpan={orderedCols.length + 1 + defs.length} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : (
                contracts.map(contract => (
                  <TableRow key={contract.id} className="hover:bg-muted/50">
                    {orderedCols.map(col => (
                      <TableCell key={col.key} className={col.className}>{col.render(contract as unknown as ContractItem)}</TableCell>
                    ))}
                    {defs.map(d => <TableCell key={d.fieldName} className="text-sm text-muted-foreground">{String(((contract as any).customFields ?? {})[d.fieldName] ?? "")}</TableCell>)}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "编辑合同" : "新建合同"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {/* 基本编号信息 */}
            <div className="space-y-1.5"><Label>合同编号 <span className="text-destructive">*</span></Label><Input value={form.contractNo} onChange={e => f("contractNo", e.target.value)} placeholder="如 ZFMD/SD-26001-SH" /></div>
            <div className="space-y-1.5"><Label>合同变更号</Label><Input value={form.changeNo} onChange={e => f("changeNo", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>开工申请编号</Label><Input value={form.workOrderNo} onChange={e => f("workOrderNo", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>售后服务编号</Label><Input value={form.afterSaleNo} onChange={e => f("afterSaleNo", e.target.value)} /></div>

            {/* 合同基本信息 */}
            <div className="col-span-2 space-y-1.5"><Label>合同名称 <span className="text-destructive">*</span></Label><Input value={form.contractName} onChange={e => f("contractName", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>合同类型</Label>
              <Select value={form.contractType} onValueChange={v => f("contractType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["销售合同","续签合同","框架合同","补充协议"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>状态</Label>
              <Select value={form.status} onValueChange={v => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["执行中","已完成","已终止"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* 客户信息 */}
            <div className="col-span-2 space-y-1.5"><Label>客户名称 <span className="text-destructive">*</span></Label><Input value={form.customer} onChange={e => f("customer", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>一级公司</Label><Input value={form.company1} onChange={e => f("company1", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>二级公司</Label><Input value={form.company2} onChange={e => f("company2", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>三级公司</Label><Input value={form.company3} onChange={e => f("company3", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>省份 <span className="text-destructive">*</span></Label><Input value={form.province} onChange={e => f("province", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>集团</Label><Input value={form.group} onChange={e => f("group", e.target.value)} placeholder="如：国电投、华能" /></div>
            <div className="space-y-1.5"><Label>场站名称</Label><Input value={form.station} onChange={e => f("station", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>其他名称</Label><Input value={form.otherName} onChange={e => f("otherName", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>场站类别</Label>
              <Select value={form.stationType || "none"} onValueChange={v => f("stationType", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="选择场站类别" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {["风电场","光伏电站","其他"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>场站容量</Label><Input value={form.stationCapacity} onChange={e => f("stationCapacity", e.target.value)} placeholder="如：100MW" /></div>

            {/* 产品与业务 */}
            <div className="space-y-1.5"><Label>产品线</Label>
              <Select value={form.productType} onValueChange={v => f("productType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["风电功率预测","光伏功率预测","网络安全监测装置","数值天气预报","综合预测平台","其他"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>项目编号</Label><Input value={form.projectNo} onChange={e => f("projectNo", e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>合同项目内容</Label><Input value={form.projectContent} onChange={e => f("projectContent", e.target.value)} placeholder="如：短期软件；超短期软件；预测服务2年" /></div>

            {/* 销售信息 */}
            <div className="space-y-1.5"><Label>销售经理 <span className="text-destructive">*</span></Label><Input value={form.salesManager} onChange={e => f("salesManager", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>销售联系人</Label><Input value={form.salesContact} onChange={e => f("salesContact", e.target.value)} /></div>

            {/* 存档与日期 */}
            <div className="space-y-1.5"><Label>合同存档日期</Label><Input type="date" value={form.archiveDate} onChange={e => f("archiveDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>合同签订日期</Label><Input type="date" value={form.signDate} onChange={e => f("signDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>存档原件/复印件</Label><Input value={form.archiveType} onChange={e => f("archiveType", e.target.value)} placeholder="原件/复印件" /></div>
            <div className="space-y-1.5"><Label>存档份数</Label><Input value={form.archiveCopies} onChange={e => f("archiveCopies", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>服务收费起始时间</Label><Input type="date" value={form.startDate} onChange={e => f("startDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>服务收费终止时间</Label><Input type="date" value={form.endDate} onChange={e => f("endDate", e.target.value)} /></div>

            {/* 金额 */}
            <div className="space-y-1.5"><Label>初装费（万元）</Label><Input type="number" step="0.001" value={form.installFee} onChange={e => f("installFee", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>预测服务费（万元）</Label><Input type="number" step="0.001" value={form.serviceFee} onChange={e => f("serviceFee", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>合同总额（万元）</Label><Input type="number" step="0.001" value={form.amountWithTax} onChange={e => f("amountWithTax", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>不含税合同金额（万元）</Label><Input type="number" step="0.001" value={form.amountWithoutTax} onChange={e => f("amountWithoutTax", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>第三方接口费（万元）</Label><Input type="number" step="0.001" value={form.thirdPartyFee} onChange={e => f("thirdPartyFee", e.target.value)} /></div>

            {/* 交付信息 */}
            <div className="space-y-1.5"><Label>交付部门</Label><Input value={form.deliveryDept} onChange={e => f("deliveryDept", e.target.value)} placeholder="如：工程项目部" /></div>
            <div className="space-y-1.5"><Label>项目经理</Label><Input value={form.projectManager} onChange={e => f("projectManager", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>合同交底会时间</Label><Input type="date" value={form.briefingDate} onChange={e => f("briefingDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>保函开具情况</Label><Input value={form.guaranteeLetter} onChange={e => f("guaranteeLetter", e.target.value)} /></div>

            {/* 标记 */}
            <div className="flex items-center gap-4 col-span-2">
              <div className="flex items-center gap-2">
                <Checkbox id="excludeRevenue" checked={form.excludeRevenue} onCheckedChange={v => f("excludeRevenue", !!v)} />
                <label htmlFor="excludeRevenue" className="text-sm cursor-pointer">不算销售收入</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="excludePerformance" checked={form.excludePerformance} onCheckedChange={v => f("excludePerformance", !!v)} />
                <label htmlFor="excludePerformance" className="text-sm cursor-pointer">不算销售业绩</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="isSpecial" checked={form.isSpecial} onCheckedChange={v => f("isSpecial", !!v)} />
                <label htmlFor="isSpecial" className="text-sm cursor-pointer">特殊合同</label>
              </div>
            </div>

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
        templateColumns={orderedCols.map(c => ({ key: c.key, label: c.header }))}
        columns={[
          { key: "contractNo", label: "合同编号", required: true },
          { key: "changeNo", label: "合同变更号" },
          { key: "workOrderNo", label: "开工申请编号" },
          { key: "afterSaleNo", label: "售后服务编号" },
          { key: "customer", label: "客户名称", required: true },
          { key: "contractName", label: "合同名称", required: true },
          { key: "company1", label: "一级公司" },
          { key: "company2", label: "二级公司" },
          { key: "company3", label: "三级公司" },
          { key: "province", label: "省份", required: true },
          { key: "group", label: "集团" },
          { key: "station", label: "场站名称" },
          { key: "otherName", label: "其他名称" },
          { key: "stationType", label: "场站类别" },
          { key: "stationCapacity", label: "场站容量" },
          { key: "productType", label: "产品线" },
          { key: "projectContent", label: "合同项目内容" },
          { key: "projectNo", label: "项目编号" },
          { key: "salesManager", label: "销售经理", required: true },
          { key: "salesContact", label: "销售联系人" },
          { key: "archiveDate", label: "合同存档日期" },
          { key: "signDate", label: "合同签订日期" },
          { key: "archiveType", label: "合同存档原件/复印件" },
          { key: "archiveCopies", label: "合同存档份数" },
          { key: "startDate", label: "服务收费起始时间" },
          { key: "endDate", label: "服务收费终止时间" },
          { key: "installFee", label: "初装费(万元)", transform: v => parseFloat(v) || undefined },
          { key: "serviceFee", label: "预测服务费(万元)", transform: v => parseFloat(v) || undefined },
          { key: "amountWithTax", label: "合同总额(万元)", transform: v => parseFloat(v) || 0 },
          { key: "amountWithoutTax", label: "不含税合同金额(万元)", transform: v => parseFloat(v) || 0 },
          { key: "guaranteeLetter", label: "保函开具情况" },
          { key: "deliveryDept", label: "交付部门" },
          { key: "projectManager", label: "项目经理" },
          { key: "briefingDate", label: "合同交底会时间" },
          { key: "thirdPartyFee", label: "第三方接口费(万元)", transform: v => parseFloat(v) || undefined },
          { key: "status", label: "状态" },
          { key: "notes", label: "备注" },
        ]}
        onImportRow={async (row) => { await createMutation.mutateAsync({ data: row as any }); invalidate(); }}
      />
      <CustomFieldsManager open={showCF} onOpenChange={setShowCF} defs={defs} onAdd={addDef} onDelete={deleteDef} onReorder={reorderDefs} />
    </div>
  );
}

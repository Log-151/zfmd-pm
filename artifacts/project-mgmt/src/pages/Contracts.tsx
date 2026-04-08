import { useState } from "react";
import {
  useListContracts,
  getListContractsQueryKey,
  useCreateContract,
  useDeleteContract,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { formatWanYuan, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const EMPTY_FORM = {
  contractNo: "",
  contractName: "",
  contractType: "销售合同",
  status: "执行中",
  customer: "",
  province: "",
  group: "",
  station: "",
  salesManager: "",
  signDate: "",
  startDate: "",
  endDate: "",
  amountWithTax: "",
  amountWithoutTax: "",
  productType: "数值天气预报",
  workOrderNo: "",
  afterSaleNo: "",
  notes: "",
  isSpecial: false,
};

export default function Contracts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const queryParams = {
    search: search || undefined,
    year: year === "all" ? undefined : parseInt(year),
  };

  const { data: contracts, isLoading } = useListContracts(queryParams, {
    query: { queryKey: getListContractsQueryKey(queryParams) },
  });

  const createMutation = useCreateContract({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
        setShowCreate(false);
        setForm({ ...EMPTY_FORM });
        toast({ title: "合同已创建" });
      },
      onError: () => toast({ title: "创建失败", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteContract({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
        setDeleteId(null);
        toast({ title: "合同已删除" });
      },
      onError: () => toast({ title: "删除失败", variant: "destructive" }),
    },
  });

  const handleCreate = () => {
    if (!form.contractNo || !form.contractName || !form.customer) {
      toast({ title: "请填写必填项（合同编号、合同名称、客户名称）", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      data: {
        ...form,
        amountWithTax: parseFloat(form.amountWithTax) || 0,
        amountWithoutTax: parseFloat(form.amountWithoutTax) || 0,
        signDate: form.signDate || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        workOrderNo: form.workOrderNo || undefined,
        afterSaleNo: form.afterSaleNo || undefined,
        notes: form.notes || undefined,
      },
    });
  };

  const handleExport = () => {
    if (!contracts) return;
    exportToCsv("合同列表", contracts, [
      { header: "合同编号", accessor: (c) => c.contractNo },
      { header: "合同名称", accessor: (c) => c.contractName },
      { header: "客户名称", accessor: (c) => c.customer },
      { header: "省份", accessor: (c) => c.province },
      { header: "集团", accessor: (c) => c.group },
      { header: "场站", accessor: (c) => c.station },
      { header: "销售经理", accessor: (c) => c.salesManager },
      { header: "含税金额", accessor: (c) => c.amountWithTax },
      { header: "不含税金额", accessor: (c) => c.amountWithoutTax },
      { header: "产品类型", accessor: (c) => c.productType },
      { header: "签订日期", accessor: (c) => formatDate(c.signDate) },
      { header: "开始日期", accessor: (c) => formatDate(c.startDate) },
      { header: "结束日期", accessor: (c) => formatDate(c.endDate) },
      { header: "状态", accessor: (c) => c.status },
    ]);
  };

  const f = (field: keyof typeof EMPTY_FORM, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">合同管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> 导出 CSV
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> 新建合同
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border shadow-sm p-4 flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索合同编号、名称、客户..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="年份" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部年份</SelectItem>
            {[2026, 2025, 2024, 2023, 2022, 2021].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : !contracts?.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell>
                </TableRow>
              ) : (
                contracts.map((contract) => (
                  <TableRow key={contract.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{contract.contractNo}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={contract.contractName}>{contract.contractName}</TableCell>
                    <TableCell className="max-w-[150px] truncate" title={contract.customer}>{contract.customer}</TableCell>
                    <TableCell>{contract.province}</TableCell>
                    <TableCell>{contract.salesManager}</TableCell>
                    <TableCell className="text-right font-medium">{formatWanYuan(contract.amountWithTax)}</TableCell>
                    <TableCell>{formatDate(contract.signDate)}</TableCell>
                    <TableCell>
                      <Badge variant={contract.status === "执行中" ? "default" : "secondary"}>
                        {contract.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(contract.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建合同</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>合同编号 <span className="text-destructive">*</span></Label>
              <Input value={form.contractNo} onChange={(e) => f("contractNo", e.target.value)} placeholder="如 HT-2024-001" />
            </div>
            <div className="space-y-1.5">
              <Label>合同类型</Label>
              <Select value={form.contractType} onValueChange={(v) => f("contractType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="销售合同">销售合同</SelectItem>
                  <SelectItem value="续签合同">续签合同</SelectItem>
                  <SelectItem value="框架合同">框架合同</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>合同名称 <span className="text-destructive">*</span></Label>
              <Input value={form.contractName} onChange={(e) => f("contractName", e.target.value)} placeholder="合同名称" />
            </div>
            <div className="space-y-1.5">
              <Label>客户名称 <span className="text-destructive">*</span></Label>
              <Input value={form.customer} onChange={(e) => f("customer", e.target.value)} placeholder="客户全称" />
            </div>
            <div className="space-y-1.5">
              <Label>销售经理 <span className="text-destructive">*</span></Label>
              <Input value={form.salesManager} onChange={(e) => f("salesManager", e.target.value)} placeholder="销售经理姓名" />
            </div>
            <div className="space-y-1.5">
              <Label>省份</Label>
              <Input value={form.province} onChange={(e) => f("province", e.target.value)} placeholder="如 甘肃" />
            </div>
            <div className="space-y-1.5">
              <Label>集团</Label>
              <Input value={form.group} onChange={(e) => f("group", e.target.value)} placeholder="所属集团" />
            </div>
            <div className="space-y-1.5">
              <Label>场站</Label>
              <Input value={form.station} onChange={(e) => f("station", e.target.value)} placeholder="场站名称" />
            </div>
            <div className="space-y-1.5">
              <Label>产品类型</Label>
              <Select value={form.productType} onValueChange={(v) => f("productType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="数值天气预报">数值天气预报</SelectItem>
                  <SelectItem value="功率预测系统">功率预测系统</SelectItem>
                  <SelectItem value="综合预测平台">综合预测平台</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={(v) => f("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="执行中">执行中</SelectItem>
                  <SelectItem value="已完成">已完成</SelectItem>
                  <SelectItem value="已终止">已终止</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>含税金额（元）</Label>
              <Input type="number" value={form.amountWithTax} onChange={(e) => f("amountWithTax", e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>不含税金额（元）</Label>
              <Input type="number" value={form.amountWithoutTax} onChange={(e) => f("amountWithoutTax", e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>签订日期</Label>
              <Input type="date" value={form.signDate} onChange={(e) => f("signDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>开始日期</Label>
              <Input type="date" value={form.startDate} onChange={(e) => f("startDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>结束日期</Label>
              <Input type="date" value={form.endDate} onChange={(e) => f("endDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>开工号</Label>
              <Input value={form.workOrderNo} onChange={(e) => f("workOrderNo", e.target.value)} placeholder="关联开工号" />
            </div>
            <div className="space-y-1.5">
              <Label>售后号</Label>
              <Input value={form.afterSaleNo} onChange={(e) => f("afterSaleNo", e.target.value)} placeholder="关联售后号" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>备注</Label>
              <Input value={form.notes} onChange={(e) => f("notes", e.target.value)} placeholder="备注信息" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复，确定要删除该合同吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

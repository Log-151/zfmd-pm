import { useState } from "react";
import { useListPayments, getListPaymentsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatWanYuan, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search } from "lucide-react";

export default function Payments() {
  const [payer, setPayer] = useState("");
  
  const { data: payments, isLoading } = useListPayments(
    { payer: payer || undefined },
    { query: { queryKey: getListPaymentsQueryKey({ payer: payer || undefined }) } }
  );

  const handleExport = () => {
    if (!payments) return;
    exportToCsv("回款记录", payments, [
      { header: "付款单位", accessor: (p) => p.payer },
      { header: "关联合同", accessor: (p) => p.contractNo },
      { header: "省份", accessor: (p) => p.province },
      { header: "销售经理", accessor: (p) => p.salesManager },
      { header: "回款金额", accessor: (p) => p.amount },
      { header: "回款日期", accessor: (p) => formatDate(p.paymentDate) },
    ]);
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">回款管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> 导出 CSV
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" /> 登记回款
          </Button>
        </div>
      </div>
      
      <div className="bg-card rounded-lg border shadow-sm p-4 flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索付款单位..."
            className="pl-9"
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
          />
        </div>
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
                <TableHead>回款日期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : !payments?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无数据</TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium max-w-[200px] truncate" title={payment.payer}>{payment.payer}</TableCell>
                    <TableCell>{payment.contractNo || "-"}</TableCell>
                    <TableCell>{payment.province}</TableCell>
                    <TableCell>{payment.salesManager}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">+{formatWanYuan(payment.amount)}</TableCell>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

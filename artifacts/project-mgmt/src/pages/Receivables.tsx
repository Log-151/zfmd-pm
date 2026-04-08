import { useState } from "react";
import { useListReceivables, getListReceivablesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatWanYuan, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Receivables() {
  const [search, setSearch] = useState("");
  
  const { data: receivables, isLoading } = useListReceivables(
    { contractNo: search || undefined },
    { query: { queryKey: getListReceivablesQueryKey({ contractNo: search || undefined }) } }
  );

  const handleExport = () => {
    if (!receivables) return;
    exportToCsv("应收款管理", receivables, [
      { header: "客户名称", accessor: (r) => r.customer },
      { header: "关联合同", accessor: (r) => r.contractNo },
      { header: "收款类型", accessor: (r) => r.receivableType },
      { header: "金额", accessor: (r) => r.amount },
      { header: "预计收款日", accessor: (r) => formatDate(r.expectedDate) },
      { header: "状态", accessor: (r) => r.status },
    ]);
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">应收款管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> 导出 CSV
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" /> 新增应收记录
          </Button>
        </div>
      </div>
      
      <div className="bg-card rounded-lg border shadow-sm p-4 flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索合同编号..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead>客户名称</TableHead>
                <TableHead>关联合同</TableHead>
                <TableHead>收款类型</TableHead>
                <TableHead className="text-right">应收金额</TableHead>
                <TableHead>预计收款日</TableHead>
                <TableHead>销售经理</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : !receivables?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无数据</TableCell>
                </TableRow>
              ) : (
                receivables.map((receivable) => (
                  <TableRow key={receivable.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="max-w-[200px] truncate" title={receivable.customer}>{receivable.customer}</TableCell>
                    <TableCell>{receivable.contractNo || "-"}</TableCell>
                    <TableCell>{receivable.receivableType}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">{formatWanYuan(receivable.amount)}</TableCell>
                    <TableCell>{formatDate(receivable.expectedDate)}</TableCell>
                    <TableCell>{receivable.salesManager}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={receivable.status === "已收回" ? "outline" : "default"}>
                          {receivable.status}
                        </Badge>
                        {receivable.isBadDebt && (
                          <Badge variant="destructive">坏账</Badge>
                        )}
                        {(receivable.daysLate || 0) > 0 && (
                          <span className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> 逾期 {receivable.daysLate} 天
                          </span>
                        )}
                      </div>
                    </TableCell>
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

import { useState } from "react";
import { useListWorkOrders, getListWorkOrdersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatWanYuan, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function WorkOrders() {
  const [search, setSearch] = useState("");
  
  const { data: workOrders, isLoading } = useListWorkOrders(
    { province: search || undefined }, // Just repurposing search to province for now
    { query: { queryKey: getListWorkOrdersQueryKey({ province: search || undefined }) } }
  );

  const handleExport = () => {
    if (!workOrders) return;
    exportToCsv("开工申请", workOrders, [
      { header: "申请单号", accessor: (w) => w.workOrderNo },
      { header: "客户名称", accessor: (w) => w.customer },
      { header: "产品类型", accessor: (w) => w.productType },
      { header: "省份", accessor: (w) => w.province },
      { header: "申请日期", accessor: (w) => formatDate(w.applyDate) },
      { header: "关联合同", accessor: (w) => w.contractNo || "无" },
    ]);
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">开工申请</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> 导出 CSV
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" /> 新建开工申请
          </Button>
        </div>
      </div>
      
      <div className="bg-card rounded-lg border shadow-sm p-4 flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索省份..."
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
                <TableHead>申请单号</TableHead>
                <TableHead>客户名称</TableHead>
                <TableHead>产品类型</TableHead>
                <TableHead>省份</TableHead>
                <TableHead>销售经理</TableHead>
                <TableHead>申请日期</TableHead>
                <TableHead>关联合同</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : !workOrders?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无数据</TableCell>
                </TableRow>
              ) : (
                workOrders.map((wo) => (
                  <TableRow key={wo.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{wo.workOrderNo}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={wo.customer}>{wo.customer}</TableCell>
                    <TableCell>{wo.productType}</TableCell>
                    <TableCell>{wo.province}</TableCell>
                    <TableCell>{wo.salesManager}</TableCell>
                    <TableCell>{formatDate(wo.applyDate)}</TableCell>
                    <TableCell>
                      {wo.hasContract ? (
                        <span className="text-muted-foreground">{wo.contractNo}</span>
                      ) : (
                        <Badge variant="destructive" className="gap-1 flex w-fit">
                          <AlertTriangle className="w-3 h-3" /> 无合同
                        </Badge>
                      )}
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

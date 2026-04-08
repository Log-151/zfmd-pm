import { useState } from "react";
import { useListContracts, getListContractsQueryKey, useCreateContract, useUpdateContract, useDeleteContract } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatWanYuan, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Contracts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<string>("all");
  
  const { data: contracts, isLoading } = useListContracts(
    { search: search || undefined, year: year === "all" ? undefined : parseInt(year) },
    { query: { queryKey: getListContractsQueryKey({ search: search || undefined, year: year === "all" ? undefined : parseInt(year) }) } }
  );

  const handleExport = () => {
    if (!contracts) return;
    exportToCsv("合同列表", contracts, [
      { header: "合同编号", accessor: (c) => c.contractNo },
      { header: "合同名称", accessor: (c) => c.contractName },
      { header: "客户名称", accessor: (c) => c.customer },
      { header: "省份", accessor: (c) => c.province },
      { header: "销售经理", accessor: (c) => c.salesManager },
      { header: "含税金额", accessor: (c) => c.amountWithTax },
      { header: "签订日期", accessor: (c) => formatDate(c.signDate) },
      { header: "状态", accessor: (c) => c.status },
    ]);
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">合同管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> 导出 CSV
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" /> 新建合同
          </Button>
        </div>
      </div>
      
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
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
            <SelectItem value="2022">2022</SelectItem>
          </SelectContent>
        </Select>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : !contracts?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无数据</TableCell>
                </TableRow>
              ) : (
                contracts.map((contract) => (
                  <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50">
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

import { useState } from "react";
import { useListWeatherServices, getListWeatherServicesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatWanYuan, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/export";
import { Plus, Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function WeatherServices() {
  const [search, setSearch] = useState("");
  
  const { data: services, isLoading } = useListWeatherServices(
    { province: search || undefined },
    { query: { queryKey: getListWeatherServicesQueryKey({ province: search || undefined }) } }
  );

  const handleExport = () => {
    if (!services) return;
    exportToCsv("数值天气服务", services, [
      { header: "省份", accessor: (s) => s.province },
      { header: "场站", accessor: (s) => s.station },
      { header: "关联合同", accessor: (s) => s.contractNo || "无" },
      { header: "服务开始", accessor: (s) => formatDate(s.serviceStartDate) },
      { header: "服务结束", accessor: (s) => formatDate(s.serviceEndDate) },
      { header: "状态", accessor: (s) => s.status },
    ]);
  };

  const getAlertColor = (level: string | null | undefined) => {
    switch (level) {
      case "expired": return "bg-red-500 text-white hover:bg-red-600";
      case "1m": return "bg-orange-500 text-white hover:bg-orange-600";
      case "2m": return "bg-yellow-500 text-white hover:bg-yellow-600";
      case "3m": return "bg-blue-500 text-white hover:bg-blue-600";
      default: return "bg-green-500 text-white hover:bg-green-600";
    }
  };

  const getAlertText = (level: string | null | undefined) => {
    switch (level) {
      case "expired": return "已过期";
      case "1m": return "1个月内过期";
      case "2m": return "2个月内过期";
      case "3m": return "3个月内过期";
      default: return "正常";
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">数值天气</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> 导出 CSV
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" /> 新增服务
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
                <TableHead>省份</TableHead>
                <TableHead>集团</TableHead>
                <TableHead>场站</TableHead>
                <TableHead>关联合同</TableHead>
                <TableHead>服务期限</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>预警级别</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : !services?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无数据</TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>{service.province}</TableCell>
                    <TableCell>{service.group}</TableCell>
                    <TableCell>{service.station}</TableCell>
                    <TableCell>{service.contractNo || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(service.serviceStartDate)} 至 {formatDate(service.serviceEndDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.status === "提供服务中" ? "default" : "secondary"}>
                        {service.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`font-normal ${getAlertColor(service.expiryAlertLevel)}`}>
                        {getAlertText(service.expiryAlertLevel)}
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

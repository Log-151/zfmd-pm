import { useState } from "react";
import { useGetProjectManagement, getGetProjectManagementQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWanYuan } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { FileText, Receipt, Banknote, AlertTriangle } from "lucide-react";

export default function ProjectManagement() {
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  
  const { data: summary, isLoading, isError } = useGetProjectManagement(
    { year: parseInt(year) },
    { query: { queryKey: getGetProjectManagementQueryKey({ year: parseInt(year) }), retry: 1 } }
  );

  const metricsGroups = summary ? [
    {
      title: "已开票应收款明细",
      icon: Receipt,
      items: [
        { label: "质保期满已开票应收款", value: summary.invoicedExpiredWarranty },
        { label: "发货/进度款已开票应收款", value: summary.invoicedProgressReceivable },
        { label: "质保期未满已开票应收款", value: summary.invoicedUnexpiredWarranty },
        { label: "未到期服务费已开票应收款", value: summary.invoicedUnexpiredReceivable },
        { label: "已开票全额坏账金额", value: summary.invoicedBadDebt },
      ]
    },
    {
      title: "未开票应收款明细",
      icon: FileText,
      items: [
        { label: "发货/进度款未开票应收款", value: summary.uninvoicedProgressReceivable },
        { label: "未到期服务费未开票应收款", value: summary.uninvoicedUnexpiredReceivable },
      ]
    },
    {
      title: "实际运行期/维保期应收款明细",
      icon: Banknote,
      items: [
        { label: "全部开票实际应收款", value: summary.fullyInvoicedActualReceivable },
        { label: "部分开票实际应收款", value: summary.partiallyInvoicedActualReceivable },
        { label: "未开票实际应收款", value: summary.uninvoicedActualReceivable },
      ]
    },
    {
      title: "无合同及异常明细",
      icon: AlertTriangle,
      items: [
        { label: "无书面合同项目应收款预计金额", value: summary.noContractExpectedReceivable },
        { label: "无书面服务合同应收款预计金额", value: summary.noServiceContractExpected },
      ]
    }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">项目管理摘要</h1>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="年份" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">加载中...</div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-primary text-primary-foreground border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary-foreground/80">已开票应收余额总计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatWanYuan(summary.totalInvoicedReceivable)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">已开票净应收余额(剔除坏账)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{formatWanYuan(summary.netInvoicedReceivable)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">累计坏账总计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{formatWanYuan(summary.totalBadDebt)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metricsGroups.map((group, idx) => (
              <Card key={idx} className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <group.icon className="w-4 h-4 text-primary" />
                    {group.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {group.items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm text-muted-foreground">{item.label}</TableCell>
                          <TableCell className="text-right font-medium">{formatWanYuan(item.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : isError ? (
        <div className="text-center py-16 text-muted-foreground text-sm">数据加载失败，请刷新页面重试</div>
      ) : (
        <div className="text-center py-16 text-muted-foreground text-sm">暂无数据</div>
      )}
    </div>
  )
}

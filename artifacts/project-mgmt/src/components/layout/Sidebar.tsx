import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  Receipt, 
  Wrench, 
  CloudRain, 
  Banknote,
  LineChart,
  BarChart3,
  Download,
  Loader2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const NAV_ITEMS = [
  { href: "/", label: "全局看板", icon: LayoutDashboard },
  { href: "/contracts", label: "合同管理", icon: FileText },
  { href: "/payments", label: "回款管理", icon: CreditCard },
  { href: "/invoices", label: "开票管理", icon: Receipt },
  { href: "/work-orders", label: "开工申请", icon: Wrench },
  { href: "/weather-services", label: "数值天气预报", icon: CloudRain },
  { href: "/receivables", label: "应收款管理", icon: Banknote },
  { href: "/project-management", label: "项目管理", icon: LineChart },
  { href: "/statistics", label: "统计分析", icon: BarChart3 },
];

export function Sidebar() {
  const [location] = useLocation();
  const [backing, setBacking] = useState(false);
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const handleBackup = async () => {
    setBacking(true);
    try {
      const res = await fetch(`${BASE}/api/backup/export`, { credentials: "include" });
      if (!res.ok) throw new Error("备份失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `兆方美迪_数据备份_${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "备份成功", description: "全量数据已下载到本地" });
    } catch {
      toast({ title: "备份失败", description: "请稍后重试", variant: "destructive" });
    } finally {
      setBacking(false);
    }
  };

  return (
    <div className="w-64 bg-card border-r border-border h-full flex flex-col shrink-0 shadow-sm z-20">
      <div className="h-14 border-b border-border flex items-center px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">
            兆
          </div>
          <span className="font-bold text-lg tracking-tight text-card-foreground">兆方美迪</span>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-border p-3 shrink-0 flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleBackup}
          disabled={backing}
        >
          {backing
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />}
          {backing ? "正在备份..." : "一键备份全量数据"}
        </Button>
        <p className="text-[11px] text-muted-foreground px-1 leading-relaxed">
          下载全部6个模块数据为 ZIP 压缩包，CSV 格式可直接用 Excel 打开
        </p>
        <div className="flex items-center justify-between pt-1 border-t border-border mt-1">
          <span className="text-xs text-muted-foreground truncate">{user?.username ?? ""}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            onClick={logout}
            title="退出登录"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

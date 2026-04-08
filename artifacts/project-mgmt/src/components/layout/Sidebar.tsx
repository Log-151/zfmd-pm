import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  Receipt, 
  Wrench, 
  CloudRain, 
  Banknote,
  LineChart
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/contracts", label: "合同管理", icon: FileText },
  { href: "/payments", label: "回款管理", icon: CreditCard },
  { href: "/invoices", label: "开票管理", icon: Receipt },
  { href: "/work-orders", label: "开工申请", icon: Wrench },
  { href: "/weather-services", label: "数值天气", icon: CloudRain },
  { href: "/receivables", label: "应收款管理", icon: Banknote },
  { href: "/project-management", label: "项目管理", icon: LineChart },
];

export function Sidebar() {
  const [location] = useLocation();

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
    </div>
  );
}

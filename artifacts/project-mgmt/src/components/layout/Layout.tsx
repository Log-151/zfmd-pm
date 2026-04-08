import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useLocation } from "wouter";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-14 border-b border-border bg-card flex items-center px-6 shrink-0 z-10 shadow-sm">
          <div className="flex-1 font-semibold text-lg text-primary tracking-tight">
            新能源气象服务管理系统
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="max-w-[1600px] mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

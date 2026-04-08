import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Contracts from "@/pages/Contracts";
import Payments from "@/pages/Payments";
import Invoices from "@/pages/Invoices";
import WorkOrders from "@/pages/WorkOrders";
import WeatherServices from "@/pages/WeatherServices";
import Receivables from "@/pages/Receivables";
import ProjectManagement from "@/pages/ProjectManagement";
import Statistics from "@/pages/Statistics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/contracts" component={Contracts} />
        <Route path="/payments" component={Payments} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/work-orders" component={WorkOrders} />
        <Route path="/weather-services" component={WeatherServices} />
        <Route path="/receivables" component={Receivables} />
        <Route path="/project-management" component={ProjectManagement} />
        <Route path="/statistics" component={Statistics} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/layout/Layout";
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
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Sales from "@/pages/Sales";
import Reports from "@/pages/Reports";
import CapitalIncrease from "@/pages/CapitalIncrease";
import GrossCapitalReport from "@/pages/GrossCapitalReport";
import SellerReport from "@/pages/SellerReport";
import Expenses from "@/pages/Expenses";
import Delivery from "@/pages/Delivery";
import SalesReport from "@/pages/SalesReport";
import ExpensesReport from "@/pages/ExpensesReport";
import { useAuth, useLogout } from "@/lib/auth";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated && location !== "/") {
    return <Redirect to="/" />;
  }

  if (isAuthenticated && location === "/") {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function AuthenticatedLayout() {
  const logout = useLogout();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout.mutate()}
                data-testid="button-logout-header"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Switch>
              <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
              <Route path="/productos" component={() => <ProtectedRoute component={Products} />} />
              <Route path="/ventas" component={() => <ProtectedRoute component={Sales} />} />
              <Route path="/reportes" component={() => <ProtectedRoute component={Reports} />} />
              <Route path="/reporte-ventas" component={() => <ProtectedRoute component={SalesReport} />} />
              <Route path="/aumento-capital" component={() => <ProtectedRoute component={CapitalIncrease} />} />
              <Route path="/capital-bruto" component={() => <ProtectedRoute component={GrossCapitalReport} />} />
              <Route path="/reporte-vendedores" component={() => <ProtectedRoute component={SellerReport} />} />
              <Route path="/gastos" component={() => <ProtectedRoute component={Expenses} />} />
              <Route path="/delivery" component={() => <ProtectedRoute component={Delivery} />} />
              <Route path="/reporte-gastos" component={() => <ProtectedRoute component={ExpensesReport} />} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/dashboard" component={AuthenticatedLayout} />
      <Route path="/productos" component={AuthenticatedLayout} />
      <Route path="/ventas" component={AuthenticatedLayout} />
      <Route path="/reportes" component={AuthenticatedLayout} />
      <Route path="/reporte-ventas" component={AuthenticatedLayout} />
      <Route path="/aumento-capital" component={AuthenticatedLayout} />
      <Route path="/capital-bruto" component={AuthenticatedLayout} />
      <Route path="/reporte-vendedores" component={AuthenticatedLayout} />
      <Route path="/gastos" component={AuthenticatedLayout} />
      <Route path="/delivery" component={AuthenticatedLayout} />
      <Route path="/reporte-gastos" component={AuthenticatedLayout} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

import { type CSSProperties } from "react";
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
import SellerSalesAnalytics from "@/pages/SellerSalesAnalytics";
import Expenses from "@/pages/Expenses";
import Delivery from "@/pages/Delivery";
import DeliveryProductHistory from "@/pages/DeliveryProductHistory";
import SalesReport from "@/pages/SalesReport";
import ExpensesReport from "@/pages/ExpensesReport";
import Settings from "@/pages/Settings";
import { useAuth, useLogout } from "@/lib/auth";
import { hasPermission, routePermissionMap } from "@/lib/permissions";

const pageTitles: Record<string, string> = {
  "/dashboard": "Inicio",
  "/productos": "Productos",
  "/ventas": "Ventas",
  "/reportes": "Reportes",
  "/reporte-ventas": "Reporte de Ventas",
  "/aumento-capital": "Aumento de Capital",
  "/capital-bruto": "Capital Bruto",
  "/reporte-vendedores": "Reporte de Vendedores",
  "/analitica-vendedores": "Analitica Vendedores",
  "/gastos": "Gastos",
  "/delivery": "Inventario",
  "/delivery/producto": "Historial de Producto",
  "/reporte-gastos": "Reporte de Gastos",
  "/configuracion": "Configuracion",
};

function getPageTitle(location: string) {
  if (location.startsWith("/delivery/producto/")) {
    return pageTitles["/delivery/producto"];
  }
  return pageTitles[location] ?? "Panel";
}

function resolvePermissionKey(location: string) {
  if (location.startsWith("/delivery/producto/")) {
    return routePermissionMap["/delivery/producto"];
  }
  return routePermissionMap[location];
}

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f1ff]">
        <div className="rounded-xl border border-border/70 bg-card/90 px-6 py-4 text-sm font-medium text-muted-foreground shadow-md backdrop-blur">
          Cargando panel...
        </div>
      </div>
    );
  }

  if (!isAuthenticated && location !== "/") {
    return <Redirect to="/" />;
  }

  if (isAuthenticated && location === "/") {
    return <Redirect to="/dashboard" />;
  }

  const permissionKey = resolvePermissionKey(location);
  if (isAuthenticated && permissionKey && !hasPermission(user?.permissions, permissionKey, user?.isAdmin)) {
    const allowedPath =
      Object.keys(routePermissionMap).find((path) =>
        hasPermission(user?.permissions, routePermissionMap[path], user?.isAdmin)
      ) || "/dashboard";
    return <Redirect to={allowedPath} />;
  }

  return <Component />;
}

function AuthenticatedLayout() {
  const logout = useLogout();
  const [location] = useLocation();
  const style: CSSProperties = {
    ["--sidebar-width" as string]: "17rem",
    ["--sidebar-width-icon" as string]: "3rem",
  };

  return (
    <SidebarProvider style={style}>
      <div className="min-h-screen w-full bg-[radial-gradient(circle_at_18%_0%,#c5d4ed_0%,#e8eef8_44%,#f1f5fb_100%)] p-2 md:p-4">
        <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-[1600px] overflow-hidden rounded-[26px] border border-[#9fb4d9] bg-[#f3f7fc] shadow-[0_24px_60px_-30px_rgba(15,41,82,0.42)] md:min-h-[calc(100vh-2rem)]">
          <AppSidebar />

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 border-b border-[#bdcde6] bg-white/88 backdrop-blur">
              <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
                <div className="flex min-w-0 items-center gap-2.5">
                  <SidebarTrigger
                    className="h-9 w-9 rounded-xl border border-border/80 bg-white shadow-sm"
                    data-testid="button-sidebar-toggle"
                  />

                  <div className="min-w-0 md:hidden">
                    <p className="truncate text-sm font-semibold">{getPageTitle(location)}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-semibold">{getPageTitle(location)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-border/80 bg-white"
                    onClick={() => logout.mutate()}
                    data-testid="button-logout-header"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Cerrar Sesion</span>
                  </Button>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-auto">
              <div className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6 lg:px-8">
                <Switch>
                  <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
                  <Route path="/productos" component={() => <ProtectedRoute component={Products} />} />
                  <Route path="/ventas" component={() => <ProtectedRoute component={Sales} />} />
                  <Route path="/reportes" component={() => <ProtectedRoute component={Reports} />} />
                  <Route path="/reporte-ventas" component={() => <ProtectedRoute component={SalesReport} />} />
                  <Route path="/aumento-capital" component={() => <ProtectedRoute component={CapitalIncrease} />} />
                  <Route path="/capital-bruto" component={() => <ProtectedRoute component={GrossCapitalReport} />} />
                  <Route path="/reporte-vendedores" component={() => <ProtectedRoute component={SellerReport} />} />
                  <Route path="/analitica-vendedores" component={() => <ProtectedRoute component={SellerSalesAnalytics} />} />
                  <Route path="/gastos" component={() => <ProtectedRoute component={Expenses} />} />
                  <Route path="/delivery" component={() => <ProtectedRoute component={Delivery} />} />
                  <Route path="/delivery/producto/:productId" component={() => <ProtectedRoute component={DeliveryProductHistory} />} />
                  <Route path="/reporte-gastos" component={() => <ProtectedRoute component={ExpensesReport} />} />
                  <Route path="/configuracion" component={() => <ProtectedRoute component={Settings} />} />
                  <Route component={NotFound} />
                </Switch>
              </div>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f1ff]">
        <div className="rounded-xl border border-border/70 bg-card/90 px-6 py-4 text-sm font-medium text-muted-foreground shadow-md backdrop-blur">
          Cargando sistema...
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">{isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}</Route>
      <Route path="/dashboard" component={AuthenticatedLayout} />
      <Route path="/productos" component={AuthenticatedLayout} />
      <Route path="/ventas" component={AuthenticatedLayout} />
      <Route path="/reportes" component={AuthenticatedLayout} />
      <Route path="/reporte-ventas" component={AuthenticatedLayout} />
      <Route path="/aumento-capital" component={AuthenticatedLayout} />
      <Route path="/capital-bruto" component={AuthenticatedLayout} />
      <Route path="/reporte-vendedores" component={AuthenticatedLayout} />
      <Route path="/analitica-vendedores" component={AuthenticatedLayout} />
      <Route path="/gastos" component={AuthenticatedLayout} />
      <Route path="/delivery" component={AuthenticatedLayout} />
      <Route path="/delivery/producto/:productId" component={AuthenticatedLayout} />
      <Route path="/reporte-gastos" component={AuthenticatedLayout} />
      <Route path="/configuracion" component={AuthenticatedLayout} />
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

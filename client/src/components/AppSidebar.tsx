import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
  Settings,
  LogOut,
  Receipt,
  TruckIcon,
  BarChart3,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth, useLogout } from "@/lib/auth";
import { hasPermission, routePermissionMap } from "@/lib/permissions";
import { useEffect } from "react";

const allMenuItems = [
  { title: "Inicio", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Productos", icon: Package, path: "/productos" },
  { title: "Ventas", icon: ShoppingCart, path: "/ventas" },
  { title: "Reportes", icon: FileText, path: "/reportes" },
  { title: "Estado Financiero", icon: BarChart3, path: "/estado-financiero" },
  { title: "Reporte Ventas", icon: BarChart3, path: "/reporte-ventas" },
  { title: "Aumento Capital", icon: TrendingUp, path: "/aumento-capital" },
  { title: "Capital Bruto", icon: FileText, path: "/capital-bruto" },
  { title: "Reporte Vendedores", icon: Users, path: "/reporte-vendedores" },
  { title: "Equipo Comercial", icon: Users, path: "/equipo-comercial" },
  { title: "Analitica Vendedores", icon: BarChart3, path: "/analitica-vendedores" },
  { title: "Gastos", icon: Receipt, path: "/gastos" },
  { title: "Reporte Gastos", icon: FileText, path: "/reporte-gastos" },
  { title: "Inventario", icon: TruckIcon, path: "/delivery" },
  { title: "Configuracion", icon: Settings, path: "/configuracion" },
];

export default function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const logout = useLogout();
  const { isMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location, isMobile, setOpenMobile]);

  const menuItems = allMenuItems.filter((item) => {
    if (user?.isAdmin && item.path === "/ventas") {
      return false;
    }
    return hasPermission(user?.permissions, routePermissionMap[item.path], user?.isAdmin);
  });

  return (
    <Sidebar className="border-r border-[#b5c7e4] bg-[#edf3fb]/95">
      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-1">
          <div className="mb-4 rounded-2xl border border-[#c5d5eb] bg-white/85 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d7e5fb] text-sm font-bold text-[#1d4f97]">
                {(user?.name?.[0] || "U").toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">{user?.name || "Usuario"}</p>
                <p className="text-xs text-sidebar-foreground/65">Online</p>
              </div>
            </div>
          </div>

          <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55">
            Navegacion
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                    className="h-9 rounded-xl px-3 text-[0.9rem] data-[active=true]:bg-[#d9e8ff] data-[active=true]:text-[#163f88]"
                    data-testid={`link-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.path} onClick={() => isMobile && setOpenMobile(false)}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 px-3 py-4">
        <Button
          variant="outline"
          className="w-full justify-start rounded-xl border-[#bed0ea] bg-white/85"
          onClick={() => logout.mutate()}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesion
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

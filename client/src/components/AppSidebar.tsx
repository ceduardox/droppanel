import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ShoppingCart, FileText, TrendingUp, Settings, LogOut } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const allMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Productos", icon: Package, path: "/productos" },
  { title: "Ventas", icon: ShoppingCart, path: "/ventas" },
  { title: "Reportes", icon: FileText, path: "/reportes" },
  { title: "Aumento de Capital", icon: TrendingUp, path: "/aumento-capital" },
  { title: "Configuración", icon: Settings, path: "/configuracion" },
];

export default function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const menuItems = allMenuItems.filter(item => {
    if (user?.isAdmin && item.path === "/ventas") {
      return false;
    }
    return true;
  });

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold px-4 py-6">
            Sistema de Ventas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                    data-testid={`link-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.path}>
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
      <SidebarFooter className="p-4">
        <Button variant="outline" className="w-full justify-start" data-testid="button-logout">
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

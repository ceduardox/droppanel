import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "../AppSidebar";

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 bg-background">
          <h1 className="text-2xl font-bold">Contenido Principal</h1>
          <p className="text-muted-foreground mt-2">El sidebar se muestra a la izquierda</p>
        </main>
      </div>
    </SidebarProvider>
  );
}

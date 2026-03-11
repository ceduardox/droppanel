import StatsCard from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Package, TrendingUp } from "lucide-react";
import { useReports } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-BO", {
    weekday: "short",
    day: "2-digit",
    month: "long",
  }).format(date);
}

export default function Dashboard() {
  const { data: salesWithProducts = [], isLoading } = useReports();
  const { user } = useAuth();

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center">Cargando...</div>;
  }

  const totalSales = (salesWithProducts as any[]).reduce((sum: number, item: any) => {
    const price = parseFloat(item.product?.price || 0);
    return sum + price * item.quantity;
  }, 0);

  const totalProducts = (salesWithProducts as any[]).reduce((sum: number, item: any) => sum + item.quantity, 0);

  const totalCost = (salesWithProducts as any[]).reduce((sum: number, item: any) => {
    const cost = parseFloat(item.product?.cost || 0);
    return sum + cost * item.quantity;
  }, 0);

  const totalProfit = totalSales - totalCost;

  const recentSales = (salesWithProducts as any[])
    .filter((item: any) => item.product)
    .slice(0, 4)
    .map((item: any) => ({
      id: item.id,
      productName: item.product.name,
      quantity: item.quantity,
      total: parseFloat(item.product.price) * item.quantity,
      date: item.saleDate,
    }));

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-[#b7c9e6] bg-[linear-gradient(112deg,#e6edf8_0%,#eef3fb_56%,#e1eefc_100%)]">
        <CardContent className="p-5 md:p-7">
          <p className="text-sm text-muted-foreground">{formatDateLabel(new Date())}</p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">Hola, {user?.name || "Usuario"}</h1>
          <p className="mt-1 bg-gradient-to-r from-[#0e8d8d] to-[#2758b4] bg-clip-text text-2xl font-semibold text-transparent md:text-4xl">
            Bienvenido al panel de gestion
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="border-[#b7c9e6] bg-white/90">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-[#1e4e97]" />
              Ventas recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aun no hay ventas registradas.</p>
            ) : (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-white/90 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{sale.productName}</p>
                    <p className="text-xs text-muted-foreground">{sale.quantity} unidades</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="border-[#bfd0ea] bg-[#e6efff] text-[#1d438b]">
                      {sale.date}
                    </Badge>
                    <p className="mt-1 text-sm font-semibold">{sale.total.toFixed(2)} Bs</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <StatsCard title="Ventas Totales" value={`${totalSales.toFixed(2)} Bs`} subtitle="Total acumulado" icon={DollarSign} />
            <StatsCard title="Utilidad Total" value={`${totalProfit.toFixed(2)} Bs`} subtitle="Ganancia neta" icon={TrendingUp} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatsCard title="Productos Vendidos" value={totalProducts.toString()} subtitle="Unidades" icon={Package} />
        <StatsCard title="Costo Total" value={`${totalCost.toFixed(2)} Bs`} subtitle="Costo acumulado" icon={DollarSign} />
        <StatsCard title="Margen" value={totalSales > 0 ? `${((totalProfit / totalSales) * 100).toFixed(1)}%` : "0%"} subtitle="Rentabilidad" icon={TrendingUp} />
      </div>
    </div>
  );
}

import StatsCard from "@/components/StatsCard";
import ReportCard from "@/components/ReportCard";
import { DollarSign, Package, TrendingUp, Users } from "lucide-react";
import { useReports } from "@/lib/api";

export default function Dashboard() {
  const { data: salesWithProducts = [], isLoading } = useReports();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  // Calculate stats
  const totalSales = salesWithProducts.reduce((sum: number, item: any) => {
    const price = parseFloat(item.product?.price || 0);
    const quantity = item.quantity;
    return sum + (price * quantity);
  }, 0);

  const totalProducts = salesWithProducts.reduce((sum: number, item: any) => sum + item.quantity, 0);

  const totalCost = salesWithProducts.reduce((sum: number, item: any) => {
    const cost = parseFloat(item.product?.cost || 0);
    const quantity = item.quantity;
    return sum + (cost * quantity);
  }, 0);

  const totalProfit = totalSales - totalCost;
  const profitPerPartner = totalProfit / 2;

  const recentSales = salesWithProducts
    .filter((item: any) => item.product)
    .slice(0, 3)
    .map((item: any) => ({
      id: item.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: parseFloat(item.product.price),
      cost: parseFloat(item.product.cost),
      date: item.saleDate,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen de ventas y estadísticas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ventas Totales"
          value={`${totalSales.toFixed(2)} Bs`}
          subtitle="Total acumulado"
          icon={DollarSign}
        />
        <StatsCard
          title="Productos Vendidos"
          value={totalProducts.toString()}
          subtitle="Unidades totales"
          icon={Package}
        />
        <StatsCard
          title="Utilidad Total"
          value={`${totalProfit.toFixed(2)} Bs`}
          subtitle="Ganancia neta"
          icon={TrendingUp}
        />
        <StatsCard
          title="Por Socio"
          value={`${profitPerPartner.toFixed(2)} Bs`}
          subtitle="50% cada uno"
          icon={Users}
        />
      </div>

      {recentSales.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Ventas Recientes</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentSales.map((sale) => (
              <ReportCard key={sale.id} sale={sale} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import StatsCard from "@/components/StatsCard";
import ReportCard from "@/components/ReportCard";
import { DollarSign, Package, TrendingUp, Users } from "lucide-react";

// TODO: Remove mock data - replace with real data from backend
const mockSales = [
  {
    id: "1",
    productName: "Berberina",
    quantity: 9,
    price: 130,
    cost: 46.48,
    date: "2024-10-13",
  },
  {
    id: "2",
    productName: "Citrato de Magnesio",
    quantity: 5,
    price: 150,
    cost: 81.43,
    date: "2024-10-12",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen de ventas y estadísticas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ventas Totales"
          value="1,920 Bs"
          subtitle="Este mes"
          icon={DollarSign}
          trend={{ value: "+12.5%", positive: true }}
        />
        <StatsCard
          title="Productos Vendidos"
          value="14"
          subtitle="Este mes"
          icon={Package}
        />
        <StatsCard
          title="Utilidad Total"
          value="1,094.96 Bs"
          subtitle="Este mes"
          icon={TrendingUp}
          trend={{ value: "+8.2%", positive: true }}
        />
        <StatsCard
          title="Por Socio"
          value="547.48 Bs"
          subtitle="Cada uno este mes"
          icon={Users}
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Ventas Recientes</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockSales.map((sale) => (
            <ReportCard key={sale.id} sale={sale} />
          ))}
        </div>
      </div>
    </div>
  );
}

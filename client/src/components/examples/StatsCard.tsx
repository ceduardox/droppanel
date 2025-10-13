import StatsCard from "../StatsCard";
import { DollarSign, Package, TrendingUp, Users } from "lucide-react";

export default function StatsCardExample() {
  return (
    <div className="p-6 bg-background">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ventas Totales"
          value="2,450 Bs"
          subtitle="Este mes"
          icon={DollarSign}
          trend={{ value: "+12.5%", positive: true }}
        />
        <StatsCard
          title="Productos Vendidos"
          value="32"
          subtitle="Este mes"
          icon={Package}
        />
        <StatsCard
          title="Utilidad Total"
          value="1,180 Bs"
          subtitle="Este mes"
          icon={TrendingUp}
          trend={{ value: "+8.2%", positive: true }}
        />
        <StatsCard
          title="Por Socio"
          value="590 Bs"
          subtitle="Cada uno este mes"
          icon={Users}
        />
      </div>
    </div>
  );
}

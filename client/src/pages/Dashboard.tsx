import StatsCard from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Package, Receipt, TrendingUp } from "lucide-react";
import { useExpenses, useGrossCapitalMovements, useReports } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getEffectiveUnitCost, getSaleUnitPrice } from "@/lib/sales-pricing";

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-BO", {
    weekday: "short",
    day: "2-digit",
    month: "long",
  }).format(date);
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
  }
  return null;
}

function getTodayIsoLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Dashboard() {
  const { data: salesWithProducts = [], isLoading: reportsLoading } = useReports();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { user } = useAuth();
  const isAccountant = user?.role?.trim().toLowerCase() === "contador";
  const { data: grossCapitalMovements = [], isLoading: grossLoading } = useGrossCapitalMovements(!isAccountant);

  const isLoading = reportsLoading || expensesLoading || (!isAccountant && grossLoading);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center">Cargando...</div>;
  }

  const totalSales = (salesWithProducts as any[]).reduce((sum: number, item: any) => {
    const price = getSaleUnitPrice(item);
    return sum + price * item.quantity;
  }, 0);

  const totalProducts = (salesWithProducts as any[]).reduce((sum: number, item: any) => sum + item.quantity, 0);

  const totalCost = (salesWithProducts as any[]).reduce((sum: number, item: any) => {
    return sum + getEffectiveUnitCost(item) * item.quantity;
  }, 0);

  const totalProfit = totalSales - totalCost;

  const totalExpenses = (expenses as any[]).reduce((sum: number, expense: any) => {
    return sum + parseFloat(expense.amount || 0);
  }, 0);

  const totalGrossWithdrawals = isAccountant
    ? 0
    : (grossCapitalMovements as any[]).reduce((sum: number, movement: any) => {
        return sum + parseFloat(movement.amount || 0);
      }, 0);

  const realNetProfit = totalProfit - totalExpenses - totalGrossWithdrawals;
  const partnerShare = realNetProfit / 2;

  const recentSales = (salesWithProducts as any[])
    .filter((item: any) => item.product)
    .slice(0, 4)
    .map((item: any) => ({
      id: item.id,
      productName: item.product.name,
      quantity: item.quantity,
      total: getSaleUnitPrice(item) * item.quantity,
      date: item.saleDate,
    }));

  const todayIso = getTodayIsoLocal();
  const todaySales = (salesWithProducts as any[]).reduce((sum: number, item: any) => {
    if (toIsoDate(item.saleDate) !== todayIso) return sum;
    const price = getSaleUnitPrice(item);
    return sum + price * item.quantity;
  }, 0);

  const todayCost = (salesWithProducts as any[]).reduce((sum: number, item: any) => {
    if (toIsoDate(item.saleDate) !== todayIso) return sum;
    return sum + getEffectiveUnitCost(item) * item.quantity;
  }, 0);

  const todayExpenses = (expenses as any[]).reduce((sum: number, expense: any) => {
    if (toIsoDate(expense.expenseDate) !== todayIso) return sum;
    return sum + parseFloat(expense.amount || 0);
  }, 0);

  const todayGrossWithdrawals = isAccountant
    ? 0
    : (grossCapitalMovements as any[]).reduce((sum: number, movement: any) => {
        if (toIsoDate(movement.movementDate) !== todayIso) return sum;
        return sum + parseFloat(movement.amount || 0);
      }, 0);

  const dailyUtility = todaySales - todayExpenses;
  const dailyNetUtility = todaySales - todayCost - todayExpenses - todayGrossWithdrawals;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-[#b7c9e6] bg-[linear-gradient(112deg,#e6edf8_0%,#eef3fb_56%,#e1eefc_100%)]">
        <CardContent className="p-5 md:p-7">
          <p className="text-sm text-muted-foreground">{formatDateLabel(new Date())}</p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">Hola, {user?.name || "Usuario"}</h1>
          <p className="mt-1 bg-gradient-to-r from-[#0e8d8d] to-[#2758b4] bg-clip-text text-2xl font-semibold text-transparent md:text-4xl">
            Bienvenido al panel de gestion
          </p>
          {isAccountant && (
            <Badge variant="outline" className="mt-4 border-[#bfd0ea] bg-[#e6efff] text-[#1d438b]">
              Vista contador: sin datos sensibles de costos ni socios
            </Badge>
          )}
        </CardContent>
      </Card>

      {isAccountant ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatsCard title="Utilidad de Hoy" value={`${dailyUtility.toFixed(2)} Bs`} subtitle="Ventas hoy - gastos hoy" icon={TrendingUp} />
            <StatsCard title="Ventas de Hoy" value={`${todaySales.toFixed(2)} Bs`} subtitle="Ingresos del dia" icon={DollarSign} />
            <StatsCard title="Gastos de Hoy" value={`${todayExpenses.toFixed(2)} Bs`} subtitle="Egresos del dia" icon={Receipt} />
            <StatsCard title="Ventas Registradas" value={`${totalSales.toFixed(2)} Bs`} subtitle="Desde tu fecha de acceso" icon={Package} />
          </div>

          <Card className="border-[#b7c9e6] bg-white/90">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-[#1e4e97]" />
                Actividad reciente
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
        </>
      ) : (
        <>
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
                <StatsCard title="Utilidad Total" value={`${totalProfit.toFixed(2)} Bs`} subtitle="Ventas - costos" icon={TrendingUp} />
                <StatsCard title="Gastos Totales" value={`${totalExpenses.toFixed(2)} Bs`} subtitle="Egresos acumulados" icon={Receipt} />
                <StatsCard title="Retiros Capital Bruto" value={`${totalGrossWithdrawals.toFixed(2)} Bs`} subtitle="Egresos por retiro de bruto" icon={Receipt} />
                <StatsCard
                  title="Utilidad Real"
                  value={`${realNetProfit.toFixed(2)} Bs`}
                  subtitle={realNetProfit >= 0 ? "A favor (utilidad - gastos - retiros bruto)" : "En contra (utilidad - gastos - retiros bruto)"}
                  icon={TrendingUp}
                />
                <StatsCard title="50% Jose Eduardo" value={`${partnerShare.toFixed(2)} Bs`} subtitle="Mitad de utilidad real" icon={TrendingUp} />
                <StatsCard title="50% Jhonatan" value={`${partnerShare.toFixed(2)} Bs`} subtitle="Mitad de utilidad real" icon={TrendingUp} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatsCard title="Productos Vendidos" value={totalProducts.toString()} subtitle="Unidades" icon={Package} />
            <StatsCard title="Costo Total" value={`${totalCost.toFixed(2)} Bs`} subtitle="Costo acumulado" icon={DollarSign} />
            <StatsCard title="Utilidad Neta Hoy" value={`${dailyNetUtility.toFixed(2)} Bs`} subtitle="Ventas - costos - gastos del dia" icon={TrendingUp} />
          </div>
        </>
      )}
    </div>
  );
}

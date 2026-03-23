import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExpenses, useGrossCapitalMovements, useReports } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getEffectiveUnitCost, getSaleUnitPrice } from "@/lib/sales-pricing";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";

type LedgerRow = {
  id: string;
  date: string;
  module: string;
  detail: string;
  income: number;
  expense: number;
  order: number;
};

function getTodayIsoLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthStartIsoLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function toIsoDate(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
  return "";
}

function parseAmount(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

function formatMoney(value: number): string {
  return `${value.toFixed(2)} Bs`;
}

function inRange(date: string, startDate: string, endDate: string): boolean {
  if (!date) return false;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function KpiCard({
  title,
  value,
  subtitle,
  emphasize,
}: {
  title: string;
  value: string;
  subtitle: string;
  emphasize?: "positive" | "negative" | "neutral";
}) {
  const textClass =
    emphasize === "positive"
      ? "text-green-600"
      : emphasize === "negative"
        ? "text-red-600"
        : "text-foreground";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${textClass}`}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function FinancialStatus() {
  const { user } = useAuth();
  const isAccountant = user?.role?.trim().toLowerCase() === "contador";

  const [startDate, setStartDate] = useState(getMonthStartIsoLocal());
  const [endDate, setEndDate] = useState(getTodayIsoLocal());

  const salesQuery = useReports();
  const expensesQuery = useExpenses();
  const grossCapitalQuery = useGrossCapitalMovements(!isAccountant);

  const salesWithProducts = (salesQuery.data as any[]) || [];
  const expenses = (expensesQuery.data as any[]) || [];
  const grossCapitalMovements = (grossCapitalQuery.data as any[]) || [];

  const filteredSales = useMemo(
    () => salesWithProducts.filter((item: any) => inRange(toIsoDate(item.saleDate), startDate, endDate)),
    [salesWithProducts, startDate, endDate]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((item: any) => inRange(toIsoDate(item.expenseDate), startDate, endDate)),
    [expenses, startDate, endDate]
  );

  const filteredGrossCapitalMovements = useMemo(
    () => grossCapitalMovements.filter((item: any) => inRange(toIsoDate(item.movementDate), startDate, endDate)),
    [grossCapitalMovements, startDate, endDate]
  );

  const totalIncome = useMemo(
    () =>
      filteredSales.reduce((sum: number, item: any) => {
        const quantity = parseAmount(item.quantity);
        return sum + getSaleUnitPrice(item) * quantity;
      }, 0),
    [filteredSales]
  );

  const totalCostOfSales = useMemo(
    () =>
      filteredSales.reduce((sum: number, item: any) => {
        const quantity = parseAmount(item.quantity);
        return sum + getEffectiveUnitCost(item) * quantity;
      }, 0),
    [filteredSales]
  );

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum: number, item: any) => sum + parseAmount(item.amount), 0),
    [filteredExpenses]
  );

  const grossProfit = totalIncome - totalCostOfSales;
  const operatingNet = isAccountant ? totalIncome - totalExpenses : grossProfit - totalExpenses;

  const grossCapitalWithdrawals = useMemo(
    () => filteredGrossCapitalMovements.reduce((sum: number, item: any) => sum + parseAmount(item.amount), 0),
    [filteredGrossCapitalMovements]
  );

  const realNetProfit = isAccountant ? operatingNet : operatingNet - grossCapitalWithdrawals;
  const sharePerPartner = realNetProfit / 2;

  const rowsWithBalance = useMemo(() => {
    const rows: LedgerRow[] = [];

    filteredSales.forEach((sale: any) => {
      const date = toIsoDate(sale.saleDate);
      const quantity = parseAmount(sale.quantity);
      const productName = sale?.product?.name || "Producto";
      if (isAccountant) {
        const saleTotal = getSaleUnitPrice(sale) * quantity;
        rows.push({
          id: `sale-income-${sale.id}`,
          date,
          module: "Ingresos",
          detail: `Venta ${productName} (${quantity} u)`,
          income: saleTotal,
          expense: 0,
          order: 10,
        });
      } else {
        const saleProfit = (getSaleUnitPrice(sale) - getEffectiveUnitCost(sale)) * quantity;
        rows.push({
          id: `sale-profit-${sale.id}`,
          date,
          module: "Utilidad por Venta",
          detail: `${productName} (${quantity} u)`,
          income: saleProfit,
          expense: 0,
          order: 10,
        });
      }
    });

    filteredExpenses.forEach((expense: any) => {
      const date = toIsoDate(expense.expenseDate);
      rows.push({
        id: `expense-${expense.id}`,
        date,
        module: "Gastos",
        detail: `${expense.category || expense.category?.name || "Gasto"} (${parseAmount(expense.amount).toFixed(2)} Bs)`,
        income: 0,
        expense: parseAmount(expense.amount),
        order: 20,
      });
    });

    if (!isAccountant) {
      filteredGrossCapitalMovements.forEach((movement: any) => {
        const date = toIsoDate(movement.movementDate);
        rows.push({
          id: `gross-withdraw-${movement.id}`,
          date,
          module: "Retiro Capital Bruto",
          detail: movement.description?.trim() || "Retiro de capital bruto",
          income: 0,
          expense: parseAmount(movement.amount),
          order: 30,
        });
      });
    }

    const sorted = rows.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.order !== b.order) return a.order - b.order;
      return a.id.localeCompare(b.id);
    });

    let running = 0;
    return sorted.map((row) => {
      running += row.income - row.expense;
      return { ...row, running };
    });
  }, [
    filteredSales,
    filteredExpenses,
    filteredGrossCapitalMovements,
    isAccountant,
  ]);

  const capitalDataWarning = !isAccountant && grossCapitalQuery.isError;
  const isLoading =
    salesQuery.isLoading ||
    expensesQuery.isLoading ||
    (!isAccountant && grossCapitalQuery.isLoading);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Estado Financiero</h1>
        <p className="mt-1 text-muted-foreground">
          Utilidad real del periodo: utilidad por producto menos gastos y retiros de capital bruto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtro de Periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-financial-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-financial-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Ingresos por Ventas" value={formatMoney(totalIncome)} subtitle="Entradas por ventas del periodo" />
        <KpiCard
          title="Costo de Ventas"
          value={isAccountant ? "No disponible" : formatMoney(totalCostOfSales)}
          subtitle={isAccountant ? "Oculto por rol contador" : "Costo acumulado del periodo"}
        />
        <KpiCard
          title="Utilidad Bruta"
          value={isAccountant ? "No disponible" : formatMoney(grossProfit)}
          subtitle={isAccountant ? "Oculto por rol contador" : "Ingresos - costo de ventas"}
          emphasize={!isAccountant ? (grossProfit >= 0 ? "positive" : "negative") : "neutral"}
        />
        <KpiCard title="Gastos Operativos" value={formatMoney(totalExpenses)} subtitle="Egresos registrados en gastos" />
        <KpiCard
          title={isAccountant ? "Saldo Operativo Visible" : "Utilidad Neta Operativa"}
          value={formatMoney(operatingNet)}
          subtitle={isAccountant ? "Ingresos - gastos (sin costos ocultos)" : "Utilidad bruta - gastos"}
          emphasize={operatingNet >= 0 ? "positive" : "negative"}
        />
      </div>

      {!isAccountant && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Retiros Capital Bruto"
            value={formatMoney(grossCapitalWithdrawals)}
            subtitle="Egreso adicional que descuenta utilidad real"
            emphasize={grossCapitalWithdrawals > 0 ? "negative" : "neutral"}
          />
          <KpiCard
            title="Utilidad Real"
            value={formatMoney(realNetProfit)}
            subtitle="Utilidad por producto - gastos - retiros capital bruto"
            emphasize={realNetProfit >= 0 ? "positive" : "negative"}
          />
          <Card className="md:col-span-2 xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <Scale className="h-4 w-4" />
                Reparto 50/50
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Jose Eduardo</p>
                <p className={`text-2xl font-bold ${sharePerPartner >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatMoney(sharePerPartner)}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Jhonatan</p>
                <p className={`text-2xl font-bold ${sharePerPartner >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatMoney(sharePerPartner)}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Formula: utilidad real / 2 para cada socio.
              </p>
              <p className="inline-flex items-center gap-1 text-sm font-medium">
                {realNetProfit >= 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                    A favor
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                    En contra
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {capitalDataWarning && (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardContent className="flex items-start gap-2 p-4 text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <p className="text-sm">
                No se pudieron cargar los retiros de capital bruto. La utilidad real puede estar incompleta.
              </p>
            </CardContent>
          </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          {rowsWithBalance.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No hay movimientos en el periodo seleccionado.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[820px]">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Fecha</th>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Modulo</th>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Detalle</th>
                    <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ingreso</th>
                    <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Egreso</th>
                    <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsWithBalance.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-3 text-sm">{formatDate(row.date)}</td>
                      <td className="p-3 text-sm font-medium">{row.module}</td>
                      <td className="p-3 text-sm text-muted-foreground">{row.detail}</td>
                      <td className="p-3 text-right font-mono text-sm text-green-700">
                        {row.income > 0 ? formatMoney(row.income) : "-"}
                      </td>
                      <td className="p-3 text-right font-mono text-sm text-red-700">
                        {row.expense > 0 ? formatMoney(row.expense) : "-"}
                      </td>
                      <td className={`p-3 text-right font-mono text-sm font-semibold ${row.running >= 0 ? "text-foreground" : "text-red-700"}`}>
                        {formatMoney(row.running)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

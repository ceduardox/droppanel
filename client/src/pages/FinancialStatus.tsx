import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCapitalMovements, useExpenses, useGrossCapitalMovements, useReports } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getEffectiveUnitBaseCost, getEffectiveUnitCost, getSaleUnitPrice } from "@/lib/sales-pricing";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";

type SaleBreakdown = {
  id: string;
  date: string;
  productId: string;
  productName: string;
  quantity: number;
  incomeAmount: number;
  baseCostAmount: number;
  reserveAmount: number;
  totalCostAmount: number;
  grossBeforeReserve: number;
  grossAfterReserve: number;
};

type LedgerRow = {
  id: string;
  date: string;
  module: string;
  detail: string;
  signedAmount: number;
  order: number;
};

type BridgeStep = {
  id: string;
  label: string;
  amount: number;
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

function getCapitalMovementSignedAmount(movement: any): number {
  const amount = parseAmount(movement?.amount);
  const movementType = String(movement?.type ?? "").trim().toLowerCase();
  return movementType === "credito" ? amount : -amount;
}

function buildSaleBreakdown(sale: any): SaleBreakdown {
  const quantity = parseAmount(sale?.quantity);
  const unitPrice = getSaleUnitPrice(sale);
  const unitBaseCost = getEffectiveUnitBaseCost(sale);
  const unitTotalCost = getEffectiveUnitCost(sale);
  const unitReserve = Math.max(unitTotalCost - unitBaseCost, 0);

  const incomeAmount = unitPrice * quantity;
  const baseCostAmount = unitBaseCost * quantity;
  const reserveAmount = unitReserve * quantity;
  const totalCostAmount = unitTotalCost * quantity;

  return {
    id: String(sale?.id ?? ""),
    date: toIsoDate(sale?.saleDate),
    productId: String(sale?.productId ?? ""),
    productName: String(sale?.product?.name ?? "Producto"),
    quantity,
    incomeAmount,
    baseCostAmount,
    reserveAmount,
    totalCostAmount,
    grossBeforeReserve: incomeAmount - baseCostAmount,
    grossAfterReserve: incomeAmount - totalCostAmount,
  };
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
  const capitalMovementsQuery = useCapitalMovements(!isAccountant);

  const salesWithProducts = (salesQuery.data as any[]) || [];
  const expenses = (expensesQuery.data as any[]) || [];
  const grossCapitalMovements = (grossCapitalQuery.data as any[]) || [];
  const capitalMovements = (capitalMovementsQuery.data as any[]) || [];

  const allSaleBreakdowns = useMemo(
    () => (salesWithProducts as any[]).map((sale: any) => buildSaleBreakdown(sale)),
    [salesWithProducts]
  );

  const filteredSaleBreakdowns = useMemo(
    () => allSaleBreakdowns.filter((sale) => inRange(sale.date, startDate, endDate)),
    [allSaleBreakdowns, startDate, endDate]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((item: any) => inRange(toIsoDate(item.expenseDate), startDate, endDate)),
    [expenses, startDate, endDate]
  );

  const filteredGrossCapitalMovements = useMemo(
    () => grossCapitalMovements.filter((item: any) => inRange(toIsoDate(item.movementDate), startDate, endDate)),
    [grossCapitalMovements, startDate, endDate]
  );

  const filteredCapitalMovements = useMemo(
    () => capitalMovements.filter((item: any) => inRange(toIsoDate(item.movementDate), startDate, endDate)),
    [capitalMovements, startDate, endDate]
  );

  const totalIncome = useMemo(
    () => filteredSaleBreakdowns.reduce((sum, sale) => sum + sale.incomeAmount, 0),
    [filteredSaleBreakdowns]
  );

  const totalBaseCost = useMemo(
    () => filteredSaleBreakdowns.reduce((sum, sale) => sum + sale.baseCostAmount, 0),
    [filteredSaleBreakdowns]
  );

  const totalReserve = useMemo(
    () => filteredSaleBreakdowns.reduce((sum, sale) => sum + sale.reserveAmount, 0),
    [filteredSaleBreakdowns]
  );

  const totalCostSales = totalBaseCost + totalReserve;
  const grossMarginAfterReserve = totalIncome - totalCostSales;

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum: number, item: any) => sum + parseAmount(item.amount), 0),
    [filteredExpenses]
  );

  const grossCapitalWithdrawals = useMemo(
    () => filteredGrossCapitalMovements.reduce((sum: number, item: any) => sum + parseAmount(item.amount), 0),
    [filteredGrossCapitalMovements]
  );

  const operatingAfterExpenses = isAccountant
    ? totalIncome - totalExpenses
    : grossMarginAfterReserve - totalExpenses;

  const payableNetProfit = isAccountant
    ? operatingAfterExpenses
    : operatingAfterExpenses - grossCapitalWithdrawals;

  const sharePerPartner = payableNetProfit / 2;

  const periodManualCapitalNet = useMemo(
    () => filteredCapitalMovements.reduce((sum, movement) => sum + getCapitalMovementSignedAmount(movement), 0),
    [filteredCapitalMovements]
  );

  const periodManualCapitalCredits = useMemo(
    () =>
      filteredCapitalMovements.reduce(
        (sum: number, movement: any) =>
          String(movement?.type ?? "").trim().toLowerCase() === "credito"
            ? sum + parseAmount(movement.amount)
            : sum,
        0
      ),
    [filteredCapitalMovements]
  );

  const periodManualCapitalDebits = useMemo(
    () =>
      filteredCapitalMovements.reduce(
        (sum: number, movement: any) =>
          String(movement?.type ?? "").trim().toLowerCase() === "credito"
            ? sum
            : sum + parseAmount(movement.amount),
        0
      ),
    [filteredCapitalMovements]
  );

  const openingReserveFromSales = useMemo(
    () =>
      allSaleBreakdowns
        .filter((sale) => sale.date && sale.date < startDate)
        .reduce((sum, sale) => sum + sale.reserveAmount, 0),
    [allSaleBreakdowns, startDate]
  );

  const periodReserveFromSales = useMemo(
    () => filteredSaleBreakdowns.reduce((sum, sale) => sum + sale.reserveAmount, 0),
    [filteredSaleBreakdowns]
  );

  const openingManualCapital = useMemo(
    () =>
      (capitalMovements as any[])
        .filter((movement: any) => {
          const date = toIsoDate(movement.movementDate);
          return date && date < startDate;
        })
        .reduce((sum: number, movement: any) => sum + getCapitalMovementSignedAmount(movement), 0),
    [capitalMovements, startDate]
  );

  const openingCapitalFund = openingReserveFromSales + openingManualCapital;
  const closingCapitalFund = openingCapitalFund + periodReserveFromSales + periodManualCapitalNet;

  const openingBaseFromSales = useMemo(
    () =>
      allSaleBreakdowns
        .filter((sale) => sale.date && sale.date < startDate)
        .reduce((sum, sale) => sum + sale.baseCostAmount, 0),
    [allSaleBreakdowns, startDate]
  );

  const openingGrossWithdrawals = useMemo(
    () =>
      (grossCapitalMovements as any[])
        .filter((movement: any) => {
          const date = toIsoDate(movement.movementDate);
          return date && date < startDate;
        })
        .reduce((sum: number, movement: any) => sum + parseAmount(movement.amount), 0),
    [grossCapitalMovements, startDate]
  );

  const openingGrossFund = openingBaseFromSales - openingGrossWithdrawals;
  const closingGrossFund = openingGrossFund + totalBaseCost - grossCapitalWithdrawals;

  const productSummary = useMemo(() => {
    const grouped = new Map<
      string,
      {
        productName: string;
        quantity: number;
        incomeAmount: number;
        baseCostAmount: number;
        reserveAmount: number;
        grossAfterReserve: number;
      }
    >();

    filteredSaleBreakdowns.forEach((sale) => {
      const key = sale.productId || sale.productName;
      const current = grouped.get(key);
      if (current) {
        current.quantity += sale.quantity;
        current.incomeAmount += sale.incomeAmount;
        current.baseCostAmount += sale.baseCostAmount;
        current.reserveAmount += sale.reserveAmount;
        current.grossAfterReserve += sale.grossAfterReserve;
      } else {
        grouped.set(key, {
          productName: sale.productName,
          quantity: sale.quantity,
          incomeAmount: sale.incomeAmount,
          baseCostAmount: sale.baseCostAmount,
          reserveAmount: sale.reserveAmount,
          grossAfterReserve: sale.grossAfterReserve,
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.grossAfterReserve - a.grossAfterReserve);
  }, [filteredSaleBreakdowns]);

  const bridgeSteps = useMemo<BridgeStep[]>(() => {
    if (isAccountant) {
      return [
        { id: "income", label: "Ingresos por ventas", amount: totalIncome },
        { id: "expenses", label: "Gastos operativos", amount: -totalExpenses },
      ];
    }

    return [
      { id: "income", label: "Ingresos por ventas", amount: totalIncome },
      { id: "base-cost", label: "Costo bruto (reposicion)", amount: -totalBaseCost },
      { id: "reserve", label: "Reserva aumento capital", amount: -totalReserve },
      { id: "expenses", label: "Gastos operativos", amount: -totalExpenses },
      { id: "gross-withdraw", label: "Retiros capital bruto", amount: -grossCapitalWithdrawals },
    ];
  }, [
    isAccountant,
    totalIncome,
    totalBaseCost,
    totalReserve,
    totalExpenses,
    grossCapitalWithdrawals,
  ]);

  const bridgeRows = useMemo(() => {
    let running = 0;
    return bridgeSteps.map((step) => {
      running += step.amount;
      return { ...step, running };
    });
  }, [bridgeSteps]);

  const rowsWithBalance = useMemo(() => {
    const rows: LedgerRow[] = [];

    filteredSaleBreakdowns.forEach((sale) => {
      if (!sale.date) return;

      if (isAccountant) {
        rows.push({
          id: `sale-income-${sale.id}`,
          date: sale.date,
          module: "Ingresos",
          detail: `${sale.productName} (${sale.quantity} u)`,
          signedAmount: sale.incomeAmount,
          order: 10,
        });
        return;
      }

      rows.push({
        id: `sale-income-${sale.id}`,
        date: sale.date,
        module: "Ingreso venta",
        detail: `${sale.productName} (${sale.quantity} u)`,
        signedAmount: sale.incomeAmount,
        order: 10,
      });
      rows.push({
        id: `sale-base-${sale.id}`,
        date: sale.date,
        module: "Costo bruto",
        detail: `${sale.productName} reposicion`,
        signedAmount: -sale.baseCostAmount,
        order: 11,
      });
      rows.push({
        id: `sale-reserve-${sale.id}`,
        date: sale.date,
        module: "Aumento capital",
        detail: `${sale.productName} reserva`,
        signedAmount: -sale.reserveAmount,
        order: 12,
      });
    });

    filteredExpenses.forEach((expense: any) => {
      rows.push({
        id: `expense-${expense.id}`,
        date: toIsoDate(expense.expenseDate),
        module: "Gastos",
        detail: `${expense.category || expense.category?.name || "Gasto"}`,
        signedAmount: -parseAmount(expense.amount),
        order: 20,
      });
    });

    if (!isAccountant) {
      filteredCapitalMovements.forEach((movement: any) => {
        rows.push({
          id: `capital-manual-${movement.id}`,
          date: toIsoDate(movement.movementDate),
          module: "Capital manual",
          detail: movement.description?.trim() || "Movimiento manual aumento capital",
          signedAmount: getCapitalMovementSignedAmount(movement),
          order: 25,
        });
      });

      filteredGrossCapitalMovements.forEach((movement: any) => {
        rows.push({
          id: `gross-withdraw-${movement.id}`,
          date: toIsoDate(movement.movementDate),
          module: "Retiro capital bruto",
          detail: movement.description?.trim() || "Retiro de capital bruto",
          signedAmount: -parseAmount(movement.amount),
          order: 30,
        });
      });
    }

    const sorted = rows
      .filter((row) => row.date)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.order !== b.order) return a.order - b.order;
        return a.id.localeCompare(b.id);
      });

    let running = 0;
    return sorted.map((row) => {
      running += row.signedAmount;
      return { ...row, running };
    });
  }, [
    filteredSaleBreakdowns,
    filteredExpenses,
    filteredGrossCapitalMovements,
    filteredCapitalMovements,
    isAccountant,
  ]);

  const fundDataWarning = !isAccountant && (grossCapitalQuery.isError || capitalMovementsQuery.isError);
  const isLoading =
    salesQuery.isLoading ||
    expensesQuery.isLoading ||
    (!isAccountant && (grossCapitalQuery.isLoading || capitalMovementsQuery.isLoading));

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Estado Financiero</h1>
        <p className="mt-1 text-muted-foreground">
          Vista separada para administrar costo bruto, reserva de aumento de capital y utilidad neta pagable.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtro de periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-financial-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha final</Label>
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

      <Card>
        <CardHeader>
          <CardTitle>Puente financiero del periodo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {bridgeRows.map((step) => (
            <div
              key={step.id}
              className="grid grid-cols-[minmax(0,1fr)_140px_140px] items-center gap-2 rounded border bg-muted/30 p-2 text-sm"
            >
              <span className="font-medium">{step.label}</span>
              <span className={`text-right font-mono ${step.amount >= 0 ? "text-green-700" : "text-red-700"}`}>
                {step.amount >= 0 ? "+" : "-"}
                {formatMoney(Math.abs(step.amount))}
              </span>
              <span className={`text-right font-mono font-semibold ${step.running >= 0 ? "text-foreground" : "text-red-700"}`}>
                {formatMoney(step.running)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {isAccountant ? (
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard title="Ingresos" value={formatMoney(totalIncome)} subtitle="Ventas del periodo" />
          <KpiCard title="Gastos" value={formatMoney(totalExpenses)} subtitle="Egresos operativos" />
          <KpiCard
            title="Saldo operativo visible"
            value={formatMoney(operatingAfterExpenses)}
            subtitle="Ingresos - gastos"
            emphasize={operatingAfterExpenses >= 0 ? "positive" : "negative"}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <KpiCard title="Ingresos" value={formatMoney(totalIncome)} subtitle="Ventas del periodo" />
            <KpiCard title="Costo bruto" value={formatMoney(totalBaseCost)} subtitle="Reposicion por ventas" />
            <KpiCard title="Reserva aumento" value={formatMoney(totalReserve)} subtitle="Aporte separado por producto" />
            <KpiCard title="Gastos" value={formatMoney(totalExpenses)} subtitle="Gastos operativos" />
            <KpiCard
              title="Utilidad operativa"
              value={formatMoney(operatingAfterExpenses)}
              subtitle="Despues de costos y gastos"
              emphasize={operatingAfterExpenses >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              title="Utilidad neta pagable"
              value={formatMoney(payableNetProfit)}
              subtitle="Operativa - retiros capital bruto"
              emphasize={payableNetProfit >= 0 ? "positive" : "negative"}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fondo Aumento de Capital</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>Apertura periodo</span><span className="font-mono">{formatMoney(openingCapitalFund)}</span></div>
                <div className="flex items-center justify-between"><span>Aporte por ventas</span><span className="font-mono text-green-700">+{formatMoney(periodReserveFromSales)}</span></div>
                <div className="flex items-center justify-between"><span>Creditos manuales</span><span className="font-mono text-green-700">+{formatMoney(periodManualCapitalCredits)}</span></div>
                <div className="flex items-center justify-between"><span>Debitos manuales</span><span className="font-mono text-red-700">-{formatMoney(periodManualCapitalDebits)}</span></div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="font-semibold">Cierre periodo</span>
                  <span className={`font-mono font-semibold ${closingCapitalFund >= 0 ? "text-foreground" : "text-red-700"}`}>{formatMoney(closingCapitalFund)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fondo Capital Bruto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>Apertura periodo</span><span className="font-mono">{formatMoney(openingGrossFund)}</span></div>
                <div className="flex items-center justify-between"><span>Recuperado por ventas</span><span className="font-mono text-green-700">+{formatMoney(totalBaseCost)}</span></div>
                <div className="flex items-center justify-between"><span>Retiros capital bruto</span><span className="font-mono text-red-700">-{formatMoney(grossCapitalWithdrawals)}</span></div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="font-semibold">Cierre periodo</span>
                  <span className={`font-mono font-semibold ${closingGrossFund >= 0 ? "text-foreground" : "text-red-700"}`}>{formatMoney(closingGrossFund)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <Scale className="h-4 w-4" />
                Reparto 50/50
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
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
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Formula aplicada: utilidad neta pagable / 2.
              </p>
              <p className="inline-flex items-center gap-1 text-sm font-medium sm:col-span-2">
                {payableNetProfit >= 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                    Resultado a favor
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                    Resultado en contra
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalle por producto (periodo)</CardTitle>
            </CardHeader>
            <CardContent>
              {productSummary.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">No hay ventas para el periodo seleccionado.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[920px]">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Producto</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Unidades</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ingresos</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Costo Bruto</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Reserva</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Margen despues reserva</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productSummary.map((item) => (
                        <tr key={item.productName} className="border-b">
                          <td className="p-3 text-sm font-medium">{item.productName}</td>
                          <td className="p-3 text-right font-mono text-sm">{item.quantity.toFixed(0)}</td>
                          <td className="p-3 text-right font-mono text-sm">{formatMoney(item.incomeAmount)}</td>
                          <td className="p-3 text-right font-mono text-sm text-red-700">-{formatMoney(item.baseCostAmount)}</td>
                          <td className="p-3 text-right font-mono text-sm text-red-700">-{formatMoney(item.reserveAmount)}</td>
                          <td className={`p-3 text-right font-mono text-sm font-semibold ${item.grossAfterReserve >= 0 ? "text-foreground" : "text-red-700"}`}>
                            {formatMoney(item.grossAfterReserve)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {fundDataWarning && (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardContent className="flex items-start gap-2 p-4 text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <p className="text-sm">
              No se pudieron cargar todos los datos de fondos. Verifica modulos de aumento/capital bruto para evitar descuadres.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Libro de movimientos financieros</CardTitle>
        </CardHeader>
        <CardContent>
          {rowsWithBalance.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No hay movimientos en el periodo seleccionado.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[860px]">
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
                        {row.signedAmount > 0 ? formatMoney(row.signedAmount) : "-"}
                      </td>
                      <td className="p-3 text-right font-mono text-sm text-red-700">
                        {row.signedAmount < 0 ? formatMoney(Math.abs(row.signedAmount)) : "-"}
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

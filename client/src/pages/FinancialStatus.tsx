import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useCapitalMovements,
  useCreateProfitSettlement,
  useDeleteProfitSettlement,
  useExpenses,
  useGrossCapitalMovements,
  useProfitSettlements,
  useReports,
  useUpdateProfitSettlement,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { getEffectiveUnitBaseCost, getEffectiveUnitCost, getSaleUnitPrice } from "@/lib/sales-pricing";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarCheck, Eye, ImageIcon, Info, Pencil, Scale, Trash2 } from "lucide-react";

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

type ProfitSettlement = {
  id: string;
  periodStart: string;
  periodEnd: string;
  settlementDate: string;
  payableProfitSnapshot: string | number;
  joseAmount: string | number;
  jhonatanAmount: string | number;
  note?: string | null;
  imageUrl?: string | null;
};

type SettlementEditForm = {
  periodStart: string;
  periodEnd: string;
  settlementDate: string;
  payableProfitSnapshot: string;
  note: string;
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

function getStorageImageUrl(imageUrl?: string | null): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("/api/storage/") || imageUrl.startsWith("/uploads/")) return imageUrl;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  if (!imageUrl.startsWith("/")) return `/api/storage/${imageUrl}`;
  return imageUrl;
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
  const { toast } = useToast();
  const isAccountant = user?.role?.trim().toLowerCase() === "contador";
  const visibleFrom = user?.visibleFrom || null;

  const [startDate, setStartDate] = useState(getMonthStartIsoLocal());
  const [endDate, setEndDate] = useState(getTodayIsoLocal());
  const [settlementDate, setSettlementDate] = useState(getTodayIsoLocal());
  const [settlementNote, setSettlementNote] = useState("");
  const [settlementImageFile, setSettlementImageFile] = useState<File | null>(null);
  const [isSettlementDialogOpen, setIsSettlementDialogOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<ProfitSettlement | null>(null);
  const [editSettlementForm, setEditSettlementForm] = useState<SettlementEditForm>({
    periodStart: "",
    periodEnd: "",
    settlementDate: "",
    payableProfitSnapshot: "",
    note: "",
  });
  const [editSettlementImageFile, setEditSettlementImageFile] = useState<File | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerModuleFilter, setLedgerModuleFilter] = useState("all");
  const [showOnlySelectedRows, setShowOnlySelectedRows] = useState(false);
  const [selectedLedgerRowsById, setSelectedLedgerRowsById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isAccountant || !visibleFrom) return;

    let nextStart = startDate;
    let nextEnd = endDate;

    if (!nextStart || nextStart < visibleFrom) {
      nextStart = visibleFrom;
    }

    if (!nextEnd || nextEnd < visibleFrom) {
      nextEnd = visibleFrom;
    }

    if (nextEnd < nextStart) {
      nextEnd = nextStart;
    }

    if (nextStart !== startDate) {
      setStartDate(nextStart);
    }

    if (nextEnd !== endDate) {
      setEndDate(nextEnd);
    }
  }, [isAccountant, visibleFrom, startDate, endDate]);

  const effectiveStartDate = useMemo(() => {
    if (isAccountant && visibleFrom && startDate < visibleFrom) return visibleFrom;
    return startDate;
  }, [isAccountant, visibleFrom, startDate]);

  const effectiveEndDate = useMemo(() => {
    let nextEnd = endDate;
    if (isAccountant && visibleFrom && nextEnd < visibleFrom) {
      nextEnd = visibleFrom;
    }
    if (nextEnd < effectiveStartDate) {
      nextEnd = effectiveStartDate;
    }
    return nextEnd;
  }, [isAccountant, visibleFrom, endDate, effectiveStartDate]);

  const salesQuery = useReports();
  const expensesQuery = useExpenses();
  const grossCapitalQuery = useGrossCapitalMovements(!isAccountant);
  const capitalMovementsQuery = useCapitalMovements(!isAccountant);
  const profitSettlementsQuery = useProfitSettlements(!isAccountant);
  const createProfitSettlementMutation = useCreateProfitSettlement();
  const updateProfitSettlementMutation = useUpdateProfitSettlement();
  const deleteProfitSettlementMutation = useDeleteProfitSettlement();

  const salesWithProducts = (salesQuery.data as any[]) || [];
  const expenses = (expensesQuery.data as any[]) || [];
  const grossCapitalMovements = (grossCapitalQuery.data as any[]) || [];
  const capitalMovements = (capitalMovementsQuery.data as any[]) || [];
  const profitSettlements = ((profitSettlementsQuery.data as ProfitSettlement[]) || []).map((settlement) => ({
    ...settlement,
    periodStart: toIsoDate(settlement.periodStart),
    periodEnd: toIsoDate(settlement.periodEnd),
    settlementDate: toIsoDate(settlement.settlementDate),
  }));

  const allSaleBreakdowns = useMemo(
    () => (salesWithProducts as any[]).map((sale: any) => buildSaleBreakdown(sale)),
    [salesWithProducts]
  );

  const filteredSaleBreakdowns = useMemo(
    () => allSaleBreakdowns.filter((sale) => inRange(sale.date, effectiveStartDate, effectiveEndDate)),
    [allSaleBreakdowns, effectiveStartDate, effectiveEndDate]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((item: any) => inRange(toIsoDate(item.expenseDate), effectiveStartDate, effectiveEndDate)),
    [expenses, effectiveStartDate, effectiveEndDate]
  );

  const filteredGrossCapitalMovements = useMemo(
    () =>
      grossCapitalMovements.filter((item: any) =>
        inRange(toIsoDate(item.movementDate), effectiveStartDate, effectiveEndDate)
      ),
    [grossCapitalMovements, effectiveStartDate, effectiveEndDate]
  );

  const filteredCapitalMovements = useMemo(
    () =>
      capitalMovements.filter((item: any) =>
        inRange(toIsoDate(item.movementDate), effectiveStartDate, effectiveEndDate)
      ),
    [capitalMovements, effectiveStartDate, effectiveEndDate]
  );

  const filteredProfitSettlements = useMemo(
    () =>
      profitSettlements.filter(
        (settlement) =>
          settlement.periodStart >= effectiveStartDate &&
          settlement.periodEnd <= effectiveEndDate
      ),
    [profitSettlements, effectiveStartDate, effectiveEndDate]
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

  const settledProfitTotal = useMemo(
    () => filteredProfitSettlements.reduce((sum, settlement) => sum + parseAmount(settlement.payableProfitSnapshot), 0),
    [filteredProfitSettlements]
  );

  const settledJoseTotal = useMemo(
    () => filteredProfitSettlements.reduce((sum, settlement) => sum + parseAmount(settlement.joseAmount), 0),
    [filteredProfitSettlements]
  );

  const settledJhonatanTotal = useMemo(
    () => filteredProfitSettlements.reduce((sum, settlement) => sum + parseAmount(settlement.jhonatanAmount), 0),
    [filteredProfitSettlements]
  );

  const pendingPayableNetProfit = payableNetProfit - settledProfitTotal;
  const pendingJoseAmount = sharePerPartner - settledJoseTotal;
  const pendingJhonatanAmount = sharePerPartner - settledJhonatanTotal;
  const hasOverlappingSettlement = useMemo(
    () =>
      profitSettlements.some(
        (settlement) =>
          effectiveStartDate <= settlement.periodEnd && effectiveEndDate >= settlement.periodStart
      ),
    [profitSettlements, effectiveStartDate, effectiveEndDate]
  );

  const latestFilteredSettlement = filteredProfitSettlements[0] || null;

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
        .filter((sale) => sale.date && sale.date < effectiveStartDate)
        .reduce((sum, sale) => sum + sale.reserveAmount, 0),
    [allSaleBreakdowns, effectiveStartDate]
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
          return date && date < effectiveStartDate;
        })
        .reduce((sum: number, movement: any) => sum + getCapitalMovementSignedAmount(movement), 0),
    [capitalMovements, effectiveStartDate]
  );

  const openingCapitalFund = openingReserveFromSales + openingManualCapital;
  const closingCapitalFund = openingCapitalFund + periodReserveFromSales + periodManualCapitalNet;

  const openingBaseFromSales = useMemo(
    () =>
      allSaleBreakdowns
        .filter((sale) => sale.date && sale.date < effectiveStartDate)
        .reduce((sum, sale) => sum + sale.baseCostAmount, 0),
    [allSaleBreakdowns, effectiveStartDate]
  );

  const openingGrossWithdrawals = useMemo(
    () =>
      (grossCapitalMovements as any[])
        .filter((movement: any) => {
          const date = toIsoDate(movement.movementDate);
          return date && date < effectiveStartDate;
        })
        .reduce((sum: number, movement: any) => sum + parseAmount(movement.amount), 0),
    [grossCapitalMovements, effectiveStartDate]
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
      { id: "profit-settlements", label: "Cierres de utilidad pagados", amount: -settledProfitTotal },
    ];
  }, [
    isAccountant,
    totalIncome,
    totalBaseCost,
    totalReserve,
    totalExpenses,
    grossCapitalWithdrawals,
    settledProfitTotal,
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
        detail: `${sale.productName} reposicion (${sale.quantity} u)`,
        signedAmount: -sale.baseCostAmount,
        order: 11,
      });
      rows.push({
        id: `sale-reserve-${sale.id}`,
        date: sale.date,
        module: "Aumento capital",
        detail: `${sale.productName} reserva (${sale.quantity} u)`,
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

      filteredProfitSettlements.forEach((settlement) => {
        rows.push({
          id: `profit-settlement-${settlement.id}`,
          date: settlement.settlementDate,
          module: "Cierre utilidad",
          detail: `Pago 50/50 del ${formatDate(settlement.periodStart)} al ${formatDate(settlement.periodEnd)}`,
          signedAmount: -parseAmount(settlement.payableProfitSnapshot),
          order: 35,
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
    filteredProfitSettlements,
    isAccountant,
  ]);

  useEffect(() => {
    setSelectedLedgerRowsById((current) => {
      const next: Record<string, boolean> = {};
      rowsWithBalance.forEach((row) => {
        if (current[row.id]) {
          next[row.id] = true;
        }
      });
      return next;
    });
  }, [rowsWithBalance]);

  const ledgerModules = useMemo(
    () => Array.from(new Set(rowsWithBalance.map((row) => row.module))).sort((a, b) => a.localeCompare(b)),
    [rowsWithBalance]
  );

  const normalizedLedgerSearch = ledgerSearch.trim().toLowerCase();

  const visibleLedgerRows = useMemo(
    () =>
      rowsWithBalance.filter((row) => {
        if (ledgerModuleFilter !== "all" && row.module !== ledgerModuleFilter) return false;
        if (normalizedLedgerSearch) {
          const searchableText = `${row.module} ${row.detail} ${row.date}`.toLowerCase();
          if (!searchableText.includes(normalizedLedgerSearch)) return false;
        }
        if (showOnlySelectedRows && !selectedLedgerRowsById[row.id]) return false;
        return true;
      }),
    [
      rowsWithBalance,
      ledgerModuleFilter,
      normalizedLedgerSearch,
      showOnlySelectedRows,
      selectedLedgerRowsById,
    ]
  );

  const selectedLedgerRows = useMemo(
    () => rowsWithBalance.filter((row) => selectedLedgerRowsById[row.id]),
    [rowsWithBalance, selectedLedgerRowsById]
  );

  const selectedLedgerNetTotal = useMemo(
    () => selectedLedgerRows.reduce((sum, row) => sum + row.signedAmount, 0),
    [selectedLedgerRows]
  );

  const selectedLedgerIncomeTotal = useMemo(
    () =>
      selectedLedgerRows.reduce(
        (sum, row) => (row.signedAmount > 0 ? sum + row.signedAmount : sum),
        0
      ),
    [selectedLedgerRows]
  );

  const selectedLedgerExpenseTotal = useMemo(
    () =>
      selectedLedgerRows.reduce(
        (sum, row) => (row.signedAmount < 0 ? sum + Math.abs(row.signedAmount) : sum),
        0
      ),
    [selectedLedgerRows]
  );

  const selectedVisibleCount = useMemo(
    () => visibleLedgerRows.reduce((sum, row) => (selectedLedgerRowsById[row.id] ? sum + 1 : sum), 0),
    [visibleLedgerRows, selectedLedgerRowsById]
  );

  const allVisibleSelected = visibleLedgerRows.length > 0 && selectedVisibleCount === visibleLedgerRows.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  const toggleLedgerRowSelection = (rowId: string, checked: boolean) => {
    setSelectedLedgerRowsById((current) => {
      if (checked) {
        return { ...current, [rowId]: true };
      }
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  };

  const setVisibleRowsSelection = (checked: boolean) => {
    setSelectedLedgerRowsById((current) => {
      const next = { ...current };
      visibleLedgerRows.forEach((row) => {
        if (checked) {
          next[row.id] = true;
        } else {
          delete next[row.id];
        }
      });
      return next;
    });
  };

  const handleCreateProfitSettlement = async () => {
    try {
      const formData = new FormData();
      formData.append("periodStart", effectiveStartDate);
      formData.append("periodEnd", effectiveEndDate);
      formData.append("settlementDate", settlementDate);
      formData.append("payableProfitSnapshot", String(payableNetProfit));
      formData.append("note", settlementNote);
      if (settlementImageFile) {
        formData.append("image", settlementImageFile);
      }

      await createProfitSettlementMutation.mutateAsync(formData);
      setSettlementNote("");
      setSettlementImageFile(null);
      setIsSettlementDialogOpen(false);
      toast({
        title: "Cierre registrado",
        description: settlementImageFile
          ? "La utilidad fue marcada como pagada 50/50 con voucher adjunto."
          : "La utilidad del periodo fue marcada como pagada 50/50.",
      });
    } catch (error) {
      toast({
        title: "No se pudo registrar el cierre",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProfitSettlement = async (id: string) => {
    try {
      await deleteProfitSettlementMutation.mutateAsync(id);
      toast({
        title: "Cierre eliminado",
        description: "El pago vuelve a quedar pendiente en el periodo correspondiente.",
      });
    } catch (error) {
      toast({
        title: "No se pudo eliminar el cierre",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const openEditProfitSettlement = (settlement: ProfitSettlement) => {
    setEditingSettlement(settlement);
    setEditSettlementForm({
      periodStart: settlement.periodStart,
      periodEnd: settlement.periodEnd,
      settlementDate: settlement.settlementDate,
      payableProfitSnapshot: String(parseAmount(settlement.payableProfitSnapshot).toFixed(2)),
      note: settlement.note || "",
    });
    setEditSettlementImageFile(null);
  };

  const handleUpdateProfitSettlement = async () => {
    if (!editingSettlement) return;

    try {
      const formData = new FormData();
      formData.append("periodStart", editSettlementForm.periodStart);
      formData.append("periodEnd", editSettlementForm.periodEnd);
      formData.append("settlementDate", editSettlementForm.settlementDate);
      formData.append("payableProfitSnapshot", editSettlementForm.payableProfitSnapshot);
      formData.append("note", editSettlementForm.note);
      if (editSettlementImageFile) {
        formData.append("image", editSettlementImageFile);
      }

      await updateProfitSettlementMutation.mutateAsync({
        id: editingSettlement.id,
        data: formData,
      });
      setEditingSettlement(null);
      setEditSettlementImageFile(null);
      toast({
        title: "Cierre actualizado",
        description: "Los datos del cierre fueron editados correctamente.",
      });
    } catch (error) {
      toast({
        title: "No se pudo editar el cierre",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const canRegisterSettlement =
    !isAccountant && payableNetProfit > 0 && !hasOverlappingSettlement && !createProfitSettlementMutation.isPending;
  const fundDataWarning = !isAccountant && (grossCapitalQuery.isError || capitalMovementsQuery.isError || profitSettlementsQuery.isError);
  const isLoading =
    salesQuery.isLoading ||
    expensesQuery.isLoading ||
    (!isAccountant && (grossCapitalQuery.isLoading || capitalMovementsQuery.isLoading || profitSettlementsQuery.isLoading));

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
                min={isAccountant && visibleFrom ? visibleFrom : undefined}
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
                min={isAccountant && visibleFrom ? visibleFrom : undefined}
                data-testid="input-financial-end-date"
              />
            </div>
          </div>
          {isAccountant && visibleFrom && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <Info className="h-4 w-4" />
              <span>Vista contador: datos visibles desde {formatDate(visibleFrom)}. El rango se ajusta automaticamente.</span>
            </div>
          )}
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
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
              title="Utilidad generada"
              value={formatMoney(payableNetProfit)}
              subtitle="Operativa - retiros capital bruto"
              emphasize={payableNetProfit >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              title="Saldo pendiente"
              value={formatMoney(pendingPayableNetProfit)}
              subtitle="Generada - cierres pagados"
              emphasize={pendingPayableNetProfit >= 0 ? "positive" : "negative"}
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <Scale className="h-4 w-4" />
                  Reparto 50/50
                </CardTitle>
                <AlertDialog open={isSettlementDialogOpen} onOpenChange={setIsSettlementDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canRegisterSettlement}
                      data-testid="button-create-profit-settlement"
                    >
                      <CalendarCheck className="mr-2 h-4 w-4" />
                      Registrar cierre 50/50
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Registrar cierre de utilidad</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se marcara como pagada la utilidad del {formatDate(effectiveStartDate)} al {formatDate(effectiveEndDate)}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Total pagado</p>
                          <p className="font-mono text-lg font-semibold">{formatMoney(payableNetProfit)}</p>
                        </div>
                        <div className="rounded border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Jose Eduardo</p>
                          <p className="font-mono text-lg font-semibold">{formatMoney(sharePerPartner)}</p>
                        </div>
                        <div className="rounded border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Jhonatan</p>
                          <p className="font-mono text-lg font-semibold">{formatMoney(sharePerPartner)}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="settlementDate">Fecha de pago</Label>
                        <Input
                          id="settlementDate"
                          type="date"
                          value={settlementDate}
                          onChange={(e) => setSettlementDate(e.target.value)}
                          data-testid="input-profit-settlement-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="settlementNote">Nota opcional</Label>
                        <Textarea
                          id="settlementNote"
                          value={settlementNote}
                          onChange={(e) => setSettlementNote(e.target.value)}
                          placeholder="Ej: cierre quincenal pagado por transferencia"
                          data-testid="textarea-profit-settlement-note"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="settlementImage">Voucher o imagen opcional</Label>
                        <Input
                          id="settlementImage"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setSettlementImageFile(e.target.files?.[0] || null)}
                          data-testid="input-profit-settlement-image"
                        />
                        {settlementImageFile && (
                          <p className="text-xs text-muted-foreground">
                            Archivo seleccionado: {settlementImageFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(event) => {
                          event.preventDefault();
                          handleCreateProfitSettlement();
                        }}
                        disabled={createProfitSettlementMutation.isPending}
                      >
                        Confirmar pago 50/50
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Generado</p>
                  <p className={`text-2xl font-bold ${payableNetProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatMoney(payableNetProfit)}
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Pagado</p>
                  <p className="text-2xl font-bold text-foreground">{formatMoney(settledProfitTotal)}</p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Pendiente</p>
                  <p className={`text-2xl font-bold ${pendingPayableNetProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatMoney(pendingPayableNetProfit)}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Jose Eduardo</p>
                <p className={`text-2xl font-bold ${pendingJoseAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatMoney(pendingJoseAmount)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Generado {formatMoney(sharePerPartner)} - pagado {formatMoney(settledJoseTotal)}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Jhonatan</p>
                <p className={`text-2xl font-bold ${pendingJhonatanAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatMoney(pendingJhonatanAmount)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Generado {formatMoney(sharePerPartner)} - pagado {formatMoney(settledJhonatanTotal)}
                </p>
              </div>
              </div>
              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Formula aplicada: utilidad generada / 2; saldo pendiente = generado - cierres pagados.
                </p>
                <p className="inline-flex items-center gap-1 font-medium">
                {pendingPayableNetProfit > 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                    Pendiente por pagar
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                    Sin saldo pendiente
                  </>
                )}
              </p>
              </div>
              {hasOverlappingSettlement && pendingPayableNetProfit > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  El rango seleccionado contiene un cierre ya registrado. Para registrar otro pago, selecciona solo fechas no cerradas.
                </div>
              )}
              {latestFilteredSettlement && (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  Ultimo cierre visible: pagado el {formatDate(latestFilteredSettlement.settlementDate)} por {formatMoney(parseAmount(latestFilteredSettlement.payableProfitSnapshot))}.
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={!!editingSettlement} onOpenChange={(open) => !open && setEditingSettlement(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar cierre de utilidad</DialogTitle>
                <DialogDescription>
                  Cambia el periodo, fecha, total, nota o voucher. Los montos de Jose Eduardo y Jhonatan se recalculan 50/50.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editSettlementStart">Fecha inicial</Label>
                  <Input
                    id="editSettlementStart"
                    type="date"
                    value={editSettlementForm.periodStart}
                    onChange={(e) => setEditSettlementForm((current) => ({ ...current, periodStart: e.target.value }))}
                    data-testid="input-edit-profit-settlement-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editSettlementEnd">Fecha final</Label>
                  <Input
                    id="editSettlementEnd"
                    type="date"
                    value={editSettlementForm.periodEnd}
                    onChange={(e) => setEditSettlementForm((current) => ({ ...current, periodEnd: e.target.value }))}
                    data-testid="input-edit-profit-settlement-end"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editSettlementDate">Fecha de pago</Label>
                  <Input
                    id="editSettlementDate"
                    type="date"
                    value={editSettlementForm.settlementDate}
                    onChange={(e) => setEditSettlementForm((current) => ({ ...current, settlementDate: e.target.value }))}
                    data-testid="input-edit-profit-settlement-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editSettlementTotal">Total pagado</Label>
                  <Input
                    id="editSettlementTotal"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editSettlementForm.payableProfitSnapshot}
                    onChange={(e) =>
                      setEditSettlementForm((current) => ({ ...current, payableProfitSnapshot: e.target.value }))
                    }
                    data-testid="input-edit-profit-settlement-total"
                  />
                  <p className="text-xs text-muted-foreground">
                    50/50: {formatMoney(parseAmount(editSettlementForm.payableProfitSnapshot) / 2)} por socio.
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="editSettlementNote">Nota</Label>
                  <Textarea
                    id="editSettlementNote"
                    value={editSettlementForm.note}
                    onChange={(e) => setEditSettlementForm((current) => ({ ...current, note: e.target.value }))}
                    data-testid="textarea-edit-profit-settlement-note"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="editSettlementImage">Reemplazar voucher o imagen</Label>
                  <Input
                    id="editSettlementImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditSettlementImageFile(e.target.files?.[0] || null)}
                    data-testid="input-edit-profit-settlement-image"
                  />
                  <p className="text-xs text-muted-foreground">
                    {editSettlementImageFile
                      ? `Archivo seleccionado: ${editSettlementImageFile.name}`
                      : editingSettlement?.imageUrl
                        ? "Ya existe un voucher guardado. Selecciona otro archivo solo si quieres reemplazarlo."
                        : "Este cierre no tiene voucher guardado."}
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setEditingSettlement(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleUpdateProfitSettlement}
                  disabled={updateProfitSettlementMutation.isPending}
                  data-testid="button-save-edit-profit-settlement"
                >
                  Guardar cambios
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <CardTitle>Historial de cierres de utilidad</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredProfitSettlements.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">
                  No hay cierres pagados dentro del periodo seleccionado.
                </p>
              ) : (
                <>
                <div className="hidden overflow-x-auto rounded-lg border md:block">
                  <table className="w-full min-w-[860px]">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Periodo cerrado</th>
                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Fecha pago</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Total</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Jose Eduardo</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Jhonatan</th>
                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Nota</th>
                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Voucher</th>
                        <th className="w-[116px] p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProfitSettlements.map((settlement) => (
                        <tr key={settlement.id} className="border-b">
                          <td className="p-3 text-sm font-medium">
                            {formatDate(settlement.periodStart)} - {formatDate(settlement.periodEnd)}
                          </td>
                          <td className="p-3 text-sm">{formatDate(settlement.settlementDate)}</td>
                          <td className="p-3 text-right font-mono text-sm font-semibold">
                            {formatMoney(parseAmount(settlement.payableProfitSnapshot))}
                          </td>
                          <td className="p-3 text-right font-mono text-sm">
                            {formatMoney(parseAmount(settlement.joseAmount))}
                          </td>
                          <td className="p-3 text-right font-mono text-sm">
                            {formatMoney(parseAmount(settlement.jhonatanAmount))}
                          </td>
                          <td className="max-w-[300px] p-3 text-sm text-muted-foreground">
                            {settlement.note ? (
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="min-w-0 flex-1 truncate">{settlement.note}</span>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 shrink-0 px-2"
                                      data-testid={`button-view-profit-settlement-note-${settlement.id}`}
                                    >
                                      <Eye className="mr-1 h-3.5 w-3.5" />
                                      Ver nota
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Nota del cierre</DialogTitle>
                                      <DialogDescription>
                                        Cierre del {formatDate(settlement.periodStart)} al {formatDate(settlement.periodEnd)}, pagado el {formatDate(settlement.settlementDate)}.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted/20 p-4">
                                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                                        {settlement.note}
                                      </p>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {settlement.imageUrl ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    data-testid={`button-view-profit-settlement-image-${settlement.id}`}
                                  >
                                    <ImageIcon className="mr-1 h-3.5 w-3.5" />
                                    Ver imagen
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle>Voucher del cierre</DialogTitle>
                                    <DialogDescription>
                                      Cierre del {formatDate(settlement.periodStart)} al {formatDate(settlement.periodEnd)}, pagado el {formatDate(settlement.settlementDate)}.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="max-h-[72vh] overflow-auto rounded-md border bg-muted/20 p-2">
                                    <img
                                      src={getStorageImageUrl(settlement.imageUrl)}
                                      alt="Voucher del cierre de utilidad"
                                      className="mx-auto max-h-[68vh] w-auto max-w-full rounded object-contain"
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditProfitSettlement(settlement)}
                              data-testid={`button-edit-profit-settlement-${settlement.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProfitSettlement(settlement.id)}
                              disabled={deleteProfitSettlementMutation.isPending}
                              data-testid={`button-delete-profit-settlement-${settlement.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 md:hidden">
                  {filteredProfitSettlements.map((settlement) => (
                    <details key={settlement.id} className="group rounded-lg border bg-background">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {formatDate(settlement.periodStart)} - {formatDate(settlement.periodEnd)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Pagado el {formatDate(settlement.settlementDate)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-sm font-semibold">
                            {formatMoney(parseAmount(settlement.payableProfitSnapshot))}
                          </p>
                          <p className="text-xs text-muted-foreground group-open:hidden">Ver detalle</p>
                          <p className="hidden text-xs text-muted-foreground group-open:block">Ocultar</p>
                        </div>
                      </summary>

                      <div className="space-y-3 border-t p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-md border bg-muted/20 p-2">
                            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Jose Eduardo</p>
                            <p className="mt-1 font-mono text-sm font-semibold">
                              {formatMoney(parseAmount(settlement.joseAmount))}
                            </p>
                          </div>
                          <div className="rounded-md border bg-muted/20 p-2">
                            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Jhonatan</p>
                            <p className="mt-1 font-mono text-sm font-semibold">
                              {formatMoney(parseAmount(settlement.jhonatanAmount))}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Nota</span>
                            <div className="min-w-0 text-right">
                              {settlement.note ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8"
                                      data-testid={`button-mobile-view-profit-settlement-note-${settlement.id}`}
                                    >
                                      <Eye className="mr-1 h-3.5 w-3.5" />
                                      Ver nota
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Nota del cierre</DialogTitle>
                                      <DialogDescription>
                                        Cierre del {formatDate(settlement.periodStart)} al {formatDate(settlement.periodEnd)}, pagado el {formatDate(settlement.settlementDate)}.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted/20 p-4">
                                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                                        {settlement.note}
                                      </p>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Voucher</span>
                            <div className="text-right">
                              {settlement.imageUrl ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8"
                                      data-testid={`button-mobile-view-profit-settlement-image-${settlement.id}`}
                                    >
                                      <ImageIcon className="mr-1 h-3.5 w-3.5" />
                                      Ver imagen
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle>Voucher del cierre</DialogTitle>
                                      <DialogDescription>
                                        Cierre del {formatDate(settlement.periodStart)} al {formatDate(settlement.periodEnd)}, pagado el {formatDate(settlement.settlementDate)}.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[72vh] overflow-auto rounded-md border bg-muted/20 p-2">
                                      <img
                                        src={getStorageImageUrl(settlement.imageUrl)}
                                        alt="Voucher del cierre de utilidad"
                                        className="mx-auto max-h-[68vh] w-auto max-w-full rounded object-contain"
                                      />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t pt-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditProfitSettlement(settlement)}
                            data-testid={`button-mobile-edit-profit-settlement-${settlement.id}`}
                          >
                            <Pencil className="mr-1 h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProfitSettlement(settlement.id)}
                            disabled={deleteProfitSettlementMutation.isPending}
                            data-testid={`button-mobile-delete-profit-settlement-${settlement.id}`}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
                </>
              )}
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
                <>
                <div className="hidden overflow-x-auto rounded-lg border md:block">
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
                <div className="space-y-3 md:hidden">
                  {productSummary.map((item) => (
                    <details key={item.productName} className="group rounded-lg border bg-background">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.productName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.quantity.toFixed(0)} unidades</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-sm font-semibold">{formatMoney(item.incomeAmount)}</p>
                          <p className="text-xs text-muted-foreground group-open:hidden">Ver detalle</p>
                          <p className="hidden text-xs text-muted-foreground group-open:block">Ocultar</p>
                        </div>
                      </summary>

                      <div className="space-y-2 border-t p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Ingresos</span>
                          <span className="font-mono font-medium">{formatMoney(item.incomeAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Costo bruto</span>
                          <span className="font-mono font-medium text-red-700">-{formatMoney(item.baseCostAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Reserva</span>
                          <span className="font-mono font-medium text-red-700">-{formatMoney(item.reserveAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t pt-2">
                          <span className="font-medium">Margen despues reserva</span>
                          <span className={`font-mono font-semibold ${item.grossAfterReserve >= 0 ? "text-foreground" : "text-red-700"}`}>
                            {formatMoney(item.grossAfterReserve)}
                          </span>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
                </>
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
        <CardContent className="space-y-4">
          {rowsWithBalance.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No hay movimientos en el periodo seleccionado.</p>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                <div className="space-y-2">
                  <Label htmlFor="financial-ledger-search">Buscar por modulo o detalle</Label>
                  <Input
                    id="financial-ledger-search"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Ej: publicidad, retiro, producto..."
                    data-testid="input-financial-ledger-search"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="financial-ledger-module">Modulo</Label>
                  <select
                    id="financial-ledger-module"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={ledgerModuleFilter}
                    onChange={(e) => setLedgerModuleFilter(e.target.value)}
                    data-testid="select-financial-ledger-module"
                  >
                    <option value="all">Todos los modulos</option>
                    {ledgerModules.map((moduleName) => (
                      <option key={moduleName} value={moduleName}>
                        {moduleName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={showOnlySelectedRows}
                      onCheckedChange={(checked) => setShowOnlySelectedRows(checked === true)}
                      data-testid="checkbox-financial-only-selected"
                    />
                    Solo seleccionados
                  </label>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Seleccionados: {selectedLedgerRows.length} de {rowsWithBalance.length} movimientos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVisibleRowsSelection(true)}
                      disabled={visibleLedgerRows.length === 0}
                      data-testid="button-financial-select-visible"
                    >
                      Marcar visibles
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVisibleRowsSelection(false)}
                      disabled={visibleLedgerRows.length === 0}
                      data-testid="button-financial-unselect-visible"
                    >
                      Desmarcar visibles
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLedgerRowsById({})}
                      disabled={selectedLedgerRows.length === 0}
                      data-testid="button-financial-clear-selection"
                    >
                      Limpiar seleccion
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded border bg-background px-3 py-2 text-sm">
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Neto seleccionado</p>
                    <p
                      className={`font-mono font-semibold ${
                        selectedLedgerNetTotal >= 0 ? "text-green-700" : "text-red-700"
                      }`}
                      data-testid="text-financial-selected-net"
                    >
                      {selectedLedgerNetTotal >= 0 ? "+" : "-"}
                      {formatMoney(Math.abs(selectedLedgerNetTotal))}
                    </p>
                  </div>
                  <div className="rounded border bg-background px-3 py-2 text-sm">
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Ingresos seleccionados</p>
                    <p className="font-mono font-semibold text-green-700" data-testid="text-financial-selected-income">
                      +{formatMoney(selectedLedgerIncomeTotal)}
                    </p>
                  </div>
                  <div className="rounded border bg-background px-3 py-2 text-sm">
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Egresos seleccionados</p>
                    <p className="font-mono font-semibold text-red-700" data-testid="text-financial-selected-expense">
                      -{formatMoney(selectedLedgerExpenseTotal)}
                    </p>
                  </div>
                </div>
              </div>

              {visibleLedgerRows.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">
                  No hay movimientos que coincidan con los filtros seleccionados.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[940px]">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="w-[52px] p-3 text-center">
                          <Checkbox
                            checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                            onCheckedChange={(checked) => setVisibleRowsSelection(checked === true)}
                            data-testid="checkbox-financial-select-all-visible"
                          />
                        </th>
                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Fecha</th>
                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Modulo</th>
                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Detalle</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ingreso</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Egreso</th>
                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLedgerRows.map((row) => (
                        <tr key={row.id} className="border-b">
                          <td className="p-3 text-center">
                            <Checkbox
                              checked={selectedLedgerRowsById[row.id] === true}
                              onCheckedChange={(checked) => toggleLedgerRowSelection(row.id, checked === true)}
                              data-testid={`checkbox-financial-ledger-row-${row.id}`}
                            />
                          </td>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

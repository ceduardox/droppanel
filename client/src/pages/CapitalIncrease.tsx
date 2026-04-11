import { useMemo, useRef, useState } from "react";
import { useCapitalMovements, useCreateCapitalMovement, useReports } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Eye, Upload, Plus, Minus } from "lucide-react";

interface CapitalMovement {
  id: string;
  type: string;
  description: string | null;
  amount: string;
  movementDate: string;
  imageUrl: string | null;
  createdAt?: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  amount: number;
  signedAmount: number;
  kind: "credito" | "debito";
  source: "manual" | "venta";
  description: string;
  detail: string;
  imageUrl: string | null;
  sortStamp: number;
}

function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

function formatGroupDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const label = new Intl.DateTimeFormat("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function parseAmount(value: unknown): number {
  const parsed = parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSortStamp(date: string, createdAt?: string, fallbackOrder = 0): number {
  const created = createdAt ? new Date(createdAt).getTime() : NaN;
  if (Number.isFinite(created)) return created;
  const base = new Date(`${date}T00:00:00`).getTime();
  return base + fallbackOrder;
}

export default function CapitalIncrease() {
  const { data: movements = [], isLoading } = useCapitalMovements();
  const { data: salesWithProducts = [] } = useReports();
  const createMovement = useCreateCapitalMovement();
  const { toast } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [type, setType] = useState("credito");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [movementDate, setMovementDate] = useState(today);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Error", description: "Ingresa un monto valido", variant: "destructive" });
      return;
    }

    if (type === "retiro" && !selectedFile) {
      toast({ title: "Error", description: "Debes subir un comprobante para debitos", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("type", type);
    formData.append("description", description);
    formData.append("amount", amount);
    formData.append("movementDate", movementDate);
    if (selectedFile) {
      formData.append("image", selectedFile);
    }

    try {
      await createMovement.mutateAsync(formData);
      toast({ title: "Exito", description: "Movimiento registrado correctamente" });
      setAmount("");
      setDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast({ title: "Error", description: "No se pudo registrar el movimiento", variant: "destructive" });
    }
  };

  const manualEntries = useMemo<LedgerEntry[]>(() => {
    return (movements as CapitalMovement[]).map((movement, index) => {
      const movementAmount = parseAmount(movement.amount);
      const movementKind = movement.type === "credito" ? "credito" : "debito";
      return {
        id: `manual-${movement.id}`,
        date: movement.movementDate,
        amount: movementAmount,
        signedAmount: movementKind === "credito" ? movementAmount : -movementAmount,
        kind: movementKind,
        source: "manual",
        description: movement.description?.trim() || (movementKind === "credito" ? "Credito manual" : "Debito manual"),
        detail: movementKind === "credito" ? "Ingreso manual" : "Egreso manual",
        imageUrl: movement.imageUrl || null,
        sortStamp: buildSortStamp(movement.movementDate, movement.createdAt, index),
      };
    });
  }, [movements]);

  const salesEntries = useMemo<LedgerEntry[]>(() => {
    return (salesWithProducts as any[])
      .filter((item: any) => item?.product && parseAmount(item.product.capitalIncrease) > 0)
      .map((item: any, index: number) => {
        const capitalIncrease = parseAmount(item.product.capitalIncrease);
        const quantity = parseAmount(item.quantity);
        const movementAmount = capitalIncrease * quantity;

        return {
          id: `sale-${item.id}`,
          date: item.saleDate,
          amount: movementAmount,
          signedAmount: movementAmount,
          kind: "credito",
          source: "venta",
          description: `Venta ${item.product.name}`,
          detail: `${quantity} unid x ${capitalIncrease.toFixed(2)} Bs`,
          imageUrl: null,
          sortStamp: buildSortStamp(item.saleDate, item.createdAt, index),
        };
      });
  }, [salesWithProducts]);

  const allEntries = useMemo<LedgerEntry[]>(() => {
    return [...manualEntries, ...salesEntries].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.sortStamp !== b.sortStamp) return a.sortStamp - b.sortStamp;
      return a.id.localeCompare(b.id);
    });
  }, [manualEntries, salesEntries]);

  const openingBalance = useMemo(() => {
    return allEntries
      .filter((entry) => entry.date < startDate)
      .reduce((sum, entry) => sum + entry.signedAmount, 0);
  }, [allEntries, startDate]);

  const entriesInRange = useMemo(() => {
    return allEntries.filter((entry) => entry.date >= startDate && entry.date <= endDate);
  }, [allEntries, startDate, endDate]);

  const ledgerWithBalance = useMemo(() => {
    let runningBalance = openingBalance;
    return entriesInRange.map((entry) => {
      runningBalance += entry.signedAmount;
      return {
        ...entry,
        balanceAfter: runningBalance,
      };
    });
  }, [entriesInRange, openingBalance]);

  const groupedLedger = useMemo(() => {
    const grouped: Record<string, Array<LedgerEntry & { balanceAfter: number }>> = {};
    ledgerWithBalance.forEach((entry) => {
      if (!grouped[entry.date]) grouped[entry.date] = [];
      grouped[entry.date].push(entry);
    });

    return Object.keys(grouped)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((date) => ({ date, entries: grouped[date] }));
  }, [ledgerWithBalance]);

  const totalFromSales = entriesInRange
    .filter((entry) => entry.source === "venta")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalCredits = entriesInRange
    .filter((entry) => entry.source === "manual" && entry.kind === "credito")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalDebits = entriesInRange
    .filter((entry) => entry.kind === "debito")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const netRangeBalance = totalFromSales + totalCredits - totalDebits;
  const closingBalance = openingBalance + totalFromSales + totalCredits - totalDebits;

  const handleViewImage = (imageUrl: string) => {
    window.open(`/api/storage/${imageUrl}`, "_blank");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Aumento de Capital</h1>
        <p className="text-muted-foreground mt-1">Registra y consulta movimientos de capital</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registrar Movimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Movimiento</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-movement-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credito">Credito (Suma)</SelectItem>
                    <SelectItem value="retiro">Debito (Resta)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === "retiro" && (
                <div className="space-y-2">
                  <Label htmlFor="description">Descripcion del Debito</Label>
                  <Input
                    id="description"
                    placeholder="Ej: Pago a banco, nomina, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    data-testid="input-description"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Monto (Bs)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="input-amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={movementDate}
                  onChange={(e) => setMovementDate(e.target.value)}
                  data-testid="input-movement-date"
                />
              </div>

              {type === "retiro" && (
                <div className="space-y-2">
                  <Label>Comprobante</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    data-testid="input-image"
                  />
                  {selectedFile && <p className="text-sm text-muted-foreground">{selectedFile.name}</p>}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={createMovement.isPending} data-testid="button-submit">
                <Upload className="h-4 w-4 mr-2" />
                {createMovement.isPending ? "Guardando..." : "Registrar Movimiento"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtrar por Fecha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Fecha Inicio</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Fecha Fin</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo Inicial del Periodo:</span>
                <span className="font-medium text-slate-700">{openingBalance.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entradas por Ventas:</span>
                <span className="font-medium text-green-600">+{totalFromSales.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Creditos Manuales:</span>
                <span className="font-medium text-green-600">+{totalCredits.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Debitos/Pagos:</span>
                <span className="font-medium text-red-600">-{totalDebits.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo Neto del Periodo:</span>
                <span className={`font-medium ${netRangeBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {netRangeBalance >= 0 ? "+" : "-"}
                  {Math.abs(netRangeBalance).toFixed(2)} Bs
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold">Saldo Final (Acumulado):</span>
                <span
                  className={`inline-flex items-baseline gap-1 whitespace-nowrap text-xl font-bold sm:text-2xl ${closingBalance >= 0 ? "text-green-600" : "text-red-600"}`}
                  data-testid="text-total-capital"
                >
                  {closingBalance >= 0 ? "" : "-"}
                  {Math.abs(closingBalance).toFixed(2)} Bs
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estado de Cuenta de Capital</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {groupedLedger.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay movimientos en este periodo</p>
          ) : (
            <div className="space-y-5">
              {groupedLedger.map((dayGroup) => (
                <div key={dayGroup.date} className="space-y-3">
                  <p className="text-lg font-semibold">{formatGroupDate(dayGroup.date)}</p>

                  {dayGroup.entries.map((entry) => (
                    <div key={entry.id} className="rounded-xl border bg-muted/20 p-4" data-testid={`row-ledger-${entry.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium">{entry.description}</p>
                          <p className="text-xs text-muted-foreground sm:text-sm">{entry.detail}</p>
                          <div className="flex items-center gap-2 text-sm">
                            {entry.kind === "credito" ? (
                              <span className="inline-flex items-center gap-1 font-medium text-green-600">
                                <Plus className="h-3.5 w-3.5" />
                                Credito
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-red-600">
                                <Minus className="h-3.5 w-3.5" />
                                Debito
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p
                            className={`whitespace-nowrap text-lg font-bold sm:text-xl ${entry.kind === "credito" ? "text-green-600" : "text-red-600"}`}
                          >
                            {entry.kind === "credito" ? "+" : "-"} {entry.amount.toFixed(2)} Bs
                          </p>
                          <p className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
                            Saldo: <span className="font-semibold text-foreground">{entry.balanceAfter.toFixed(2)} Bs</span>
                          </p>
                          {entry.imageUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => handleViewImage(entry.imageUrl!)}
                              data-testid={`button-view-image-${entry.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" /> Ver
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


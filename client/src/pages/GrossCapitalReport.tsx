import { useMemo, useRef, useState } from "react";
import { useGrossCapitalMovements, useCreateGrossCapitalMovement, useUpdateGrossCapitalMovement, useDeleteGrossCapitalMovement, useReports } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, Upload, Minus, Pencil, Trash2, Check, X, Plus } from "lucide-react";

interface GrossCapitalMovement {
  id: string;
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
  source: "venta" | "retiro";
  description: string;
  detail: string;
  imageUrl: string | null;
  sortStamp: number;
  movementId?: string;
}

function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
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

export default function GrossCapitalReport() {
  const { data: movements = [], isLoading } = useGrossCapitalMovements();
  const { data: salesWithProducts = [] } = useReports();
  const createMovement = useCreateGrossCapitalMovement();
  const updateMovement = useUpdateGrossCapitalMovement();
  const deleteMovement = useDeleteGrossCapitalMovement();
  const { toast } = useToast();
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [movementDate, setMovementDate] = useState(today);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Error", description: "Ingresa un monto válido", variant: "destructive" });
      return;
    }

    if (!selectedFile) {
      toast({ title: "Error", description: "Debes subir un comprobante", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("description", description);
    formData.append("amount", amount);
    formData.append("movementDate", movementDate);
    formData.append("image", selectedFile);

    try {
      await createMovement.mutateAsync(formData);
      toast({ title: "Éxito", description: "Retiro registrado correctamente" });
      setAmount("");
      setDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast({ title: "Error", description: "No se pudo registrar el retiro", variant: "destructive" });
    }
  };

  const salesWithBaseCost = useMemo(() => {
    return (salesWithProducts as any[]).filter((item: any) => {
      if (!item?.product) return false;
      return parseAmount(item.product.baseCost) > 0;
    });
  }, [salesWithProducts]);

  const filteredSales = useMemo(() => {
    return salesWithBaseCost.filter((item: any) => {
      if (startDate && item.saleDate < startDate) return false;
      if (endDate && item.saleDate > endDate) return false;
      return true;
    });
  }, [salesWithBaseCost, startDate, endDate]);

  const movementEntries = useMemo<LedgerEntry[]>(() => {
    return (movements as GrossCapitalMovement[]).map((movement, index) => {
      const movementAmount = parseAmount(movement.amount);
      return {
        id: `withdraw-${movement.id}`,
        date: movement.movementDate,
        amount: movementAmount,
        signedAmount: -movementAmount,
        kind: "debito",
        source: "retiro",
        description: movement.description?.trim() || "Retiro de capital bruto",
        detail: "Egreso de capital bruto",
        imageUrl: movement.imageUrl || null,
        sortStamp: buildSortStamp(movement.movementDate, movement.createdAt, index),
        movementId: movement.id,
      };
    });
  }, [movements]);

  const salesEntries = useMemo<LedgerEntry[]>(() => {
    return salesWithBaseCost.map((item: any, index: number) => {
      const baseCost = parseAmount(item.product.baseCost);
      const quantity = parseAmount(item.quantity);
      const movementAmount = baseCost * quantity;

      return {
        id: `sale-${item.id}`,
        date: item.saleDate,
        amount: movementAmount,
        signedAmount: movementAmount,
        kind: "credito",
        source: "venta",
        description: `Venta ${item.product.name}`,
        detail: `${quantity} unid x ${baseCost.toFixed(2)} Bs`,
        imageUrl: null,
        sortStamp: buildSortStamp(item.saleDate, item.createdAt, index),
      };
    });
  }, [salesWithBaseCost]);

  const allEntries = useMemo(() => {
    return [...movementEntries, ...salesEntries].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.sortStamp !== b.sortStamp) return a.sortStamp - b.sortStamp;
      return a.id.localeCompare(b.id);
    });
  }, [movementEntries, salesEntries]);

  const movementById = useMemo(() => {
    const map = new Map<string, GrossCapitalMovement>();
    (movements as GrossCapitalMovement[]).forEach((movement) => {
      map.set(movement.id, movement);
    });
    return map;
  }, [movements]);

  const openingBalance = useMemo(() => {
    return allEntries
      .filter((entry) => entry.date < startDate)
      .reduce((sum, entry) => sum + entry.signedAmount, 0);
  }, [allEntries, startDate]);

  const entriesInRange = useMemo(() => {
    return allEntries.filter((entry) => entry.date >= startDate && entry.date <= endDate);
  }, [allEntries, startDate, endDate]);

  const ledgerWithBalance = useMemo(() => {
    let runningPeriodBalance = 0;
    let runningAccumulatedBalance = openingBalance;
    return entriesInRange.map((entry) => {
      runningPeriodBalance += entry.signedAmount;
      runningAccumulatedBalance += entry.signedAmount;
      return {
        ...entry,
        balanceAfterPeriod: runningPeriodBalance,
        balanceAfterAccumulated: runningAccumulatedBalance,
      };
    });
  }, [entriesInRange, openingBalance]);

  const groupedLedger = useMemo(() => {
    const grouped: Record<string, Array<LedgerEntry & { balanceAfterPeriod: number; balanceAfterAccumulated: number }>> = {};
    ledgerWithBalance.forEach((entry) => {
      if (!grouped[entry.date]) grouped[entry.date] = [];
      grouped[entry.date].push(entry);
    });

    return Object.keys(grouped)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((date) => ({ date, entries: grouped[date] }));
  }, [ledgerWithBalance]);

  const totalBrutoFromSales = entriesInRange
    .filter((entry) => entry.source === "venta")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalWithdrawals = entriesInRange
    .filter((entry) => entry.source === "retiro")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const periodCapitalBalance = totalBrutoFromSales - totalWithdrawals;
  const accumulatedCapitalBalance = openingBalance + periodCapitalBalance;

  const handleViewImage = (imageUrl: string) => {
    window.open(`/api/storage/${imageUrl}`, "_blank");
  };

  const handleStartEdit = (m: GrossCapitalMovement) => {
    setEditingId(m.id);
    setEditDescription(m.description || "");
    setEditAmount(m.amount);
    setEditDate(m.movementDate);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDescription("");
    setEditAmount("");
    setEditDate("");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await updateMovement.mutateAsync({
        id: editingId,
        data: { description: editDescription, amount: editAmount, movementDate: editDate },
      });
      toast({ title: "Éxito", description: "Retiro actualizado" });
      handleCancelEdit();
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMovement.mutateAsync(id);
      toast({ title: "Éxito", description: "Retiro eliminado" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reporte Capital Bruto</h1>
        <p className="text-muted-foreground mt-1">Control de costo bruto de productos vendidos</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registrar Retiro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descripción del Retiro</Label>
                <Input
                  id="description"
                  placeholder="Ej: Pago a proveedor, Reposición, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="input-description"
                />
              </div>

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

              <div className="space-y-2">
                <Label>Comprobante</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  data-testid="input-image"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={createMovement.isPending} data-testid="button-submit">
                <Upload className="h-4 w-4 mr-2" />
                {createMovement.isPending ? "Guardando..." : "Registrar Retiro"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtrar por Fecha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <p className="text-sm font-medium text-muted-foreground mb-2">Costo Bruto por Producto:</p>
              {Object.entries(
                filteredSales.reduce((acc: Record<string, { name: string; total: number; qty: number }>, item: any) => {
                  const name = item.product.name;
                  const baseCost = parseFloat(item.product.baseCost || 0);
                  if (!acc[name]) acc[name] = { name, total: 0, qty: 0 };
                  acc[name].total += baseCost * item.quantity;
                  acc[name].qty += item.quantity;
                  return acc;
                }, {})
              ).map(([name, data]: [string, any]) => (
                <div key={name} className="flex justify-between text-sm pl-2">
                  <span className="text-muted-foreground">{name} ({data.qty}u)</span>
                  <span className="font-medium text-blue-600">+{data.total.toFixed(2)} Bs</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-1 border-t border-dashed">
                <span className="text-muted-foreground font-medium">Entradas por Costo Bruto:</span>
                <span className="font-medium text-green-600">+{totalBrutoFromSales.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Retiros:</span>
                <span className="font-medium text-red-600">-{totalWithdrawals.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold">Saldo Capital Bruto:</span>
                <span
                  className={`inline-flex items-baseline gap-1 whitespace-nowrap text-xl font-bold sm:text-2xl ${periodCapitalBalance >= 0 ? "text-blue-600" : "text-red-600"}`}
                  data-testid="text-total-bruto"
                >
                  {periodCapitalBalance >= 0 ? "" : "-"}
                  {Math.abs(periodCapitalBalance).toFixed(2)} Bs
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Saldo Acumulado (informativo):</span>
                <span className={`font-medium ${accumulatedCapitalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {accumulatedCapitalBalance >= 0 ? "" : "-"}
                  {Math.abs(accumulatedCapitalBalance).toFixed(2)} Bs
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estado de Cuenta de Capital Bruto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {groupedLedger.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay movimientos en este período</p>
          ) : (
            <div className="space-y-5">
              {groupedLedger.map((dayGroup) => (
                <div key={dayGroup.date} className="space-y-3">
                  <p className="text-lg font-semibold">{formatGroupDate(dayGroup.date)}</p>

                  {dayGroup.entries.map((entry) => {
                    const isWithdrawal = entry.source === "retiro";
                    const movementId = entry.movementId;
                    const movement = movementId ? movementById.get(movementId) : undefined;
                    const isEditing = isWithdrawal && movementId && editingId === movementId;

                    if (isEditing) {
                      return (
                        <div key={entry.id} className="rounded-xl border bg-muted/20 p-4" data-testid={`row-ledger-${entry.id}`}>
                          <div className="space-y-2">
                            <Input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="h-9"
                              data-testid="edit-input-date"
                            />
                            <Input
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Descripción"
                              className="h-9"
                              data-testid="edit-input-description"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="h-9"
                              data-testid="edit-input-amount"
                            />
                            <div className="flex items-center justify-between gap-2">
                              {entry.imageUrl ? (
                                <Button variant="outline" size="sm" onClick={() => handleViewImage(entry.imageUrl!)}>
                                  <Eye className="h-4 w-4 mr-1" /> Ver
                                </Button>
                              ) : (
                                <span className="text-sm text-muted-foreground">Sin comprobante</span>
                              )}
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveEdit} data-testid="button-save-edit">
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelEdit} data-testid="button-cancel-edit">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={entry.id} className="rounded-xl border bg-muted/20 p-4" data-testid={`row-ledger-${entry.id}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1 min-w-0 sm:flex-1">
                            <p className="font-medium break-words">{entry.description}</p>
                            <p className="text-xs text-muted-foreground sm:text-sm">{entry.detail}</p>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              {entry.kind === "credito" ? (
                                <span className="inline-flex items-center gap-1 font-medium text-green-600">
                                  <Plus className="h-3.5 w-3.5" />
                                  Crédito
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-medium text-red-600">
                                  <Minus className="h-3.5 w-3.5" />
                                  Débito
                                </span>
                              )}
                              <span className="text-muted-foreground">| {formatDateString(entry.date)}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-0.5 sm:items-end">
                            <p className={`text-lg font-bold sm:text-xl sm:whitespace-nowrap ${entry.kind === "credito" ? "text-green-600" : "text-red-600"}`}>
                              {entry.kind === "credito" ? "+" : "-"} {entry.amount.toFixed(2)} Bs
                            </p>
                            <p className="text-xs text-muted-foreground sm:text-sm sm:whitespace-nowrap">
                              Saldo Capital Bruto: <span className="font-semibold text-foreground">{entry.balanceAfterPeriod.toFixed(2)} Bs</span>
                            </p>
                          </div>
                        </div>

                        {isWithdrawal && (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                            {entry.imageUrl ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewImage(entry.imageUrl!)}
                                data-testid={`button-view-image-${entry.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" /> Ver comprobante
                              </Button>
                            ) : (
                              <span className="text-sm text-muted-foreground">Sin comprobante</span>
                            )}
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => movement && handleStartEdit(movement)}
                                data-testid={`button-edit-${entry.id}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => movementId && handleDelete(movementId)}
                                data-testid={`button-delete-${entry.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {filteredSales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Costo Bruto por Ventas de Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredSales.map((item: any) => {
                const baseCost = parseFloat(item.product.baseCost);
                const totalBruto = baseCost * item.quantity;

                return (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`card-bruto-${item.id}`}>
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateString(item.saleDate)} • {item.quantity} unidades × {baseCost.toFixed(2)} Bs
                      </p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">+{totalBruto.toFixed(2)} Bs</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

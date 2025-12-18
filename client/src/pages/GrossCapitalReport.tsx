import { useState, useRef } from "react";
import { useGrossCapitalMovements, useCreateGrossCapitalMovement, useUpdateGrossCapitalMovement, useDeleteGrossCapitalMovement, useReports } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, Upload, Minus, Pencil, Trash2, Check, X } from "lucide-react";

interface GrossCapitalMovement {
  id: string;
  description: string | null;
  amount: string;
  movementDate: string;
  imageUrl: string | null;
}

function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
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

  const filteredMovements = (movements as GrossCapitalMovement[]).filter((m) => {
    if (!startDate || !endDate) return true;
    return m.movementDate >= startDate && m.movementDate <= endDate;
  });

  const filteredSales = (salesWithProducts as any[]).filter((item: any) => {
    if (!item.product) return false;
    const hasBaseCost = item.product.baseCost !== null && 
                        item.product.baseCost !== undefined && 
                        parseFloat(item.product.baseCost) > 0;
    if (!hasBaseCost) return false;
    if (startDate && item.saleDate < startDate) return false;
    if (endDate && item.saleDate > endDate) return false;
    return true;
  });

  const totalBrutoFromSales = filteredSales.reduce((sum: number, item: any) => {
    const baseCost = parseFloat(item.product.baseCost || 0);
    return sum + (baseCost * item.quantity);
  }, 0);

  const totalWithdrawals = filteredMovements.reduce((sum, m) => sum + parseFloat(m.amount), 0);

  const grandTotal = totalBrutoFromSales - totalWithdrawals;

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
                <span className="text-muted-foreground font-medium">Subtotal Costo Bruto:</span>
                <span className="font-medium text-blue-600">+{totalBrutoFromSales.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Retiros:</span>
                <span className="font-medium text-red-600">-{totalWithdrawals.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold">Saldo Capital Bruto:</span>
                <span className={`text-2xl font-bold ${grandTotal >= 0 ? 'text-blue-600' : 'text-red-600'}`} data-testid="text-total-bruto">
                  {grandTotal >= 0 ? '' : '-'}{Math.abs(grandTotal).toFixed(2)} Bs
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial de Retiros</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMovements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay retiros en este período</p>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Fecha</th>
                    <th className="p-3 text-left font-medium">Descripción</th>
                    <th className="p-3 text-right font-medium">Monto</th>
                    <th className="p-3 text-center font-medium">Comprobante</th>
                    <th className="p-3 text-center font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((movement) => (
                    <tr key={movement.id} className="border-b" data-testid={`row-movement-${movement.id}`}>
                      {editingId === movement.id ? (
                        <>
                          <td className="p-3">
                            <Input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="h-8"
                              data-testid="edit-input-date"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Descripción"
                              className="h-8"
                              data-testid="edit-input-description"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="h-8 text-right"
                              data-testid="edit-input-amount"
                            />
                          </td>
                          <td className="p-3 text-center">
                            {movement.imageUrl ? (
                              <Button variant="outline" size="sm" onClick={() => handleViewImage(movement.imageUrl!)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            ) : "-"}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit} data-testid="button-save-edit">
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit} data-testid="button-cancel-edit">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {formatDateString(movement.movementDate)}
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{movement.description || "-"}</td>
                          <td className="p-3 text-right font-mono font-medium text-red-600">
                            <span className="inline-flex items-center gap-1">
                              <Minus className="h-3 w-3" />
                              {parseFloat(movement.amount).toFixed(2)} Bs
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {movement.imageUrl ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewImage(movement.imageUrl!)}
                                data-testid={`button-view-image-${movement.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" /> Ver
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(movement)} data-testid={`button-edit-${movement.id}`}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(movement.id)} data-testid={`button-delete-${movement.id}`}>
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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

import { useState, useRef } from "react";
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
}

function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

export default function CapitalIncrease() {
  const { data: movements = [], isLoading } = useCapitalMovements();
  const { data: salesWithProducts = [] } = useReports();
  const createMovement = useCreateCapitalMovement();
  const { toast } = useToast();
  
  const today = new Date().toISOString().split('T')[0];
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
      toast({ title: "Error", description: "Ingresa un monto válido", variant: "destructive" });
      return;
    }

    if (type === "retiro" && !selectedFile) {
      toast({ title: "Error", description: "Debes subir un comprobante para retiros", variant: "destructive" });
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
      toast({ title: "Éxito", description: "Movimiento registrado correctamente" });
      setAmount("");
      setDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast({ title: "Error", description: "No se pudo registrar el movimiento", variant: "destructive" });
    }
  };

  const filteredMovements = (movements as CapitalMovement[]).filter((m) => {
    if (!startDate || !endDate) return true;
    return m.movementDate >= startDate && m.movementDate <= endDate;
  });

  const filteredSales = (salesWithProducts as any[]).filter((item: any) => {
    if (!item.product) return false;
    const hasCapitalIncrease = item.product.capitalIncrease !== null && 
                               item.product.capitalIncrease !== undefined && 
                               parseFloat(item.product.capitalIncrease) > 0;
    if (!hasCapitalIncrease) return false;
    if (startDate && item.saleDate < startDate) return false;
    if (endDate && item.saleDate > endDate) return false;
    return true;
  });

  const totalFromSales = filteredSales.reduce((sum: number, item: any) => {
    const capitalIncrease = parseFloat(item.product.capitalIncrease || 0);
    return sum + (capitalIncrease * item.quantity);
  }, 0);

  const totalCredits = filteredMovements
    .filter(m => m.type === "credito")
    .reduce((sum, m) => sum + parseFloat(m.amount), 0);

  const totalWithdrawals = filteredMovements
    .filter(m => m.type === "retiro")
    .reduce((sum, m) => sum + parseFloat(m.amount), 0);

  const grandTotal = totalFromSales + totalCredits - totalWithdrawals;

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
                    <SelectItem value="credito">Crédito (Suma)</SelectItem>
                    <SelectItem value="retiro">Retiro / Pago (Resta)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === "retiro" && (
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción del Retiro</Label>
                  <Input
                    id="description"
                    placeholder="Ej: Pago a banco, Nómina, etc."
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
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                  )}
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
                <span className="text-muted-foreground">Capital por Ventas:</span>
                <span className="font-medium text-green-600">+{totalFromSales.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Créditos Manuales:</span>
                <span className="font-medium text-green-600">+{totalCredits.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Retiros/Pagos:</span>
                <span className="font-medium text-red-600">-{totalWithdrawals.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold">Total Capital:</span>
                <span className={`text-2xl font-bold ${grandTotal >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-total-capital">
                  {grandTotal >= 0 ? '' : '-'}{Math.abs(grandTotal).toFixed(2)} Bs
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial de Movimientos Manuales</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMovements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay movimientos en este período</p>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Fecha</th>
                    <th className="p-3 text-left font-medium">Tipo</th>
                    <th className="p-3 text-left font-medium">Descripción</th>
                    <th className="p-3 text-right font-medium">Monto</th>
                    <th className="p-3 text-center font-medium">Comprobante</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((movement) => (
                    <tr key={movement.id} className="border-b" data-testid={`row-movement-${movement.id}`}>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDateString(movement.movementDate)}
                        </div>
                      </td>
                      <td className="p-3">
                        {movement.type === "credito" ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                            <Plus className="h-3 w-3" /> Crédito
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                            <Minus className="h-3 w-3" /> Retiro
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{movement.description || "-"}</td>
                      <td className={`p-3 text-right font-mono font-medium ${movement.type === "retiro" ? 'text-red-600' : 'text-green-600'}`}>
                        {movement.type === "retiro" ? '-' : '+'}{parseFloat(movement.amount).toFixed(2)} Bs
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
            <CardTitle className="text-lg">Capital por Ventas de Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredSales.map((item: any) => {
                const capitalIncrease = parseFloat(item.product.capitalIncrease);
                const totalIncrease = capitalIncrease * item.quantity;

                return (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`card-capital-${item.id}`}>
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateString(item.saleDate)} • {item.quantity} unidades × {capitalIncrease.toFixed(2)} Bs
                      </p>
                    </div>
                    <span className="text-lg font-bold text-green-600">+{totalIncrease.toFixed(2)} Bs</span>
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

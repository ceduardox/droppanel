import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, TruckIcon, Package, FileText, Pencil, Trash2, Check, X, Calendar } from "lucide-react";
import {
  useDeliveries,
  useCreateDelivery,
  useProducts,
  useDeliveryStockEntries,
  useCreateDeliveryStockEntry,
  useUpdateDeliveryStockEntry,
  useDeleteDeliveryStockEntry,
  useCreateDeliveryAssignment,
  useDeliveryAssignmentsReport,
  useUpdateDeliveryAssignmentPaid,
} from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Delivery() {
  const { toast } = useToast();
  
  // Delivery management state
  const [newDeliveryName, setNewDeliveryName] = useState("");
  
  // Stock entry state
  const [stockProductId, setStockProductId] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockNote, setStockNote] = useState("");
  const [stockEntryDate, setStockEntryDate] = useState("");

  // Stock editing state
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editStockProductId, setEditStockProductId] = useState("");
  const [editStockQuantity, setEditStockQuantity] = useState("");
  const [editStockEntryDate, setEditStockEntryDate] = useState("");
  
  // Assignment state
  const [assignDeliveryId, setAssignDeliveryId] = useState("");
  const [assignProductId, setAssignProductId] = useState("");
  const [assignQuantity, setAssignQuantity] = useState("");
  const [assignNote, setAssignNote] = useState("");
  
  // Report state
  const today = new Date().toISOString().split('T')[0];
  const [reportStartDate, setReportStartDate] = useState(today);
  const [reportEndDate, setReportEndDate] = useState(today);

  // Queries
  const { data: deliveries = [], isLoading: deliveriesLoading } = useDeliveries() as { data: any[], isLoading: boolean };
  const { data: products = [], isLoading: productsLoading } = useProducts() as { data: any[], isLoading: boolean };
  const { data: stockEntries = [] } = useDeliveryStockEntries() as { data: any[] };
  const { data: report, isLoading: reportLoading } = useDeliveryAssignmentsReport(reportStartDate, reportEndDate);

  // Mutations
  const createDelivery = useCreateDelivery();
  const createStockEntry = useCreateDeliveryStockEntry();
  const updateStockEntry = useUpdateDeliveryStockEntry();
  const deleteStockEntry = useDeleteDeliveryStockEntry();
  const createAssignment = useCreateDeliveryAssignment();
  const updatePaidStatus = useUpdateDeliveryAssignmentPaid();

  // Handlers
  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeliveryName.trim()) return;

    try {
      await createDelivery.mutateAsync({ name: newDeliveryName.trim() });
      setNewDeliveryName("");
      toast({
        title: "Delivery creado",
        description: "El delivery se ha creado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el delivery",
        variant: "destructive",
      });
    }
  };

  const handleCreateStockEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockProductId || !stockQuantity) return;

    try {
      await createStockEntry.mutateAsync({
        productId: stockProductId,
        quantity: parseInt(stockQuantity),
        note: stockNote || undefined,
        entryDate: stockEntryDate || undefined,
      });
      setStockProductId("");
      setStockQuantity("");
      setStockNote("");
      setStockEntryDate("");
      toast({
        title: "Stock agregado",
        description: "El stock se ha registrado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el stock",
        variant: "destructive",
      });
    }
  };

  const handleStartEditStock = (entry: any) => {
    setEditingStockId(entry.id);
    setEditStockProductId(entry.productId);
    setEditStockQuantity(entry.quantity.toString());
    setEditStockEntryDate(entry.entryDate || "");
  };

  const handleCancelEditStock = () => {
    setEditingStockId(null);
    setEditStockProductId("");
    setEditStockQuantity("");
    setEditStockEntryDate("");
  };

  const handleSaveEditStock = async () => {
    if (!editingStockId) return;
    try {
      await updateStockEntry.mutateAsync({
        id: editingStockId,
        data: {
          productId: editStockProductId,
          quantity: parseInt(editStockQuantity),
          entryDate: editStockEntryDate || null,
        },
      });
      toast({ title: "Éxito", description: "Stock actualizado" });
      handleCancelEditStock();
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    }
  };

  const handleDeleteStock = async (id: string) => {
    try {
      await deleteStockEntry.mutateAsync(id);
      toast({ title: "Éxito", description: "Entrada eliminada" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignDeliveryId || !assignProductId || !assignQuantity) return;

    const product = products.find((p: any) => p.id === assignProductId);
    if (!product) return;

    try {
      await createAssignment.mutateAsync({
        deliveryId: assignDeliveryId,
        productId: assignProductId,
        quantity: parseInt(assignQuantity),
        unitPriceSnapshot: product.price,
        note: assignNote || undefined,
        isPaid: 0,
      });
      setAssignDeliveryId("");
      setAssignProductId("");
      setAssignQuantity("");
      setAssignNote("");
      toast({
        title: "Asignación creada",
        description: "El stock se ha asignado al delivery correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la asignación",
        variant: "destructive",
      });
    }
  };

  const handleTogglePaid = async (assignmentId: string, currentStatus: number) => {
    try {
      await updatePaidStatus.mutateAsync({
        id: assignmentId,
        isPaid: currentStatus === 1 ? 0 : 1,
      });
      toast({
        title: "Estado actualizado",
        description: "El estado de pago se ha actualizado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  // Calculate stock balance per product
  const stockBalance = new Map<string, number>();
  stockEntries.forEach((entry: any) => {
    const current = stockBalance.get(entry.productId) || 0;
    stockBalance.set(entry.productId, current + entry.quantity);
  });
  report?.assignments?.forEach((assignment: any) => {
    const current = stockBalance.get(assignment.productId) || 0;
    stockBalance.set(assignment.productId, current - assignment.quantity);
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Gestión de Delivery</h1>

      <Tabs defaultValue="deliveries" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="deliveries" data-testid="tab-deliveries">
            <TruckIcon className="h-4 w-4 mr-2" />
            Deliveries
          </TabsTrigger>
          <TabsTrigger value="stock" data-testid="tab-stock">
            <Package className="h-4 w-4 mr-2" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="assign" data-testid="tab-assign">
            <Plus className="h-4 w-4 mr-2" />
            Asignar
          </TabsTrigger>
          <TabsTrigger value="report" data-testid="tab-report">
            <FileText className="h-4 w-4 mr-2" />
            Reporte
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Deliveries */}
        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crear Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDelivery} className="flex gap-2">
                <Input
                  placeholder="Nombre del delivery"
                  value={newDeliveryName}
                  onChange={(e) => setNewDeliveryName(e.target.value)}
                  data-testid="input-delivery-name"
                />
                <Button type="submit" disabled={createDelivery.isPending} data-testid="button-create-delivery">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              {deliveriesLoading ? (
                <p className="text-center text-muted-foreground">Cargando...</p>
              ) : deliveries.length > 0 ? (
                <div className="space-y-2">
                  {deliveries.map((delivery: any) => (
                    <div
                      key={delivery.id}
                      className="p-3 rounded-lg border bg-card"
                      data-testid={`delivery-${delivery.id}`}
                    >
                      <p className="font-medium">{delivery.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hay deliveries registrados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Stock */}
        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agregar Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateStockEntry} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stockProduct">Producto</Label>
                  <Select value={stockProductId} onValueChange={setStockProductId}>
                    <SelectTrigger data-testid="select-stock-product">
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product: any) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - {parseFloat(product.price).toFixed(2)} Bs
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Cantidad</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    placeholder="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    data-testid="input-stock-quantity"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stockEntryDate">Fecha de Entrega (opcional)</Label>
                  <Input
                    id="stockEntryDate"
                    type="date"
                    value={stockEntryDate}
                    onChange={(e) => setStockEntryDate(e.target.value)}
                    data-testid="input-stock-entry-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stockNote">Nota (opcional)</Label>
                  <Textarea
                    id="stockNote"
                    placeholder="Notas sobre esta entrada de stock..."
                    value={stockNote}
                    onChange={(e) => setStockNote(e.target.value)}
                    data-testid="input-stock-note"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createStockEntry.isPending || !stockProductId || !stockQuantity}
                  className="w-full"
                  data-testid="button-create-stock"
                >
                  Agregar Stock
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Balance de Stock por Producto</CardTitle>
            </CardHeader>
            <CardContent>
              {products.length > 0 ? (
                <div className="space-y-2">
                  {products.map((product: any) => {
                    const balance = stockBalance.get(product.id) || 0;
                    return (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        data-testid={`stock-balance-${product.id}`}
                      >
                        <span className="font-medium">{product.name}</span>
                        <span className={`font-mono ${balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                          {balance} unidades
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hay productos registrados</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Entradas de Stock</CardTitle>
            </CardHeader>
            <CardContent>
              {stockEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay entradas de stock registradas</p>
              ) : (
                <div className="rounded-lg border">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="p-3 text-left font-medium">Producto</th>
                        <th className="p-3 text-center font-medium">Cantidad</th>
                        <th className="p-3 text-center font-medium">Fecha Entrega</th>
                        <th className="p-3 text-center font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockEntries.map((entry: any) => {
                        const product = products.find((p: any) => p.id === entry.productId);
                        return (
                          <tr key={entry.id} className="border-b" data-testid={`row-stock-${entry.id}`}>
                            {editingStockId === entry.id ? (
                              <>
                                <td className="p-3">
                                  <Select value={editStockProductId} onValueChange={setEditStockProductId}>
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-3">
                                  <Input
                                    type="number"
                                    value={editStockQuantity}
                                    onChange={(e) => setEditStockQuantity(e.target.value)}
                                    className="h-8 text-center"
                                    data-testid="edit-input-stock-quantity"
                                  />
                                </td>
                                <td className="p-3">
                                  <Input
                                    type="date"
                                    value={editStockEntryDate}
                                    onChange={(e) => setEditStockEntryDate(e.target.value)}
                                    className="h-8"
                                    data-testid="edit-input-stock-date"
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex justify-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEditStock} data-testid="button-save-stock">
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEditStock} data-testid="button-cancel-stock">
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 font-medium">{product?.name || "Producto eliminado"}</td>
                                <td className="p-3 text-center font-mono">{entry.quantity}</td>
                                <td className="p-3 text-center">
                                  {entry.entryDate ? (
                                    <span className="inline-flex items-center gap-1 text-sm">
                                      <Calendar className="h-3 w-3" />
                                      {entry.entryDate}
                                    </span>
                                  ) : "-"}
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex justify-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEditStock(entry)} data-testid={`button-edit-stock-${entry.id}`}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteStock(entry.id)} data-testid={`button-delete-stock-${entry.id}`}>
                                      <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Assignment */}
        <TabsContent value="assign" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignar Stock a Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assignDelivery">Delivery</Label>
                  <Select value={assignDeliveryId} onValueChange={setAssignDeliveryId}>
                    <SelectTrigger data-testid="select-assign-delivery">
                      <SelectValue placeholder="Seleccionar delivery" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveries.map((delivery: any) => (
                        <SelectItem key={delivery.id} value={delivery.id}>
                          {delivery.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignProduct">Producto</Label>
                  <Select value={assignProductId} onValueChange={setAssignProductId}>
                    <SelectTrigger data-testid="select-assign-product">
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product: any) => {
                        const available = stockBalance.get(product.id) || 0;
                        return (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {parseFloat(product.price).toFixed(2)} Bs (Stock: {available})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignQuantity">Cantidad</Label>
                  <Input
                    id="assignQuantity"
                    type="number"
                    placeholder="0"
                    value={assignQuantity}
                    onChange={(e) => setAssignQuantity(e.target.value)}
                    data-testid="input-assign-quantity"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignNote">Nota (opcional)</Label>
                  <Textarea
                    id="assignNote"
                    placeholder="Notas sobre esta asignación..."
                    value={assignNote}
                    onChange={(e) => setAssignNote(e.target.value)}
                    data-testid="input-assign-note"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createAssignment.isPending || !assignDeliveryId || !assignProductId || !assignQuantity}
                  className="w-full"
                  data-testid="button-create-assignment"
                >
                  Asignar Stock
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Report */}
        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reporte de Asignaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reportStartDate">Fecha Inicial</Label>
                  <Input
                    id="reportStartDate"
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    data-testid="input-report-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportEndDate">Fecha Final</Label>
                  <Input
                    id="reportEndDate"
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    data-testid="input-report-end-date"
                  />
                </div>
              </div>

              {reportLoading ? (
                <p className="text-center text-muted-foreground">Cargando reporte...</p>
              ) : report && report.byDelivery && report.byDelivery.length > 0 ? (
                <>
                  {report.byDelivery.map((deliveryData: any) => (
                    <Card key={deliveryData.delivery.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{deliveryData.delivery.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="rounded-lg border">
                          <table className="w-full">
                            <thead className="border-b bg-muted/50">
                              <tr>
                                <th className="p-2 text-left text-sm font-medium">Producto</th>
                                <th className="p-2 text-center text-sm font-medium">Cant.</th>
                                <th className="p-2 text-right text-sm font-medium">Precio</th>
                                <th className="p-2 text-right text-sm font-medium">Total</th>
                                <th className="p-2 text-center text-sm font-medium">Pagado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deliveryData.assignments.map((assignment: any) => (
                                <tr key={assignment.id} className="border-b">
                                  <td className="p-2 text-sm">{assignment.product?.name}</td>
                                  <td className="p-2 text-center text-sm font-mono">{assignment.quantity}</td>
                                  <td className="p-2 text-right text-sm font-mono">
                                    {parseFloat(assignment.unitPriceSnapshot).toFixed(2)} Bs
                                  </td>
                                  <td className="p-2 text-right text-sm font-mono">
                                    {(assignment.quantity * parseFloat(assignment.unitPriceSnapshot)).toFixed(2)} Bs
                                  </td>
                                  <td className="p-2 text-center">
                                    <Checkbox
                                      checked={assignment.isPaid === 1}
                                      onCheckedChange={() => handleTogglePaid(assignment.id, assignment.isPaid)}
                                      data-testid={`checkbox-paid-${assignment.id}`}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex justify-end">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total del delivery:</p>
                            <p className="text-xl font-bold" data-testid={`total-${deliveryData.delivery.id}`}>
                              {deliveryData.total.toFixed(2)} Bs
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Card className="bg-primary text-primary-foreground">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium">Total General del Periodo:</span>
                        <span className="text-3xl font-bold" data-testid="text-grand-total">
                          {parseFloat(report.grandTotal).toFixed(2)} Bs
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No hay asignaciones en este periodo
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

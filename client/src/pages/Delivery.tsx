import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, TruckIcon, Pencil, Trash2, Check, X, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import {
  useDeliveries,
  useCreateDelivery,
  useProducts,
  useDeliveryStockEntries,
  useCreateDeliveryStockEntry,
  useUpdateDeliveryStockEntry,
  useDeleteDeliveryStockEntry,
  useCreateDeliveryAssignment,
  useDeliveryAssignments,
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
  const { data: deliveryAssignments = [] } = useDeliveryAssignments() as { data: any[] };
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
      toast({ title: "Exito", description: "Stock actualizado" });
      handleCancelEditStock();
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    }
  };

  const handleDeleteStock = async (id: string) => {
    try {
      await deleteStockEntry.mutateAsync(id);
      toast({ title: "Exito", description: "Entrada eliminada" });
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
        title: "Asignacion creada",
        description: "El stock se ha asignado al delivery correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la asignacion",
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

  const deliveryAvailableBalance = new Map<string, number>();
  deliveryAssignments.forEach((assignment: any) => {
    if (assignment.isPaid === 1) return;
    const current = deliveryAvailableBalance.get(assignment.deliveryId) || 0;
    deliveryAvailableBalance.set(assignment.deliveryId, current + assignment.quantity);
  });

  const bentoCardClass =
    "rounded-[2rem] border border-slate-100 bg-white shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]";
  const bentoInputClass =
    "h-14 rounded-2xl border-2 border-transparent bg-slate-50 px-5 text-slate-700 transition-all focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-100";
  const bentoLabelClass = "ml-1 text-xs font-bold uppercase tracking-wide text-slate-400";
  const bentoPrimaryButtonClass =
    "h-16 w-full rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-200 transition-all hover:bg-indigo-600 active:scale-[0.99]";
  const tabButtonClass =
    "h-9 rounded-xl border border-slate-100 bg-white px-2 py-1.5 text-[11px] font-bold tracking-tight text-slate-500 shadow-sm data-[state=active]:border-transparent data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-200 sm:text-xs";

  return (
    <div className="mx-auto w-full max-w-none space-y-5 px-1 sm:px-4 lg:px-6">
      <h1 className="text-2xl font-bold sm:text-3xl">Gestion de Delivery</h1>

      <Tabs defaultValue="deliveries" className="space-y-5">
        <TabsList className="grid w-full grid-cols-4 gap-1.5 bg-transparent p-0 py-1">
          <TabsTrigger
            value="deliveries"
            className={tabButtonClass}
            data-testid="tab-deliveries"
          >
            Entregas
          </TabsTrigger>
          <TabsTrigger
            value="stock"
            className={tabButtonClass}
            data-testid="tab-stock"
          >
            Stock
          </TabsTrigger>
          <TabsTrigger
            value="assign"
            className={tabButtonClass}
            data-testid="tab-assign"
          >
            Asignar
          </TabsTrigger>
          <TabsTrigger
            value="report"
            className={tabButtonClass}
            data-testid="tab-report"
          >
            Reportes
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Deliveries */}
        <TabsContent value="deliveries" className="space-y-4">
          <Card className={bentoCardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Plus className="h-5 w-5 text-[#194792]" />
                Crear Delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDelivery} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  className={`${bentoInputClass} min-w-0`}
                  placeholder="Nombre del delivery"
                  value={newDeliveryName}
                  onChange={(e) => setNewDeliveryName(e.target.value)}
                  data-testid="input-delivery-name"
                />
                <Button
                  type="submit"
                  className={`${bentoPrimaryButtonClass} w-full px-6 sm:h-14 sm:w-auto`}
                  disabled={createDelivery.isPending}
                  data-testid="button-create-delivery"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className={bentoCardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl">Lista de Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              {deliveriesLoading ? (
                <p className="text-center text-muted-foreground">Cargando...</p>
              ) : deliveries.length > 0 ? (
                <div className="space-y-2.5">
                  {deliveries.map((delivery: any) => (
                    <Link key={delivery.id} href={`/delivery/historial/${delivery.id}`}>
                      <div
                        className="group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(90deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 shadow-[0_8px_20px_-14px_rgba(37,99,235,0.45)] transition-all hover:-translate-y-0.5 hover:border-[#9ec2ef] hover:shadow-[0_16px_34px_-16px_rgba(37,99,235,0.35)]"
                        data-testid={`delivery-${delivery.id}`}
                      >
                        <span className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 to-cyan-500" />
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <TruckIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{delivery.name}</p>
                          <p className="text-xs font-medium text-[#6c87ab] transition-colors group-hover:text-[#1d4f97]">
                            Toca para ver historial y movimientos de este delivery
                          </p>
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-2 rounded-xl border border-[#c9d8ee] bg-[#eef5ff] px-3 py-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b82a5]">
                            Disponible
                          </span>
                          <span
                            className="text-base font-bold text-[#163f88]"
                            data-testid={`delivery-available-${delivery.id}`}
                          >
                            {deliveryAvailableBalance.get(delivery.id) || 0}
                          </span>
                        </div>
                      </div>
                    </Link>
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
          <Card className={bentoCardClass}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="text-xl font-bold text-slate-800">Agregar Stock</CardTitle>
              <span className="rounded-lg bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-600">
                Nuevo ingreso
              </span>
            </CardHeader>
            <CardContent className="pt-1">
              <form onSubmit={handleCreateStockEntry} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="stockProduct" className={bentoLabelClass}>Producto</Label>
                  <Select value={stockProductId} onValueChange={setStockProductId}>
                    <SelectTrigger className={bentoInputClass} data-testid="select-stock-product">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stockQuantity" className={bentoLabelClass}>Cantidad</Label>
                    <Input
                      id="stockQuantity"
                      type="number"
                      placeholder="0"
                      className={`${bentoInputClass} text-lg font-bold text-slate-800`}
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      data-testid="input-stock-quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stockEntryDate" className={bentoLabelClass}>Fecha</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="stockEntryDate"
                        type="date"
                        className={`${bentoInputClass} pl-8 pr-1 text-[12px] tracking-tight sm:text-sm`}
                        value={stockEntryDate}
                        onChange={(e) => setStockEntryDate(e.target.value)}
                        data-testid="input-stock-entry-date"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stockNote" className={bentoLabelClass}>
                    Nota <span className="normal-case font-medium text-slate-300">(opcional)</span>
                  </Label>
                  <Textarea
                    id="stockNote"
                    placeholder="Notas sobre esta entrada de stock..."
                    className="min-h-32 resize-none rounded-2xl border-2 border-transparent bg-slate-50 p-5 text-slate-700 transition-all focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-100"
                    value={stockNote}
                    onChange={(e) => setStockNote(e.target.value)}
                    data-testid="input-stock-note"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createStockEntry.isPending || !stockProductId || !stockQuantity}
                  className={bentoPrimaryButtonClass}
                  data-testid="button-create-stock"
                >
                  <span className="tracking-wide">Actualizar Inventario</span>
                  <ArrowRight className="h-5 w-5 opacity-70" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className={bentoCardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-bold text-slate-800">Balance de Stock por Producto</CardTitle>
            </CardHeader>
            <CardContent>
              {products.length > 0 ? (
                <div className="space-y-3">
                  {products.map((product: any) => {
                    const balance = stockBalance.get(product.id) || 0;
                    return (
                      <Link key={product.id} href={`/delivery/producto/${product.id}`}>
                        <div
                          className="group relative flex cursor-pointer items-start justify-between gap-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_14px_28px_-18px_rgba(37,99,235,0.45)] transition-all hover:-translate-y-0.5 hover:border-[#9ec2ef] hover:shadow-[0_16px_34px_-16px_rgba(37,99,235,0.35)]"
                          data-testid={`stock-balance-${product.id}`}
                        >
                          <span className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 to-cyan-500" />
                          <div className="max-w-[68%] space-y-1">
                            <span className="block break-words text-[1.05rem] font-semibold leading-snug text-slate-800">
                              {product.name}
                            </span>
                            <p className="text-xs font-medium text-[#6c87ab] transition-colors group-hover:text-[#1d4f97]">
                              Toca para ver historial de vendedores y cantidades
                            </p>
                          </div>
                          <div className="min-w-[98px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                            <p className={`font-mono text-2xl font-bold leading-none ${balance < 0 ? "text-destructive" : "text-slate-800"}`}>
                              {balance}
                            </p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Unidades
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hay productos registrados</p>
              )}
            </CardContent>
          </Card>

          <Card className={bentoCardClass}>
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
                                      <CalendarIcon className="h-3 w-3" />
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
          <Card className={bentoCardClass}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="text-xl font-bold text-slate-800">Asignar Stock a Delivery</CardTitle>
              <span className="rounded-lg bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Nueva asignacion
              </span>
            </CardHeader>
            <CardContent className="pt-1">
              <form onSubmit={handleCreateAssignment} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="assignDelivery" className={bentoLabelClass}>Delivery</Label>
                  <Select value={assignDeliveryId} onValueChange={setAssignDeliveryId}>
                    <SelectTrigger className={bentoInputClass} data-testid="select-assign-delivery">
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
                  <Label htmlFor="assignProduct" className={bentoLabelClass}>Producto</Label>
                  <Select value={assignProductId} onValueChange={setAssignProductId}>
                    <SelectTrigger className={bentoInputClass} data-testid="select-assign-product">
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
                  <Label htmlFor="assignQuantity" className={bentoLabelClass}>Cantidad</Label>
                  <Input
                    id="assignQuantity"
                    type="number"
                    placeholder="0"
                    className={`${bentoInputClass} text-lg font-bold text-slate-800`}
                    value={assignQuantity}
                    onChange={(e) => setAssignQuantity(e.target.value)}
                    data-testid="input-assign-quantity"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignNote" className={bentoLabelClass}>
                    Nota <span className="normal-case font-medium text-slate-300">(opcional)</span>
                  </Label>
                  <Textarea
                    id="assignNote"
                    placeholder="Notas sobre esta asignacion..."
                    className="min-h-32 resize-none rounded-2xl border-2 border-transparent bg-slate-50 p-5 text-slate-700 transition-all focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-100"
                    value={assignNote}
                    onChange={(e) => setAssignNote(e.target.value)}
                    data-testid="input-assign-note"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createAssignment.isPending || !assignDeliveryId || !assignProductId || !assignQuantity}
                  className={bentoPrimaryButtonClass}
                  data-testid="button-create-assignment"
                >
                  <span className="tracking-wide">Asignar Stock</span>
                  <ArrowRight className="h-5 w-5 opacity-70" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Report */}
        <TabsContent value="report" className="space-y-4">
          <Card className={bentoCardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-bold text-slate-800">Reporte de Asignaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reportStartDate" className={bentoLabelClass}>Fecha Inicial</Label>
                  <Input
                    id="reportStartDate"
                    type="date"
                    className={bentoInputClass}
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    data-testid="input-report-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportEndDate" className={bentoLabelClass}>Fecha Final</Label>
                  <Input
                    id="reportEndDate"
                    type="date"
                    className={bentoInputClass}
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
                    <Card key={deliveryData.delivery.id} className={bentoCardClass}>
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

                  <Card className={bentoCardClass}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium text-slate-700">Total General del Periodo:</span>
                        <span className="text-3xl font-bold text-primary" data-testid="text-grand-total">
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



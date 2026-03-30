import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, TruckIcon, Pencil, Trash2, Check, X, Calendar as CalendarIcon, ArrowRight, Boxes, Clock3, Search, PackageSearch } from "lucide-react";
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
  useSales,
  useDeliveryAssignmentAudit,
  useUpdateDeliveryAssignment,
  useDeleteDeliveryAssignment,
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
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockProductsPage, setStockProductsPage] = useState(1);
  const [stockHistoryProductId, setStockHistoryProductId] = useState("all");
  const [stockEntriesPage, setStockEntriesPage] = useState(1);

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
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editAssignDeliveryId, setEditAssignDeliveryId] = useState("");
  const [editAssignProductId, setEditAssignProductId] = useState("");
  const [editAssignQuantity, setEditAssignQuantity] = useState("");
  const [editAssignNote, setEditAssignNote] = useState("");
  const [assignmentToDelete, setAssignmentToDelete] = useState<any | null>(null);
  
  // Report state
  const today = new Date().toISOString().split('T')[0];
  const [reportStartDate, setReportStartDate] = useState(today);
  const [reportEndDate, setReportEndDate] = useState(today);

  // Queries
  const { data: deliveries = [], isLoading: deliveriesLoading } = useDeliveries() as { data: any[], isLoading: boolean };
  const { data: products = [], isLoading: productsLoading } = useProducts() as { data: any[], isLoading: boolean };
  const { data: stockEntries = [] } = useDeliveryStockEntries() as { data: any[] };
  const { data: deliveryAssignments = [] } = useDeliveryAssignments() as { data: any[] };
  const { data: sales = [] } = useSales() as { data: any[] };
  const { data: report, isLoading: reportLoading } = useDeliveryAssignmentsReport(reportStartDate, reportEndDate);
  const { data: assignmentAudit = [] } = useDeliveryAssignmentAudit(reportStartDate, reportEndDate) as { data: any[] };
  const activeProducts = products.filter((product: any) => product.isActive !== false);

  // Mutations
  const createDelivery = useCreateDelivery();
  const createStockEntry = useCreateDeliveryStockEntry();
  const updateStockEntry = useUpdateDeliveryStockEntry();
  const deleteStockEntry = useDeleteDeliveryStockEntry();
  const createAssignment = useCreateDeliveryAssignment();
  const updateAssignment = useUpdateDeliveryAssignment();
  const deleteAssignment = useDeleteDeliveryAssignment();
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

  const handleStartEditAssignment = (assignment: any) => {
    setEditingAssignmentId(assignment.id);
    setEditAssignDeliveryId(assignment.deliveryId);
    setEditAssignProductId(assignment.productId);
    setEditAssignQuantity(String(assignment.quantity));
    setEditAssignNote(assignment.note || "");
  };

  const handleCancelEditAssignment = () => {
    setEditingAssignmentId(null);
    setEditAssignDeliveryId("");
    setEditAssignProductId("");
    setEditAssignQuantity("");
    setEditAssignNote("");
  };

  const handleSaveEditAssignment = async () => {
    if (!editingAssignmentId || !editAssignDeliveryId || !editAssignProductId || !editAssignQuantity) return;

    const product = products.find((item: any) => item.id === editAssignProductId);
    if (!product) {
      toast({
        title: "Error",
        description: "Producto no encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateAssignment.mutateAsync({
        id: editingAssignmentId,
        data: {
          deliveryId: editAssignDeliveryId,
          productId: editAssignProductId,
          quantity: parseInt(editAssignQuantity, 10),
          unitPriceSnapshot: String(product.price),
          note: editAssignNote.trim() || null,
        },
      });
      toast({
        title: "Asignacion actualizada",
        description: "El valor anterior quedo guardado en el historial",
      });
      handleCancelEditAssignment();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la asignacion",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await deleteAssignment.mutateAsync(assignmentId);
      toast({
        title: "Asignacion eliminada",
        description: "La asignacion se quito del saldo actual y quedo respaldada",
      });
      if (editingAssignmentId === assignmentId) {
        handleCancelEditAssignment();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la asignacion",
        variant: "destructive",
      });
    }
  };

  const openDeleteAssignmentDialog = (assignment: any) => {
    setAssignmentToDelete(assignment);
  };

  const handleConfirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    await handleDeleteAssignment(assignmentToDelete.id);
    setAssignmentToDelete(null);
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

  const getEntryReferenceDate = (entry: any) => entry.entryDate || entry.createdAt || null;

  const stockBalance = useMemo(() => {
    const balance = new Map<string, number>();
    stockEntries.forEach((entry: any) => {
      const current = balance.get(entry.productId) || 0;
      balance.set(entry.productId, current + entry.quantity);
    });
    deliveryAssignments.forEach((assignment: any) => {
      const current = balance.get(assignment.productId) || 0;
      balance.set(assignment.productId, current - assignment.quantity);
    });
    return balance;
  }, [stockEntries, deliveryAssignments]);

  const deliveryAvailableBalance = useMemo(() => {
    const balance = new Map<string, number>();
    deliveryAssignments.forEach((assignment: any) => {
      const current = balance.get(assignment.deliveryId) || 0;
      balance.set(assignment.deliveryId, current + assignment.quantity);
    });
    sales.forEach((sale: any) => {
      if (!sale.deliveryId) return;
      const soldQty = Number.parseInt(String(sale.quantity ?? 0), 10);
      if (!Number.isFinite(soldQty) || soldQty <= 0) return;
      const current = balance.get(sale.deliveryId) || 0;
      balance.set(sale.deliveryId, current - soldQty);
    });
    return balance;
  }, [deliveryAssignments, sales]);

  const bentoCardClass =
    "rounded-[2rem] border border-slate-100 bg-white shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]";
  const bentoInputClass =
    "h-14 rounded-2xl border-2 border-transparent bg-slate-50 px-5 text-slate-700 transition-all focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-100";
  const bentoLabelClass = "ml-1 text-xs font-bold uppercase tracking-wide text-slate-400";
  const bentoPrimaryButtonClass =
    "h-16 w-full rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-200 transition-all hover:bg-indigo-600 active:scale-[0.99]";
  const tabButtonClass =
    "h-9 rounded-xl border border-slate-100 bg-white px-2 py-1.5 text-[11px] font-bold tracking-tight text-slate-500 shadow-sm data-[state=active]:border-transparent data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-200 sm:text-xs";
  const formatShortDateTime = (value: string | Date | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("es-BO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };
  const formatShortDate = (value: string | Date | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("es-BO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const stockProductSummaries = useMemo(() => {
    return products
      .map((product: any) => {
        const relatedEntries = stockEntries
          .filter((entry: any) => entry.productId === product.id)
          .sort(
            (a: any, b: any) =>
              new Date(getEntryReferenceDate(b) || 0).getTime() - new Date(getEntryReferenceDate(a) || 0).getTime()
          );
        const assignedUnits = deliveryAssignments.reduce((sum: number, assignment: any) => {
          if (assignment.productId !== product.id) return sum;
          return sum + Number.parseInt(String(assignment.quantity ?? 0), 10);
        }, 0);

        return {
          product,
          balance: stockBalance.get(product.id) || 0,
          entriesCount: relatedEntries.length,
          assignedUnits,
          lastEntryDate: relatedEntries[0] ? getEntryReferenceDate(relatedEntries[0]) : null,
        };
      })
      .sort((a, b) => {
        if ((b.balance || 0) !== (a.balance || 0)) return (b.balance || 0) - (a.balance || 0);
        return String(a.product?.name || "").localeCompare(String(b.product?.name || ""));
      });
  }, [products, stockEntries, deliveryAssignments, stockBalance]);

  const normalizedStockSearch = stockSearchQuery.trim().toLowerCase();
  const filteredStockProductSummaries = useMemo(() => {
    if (!normalizedStockSearch) return stockProductSummaries;
    return stockProductSummaries.filter((item) =>
      String(item.product?.name || "").toLowerCase().includes(normalizedStockSearch)
    );
  }, [normalizedStockSearch, stockProductSummaries]);

  const stockProductsPerPage = 6;
  const stockProductsTotalPages = Math.max(1, Math.ceil(filteredStockProductSummaries.length / stockProductsPerPage));
  const safeStockProductsPage = Math.min(stockProductsPage, stockProductsTotalPages);
  const paginatedStockProducts = filteredStockProductSummaries.slice(
    (safeStockProductsPage - 1) * stockProductsPerPage,
    safeStockProductsPage * stockProductsPerPage
  );

  const filteredStockEntries = useMemo(() => {
    const entries =
      stockHistoryProductId === "all"
        ? stockEntries
        : stockEntries.filter((entry: any) => entry.productId === stockHistoryProductId);
    return [...entries].sort(
      (a: any, b: any) =>
        new Date(getEntryReferenceDate(b) || 0).getTime() - new Date(getEntryReferenceDate(a) || 0).getTime()
    );
  }, [stockEntries, stockHistoryProductId]);

  const stockEntriesPerPage = 8;
  const stockEntriesTotalPages = Math.max(1, Math.ceil(filteredStockEntries.length / stockEntriesPerPage));
  const safeStockEntriesPage = Math.min(stockEntriesPage, stockEntriesTotalPages);
  const paginatedStockEntries = filteredStockEntries.slice(
    (safeStockEntriesPage - 1) * stockEntriesPerPage,
    safeStockEntriesPage * stockEntriesPerPage
  );

  const stockProductsWithBalance = stockProductSummaries.filter((item) => item.balance > 0).length;
  const totalUnitsAvailable = stockProductSummaries.reduce((sum, item) => sum + Math.max(item.balance, 0), 0);
  const totalUnitsAssigned = stockProductSummaries.reduce((sum, item) => sum + Math.max(item.assignedUnits, 0), 0);

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
                      {activeProducts.map((product: any) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - {parseFloat(product.price).toFixed(2)} Bs
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeProducts.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay productos activos para agregar stock.
                  </p>
                )}

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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className={bentoCardClass}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Productos con saldo</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{stockProductsWithBalance}</p>
                  </div>
                  <span className="rounded-2xl bg-cyan-50 p-3 text-cyan-600">
                    <Boxes className="h-5 w-5" />
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className={bentoCardClass}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Unidades disponibles</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{totalUnitsAvailable}</p>
                  </div>
                  <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                    <PackageSearch className="h-5 w-5" />
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className={bentoCardClass}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Unidades asignadas</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{totalUnitsAssigned}</p>
                  </div>
                  <span className="rounded-2xl bg-violet-50 p-3 text-violet-600">
                    <TruckIcon className="h-5 w-5" />
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className={bentoCardClass}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Movimientos cargados</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{stockEntries.length}</p>
                  </div>
                  <span className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                    <Clock3 className="h-5 w-5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className={bentoCardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-bold text-slate-800">Explorador de Productos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <Label htmlFor="stock-search" className={bentoLabelClass}>Buscar producto</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="stock-search"
                    value={stockSearchQuery}
                    onChange={(e) => {
                      setStockSearchQuery(e.target.value);
                      setStockProductsPage(1);
                    }}
                    placeholder="Ej: Citrato, Berberina, Magnesio"
                    className={`${bentoInputClass} pl-11`}
                    data-testid="input-stock-search"
                  />
                </div>
              </div>

              {filteredStockProductSummaries.length > 0 ? (
                <div className="space-y-3">
                  {paginatedStockProducts.map((item) => (
                    <div
                      key={item.product.id}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_16px_34px_-20px_rgba(37,99,235,0.18)]"
                      data-testid={`stock-balance-${item.product.id}`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-slate-900">{item.product.name}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {item.entriesCount} ingresos registrados • ultimo movimiento {formatShortDate(item.lastEntryDate)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Saldo</p>
                            <p className={`mt-1 text-lg font-bold ${item.balance < 0 ? "text-rose-600" : "text-slate-900"}`}>
                              {item.balance}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Asignado</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">{item.assignedUnits}</p>
                          </div>
                          <Link href={`/delivery/producto/${item.product.id}`}>
                            <Button type="button" variant="outline" size="sm">
                              Ver historial
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-muted-foreground">
                  No hay productos que coincidan con la busqueda.
                </p>
              )}

              {stockProductsTotalPages > 1 && (
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <p className="text-sm text-slate-500">
                    Pagina {safeStockProductsPage} de {stockProductsTotalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStockProductsPage((prev) => Math.max(prev - 1, 1))}
                      disabled={safeStockProductsPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStockProductsPage((prev) => Math.min(prev + 1, stockProductsTotalPages))}
                      disabled={safeStockProductsPage === stockProductsTotalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={bentoCardClass}>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>Movimientos de Stock</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Historial filtrable y paginado para no saturar la vista.</p>
                </div>
                <div className="w-full lg:w-[320px]">
                  <Label className={bentoLabelClass}>Filtrar por producto</Label>
                  <Select
                    value={stockHistoryProductId}
                    onValueChange={(value) => {
                      setStockHistoryProductId(value);
                      setStockEntriesPage(1);
                    }}
                  >
                    <SelectTrigger className={`${bentoInputClass} mt-2`} data-testid="select-stock-history-product">
                      <SelectValue placeholder="Todos los productos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los productos</SelectItem>
                      {products.map((product: any) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredStockEntries.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-muted-foreground">
                  No hay entradas de stock para ese filtro.
                </p>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white">
                  <div className="hidden border-b bg-slate-50/80 px-4 py-3 md:grid md:grid-cols-[minmax(220px,1.2fr)_110px_170px_110px] md:items-center md:gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Producto</p>
                    <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Cantidad</p>
                    <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Fecha</p>
                    <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Acciones</p>
                  </div>
                  <div className="divide-y">
                    {paginatedStockEntries.map((entry: any) => {
                      const product = products.find((p: any) => p.id === entry.productId);
                      return (
                        <div key={entry.id} className="px-4 py-4" data-testid={`row-stock-${entry.id}`}>
                          {editingStockId === entry.id ? (
                            <div className="grid gap-3 md:grid-cols-[minmax(220px,1.2fr)_110px_170px_110px] md:items-center">
                              <Select value={editStockProductId} onValueChange={setEditStockProductId}>
                                <SelectTrigger className="h-11">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                value={editStockQuantity}
                                onChange={(e) => setEditStockQuantity(e.target.value)}
                                className="h-11 text-center"
                                data-testid="edit-input-stock-quantity"
                              />
                              <Input
                                type="date"
                                value={editStockEntryDate}
                                onChange={(e) => setEditStockEntryDate(e.target.value)}
                                className="h-11"
                                data-testid="edit-input-stock-date"
                              />
                              <div className="flex justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSaveEditStock} data-testid="button-save-stock">
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleCancelEditStock} data-testid="button-cancel-stock">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid gap-3 md:grid-cols-[minmax(220px,1.2fr)_110px_170px_110px] md:items-center">
                              <div>
                                <p className="font-semibold text-slate-900">{product?.name || "Producto eliminado"}</p>
                                <p className="mt-1 text-xs text-slate-500">{entry.note ? entry.note : "Sin nota registrada"}</p>
                              </div>
                              <p className="text-center font-mono text-lg font-bold text-slate-900">{entry.quantity}</p>
                              <p className="text-center text-sm text-slate-600">{formatShortDate(getEntryReferenceDate(entry))}</p>
                              <div className="flex justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEditStock(entry)} data-testid={`button-edit-stock-${entry.id}`}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteStock(entry.id)} data-testid={`button-delete-stock-${entry.id}`}>
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {stockEntriesTotalPages > 1 && (
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <p className="text-sm text-slate-500">
                    Pagina {safeStockEntriesPage} de {stockEntriesTotalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStockEntriesPage((prev) => Math.max(prev - 1, 1))}
                      disabled={safeStockEntriesPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStockEntriesPage((prev) => Math.min(prev + 1, stockEntriesTotalPages))}
                      disabled={safeStockEntriesPage === stockEntriesTotalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
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
              ) : (
                <>
                  {report && report.byDelivery && report.byDelivery.length > 0 ? (
                    <>
                      {report.byDelivery.map((deliveryData: any) => (
                        <Card key={deliveryData.delivery.id} className={bentoCardClass}>
                          <CardHeader>
                            <CardTitle className="text-lg">{deliveryData.delivery.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="hidden overflow-x-auto rounded-lg border md:block">
                              <table className="w-full">
                                <thead className="border-b bg-muted/50">
                                  <tr>
                                    <th className="p-2 text-left text-sm font-medium">Producto</th>
                                    <th className="p-2 text-center text-sm font-medium">Cant.</th>
                                    <th className="p-2 text-right text-sm font-medium">Precio</th>
                                    <th className="p-2 text-right text-sm font-medium">Total</th>
                                    <th className="p-2 text-center text-sm font-medium">Pagado</th>
                                    <th className="p-2 text-center text-sm font-medium">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {deliveryData.assignments.map((assignment: any) => {
                                    const editing = editingAssignmentId === assignment.id;
                                    const activePrice = parseFloat(
                                      String(
                                        products.find((product: any) => product.id === editAssignProductId)?.price ||
                                          assignment.unitPriceSnapshot
                                      )
                                    );
                                    return (
                                      <tr key={assignment.id} className="border-b align-top">
                                        <td className="p-2 text-sm">
                                          {editing ? (
                                            <div className="space-y-2">
                                              <Select value={editAssignProductId} onValueChange={setEditAssignProductId}>
                                                <SelectTrigger className="h-9 min-w-[220px]">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {products.map((product: any) => (
                                                    <SelectItem key={product.id} value={product.id}>
                                                      {product.name}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              <Input
                                                value={editAssignNote}
                                                onChange={(e) => setEditAssignNote(e.target.value)}
                                                placeholder="Nota opcional"
                                                className="h-9"
                                              />
                                            </div>
                                          ) : (
                                            <div className="space-y-1">
                                              <p>{assignment.product?.name}</p>
                                              {assignment.note ? (
                                                <p className="text-xs text-slate-500">{assignment.note}</p>
                                              ) : null}
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-2 text-center text-sm font-mono">
                                          {editing ? (
                                            <Input
                                              type="number"
                                              value={editAssignQuantity}
                                              onChange={(e) => setEditAssignQuantity(e.target.value)}
                                              className="mx-auto h-9 w-20 text-center"
                                            />
                                          ) : (
                                            assignment.quantity
                                          )}
                                        </td>
                                        <td className="p-2 text-right text-sm font-mono">
                                          {(editing ? activePrice : parseFloat(assignment.unitPriceSnapshot)).toFixed(2)} Bs
                                        </td>
                                        <td className="p-2 text-right text-sm font-mono">
                                          {(
                                            (editing ? activePrice : parseFloat(assignment.unitPriceSnapshot)) *
                                            (editing ? parseInt(editAssignQuantity || "0", 10) || 0 : assignment.quantity)
                                          ).toFixed(2)} Bs
                                        </td>
                                        <td className="p-2 text-center">
                                          <Checkbox
                                            checked={assignment.isPaid === 1}
                                            onCheckedChange={() => handleTogglePaid(assignment.id, assignment.isPaid)}
                                            data-testid={`checkbox-paid-${assignment.id}`}
                                          />
                                        </td>
                                        <td className="p-2">
                                          {editing ? (
                                            <div className="space-y-2">
                                              <Select value={editAssignDeliveryId} onValueChange={setEditAssignDeliveryId}>
                                                <SelectTrigger className="h-9 min-w-[180px]">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {deliveries.map((delivery: any) => (
                                                    <SelectItem key={delivery.id} value={delivery.id}>
                                                      {delivery.name}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              <div className="flex items-center justify-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveEditAssignment}>
                                                  <Check className="h-4 w-4 text-green-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelEditAssignment}>
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-center gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleStartEditAssignment(assignment)}
                                                data-testid={`button-edit-assignment-${assignment.id}`}
                                              >
                                                <Pencil className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => openDeleteAssignmentDialog(assignment)}
                                                data-testid={`button-delete-assignment-${assignment.id}`}
                                              >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                              </Button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <div className="space-y-3 md:hidden">
                              {deliveryData.assignments.map((assignment: any) => {
                                const editing = editingAssignmentId === assignment.id;
                                const activePrice = parseFloat(
                                  String(
                                    products.find((product: any) => product.id === editAssignProductId)?.price ||
                                      assignment.unitPriceSnapshot
                                  )
                                );
                                const rowPrice = editing ? activePrice : parseFloat(assignment.unitPriceSnapshot);
                                const rowQuantity = editing ? parseInt(editAssignQuantity || "0", 10) || 0 : assignment.quantity;
                                return (
                                  <div key={assignment.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                                    {editing ? (
                                      <div className="space-y-3">
                                        <Select value={editAssignProductId} onValueChange={setEditAssignProductId}>
                                          <SelectTrigger className="h-11">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {products.map((product: any) => (
                                              <SelectItem key={product.id} value={product.id}>
                                                {product.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Select value={editAssignDeliveryId} onValueChange={setEditAssignDeliveryId}>
                                          <SelectTrigger className="h-11">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {deliveries.map((delivery: any) => (
                                              <SelectItem key={delivery.id} value={delivery.id}>
                                                {delivery.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          type="number"
                                          value={editAssignQuantity}
                                          onChange={(e) => setEditAssignQuantity(e.target.value)}
                                          className="h-11"
                                        />
                                        <Input
                                          value={editAssignNote}
                                          onChange={(e) => setEditAssignNote(e.target.value)}
                                          placeholder="Nota opcional"
                                          className="h-11"
                                        />
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="font-semibold text-slate-900">{assignment.product?.name}</p>
                                            <p className="text-sm text-slate-500">{assignment.delivery?.name}</p>
                                            {assignment.note ? (
                                              <p className="mt-1 text-xs text-slate-500">{assignment.note}</p>
                                            ) : null}
                                          </div>
                                          <Checkbox
                                            checked={assignment.isPaid === 1}
                                            onCheckedChange={() => handleTogglePaid(assignment.id, assignment.isPaid)}
                                            data-testid={`checkbox-paid-mobile-${assignment.id}`}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                      <div className="rounded-xl bg-white px-3 py-2">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Cant.</p>
                                        <p className="font-semibold text-slate-800">{rowQuantity}</p>
                                      </div>
                                      <div className="rounded-xl bg-white px-3 py-2">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Precio</p>
                                        <p className="font-semibold text-slate-800">{rowPrice.toFixed(2)} Bs</p>
                                      </div>
                                      <div className="rounded-xl bg-white px-3 py-2">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Total</p>
                                        <p className="font-semibold text-slate-800">{(rowPrice * rowQuantity).toFixed(2)} Bs</p>
                                      </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-end gap-2">
                                      {editing ? (
                                        <>
                                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSaveEditAssignment}>
                                            <Check className="h-4 w-4 text-green-600" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleCancelEditAssignment}>
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9"
                                            onClick={() => handleStartEditAssignment(assignment)}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9"
                                            onClick={() => openDeleteAssignmentDialog(assignment)}
                                          >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
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
                    <p className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-muted-foreground">
                      No hay asignaciones activas en este periodo
                    </p>
                  )}

                  <Card className={bentoCardClass}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl font-bold text-slate-800">Historial de cambios</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {assignmentAudit.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                          No hubo asignaciones editadas o eliminadas en este rango
                        </p>
                      ) : (
                        assignmentAudit.map((log: any) => {
                          const isEdited = log.action === "edited";
                          return (
                            <div
                              key={log.id}
                              className={`rounded-2xl border px-4 py-4 ${
                                isEdited ? "border-amber-200 bg-amber-50/40" : "border-rose-200 bg-rose-50/40"
                              }`}
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                                        isEdited ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                                      }`}
                                    >
                                      {isEdited ? "Editado" : "Eliminado"}
                                    </span>
                                    <span className="text-xs text-slate-500">{formatShortDateTime(log.createdAt)}</span>
                                  </div>
                                  <div className="space-y-1 text-sm text-slate-700">
                                    <p className="font-semibold text-slate-900">
                                      {log.product?.name || "Producto"} • {log.quantity} und • {log.delivery?.name || "Delivery"}
                                    </p>
                                    <p>Precio guardado: {parseFloat(log.unitPriceSnapshot).toFixed(2)} Bs</p>
                                    {log.note ? <p>Nota anterior: {log.note}</p> : null}
                                    <p>Asignado originalmente: {formatShortDateTime(log.assignedAt)}</p>
                                  </div>
                                </div>
                                <div className="lg:max-w-[340px]">
                                  {isEdited && log.nextState ? (
                                    <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-3 text-sm text-slate-700">
                                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                        Nuevo valor activo
                                      </p>
                                      <p className="font-medium">
                                        {log.nextProduct?.name || "Producto"} • {log.nextState.quantity} und •{" "}
                                        {log.nextDelivery?.name || "Delivery"}
                                      </p>
                                      <p>Precio: {parseFloat(log.nextState.unitPriceSnapshot).toFixed(2)} Bs</p>
                                      {log.nextState.note ? <p>Nota: {log.nextState.note}</p> : null}
                                    </div>
                                  ) : (
                                    <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-3 text-sm text-slate-700">
                                      Este registro ya no afecta el saldo ni el inventario actual.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!assignmentToDelete} onOpenChange={(open) => !open && setAssignmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar asignacion</AlertDialogTitle>
            <AlertDialogDescription>
              {assignmentToDelete ? (
                <>
                  Vas a eliminar la asignacion de{" "}
                  <span className="font-semibold text-slate-900">
                    {assignmentToDelete.product?.name || "Producto"}
                  </span>{" "}
                  para{" "}
                  <span className="font-semibold text-slate-900">
                    {assignmentToDelete.delivery?.name || "Delivery"}
                  </span>
                  . El saldo actual se actualizara y el registro quedara guardado en el historial de cambios.
                </>
              ) : (
                "Confirma si deseas eliminar esta asignacion."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAssignment}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Eliminar asignacion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}



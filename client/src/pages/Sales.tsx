import { useState } from "react";
import SalesForm from "@/components/SalesForm";
import {
  useCreateSale,
  useDeleteSale,
  useDeliveryAssignments,
  useDeliveries,
  useDirectors,
  useProducts,
  useSales,
  useSellers,
  useUpdateSale,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DropshipperDeliveriesModal from "@/components/DropshipperDeliveriesModal";
import WhatsAppReport from "@/components/WhatsAppReport";

function getTodayIsoLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toIsoDate(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return text.includes("T") ? text.split("T")[0] : text.slice(0, 10);
}

function toSelectValue(value: unknown): string {
  if (value === null || value === undefined) return "none";
  const text = String(value).trim();
  return text.length > 0 ? text : "none";
}

function toOptionalId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "none") return null;
  return text;
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const monthIndex = Number.parseInt(month || "1", 10) - 1;
  const safeMonth = monthNames[monthIndex] || month;
  return `${Number.parseInt(day || "1", 10)} ${safeMonth} ${year}`;
}

type SaleEditDraft = {
  productId: string;
  sellerId: string;
  directorId: string;
  deliveryId: string;
  quantity: string;
  unitPrice: string;
  saleDate: string;
};

export default function Sales() {
  const { user } = useAuth();
  const todayIso = getTodayIsoLocal();
  const { data: products = [], isLoading } = useProducts();
  const { data: directors = [], isLoading: loadingDirectors } = useDirectors();
  const { data: sellers = [], isLoading: loadingSellers } = useSellers();
  const { data: deliveries = [], isLoading: loadingDeliveries } = useDeliveries();
  const { data: deliveryAssignments = [], isLoading: loadingAssignments } = useDeliveryAssignments();
  const { data: sales = [], isLoading: loadingSales } = useSales();
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();
  const { toast } = useToast();
  const [reportMode, setReportMode] = useState<"day" | "range">("day");
  const [reportDate, setReportDate] = useState(todayIso);
  const [reportStartDate, setReportStartDate] = useState(todayIso);
  const [reportEndDate, setReportEndDate] = useState(todayIso);
  const [textReportMode, setTextReportMode] = useState<"day" | "range">("day");
  const [textReportDate, setTextReportDate] = useState(todayIso);
  const [textReportStartDate, setTextReportStartDate] = useState(todayIso);
  const [textReportEndDate, setTextReportEndDate] = useState(todayIso);
  const [textFilterDirector, setTextFilterDirector] = useState("all");
  const [textFilterSeller, setTextFilterSeller] = useState("all");
  const [textFilterDelivery, setTextFilterDelivery] = useState("all");
  const [textIncludeSaleDate, setTextIncludeSaleDate] = useState(true);
  const [textIncludeProduct, setTextIncludeProduct] = useState(true);
  const [textIncludeQuantity, setTextIncludeQuantity] = useState(true);
  const [textIncludeUnitPrice, setTextIncludeUnitPrice] = useState(true);
  const [textIncludeLineTotal, setTextIncludeLineTotal] = useState(true);
  const [textIncludeSeller, setTextIncludeSeller] = useState(true);
  const [textIncludeDirector, setTextIncludeDirector] = useState(true);
  const [textIncludeDelivery, setTextIncludeDelivery] = useState(true);
  const [textIncludeSummary, setTextIncludeSummary] = useState(true);
  const [isDropshipperModalOpen, setIsDropshipperModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SaleEditDraft | null>(null);
  const isAccountant = user?.role?.trim().toLowerCase() === "contador";

  const handleSubmit = async (data: {
    productId: string;
    quantity: number;
    date: string;
    unitPrice: number;
    unitTransport: number;
    sellerId?: string | null;
    directorId?: string | null;
    deliveryId?: string | null;
  }) => {
    const deliveryId = toOptionalId(data.deliveryId);
    if (deliveryId) {
      const available = getDeliveryAvailability({
        deliveryId,
        productId: data.productId,
      });
      if (data.quantity > available) {
        toast({
          title: "Ese delivery no tiene stock",
          description: `Ese delivery no tiene stock para esta venta. Disponible: ${available} und`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await createSale.mutateAsync(data);
      toast({ 
        title: "Venta registrada", 
        description: "La venta ha sido registrada exitosamente" 
      });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Error al registrar venta", 
        variant: "destructive" 
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  if (loadingDirectors || loadingSellers || loadingDeliveries || loadingAssignments) {
    return <div className="flex items-center justify-center h-64">Cargando equipo comercial...</div>;
  }

  if (loadingSales) {
    return <div className="flex items-center justify-center h-64">Cargando reporte de ventas...</div>;
  }

  const allProducts = products as any[];
  const allDirectors = directors as any[];
  const allSellers = sellers as any[];
  const allDeliveries = deliveries as any[];
  const allAssignments = deliveryAssignments as any[];
  const allSales = sales as any[];

  const activeProducts = (products as any[]).filter((p: any) => p.isActive !== false);
  const activeDirectors = (directors as any[]).filter((d: any) => d.isActive !== false);
  const activeSellers = (sellers as any[]).filter((s: any) => s.isActive !== false);

  const formattedProducts = activeProducts.map((p: any) => ({
    id: p.id,
    name: p.name,
    price: parseFloat(p.price),
    cost: parseFloat(p.cost),
    baseCost: p.baseCost !== null && p.baseCost !== undefined ? parseFloat(p.baseCost) : null,
    costTransport: p.costTransport !== null && p.costTransport !== undefined ? parseFloat(p.costTransport) : 0,
  }));

  const formattedDirectors = activeDirectors.map((d: any) => ({
    id: d.id,
    name: d.name,
  }));

  const formattedSellers = activeSellers.map((s: any) => ({
    id: s.id,
    name: s.name,
    directorId: s.directorId || null,
  }));

  const formattedDeliveries = allDeliveries.map((delivery: any) => ({
    id: delivery.id,
    name: delivery.name,
  }));

  const normalizedStartDate =
    reportStartDate <= reportEndDate ? reportStartDate : reportEndDate;
  const normalizedEndDate =
    reportStartDate <= reportEndDate ? reportEndDate : reportStartDate;
  const normalizedTextStartDate =
    textReportStartDate <= textReportEndDate ? textReportStartDate : textReportEndDate;
  const normalizedTextEndDate =
    textReportStartDate <= textReportEndDate ? textReportEndDate : textReportStartDate;

  const productMap = new Map(
    allProducts.map((product: any) => [product.id, product])
  );
  const directorMap = new Map(
    allDirectors.map((director: any) => [director.id, director.name])
  );
  const sellerMap = new Map(
    allSellers.map((seller: any) => [seller.id, seller.name])
  );
  const deliveryMap = new Map(
    allDeliveries.map((delivery: any) => [delivery.id, delivery.name])
  );

  const getDeliveryAvailability = (params: {
    deliveryId: string;
    productId: string;
    excludeSaleId?: string;
  }) => {
    const { deliveryId, productId, excludeSaleId } = params;
    const assignedTotal = allAssignments.reduce((sum: number, assignment: any) => {
      if (String(assignment.deliveryId || "") !== deliveryId) return sum;
      if (String(assignment.productId || "") !== productId) return sum;
      const quantity = Number.parseInt(String(assignment.quantity || 0), 10);
      return sum + (Number.isFinite(quantity) ? quantity : 0);
    }, 0);

    const sold = allSales.reduce((sum: number, sale: any) => {
      if (excludeSaleId && String(sale.id || "") === excludeSaleId) return sum;
      if (String(sale.deliveryId || "") !== deliveryId) return sum;
      if (String(sale.productId || "") !== productId) return sum;
      const quantity = Number.parseInt(String(sale.quantity || 0), 10);
      return sum + (Number.isFinite(quantity) ? quantity : 0);
    }, 0);

    return assignedTotal - sold;
  };

  const startEdit = (sale: any) => {
    const product = productMap.get(sale.productId);
    const unitPrice = Number.parseFloat(String(sale.unitPrice ?? product?.price ?? 0));
    const quantity = Number.parseInt(String(sale.quantity || 1), 10);

    setEditingSaleId(sale.id);
    setEditDraft({
      productId: String(sale.productId || ""),
      sellerId: toSelectValue(sale.sellerId),
      directorId: toSelectValue(sale.directorId),
      deliveryId: toSelectValue(sale.deliveryId),
      quantity: String(Number.isFinite(quantity) && quantity > 0 ? quantity : 1),
      unitPrice: Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice.toFixed(2) : "0.00",
      saleDate: toIsoDate(sale.saleDate) || todayIso,
    });
    setIsEditModalOpen(true);
  };

  const cancelEdit = () => {
    setIsEditModalOpen(false);
    setEditingSaleId(null);
    setEditDraft(null);
  };

  const handleEditProductChange = (nextProductId: string) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const nextProduct = allProducts.find((product: any) => product.id === nextProductId);
      const nextPrice = Number.parseFloat(String(nextProduct?.price ?? prev.unitPrice));
      return {
        ...prev,
        productId: nextProductId,
        unitPrice: Number.isFinite(nextPrice) && nextPrice > 0 ? nextPrice.toFixed(2) : prev.unitPrice,
      };
    });
  };

  const handleEditDirectorChange = (nextDirectorId: string) => {
    setEditDraft((prev) => {
      if (!prev) return prev;

      let nextSellerId = prev.sellerId;
      if (nextSellerId !== "none") {
        const seller = allSellers.find((candidate: any) => candidate.id === nextSellerId);
        const sellerDirectorId = toSelectValue(seller?.directorId);
        if (sellerDirectorId !== nextDirectorId) {
          nextSellerId = "none";
        }
      }

      return {
        ...prev,
        directorId: nextDirectorId,
        sellerId: nextSellerId,
      };
    });
  };

  const handleEditSellerChange = (nextSellerId: string) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      if (nextSellerId === "none") {
        return {
          ...prev,
          sellerId: "none",
        };
      }

      const seller = allSellers.find((candidate: any) => candidate.id === nextSellerId);
      const sellerDirectorId = toSelectValue(seller?.directorId);
      return {
        ...prev,
        sellerId: nextSellerId,
        directorId: sellerDirectorId,
      };
    });
  };

  const handleSaveEdit = async () => {
    if (!editDraft || !editingSaleId) return;

    const parsedQuantity = Number.parseInt(editDraft.quantity || "0", 10);
    const parsedUnitPrice = Number.parseFloat(editDraft.unitPrice || "0");

    if (!editDraft.productId) {
      toast({
        title: "Error",
        description: "Selecciona un producto",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast({
        title: "Error",
        description: "Cantidad invalida",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) {
      toast({
        title: "Error",
        description: "Precio unitario invalido",
        variant: "destructive",
      });
      return;
    }

    if (!editDraft.saleDate) {
      toast({
        title: "Error",
        description: "Fecha invalida",
        variant: "destructive",
      });
      return;
    }

    const editDeliveryId = toOptionalId(editDraft.deliveryId);
    if (editDeliveryId) {
      const available = getDeliveryAvailability({
        deliveryId: editDeliveryId,
        productId: editDraft.productId,
        excludeSaleId: editingSaleId,
      });
      if (parsedQuantity > available) {
        toast({
          title: "Ese delivery no tiene stock",
          description: `Ese delivery no tiene stock para esta venta. Disponible: ${available} und`,
          variant: "destructive",
        });
        return;
      }
    }

    const selectedProduct = allProducts.find((product: any) => product.id === editDraft.productId);
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Producto no encontrado",
        variant: "destructive",
      });
      return;
    }

    const parsedUnitTransport = Number.parseFloat(String(selectedProduct.costTransport ?? 0));
    const safeUnitTransport =
      Number.isFinite(parsedUnitTransport) && parsedUnitTransport >= 0
        ? parsedUnitTransport
        : 0;

    try {
      await updateSale.mutateAsync({
        id: editingSaleId,
        data: {
          productId: editDraft.productId,
          quantity: parsedQuantity,
          unitPrice: parsedUnitPrice.toFixed(2),
          unitTransport: safeUnitTransport.toFixed(2),
          saleDate: editDraft.saleDate,
          sellerId: editDraft.sellerId === "none" ? null : editDraft.sellerId,
          directorId: editDraft.directorId === "none" ? null : editDraft.directorId,
          deliveryId: editDraft.deliveryId === "none" ? null : editDraft.deliveryId,
        },
      });
      toast({
        title: "Venta actualizada",
        description: "Los datos de la venta se guardaron correctamente",
      });
      cancelEdit();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar la venta",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!window.confirm("Esta accion eliminara la venta. Deseas continuar?")) {
      return;
    }

    try {
      await deleteSale.mutateAsync(saleId);
      if (editingSaleId === saleId) {
        cancelEdit();
      }
      toast({
        title: "Venta eliminada",
        description: "La venta se elimino correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo eliminar la venta",
        variant: "destructive",
      });
    }
  };

  const filteredSales = (allSales as any[])
    .filter((sale: any) => {
      const saleDate = toIsoDate(sale.saleDate);
      if (!saleDate) return false;
      if (reportMode === "day") {
        return saleDate === reportDate;
      }
      return saleDate >= normalizedStartDate && saleDate <= normalizedEndDate;
    })
    .sort((a: any, b: any) => toIsoDate(b.saleDate).localeCompare(toIsoDate(a.saleDate)));

  const totalUnits = filteredSales.reduce((sum: number, sale: any) => {
    const qty = Number.parseInt(String(sale.quantity || 0), 10);
    return sum + (Number.isFinite(qty) ? qty : 0);
  }, 0);

  const totalSalesAmount = filteredSales.reduce((sum: number, sale: any) => {
    const qty = Number.parseInt(String(sale.quantity || 0), 10);
    const product = productMap.get(sale.productId);
    const unitPrice = Number.parseFloat(String(sale.unitPrice ?? product?.price ?? 0));
    const safeQty = Number.isFinite(qty) ? qty : 0;
    const safePrice = Number.isFinite(unitPrice) ? unitPrice : 0;
    return sum + safeQty * safePrice;
  }, 0);

  const reportPeriodLabel =
    reportMode === "day"
      ? reportDate
      : `${normalizedStartDate} - ${normalizedEndDate}`;

  const editingSale = editingSaleId ? allSales.find((sale: any) => sale.id === editingSaleId) : null;
  const editingSaleProductId = editingSale ? String(editingSale.productId || "") : "";
  const editingSaleSellerId = editingSale ? toSelectValue(editingSale.sellerId) : "none";
  const editingSaleDirectorId = editingSale ? toSelectValue(editingSale.directorId) : "none";
  const editingSaleDeliveryId = editingSale ? toSelectValue(editingSale.deliveryId) : "none";

  const productOptions = [...activeProducts];
  if (editingSaleProductId && !productOptions.some((candidate: any) => candidate.id === editingSaleProductId)) {
    const currentProduct = allProducts.find((candidate: any) => candidate.id === editingSaleProductId);
    if (currentProduct) {
      productOptions.push(currentProduct);
    }
  }

  const draftDirectorId = editDraft?.directorId ?? editingSaleDirectorId;
  const directorOptions = [...activeDirectors];
  if (draftDirectorId !== "none" && !directorOptions.some((candidate: any) => candidate.id === draftDirectorId)) {
    const currentDirector = allDirectors.find((candidate: any) => candidate.id === draftDirectorId);
    if (currentDirector) {
      directorOptions.push(currentDirector);
    }
  }

  const selectedDirectorForSellerFilter = draftDirectorId === "none" ? null : draftDirectorId;
  const sellerOptionsBase = activeSellers.filter((candidate: any) =>
    !selectedDirectorForSellerFilter || candidate.directorId === selectedDirectorForSellerFilter
  );
  const draftSellerId = editDraft?.sellerId ?? editingSaleSellerId;
  const sellerOptions = [...sellerOptionsBase];
  if (draftSellerId !== "none" && !sellerOptions.some((candidate: any) => candidate.id === draftSellerId)) {
    const currentSeller = allSellers.find((candidate: any) => candidate.id === draftSellerId);
    if (currentSeller) {
      sellerOptions.push(currentSeller);
    }
  }

  const draftDeliveryId = editDraft?.deliveryId ?? editingSaleDeliveryId;
  const deliveryOptions = [...allDeliveries];
  if (draftDeliveryId !== "none" && !deliveryOptions.some((candidate: any) => candidate.id === draftDeliveryId)) {
    const currentDelivery = allDeliveries.find((candidate: any) => candidate.id === draftDeliveryId);
    if (currentDelivery) {
      deliveryOptions.push(currentDelivery);
    }
  }

  const modalQuantity = Number.parseInt(editDraft?.quantity || "0", 10);
  const modalUnitPrice = Number.parseFloat(editDraft?.unitPrice || "0");
  const modalTotal =
    (Number.isFinite(modalQuantity) && modalQuantity > 0 ? modalQuantity : 0) *
    (Number.isFinite(modalUnitPrice) && modalUnitPrice > 0 ? modalUnitPrice : 0);
  const buildSaleRow = (sale: any) => {
    const saleDate = toIsoDate(sale.saleDate);
    const product = productMap.get(sale.productId);
    const productName = product?.name || "Producto";
    const sellerName = sale.sellerId ? sellerMap.get(sale.sellerId) || "Vendedor" : "-";
    const directorName = sale.directorId ? directorMap.get(sale.directorId) || "Director" : "-";
    const deliveryName = sale.deliveryId ? deliveryMap.get(sale.deliveryId) || "Delivery" : "-";
    const qty = Number.parseInt(String(sale.quantity || 0), 10);
    const safeQty = Number.isFinite(qty) ? qty : 0;
    const unitPrice = Number.parseFloat(String(sale.unitPrice ?? product?.price ?? 0));
    const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;

    return {
      saleDate,
      productName,
      sellerName,
      directorName,
      deliveryName,
      safeQty,
      safeUnitPrice,
      total: safeQty * safeUnitPrice,
    };
  };
  const selectedTextDirectorLabel =
    textFilterDirector === "all"
      ? "Todos"
      : textFilterDirector === "none"
        ? "Sin director"
        : directorMap.get(textFilterDirector) || "Director";
  const selectedTextSellerLabel =
    textFilterSeller === "all"
      ? "Todos"
      : textFilterSeller === "none"
        ? "Sin vendedor"
        : sellerMap.get(textFilterSeller) || "Vendedor";
  const selectedTextDeliveryLabel =
    textFilterDelivery === "all"
      ? "Todos"
      : textFilterDelivery === "none"
        ? "Sin delivery"
        : deliveryMap.get(textFilterDelivery) || "Delivery";

  const textSalesFiltered = allSales
    .filter((sale: any) => {
      const saleDate = toIsoDate(sale.saleDate);
      if (!saleDate) return false;

      const matchDate =
        textReportMode === "day"
          ? saleDate === textReportDate
          : saleDate >= normalizedTextStartDate && saleDate <= normalizedTextEndDate;

      const matchDirector =
        textFilterDirector === "all"
          ? true
          : textFilterDirector === "none"
            ? !sale.directorId
            : sale.directorId === textFilterDirector;

      const matchSeller =
        textFilterSeller === "all"
          ? true
          : textFilterSeller === "none"
            ? !sale.sellerId
            : sale.sellerId === textFilterSeller;
      const matchDelivery =
        textFilterDelivery === "all"
          ? true
          : textFilterDelivery === "none"
            ? !sale.deliveryId
            : sale.deliveryId === textFilterDelivery;

      return matchDate && matchDirector && matchSeller && matchDelivery;
    })
    .sort((a: any, b: any) => toIsoDate(a.saleDate).localeCompare(toIsoDate(b.saleDate)));

  const textReportRows = textSalesFiltered.map((sale: any) => ({
    id: sale.id,
    ...buildSaleRow(sale),
  }));
  const textReportUnits = textReportRows.reduce((sum, row) => sum + row.safeQty, 0);
  const textReportTotal = textReportRows.reduce((sum, row) => sum + row.total, 0);
  const textReportPeriodLabel =
    textReportMode === "day"
      ? formatDateShort(textReportDate)
      : `${formatDateShort(normalizedTextStartDate)} a ${formatDateShort(normalizedTextEndDate)}`;

  const textSellerOptionsBase = allSellers.filter((seller: any) => {
    if (textFilterDirector === "all") return true;
    if (textFilterDirector === "none") return !seller.directorId;
    return seller.directorId === textFilterDirector;
  });
  const textSellerOptions = [...textSellerOptionsBase];
  if (
    textFilterSeller !== "all" &&
    textFilterSeller !== "none" &&
    !textSellerOptions.some((seller: any) => seller.id === textFilterSeller)
  ) {
    const selectedSeller = allSellers.find((seller: any) => seller.id === textFilterSeller);
    if (selectedSeller) {
      textSellerOptions.push(selectedSeller);
    }
  }

  const buildSalesTextReport = () => {
    const lines: string[] = [];
    lines.push("REPORTE DE VENTAS");
    lines.push(`Periodo: ${textReportPeriodLabel}`);
    lines.push(`Director: ${selectedTextDirectorLabel}`);
    lines.push(`Vendedor: ${selectedTextSellerLabel}`);
    lines.push(`Delivery: ${selectedTextDeliveryLabel}`);
    lines.push("");

    if (textReportRows.length === 0) {
      lines.push("Sin ventas en el filtro seleccionado.");
      return lines.join("\n");
    }

    textReportRows.forEach((row, index) => {
      lines.push(`VENTA ${index + 1}`);
      if (textIncludeSaleDate) lines.push(`Fecha: ${row.saleDate}`);
      if (textIncludeProduct) lines.push(`Producto: ${row.productName}`);
      if (textIncludeQuantity) lines.push(`Cantidad: ${row.safeQty}`);
      if (textIncludeUnitPrice) lines.push(`P. Unit: ${row.safeUnitPrice.toFixed(2)} Bs`);
      if (textIncludeLineTotal) lines.push(`Total: ${row.total.toFixed(2)} Bs`);
      if (textIncludeSeller) lines.push(`Vendedor: ${row.sellerName}`);
      if (textIncludeDirector) lines.push(`Director: ${row.directorName}`);
      if (textIncludeDelivery) lines.push(`Delivery: ${row.deliveryName}`);
      lines.push("");
    });

    if (textIncludeSummary) {
      lines.push("RESUMEN");
      lines.push(`Ventas registradas: ${textReportRows.length}`);
      if (textIncludeQuantity) lines.push(`Unidades totales: ${textReportUnits}`);
      if (textIncludeLineTotal) lines.push(`Total ventas: ${textReportTotal.toFixed(2)} Bs`);
    }

    return lines.join("\n");
  };

  const salesTextReport = buildSalesTextReport();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isAccountant ? "Ventas (solo lectura)" : "Registrar Venta"}</h1>
          <p className="text-muted-foreground mt-1">
            {isAccountant
              ? "Vista contador: puedes revisar reportes, filtros y detalle de ventas."
              : "Ingresa los detalles de la nueva venta"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsDropshipperModalOpen(true)}
          data-testid="button-open-dropshipper-deliveries"
        >
          Ver entregas
        </Button>
      </div>

      {isAccountant ? (
        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90 shadow-sm">
          <CardContent className="py-4 text-sm text-muted-foreground">
            El rol contador no puede registrar o editar ventas directas desde este formulario.
          </CardContent>
        </Card>
      ) : formattedProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Primero debes agregar productos</p>
        </div>
      ) : (
        <SalesForm
          products={formattedProducts}
          directors={formattedDirectors}
          sellers={formattedSellers}
          deliveries={formattedDeliveries}
          onSubmit={handleSubmit}
        />
      )}

      <Card className="rounded-2xl border-[#b7c9e6] bg-white/90 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-[#102544]">Reporte de ventas (en esta pagina)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={reportMode === "day" ? "default" : "outline"}
              onClick={() => setReportMode("day")}
              data-testid="button-sales-report-mode-day"
            >
              Por fecha
            </Button>
            <Button
              type="button"
              size="sm"
              variant={reportMode === "range" ? "default" : "outline"}
              onClick={() => setReportMode("range")}
              data-testid="button-sales-report-mode-range"
            >
              Por rango
            </Button>
          </div>

          {reportMode === "day" ? (
            <div className="max-w-sm space-y-2">
              <Label htmlFor="sales-report-date">Fecha</Label>
              <Input
                id="sales-report-date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                data-testid="input-sales-report-date"
              />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sales-report-start">Fecha inicial</Label>
                <Input
                  id="sales-report-start"
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  data-testid="input-sales-report-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-report-end">Fecha final</Label>
                <Input
                  id="sales-report-end"
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  data-testid="input-sales-report-end-date"
                />
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
              <p className="text-xs text-muted-foreground">Periodo</p>
              <p className="text-sm font-semibold text-[#1a2a43]">{reportPeriodLabel}</p>
            </div>
            <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
              <p className="text-xs text-muted-foreground">Ventas registradas</p>
              <p className="text-sm font-semibold text-[#1a2a43]">{filteredSales.length}</p>
            </div>
            <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
              <p className="text-xs text-muted-foreground">Total del periodo</p>
              <p className="text-sm font-semibold text-[#1a2a43]">{totalSalesAmount.toFixed(2)} Bs ({totalUnits} und)</p>
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay ventas en el filtro seleccionado.
            </div>
          ) : (
            <>
              <div className="hidden rounded-lg border md:block">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
                      <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Producto</th>
                      <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendedor</th>
                      <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Director</th>
                      <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivery</th>
                      <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cantidad</th>
                      <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">P. Unit</th>
                      <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                      <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale: any) => {
                      const row = buildSaleRow(sale);
                      return (
                        <tr key={sale.id} className="border-b last:border-b-0">
                          <td className="p-3 text-sm">{row.saleDate}</td>
                          <td className="p-3 text-sm font-medium">
                            <span className="inline-block max-w-[260px] truncate align-bottom">{row.productName}</span>
                          </td>
                          <td className="p-3 text-sm">{row.sellerName}</td>
                          <td className="p-3 text-sm">{row.directorName}</td>
                          <td className="p-3 text-sm">{row.deliveryName}</td>
                          <td className="p-3 text-right text-sm">{row.safeQty}</td>
                          <td className="p-3 text-right text-sm">{row.safeUnitPrice.toFixed(2)} Bs</td>
                          <td className="p-3 text-right text-sm font-semibold">{row.total.toFixed(2)} Bs</td>
                          <td className="p-3 text-right text-sm">
                            {isAccountant ? (
                              <span className="text-muted-foreground">Sin permiso</span>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEdit(sale)}
                                  disabled={isEditModalOpen || updateSale.isPending || deleteSale.isPending}
                                  data-testid={`button-sale-edit-${sale.id}`}
                                >
                                  Editar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteSale(sale.id)}
                                  disabled={deleteSale.isPending || updateSale.isPending}
                                  data-testid={`button-sale-delete-${sale.id}`}
                                >
                                  Eliminar
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
                {filteredSales.map((sale: any) => {
                  const row = buildSaleRow(sale);
                  return (
                    <div key={sale.id} className="rounded-lg border bg-white p-3 shadow-sm">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <span className="text-xs text-muted-foreground">Fecha</span>
                        <span className="text-right">{row.saleDate}</span>

                        <span className="text-xs text-muted-foreground">Producto</span>
                        <span className="text-right font-medium">{row.productName}</span>

                        <span className="text-xs text-muted-foreground">Vendedor</span>
                        <span className="text-right">{row.sellerName}</span>

                        <span className="text-xs text-muted-foreground">Director</span>
                        <span className="text-right">{row.directorName}</span>

                        <span className="text-xs text-muted-foreground">Delivery</span>
                        <span className="text-right">{row.deliveryName}</span>

                        <span className="text-xs text-muted-foreground">Cantidad</span>
                        <span className="text-right">{row.safeQty}</span>

                        <span className="text-xs text-muted-foreground">P. Unit</span>
                        <span className="text-right">{row.safeUnitPrice.toFixed(2)} Bs</span>

                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="text-right font-semibold">{row.total.toFixed(2)} Bs</span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        {isAccountant ? (
                          <span className="text-xs text-muted-foreground">Sin permiso</span>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => startEdit(sale)}
                              disabled={isEditModalOpen || updateSale.isPending || deleteSale.isPending}
                              data-testid={`button-sale-edit-mobile-${sale.id}`}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => handleDeleteSale(sale.id)}
                              disabled={deleteSale.isPending || updateSale.isPending}
                              data-testid={`button-sale-delete-mobile-${sale.id}`}
                            >
                              Eliminar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#b7c9e6] bg-white/90 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-[#102544]">Filtros del reporte de texto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={textReportMode === "day" ? "default" : "outline"}
              onClick={() => setTextReportMode("day")}
              data-testid="button-sales-text-report-mode-day"
            >
              Por fecha
            </Button>
            <Button
              type="button"
              size="sm"
              variant={textReportMode === "range" ? "default" : "outline"}
              onClick={() => setTextReportMode("range")}
              data-testid="button-sales-text-report-mode-range"
            >
              Por rango
            </Button>
          </div>

          {textReportMode === "day" ? (
            <div className="max-w-sm space-y-2">
              <Label htmlFor="sales-text-report-date">Fecha</Label>
              <Input
                id="sales-text-report-date"
                type="date"
                value={textReportDate}
                onChange={(e) => setTextReportDate(e.target.value)}
                data-testid="input-sales-text-report-date"
              />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sales-text-report-start">Fecha inicial</Label>
                <Input
                  id="sales-text-report-start"
                  type="date"
                  value={textReportStartDate}
                  onChange={(e) => setTextReportStartDate(e.target.value)}
                  data-testid="input-sales-text-report-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales-text-report-end">Fecha final</Label>
                <Input
                  id="sales-text-report-end"
                  type="date"
                  value={textReportEndDate}
                  onChange={(e) => setTextReportEndDate(e.target.value)}
                  data-testid="input-sales-text-report-end-date"
                />
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Director</Label>
              <Select
                value={textFilterDirector}
                onValueChange={(value) => {
                  setTextFilterDirector(value);
                  setTextFilterSeller("all");
                }}
              >
                <SelectTrigger data-testid="select-sales-text-filter-director">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos directores</SelectItem>
                  <SelectItem value="none">Sin director</SelectItem>
                  {allDirectors.map((director: any) => (
                    <SelectItem key={director.id} value={director.id}>
                      {director.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={textFilterSeller} onValueChange={setTextFilterSeller}>
                <SelectTrigger data-testid="select-sales-text-filter-seller">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos vendedores</SelectItem>
                  <SelectItem value="none">Sin vendedor</SelectItem>
                  {textSellerOptions.map((seller: any) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Delivery</Label>
              <Select value={textFilterDelivery} onValueChange={setTextFilterDelivery}>
                <SelectTrigger data-testid="select-sales-text-filter-delivery">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos deliveries</SelectItem>
                  <SelectItem value="none">Sin delivery</SelectItem>
                  {allDeliveries.map((delivery: any) => (
                    <SelectItem key={delivery.id} value={delivery.id}>
                      {delivery.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
            <p className="mb-3 text-sm font-semibold text-[#1a2a43]">Campos a mostrar en el texto</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm">
                Fecha de venta
                <Checkbox
                  checked={textIncludeSaleDate}
                  onCheckedChange={(checked) => setTextIncludeSaleDate(checked === true)}
                  data-testid="checkbox-sales-text-include-sale-date"
                />
              </label>
              <label className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm">
                Producto
                <Checkbox
                  checked={textIncludeProduct}
                  onCheckedChange={(checked) => setTextIncludeProduct(checked === true)}
                  data-testid="checkbox-sales-text-include-product"
                />
              </label>
              <label className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm">
                Cantidad
                <Checkbox
                  checked={textIncludeQuantity}
                  onCheckedChange={(checked) => setTextIncludeQuantity(checked === true)}
                  data-testid="checkbox-sales-text-include-quantity"
                />
              </label>
              <label className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm">
                Precio unitario
                <Checkbox
                  checked={textIncludeUnitPrice}
                  onCheckedChange={(checked) => setTextIncludeUnitPrice(checked === true)}
                  data-testid="checkbox-sales-text-include-unit-price"
                />
              </label>
              <label className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm">
                Total por venta
                <Checkbox
                  checked={textIncludeLineTotal}
                  onCheckedChange={(checked) => setTextIncludeLineTotal(checked === true)}
                  data-testid="checkbox-sales-text-include-line-total"
                />
              </label>
              <label className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm">
                Vendedor
                <Checkbox
                  checked={textIncludeSeller}
                  onCheckedChange={(checked) => setTextIncludeSeller(checked === true)}
                  data-testid="checkbox-sales-text-include-seller"
                />
              </label>
              <label className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm">
                Director
                <Checkbox
                  checked={textIncludeDirector}
                  onCheckedChange={(checked) => setTextIncludeDirector(checked === true)}
                  data-testid="checkbox-sales-text-include-director"
                />
              </label>
              <label className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm">
                Delivery
                <Checkbox
                  checked={textIncludeDelivery}
                  onCheckedChange={(checked) => setTextIncludeDelivery(checked === true)}
                  data-testid="checkbox-sales-text-include-delivery"
                />
              </label>
              <label className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-sm">
                Resumen final
                <Checkbox
                  checked={textIncludeSummary}
                  onCheckedChange={(checked) => setTextIncludeSummary(checked === true)}
                  data-testid="checkbox-sales-text-include-summary"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
              <p className="text-xs text-muted-foreground">Periodo texto</p>
              <p className="text-sm font-semibold text-[#1a2a43]">{textReportPeriodLabel}</p>
            </div>
            <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
              <p className="text-xs text-muted-foreground">Ventas filtradas</p>
              <p className="text-sm font-semibold text-[#1a2a43]">{textReportRows.length}</p>
            </div>
            <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
              <p className="text-xs text-muted-foreground">Monto filtrado</p>
              <p className="text-sm font-semibold text-[#1a2a43]">
                {textReportTotal.toFixed(2)} Bs ({textReportUnits} und)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <WhatsAppReport reportText={salesTextReport} />

      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            cancelEdit();
          } else {
            setIsEditModalOpen(true);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar venta</DialogTitle>
            <DialogDescription>
              Actualiza producto, vendedor, director, delivery, cantidad, monto y fecha sin salir de esta pagina.
            </DialogDescription>
          </DialogHeader>

          {editDraft && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sale-edit-date">Fecha</Label>
                  <Input
                    id="sale-edit-date"
                    type="date"
                    value={editDraft.saleDate}
                    onChange={(e) =>
                      setEditDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              saleDate: e.target.value,
                            }
                          : prev
                      )
                    }
                    data-testid="input-sale-edit-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sale-edit-quantity">Cantidad</Label>
                  <Input
                    id="sale-edit-quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={editDraft.quantity}
                    onChange={(e) =>
                      setEditDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              quantity: e.target.value,
                            }
                          : prev
                      )
                    }
                    data-testid="input-sale-edit-quantity"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Producto</Label>
                <Select value={editDraft.productId} onValueChange={handleEditProductChange}>
                  <SelectTrigger data-testid="select-sale-edit-product">
                    <SelectValue placeholder="Selecciona producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productOptions.map((candidate: any) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name}
                        {candidate.isActive === false ? " (Inactivo)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Director</Label>
                  <Select value={editDraft.directorId} onValueChange={handleEditDirectorChange}>
                    <SelectTrigger data-testid="select-sale-edit-director">
                      <SelectValue placeholder="Sin director" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin director</SelectItem>
                      {directorOptions.map((candidate: any) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.name}
                          {candidate.isActive === false ? " (Inactivo)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Vendedor</Label>
                  <Select value={editDraft.sellerId} onValueChange={handleEditSellerChange}>
                    <SelectTrigger data-testid="select-sale-edit-seller">
                      <SelectValue placeholder="Sin vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin vendedor</SelectItem>
                      {sellerOptions.map((candidate: any) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.name}
                          {candidate.isActive === false ? " (Inactivo)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Delivery</Label>
                  <Select
                    value={editDraft.deliveryId}
                    onValueChange={(value) =>
                      setEditDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              deliveryId: value,
                            }
                          : prev
                      )
                    }
                  >
                    <SelectTrigger data-testid="select-sale-edit-delivery">
                      <SelectValue placeholder="Sin delivery" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin delivery</SelectItem>
                      {deliveryOptions.map((candidate: any) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale-edit-unit-price">Precio unitario (Bs)</Label>
                <Input
                  id="sale-edit-unit-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editDraft.unitPrice}
                  onChange={(e) =>
                    setEditDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            unitPrice: e.target.value,
                          }
                        : prev
                    )
                  }
                  data-testid="input-sale-edit-unit-price"
                />
              </div>

              <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
                <p className="text-xs text-muted-foreground">Resumen rapido</p>
                <p className="mt-1 text-sm text-[#1a2a43]">
                  Total: <span className="font-semibold">{modalTotal.toFixed(2)} Bs</span>
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={updateSale.isPending}
                  data-testid="button-sale-edit-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={updateSale.isPending}
                  data-testid="button-sale-edit-save"
                >
                  {updateSale.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DropshipperDeliveriesModal
        open={isDropshipperModalOpen}
        onOpenChange={setIsDropshipperModalOpen}
      />
    </div>
  );
}

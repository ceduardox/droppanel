import { useState } from "react";
import SalesForm from "@/components/SalesForm";
import { useCreateSale, useDirectors, useProducts, useSales, useSellers } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

export default function Sales() {
  const todayIso = getTodayIsoLocal();
  const { data: products = [], isLoading } = useProducts();
  const { data: directors = [], isLoading: loadingDirectors } = useDirectors();
  const { data: sellers = [], isLoading: loadingSellers } = useSellers();
  const { data: sales = [], isLoading: loadingSales } = useSales();
  const createSale = useCreateSale();
  const { toast } = useToast();
  const [reportMode, setReportMode] = useState<"day" | "range">("day");
  const [reportDate, setReportDate] = useState(todayIso);
  const [reportStartDate, setReportStartDate] = useState(todayIso);
  const [reportEndDate, setReportEndDate] = useState(todayIso);

  const handleSubmit = async (data: {
    productId: string;
    quantity: number;
    date: string;
    unitPrice: number;
    unitTransport: number;
    sellerId?: string | null;
    directorId?: string | null;
  }) => {
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

  if (loadingDirectors || loadingSellers) {
    return <div className="flex items-center justify-center h-64">Cargando equipo comercial...</div>;
  }

  if (loadingSales) {
    return <div className="flex items-center justify-center h-64">Cargando reporte de ventas...</div>;
  }

  const allProducts = products as any[];
  const allDirectors = directors as any[];
  const allSellers = sellers as any[];

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

  const normalizedStartDate =
    reportStartDate <= reportEndDate ? reportStartDate : reportEndDate;
  const normalizedEndDate =
    reportStartDate <= reportEndDate ? reportEndDate : reportStartDate;

  const productMap = new Map(
    allProducts.map((product: any) => [product.id, product])
  );
  const directorMap = new Map(
    allDirectors.map((director: any) => [director.id, director.name])
  );
  const sellerMap = new Map(
    allSellers.map((seller: any) => [seller.id, seller.name])
  );

  const filteredSales = (sales as any[])
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Registrar Venta</h1>
        <p className="text-muted-foreground mt-1">Ingresa los detalles de la nueva venta</p>
      </div>

      {formattedProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Primero debes agregar productos</p>
        </div>
      ) : (
        <SalesForm
          products={formattedProducts}
          directors={formattedDirectors}
          sellers={formattedSellers}
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
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[780px]">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Producto</th>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendedor</th>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Director</th>
                    <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cantidad</th>
                    <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">P. Unit</th>
                    <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale: any) => {
                    const saleDate = toIsoDate(sale.saleDate);
                    const product = productMap.get(sale.productId);
                    const productName = product?.name || "Producto";
                    const sellerName = sale.sellerId ? sellerMap.get(sale.sellerId) || "Vendedor" : "-";
                    const directorName = sale.directorId ? directorMap.get(sale.directorId) || "Director" : "-";
                    const qty = Number.parseInt(String(sale.quantity || 0), 10);
                    const safeQty = Number.isFinite(qty) ? qty : 0;
                    const unitPrice = Number.parseFloat(String(sale.unitPrice ?? product?.price ?? 0));
                    const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
                    const total = safeQty * safeUnitPrice;

                    return (
                      <tr key={sale.id} className="border-b last:border-b-0">
                        <td className="p-3 text-sm">{saleDate}</td>
                        <td className="p-3 text-sm font-medium">{productName}</td>
                        <td className="p-3 text-sm">{sellerName}</td>
                        <td className="p-3 text-sm">{directorName}</td>
                        <td className="p-3 text-right text-sm">{safeQty}</td>
                        <td className="p-3 text-right text-sm">{safeUnitPrice.toFixed(2)} Bs</td>
                        <td className="p-3 text-right text-sm font-semibold">{total.toFixed(2)} Bs</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

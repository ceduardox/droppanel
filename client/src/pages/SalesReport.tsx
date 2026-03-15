import { Fragment, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useReports } from "@/lib/api";
import { ChevronDown, Eye } from "lucide-react";

function formatDetailDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

export default function SalesReport() {
  const { data: salesWithProducts = [], isLoading } = useReports();
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [expandedProducts, setExpandedProducts] = useState<string[]>([]);

  // Filtrar por rango de fechas
  const filteredSales = (salesWithProducts as any[]).filter((item: any) => {
    if (!startDate || !endDate) return true;
    return item.saleDate >= startDate && item.saleDate <= endDate;
  });

  // Agrupar por producto y sumar cantidades
  const productSummary = new Map<
    string,
    {
      name: string;
      quantity: number;
      total: number;
      entries: Array<{
        saleId: string;
        saleDate: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
    }
  >();
  
  filteredSales.forEach((item: any) => {
    if (!item.product) return;
    const productId = item.productId;
    const existing = productSummary.get(productId);
    const price = parseFloat(item.product.price);
    const saleTotal = price * item.quantity;
    
    if (existing) {
      existing.quantity += item.quantity;
      existing.total += saleTotal;
      existing.entries.push({
        saleId: item.id,
        saleDate: item.saleDate,
        quantity: item.quantity,
        unitPrice: price,
        total: saleTotal,
      });
    } else {
      productSummary.set(productId, {
        name: item.product.name,
        quantity: item.quantity,
        total: saleTotal,
        entries: [
          {
            saleId: item.id,
            saleDate: item.saleDate,
            quantity: item.quantity,
            unitPrice: price,
            total: saleTotal,
          },
        ],
      });
    }
  });

  const summaryArray = Array.from(productSummary.entries()).map(([productId, value]) => ({
    productId,
    ...value,
    entries: [...value.entries].sort((a, b) => a.saleDate.localeCompare(b.saleDate)),
  }));
  const grandTotalUnits = summaryArray.reduce((sum, p) => sum + p.quantity, 0);
  const grandTotalSales = summaryArray.reduce((sum, p) => sum + p.total, 0);

  const toggleExpandedProduct = (productId: string) => {
    setExpandedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Reporte de Ventas</h1>
        <p className="text-muted-foreground mt-1">Resumen de ventas por producto en un rango de fechas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Rango de Fechas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen por Producto</CardTitle>
        </CardHeader>
        <CardContent>
          {summaryArray.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2 md:hidden">
                {summaryArray.map((product, index) => (
                  <details
                    key={product.productId}
                    className="rounded-xl border-2 border-[#b9cbea] bg-gradient-to-r from-[#f4f8ff] to-white p-3 shadow-sm"
                    data-testid={`row-product-${index}`}
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#dce9ff] text-[#1d438b]">
                              <Eye className="h-4 w-4" />
                            </span>
                            <p className="truncate font-semibold">{product.name}</p>
                          </div>
                          <p className="mt-1 text-xs font-medium text-[#1d438b]">Registro desplegable</p>
                        </div>
                        <p className="font-mono text-sm whitespace-nowrap">{product.total.toFixed(2)} Bs</p>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#dce9ff] px-2.5 py-1 text-[11px] font-semibold text-[#1d438b]">
                        <ChevronDown className="h-3.5 w-3.5" />
                        Toca para ver mas detalles
                      </div>
                    </summary>
                    <div className="mt-3 space-y-2 border-t pt-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Producto</span>
                        <span className="text-right font-medium">{product.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Unidades Vendidas</span>
                        <span className="font-mono">{product.quantity}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Ventas</span>
                        <span className="font-mono whitespace-nowrap">{product.total.toFixed(2)} Bs</span>
                      </div>
                      <div className="rounded-xl border border-[#d7e4f8] bg-white/90 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#57709a]">
                            Ventas del rango
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {product.entries.length} registro{product.entries.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {product.entries.map((entry) => (
                            <div
                              key={entry.saleId}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-slate-600">
                                  {formatDetailDate(entry.saleDate)}
                                </span>
                                <span className="font-mono text-xs whitespace-nowrap">
                                  {entry.total.toFixed(2)} Bs
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-600">
                                <span>{entry.quantity} und x {entry.unitPrice.toFixed(2)} Bs</span>
                                <span>Venta individual</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                ))}
                <div className="rounded-xl border bg-muted/35 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">TOTAL UNIDADES</span>
                    <span className="font-mono font-bold" data-testid="text-total-units">{grandTotalUnits}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="font-bold">TOTAL VENTAS</span>
                    <span className="font-mono font-bold whitespace-nowrap" data-testid="text-total-sales">{grandTotalSales.toFixed(2)} Bs</span>
                  </div>
                </div>
              </div>

              <div className="hidden rounded-lg border md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="w-14 p-2 text-center text-sm font-medium sm:p-3">Detalle</th>
                        <th className="p-2 text-left text-sm font-medium sm:p-3">Producto</th>
                        <th className="p-2 text-center text-sm font-medium sm:p-3">Unidades Vendidas</th>
                        <th className="p-2 text-right text-sm font-medium sm:p-3">Total Ventas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryArray.map((product, index) => {
                        const isExpanded = expandedProducts.includes(product.productId);
                        return (
                          <Fragment key={product.productId}>
                            <tr
                              className={`border-b transition-colors hover:bg-slate-50 ${isExpanded ? "bg-slate-50/70" : ""}`}
                              data-testid={`row-product-${index}`}
                            >
                              <td className="p-2 text-center sm:p-3">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandedProduct(product.productId)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#c9d8ee] bg-[#eef5ff] text-[#1d438b] transition-transform"
                                  data-testid={`button-toggle-product-${index}`}
                                >
                                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                              </td>
                              <td className="p-2 font-medium sm:p-3">{product.name}</td>
                              <td className="p-2 text-center font-mono sm:p-3">{product.quantity}</td>
                              <td className="p-2 text-right font-mono whitespace-nowrap sm:p-3">{product.total.toFixed(2)} Bs</td>
                            </tr>
                            {isExpanded && (
                              <tr className="border-b bg-slate-50/40">
                                <td colSpan={4} className="p-3 sm:p-4">
                                  <div className="rounded-xl border border-[#d7e4f8] bg-white p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-800">Detalle de ventas filtradas</p>
                                        <p className="text-xs text-slate-500">
                                          {product.entries.length} registro{product.entries.length !== 1 ? "s" : ""} dentro del rango seleccionado
                                        </p>
                                      </div>
                                    </div>
                                    <div className="grid gap-2">
                                      {product.entries.map((entry) => (
                                        <div
                                          key={entry.saleId}
                                          className="grid grid-cols-[140px_1fr_160px] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                        >
                                          <span className="font-medium text-slate-600">{formatDetailDate(entry.saleDate)}</span>
                                          <span className="text-slate-600">
                                            {entry.quantity} und x {entry.unitPrice.toFixed(2)} Bs
                                          </span>
                                          <span className="text-right font-mono whitespace-nowrap text-slate-900">
                                            {entry.total.toFixed(2)} Bs
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-muted/50">
                      <tr>
                        <td className="p-2 sm:p-3"></td>
                        <td className="p-2 font-bold sm:p-3">TOTAL</td>
                        <td className="p-2 text-center font-mono font-bold sm:p-3" data-testid="text-total-units">{grandTotalUnits}</td>
                        <td className="p-2 text-right font-mono font-bold whitespace-nowrap sm:p-3" data-testid="text-total-sales">{grandTotalSales.toFixed(2)} Bs</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No hay ventas en este rango de fechas</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

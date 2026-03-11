import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useReports } from "@/lib/api";
import { ChevronDown, Eye } from "lucide-react";

export default function SalesReport() {
  const { data: salesWithProducts = [], isLoading } = useReports();
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Filtrar por rango de fechas
  const filteredSales = (salesWithProducts as any[]).filter((item: any) => {
    if (!startDate || !endDate) return true;
    return item.saleDate >= startDate && item.saleDate <= endDate;
  });

  // Agrupar por producto y sumar cantidades
  const productSummary = new Map<string, { name: string; quantity: number; total: number }>();
  
  filteredSales.forEach((item: any) => {
    if (!item.product) return;
    const productId = item.productId;
    const existing = productSummary.get(productId);
    const price = parseFloat(item.product.price);
    const saleTotal = price * item.quantity;
    
    if (existing) {
      existing.quantity += item.quantity;
      existing.total += saleTotal;
    } else {
      productSummary.set(productId, {
        name: item.product.name,
        quantity: item.quantity,
        total: saleTotal,
      });
    }
  });

  const summaryArray = Array.from(productSummary.values());
  const grandTotalUnits = summaryArray.reduce((sum, p) => sum + p.quantity, 0);
  const grandTotalSales = summaryArray.reduce((sum, p) => sum + p.total, 0);

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
                    key={index}
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
                        <th className="p-2 text-left text-sm font-medium sm:p-3">Producto</th>
                        <th className="p-2 text-center text-sm font-medium sm:p-3">Unidades Vendidas</th>
                        <th className="p-2 text-right text-sm font-medium sm:p-3">Total Ventas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryArray.map((product, index) => (
                        <tr key={index} className="border-b" data-testid={`row-product-${index}`}>
                          <td className="p-2 font-medium sm:p-3">{product.name}</td>
                          <td className="p-2 text-center font-mono sm:p-3">{product.quantity}</td>
                          <td className="p-2 text-right font-mono whitespace-nowrap sm:p-3">{product.total.toFixed(2)} Bs</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/50">
                      <tr>
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

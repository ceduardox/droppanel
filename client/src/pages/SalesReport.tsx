import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useReports } from "@/lib/api";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reporte de Ventas</h1>
        <p className="text-muted-foreground mt-1">Resumen de ventas por producto en un rango de fechas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Rango de Fechas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
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
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-3 text-left font-medium">Producto</th>
                      <th className="p-3 text-center font-medium">Unidades Vendidas</th>
                      <th className="p-3 text-right font-medium">Total Ventas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryArray.map((product, index) => (
                      <tr key={index} className="border-b" data-testid={`row-product-${index}`}>
                        <td className="p-3 font-medium">{product.name}</td>
                        <td className="p-3 text-center font-mono">{product.quantity}</td>
                        <td className="p-3 text-right font-mono">{product.total.toFixed(2)} Bs</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50">
                    <tr>
                      <td className="p-3 font-bold">TOTAL</td>
                      <td className="p-3 text-center font-mono font-bold" data-testid="text-total-units">{grandTotalUnits}</td>
                      <td className="p-3 text-right font-mono font-bold" data-testid="text-total-sales">{grandTotalSales.toFixed(2)} Bs</td>
                    </tr>
                  </tfoot>
                </table>
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

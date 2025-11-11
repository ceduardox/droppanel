import { useState } from "react";
import ReportCard from "@/components/ReportCard";
import WhatsAppReport from "@/components/WhatsAppReport";
import DailyPaymentUpload from "@/components/DailyPaymentUpload";
import { useReports } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

function formatDateString(dateStr: string): string {
  // Format YYYY-MM-DD to Spanish date without timezone issues
  const [year, month, day] = dateStr.split('-');
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const monthName = months[parseInt(month) - 1];
  return `${parseInt(day)} de ${monthName} de ${year}`;
}

export default function Reports() {
  const { data: salesWithProducts = [], isLoading } = useReports();
  const [selectedDate, setSelectedDate] = useState("");

  const generateReportText = (filteredSales: any[]) => {
    if (filteredSales.length === 0) return selectedDate 
      ? `No hay ventas registradas para la fecha ${formatDateString(selectedDate)}`
      : "No hay ventas registradas";

    const totalSales = filteredSales.reduce((sum: number, item: any) => {
      const price = parseFloat(item.product?.price || 0);
      const quantity = item.quantity;
      return sum + (price * quantity);
    }, 0);

    const totalCost = filteredSales.reduce((sum: number, item: any) => {
      const cost = parseFloat(item.product?.cost || 0);
      const aumentoCapital = parseFloat(item.product?.aumentoCapital || 0);
      const quantity = item.quantity;
      return sum + ((cost + aumentoCapital) * quantity);
    }, 0);

    const totalProfit = totalSales - totalCost;
    const profitPerPartner = totalProfit / 2;

    let report = `📊 REPORTE DE VENTAS\n`;
    
    if (selectedDate) {
      report += `Fecha: ${formatDateString(selectedDate)}\n\n`;
    } else {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      report += `Fecha: ${formatDateString(todayStr)}\n\n`;
    }
    
    filteredSales.forEach((item: any, index: number) => {
      const product = item.product;
      if (!product) return;
      
      const price = parseFloat(product.price);
      const cost = parseFloat(product.cost);
      const aumentoCapital = parseFloat(product.aumentoCapital || 0);
      const quantity = item.quantity;
      const saleTotal = price * quantity;
      const saleCost = (cost + aumentoCapital) * quantity;
      const saleProfit = saleTotal - saleCost;
      const profitPerPartnerSale = saleProfit / 2;
      
      report += `🛍️ VENTA ${index + 1}:\n`;
      report += `Fecha: ${formatDateString(item.saleDate)}\n`;
      report += `Producto: ${product.name}\n`;
      report += `Cantidad: ${quantity} unidades\n`;
      report += `Precio Unitario: ${price.toFixed(2)} Bs\n`;
      report += `Total: ${saleTotal.toFixed(2)} Bs\n`;
      report += `Costo: ${saleCost.toFixed(2)} Bs\n`;
      report += `Utilidad: ${saleProfit.toFixed(2)} Bs\n`;
      report += `  - José Eduardo: ${profitPerPartnerSale.toFixed(2)} Bs\n`;
      report += `  - Jhonatan: ${profitPerPartnerSale.toFixed(2)} Bs\n\n`;
    });

    report += `💰 RESUMEN TOTAL:\n`;
    report += `Total Ventas: ${totalSales.toFixed(2)} Bs\n`;
    report += `Costo Total: ${totalCost.toFixed(2)} Bs\n`;
    report += `Utilidad Total: ${totalProfit.toFixed(2)} Bs\n\n`;
    report += `👥 DISTRIBUCIÓN (50/50):\n`;
    report += `José Eduardo: ${profitPerPartner.toFixed(2)} Bs\n`;
    report += `Jhonatan: ${profitPerPartner.toFixed(2)} Bs\n\n`;
    report += `✅ Reporte generado automáticamente`;

    return report;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  // Filter sales by date if selected
  const filteredSales = selectedDate 
    ? (salesWithProducts as any[]).filter((item: any) => item.saleDate === selectedDate)
    : (salesWithProducts as any[]);

  const salesForDisplay = filteredSales
    .filter((item: any) => item.product)
    .map((item: any) => ({
      id: item.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: parseFloat(item.product.price),
      cost: parseFloat(item.product.cost),
      aumentoCapital: parseFloat(item.product.aumentoCapital || 0),
      date: item.saleDate,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="text-muted-foreground mt-1">Consulta y comparte reportes detallados</p>
      </div>

      {(salesWithProducts as any[]).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No hay ventas registradas</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Ventas del Período</h2>
            <div className="space-y-4">
              {salesForDisplay.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No hay ventas para la fecha seleccionada</p>
                </div>
              ) : (
                salesForDisplay.map((sale: any) => (
                  <ReportCard key={sale.id} sale={sale} />
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter-date">Filtrar por Fecha</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="filter-date"
                  data-testid="input-filter-date"
                  type="date"
                  className="pl-10"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  placeholder="Selecciona una fecha"
                />
              </div>
              {selectedDate && (
                <p className="text-sm text-muted-foreground">
                  Mostrando ventas del {formatDateString(selectedDate)}
                </p>
              )}
            </div>
            <DailyPaymentUpload selectedDate={selectedDate} />
            <WhatsAppReport reportText={generateReportText(filteredSales)} />
          </div>
        </div>
      )}
    </div>
  );
}

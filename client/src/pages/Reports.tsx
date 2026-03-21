import { useState } from "react";
import ReportCard from "@/components/ReportCard";
import WhatsAppReport from "@/components/WhatsAppReport";
import DailyPaymentUpload from "@/components/DailyPaymentUpload";
import { useReports, useUpdateSaleDate, useDeleteSale } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { getEffectiveUnitBaseCost, getEffectiveUnitCost, getSaleUnitPrice } from "@/lib/sales-pricing";

function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const monthName = months[parseInt(month) - 1];
  return `${parseInt(day)} de ${monthName} de ${year}`;
}

export default function Reports() {
  const { user } = useAuth();
  const { data: salesWithProducts = [], isLoading } = useReports();
  const [selectedDate, setSelectedDate] = useState("");
  const updateSaleDate = useUpdateSaleDate();
  const deleteSale = useDeleteSale();
  const { toast } = useToast();
  const isAccountant = user?.role?.trim().toLowerCase() === "contador";

  const handleEditDate = async (saleId: string, newDate: string) => {
    try {
      await updateSaleDate.mutateAsync({ id: saleId, saleDate: newDate });
      toast({
        title: "Fecha actualizada",
        description: "La fecha de la venta se cambio correctamente",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    try {
      await deleteSale.mutateAsync(saleId);
      toast({
        title: "Venta eliminada",
        description: "La venta se elimino correctamente",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo eliminar la venta",
        variant: "destructive",
      });
    }
  };

  const generateReportText = (filteredSales: any[]) => {
    if (filteredSales.length === 0) {
      return selectedDate
        ? `No hay ventas registradas para la fecha ${formatDateString(selectedDate)}`
        : "No hay ventas registradas";
    }

    const totalSales = filteredSales.reduce((sum: number, item: any) => {
      const price = getSaleUnitPrice(item);
      return sum + price * item.quantity;
    }, 0);

    const totalCost = filteredSales.reduce((sum: number, item: any) => {
      return sum + getEffectiveUnitCost(item) * item.quantity;
    }, 0);

    const totalBaseCost = filteredSales.reduce((sum: number, item: any) => {
      return sum + getEffectiveUnitBaseCost(item) * item.quantity;
    }, 0);

    const totalProfit = totalSales - totalCost;
    const profitPerPartner = totalProfit / 2;

    let report = `REPORTE DE VENTAS\n`;

    if (selectedDate) {
      report += `Fecha: ${formatDateString(selectedDate)}\n\n`;
    } else {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      report += `Fecha: ${formatDateString(todayStr)}\n\n`;
    }

    filteredSales.forEach((item: any, index: number) => {
      const product = item.product;
      if (!product) return;

      const price = getSaleUnitPrice(item);
      const unitCost = getEffectiveUnitCost(item);
      const unitBaseCost = getEffectiveUnitBaseCost(item);
      const quantity = item.quantity;
      const saleTotal = price * quantity;
      const saleCost = unitCost * quantity;
      const saleProfit = saleTotal - saleCost;
      const profitPerPartnerSale = saleProfit / 2;

      report += `VENTA ${index + 1}:\n`;
      report += `Fecha: ${formatDateString(item.saleDate)}\n`;
      report += `Producto: ${product.name}\n`;
      report += `Cantidad: ${quantity} unidades\n`;
      report += `Precio Unitario: ${price.toFixed(2)} Bs\n`;
      report += `Total: ${saleTotal.toFixed(2)} Bs\n`;

      if (unitBaseCost > 0) {
        const capitalIncrease = parseFloat(product.capitalIncrease || 0);
        report += `Costo: ${saleCost.toFixed(2)} Bs\n`;
        report += `  - Bruto: ${(unitBaseCost * quantity).toFixed(2)} Bs\n`;
        report += `  - Capital: ${(capitalIncrease * quantity).toFixed(2)} Bs\n`;
      } else {
        report += `Costo: ${saleCost.toFixed(2)} Bs\n`;
      }

      if (!isAccountant) {
        report += `Utilidad: ${saleProfit.toFixed(2)} Bs\n`;
        report += `  - Jose Eduardo: ${profitPerPartnerSale.toFixed(2)} Bs\n`;
        report += `  - Jhonatan: ${profitPerPartnerSale.toFixed(2)} Bs\n\n`;
      } else {
        report += `\n`;
      }
    });

    report += `RESUMEN TOTAL:\n`;
    report += `Total Ventas: ${totalSales.toFixed(2)} Bs\n`;
    if (!isAccountant) {
      report += `Costo Total: ${totalCost.toFixed(2)} Bs\n`;
      report += `Total Bruto: ${totalBaseCost.toFixed(2)} Bs\n`;
      report += `Utilidad Total: ${totalProfit.toFixed(2)} Bs\n\n`;
      report += `DISTRIBUCION (50/50):\n`;
      report += `Jose Eduardo: ${profitPerPartner.toFixed(2)} Bs\n`;
      report += `Jhonatan: ${profitPerPartner.toFixed(2)} Bs\n\n`;
    } else {
      report += `\n`;
    }
    report += `Reporte generado automaticamente`;

    return report;
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center">Cargando...</div>;
  }

  const filteredSales = selectedDate
    ? (salesWithProducts as any[]).filter((item: any) => item.saleDate === selectedDate)
    : (salesWithProducts as any[]);

  const salesForDisplay = filteredSales
    .filter((item: any) => item.product)
    .map((item: any) => {
      const effectiveBaseCost = getEffectiveUnitBaseCost(item);
      return {
        id: item.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: getSaleUnitPrice(item),
        cost: getEffectiveUnitCost(item),
        baseCost: effectiveBaseCost > 0 ? effectiveBaseCost : undefined,
        capitalIncrease: item.product.capitalIncrease ? parseFloat(item.product.capitalIncrease) : undefined,
        date: item.saleDate,
      };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="mt-1 text-muted-foreground">Consulta y comparte reportes detallados</p>
      </div>

      {(salesWithProducts as any[]).length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No hay ventas registradas</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <h2 className="text-xl font-semibold">Ventas del Periodo</h2>
            <div className="space-y-4">
              {salesForDisplay.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No hay ventas para la fecha seleccionada</p>
                </div>
              ) : (
                salesForDisplay.map((sale: any) => (
                  <ReportCard key={sale.id} sale={sale} onEditDate={handleEditDate} onDelete={handleDeleteSale} />
                ))
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter-date">Filtrar por Fecha</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
              {selectedDate && <p className="text-sm text-muted-foreground">Mostrando ventas del {formatDateString(selectedDate)}</p>}
            </div>

            <DailyPaymentUpload selectedDate={selectedDate} />
            <WhatsAppReport reportText={generateReportText(filteredSales)} />
          </div>
        </div>
      )}
    </div>
  );
}

import ReportCard from "@/components/ReportCard";
import WhatsAppReport from "@/components/WhatsAppReport";
import { useReports } from "@/lib/api";

export default function Reports() {
  const { data: salesWithProducts = [], isLoading } = useReports();

  const generateReportText = () => {
    if (salesWithProducts.length === 0) return "No hay ventas registradas";

    const totalSales = salesWithProducts.reduce((sum: number, item: any) => {
      const price = parseFloat(item.product?.price || 0);
      const quantity = item.quantity;
      return sum + (price * quantity);
    }, 0);

    const totalCost = salesWithProducts.reduce((sum: number, item: any) => {
      const cost = parseFloat(item.product?.cost || 0);
      const quantity = item.quantity;
      return sum + (cost * quantity);
    }, 0);

    const totalProfit = totalSales - totalCost;
    const profitPerPartner = totalProfit / 2;

    let report = `📊 REPORTE DE VENTAS\n`;
    report += `Fecha: ${new Date().toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`;
    
    salesWithProducts.forEach((item: any, index: number) => {
      const product = item.product;
      if (!product) return;
      
      const price = parseFloat(product.price);
      const cost = parseFloat(product.cost);
      const quantity = item.quantity;
      const saleTotal = price * quantity;
      const saleCost = cost * quantity;
      const saleProfit = saleTotal - saleCost;
      const profitPerPartnerSale = saleProfit / 2;
      
      report += `🛍️ VENTA ${index + 1}:\n`;
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

  const salesForDisplay = salesWithProducts
    .filter((item: any) => item.product)
    .map((item: any) => ({
      id: item.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: parseFloat(item.product.price),
      cost: parseFloat(item.product.cost),
      date: item.saleDate,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="text-muted-foreground mt-1">Consulta y comparte reportes detallados</p>
      </div>

      {salesForDisplay.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No hay ventas registradas</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Ventas del Período</h2>
            <div className="space-y-4">
              {salesForDisplay.map((sale: any) => (
                <ReportCard key={sale.id} sale={sale} />
              ))}
            </div>
          </div>

          <div>
            <WhatsAppReport reportText={generateReportText()} />
          </div>
        </div>
      )}
    </div>
  );
}

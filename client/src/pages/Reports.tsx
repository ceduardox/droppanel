import ReportCard from "@/components/ReportCard";
import WhatsAppReport from "@/components/WhatsAppReport";

// TODO: Remove mock data - replace with real data from backend
const mockSales = [
  {
    id: "1",
    productName: "Berberina",
    quantity: 9,
    price: 130,
    cost: 46.48,
    date: "2024-10-13",
  },
  {
    id: "2",
    productName: "Citrato de Magnesio",
    quantity: 5,
    price: 150,
    cost: 81.43,
    date: "2024-10-12",
  },
];

// TODO: Generate this dynamically from sales data
const generateReportText = () => {
  const totalSales = mockSales.reduce((sum, sale) => sum + (sale.price * sale.quantity), 0);
  const totalCost = mockSales.reduce((sum, sale) => sum + (sale.cost * sale.quantity), 0);
  const totalProfit = totalSales - totalCost;
  const profitPerPartner = totalProfit / 2;

  let report = `📊 REPORTE DE VENTAS\n`;
  report += `Fecha: ${new Date().toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`;
  
  mockSales.forEach((sale, index) => {
    const saleTotal = sale.price * sale.quantity;
    const saleCost = sale.cost * sale.quantity;
    const saleProfit = saleTotal - saleCost;
    
    report += `🛍️ VENTA ${index + 1}:\n`;
    report += `Producto: ${sale.productName}\n`;
    report += `Cantidad: ${sale.quantity} unidades\n`;
    report += `Precio Unitario: ${sale.price.toFixed(2)} Bs\n`;
    report += `Total: ${saleTotal.toFixed(2)} Bs\n`;
    report += `Utilidad: ${saleProfit.toFixed(2)} Bs\n\n`;
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

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="text-muted-foreground mt-1">Consulta y comparte reportes detallados</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Ventas del Período</h2>
          <div className="space-y-4">
            {mockSales.map((sale) => (
              <ReportCard key={sale.id} sale={sale} />
            ))}
          </div>
        </div>

        <div>
          <WhatsAppReport reportText={generateReportText()} />
        </div>
      </div>
    </div>
  );
}

import WhatsAppReport from "../WhatsAppReport";

const mockReport = `📊 REPORTE DE VENTAS
Fecha: 13 de Octubre, 2024

🛍️ DETALLE DE VENTA:
Producto: Berberina
Cantidad: 9 unidades
Precio Unitario: 130.00 Bs

💰 RESUMEN FINANCIERO:
Total Venta: 1,170.00 Bs
Costo Total: 418.32 Bs
Utilidad Total: 751.68 Bs

👥 DISTRIBUCIÓN DE UTILIDAD (50/50):
José Eduardo: 375.84 Bs
Jhonatan: 375.84 Bs

✅ Venta registrada exitosamente`;

export default function WhatsAppReportExample() {
  return (
    <div className="p-6 bg-background max-w-2xl">
      <WhatsAppReport reportText={mockReport} />
    </div>
  );
}

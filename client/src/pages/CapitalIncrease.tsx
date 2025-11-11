import { useState } from "react";
import { useReports } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const monthName = months[parseInt(month) - 1];
  return `${parseInt(day)} de ${monthName} de ${year}`;
}

export default function CapitalIncrease() {
  const { data: salesWithProducts = [], isLoading } = useReports();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  const filteredSales = (salesWithProducts as any[])
    .filter((item: any) => {
      if (!item.product) return false;
      
      const hasCapitalIncrease = item.product.capitalIncrease !== null && 
                                 item.product.capitalIncrease !== undefined && 
                                 parseFloat(item.product.capitalIncrease) > 0;
      
      if (!hasCapitalIncrease) return false;

      if (startDate && item.saleDate < startDate) return false;
      if (endDate && item.saleDate > endDate) return false;

      return true;
    });

  const totalCapitalIncrease = filteredSales.reduce((sum: number, item: any) => {
    const capitalIncrease = parseFloat(item.product.capitalIncrease || 0);
    const quantity = item.quantity;
    return sum + (capitalIncrease * quantity);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Aumento de Capital</h1>
        <p className="text-muted-foreground mt-1">Reporte de aumento de capital por ventas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtrar por Fecha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-date">Fecha Inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Fecha Fin</Label>
              <Input
                id="end-date"
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
          <CardTitle className="text-lg">
            Total Aumento de Capital
            {(startDate || endDate) && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {startDate && endDate 
                  ? `(${formatDateString(startDate)} - ${formatDateString(endDate)})`
                  : startDate 
                  ? `(Desde ${formatDateString(startDate)})`
                  : `(Hasta ${formatDateString(endDate)})`
                }
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-chart-2" data-testid="text-total-capital">
            {totalCapitalIncrease.toFixed(2)} Bs
          </div>
        </CardContent>
      </Card>

      {filteredSales.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No hay ventas con aumento de capital en el período seleccionado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Detalle de Ventas</h2>
          {filteredSales.map((item: any) => {
            const capitalIncrease = parseFloat(item.product.capitalIncrease);
            const totalIncrease = capitalIncrease * item.quantity;

            return (
              <Card key={item.id} data-testid={`card-capital-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base" data-testid={`text-product-${item.id}`}>
                        {item.product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span data-testid={`text-date-${item.id}`}>{formatDateString(item.saleDate)}</span>
                        <span>•</span>
                        <span data-testid={`text-quantity-${item.id}`}>Cantidad: {item.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Aumento de Capital</p>
                      <p className="text-lg font-bold text-chart-2" data-testid={`text-capital-total-${item.id}`}>
                        {totalIncrease.toFixed(2)} Bs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ({capitalIncrease.toFixed(2)} Bs × {item.quantity})
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

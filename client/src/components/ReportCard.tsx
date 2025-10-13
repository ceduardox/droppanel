import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface Sale {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  cost: number;
  date: string;
}

interface ReportCardProps {
  sale: Sale;
}

export default function ReportCard({ sale }: ReportCardProps) {
  const total = sale.price * sale.quantity;
  const totalCost = sale.cost * sale.quantity;
  const profit = total - totalCost;
  const profitPerPartner = profit / 2;

  return (
    <Card data-testid={`card-sale-${sale.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{sale.productName}</CardTitle>
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(sale.date).toLocaleDateString('es-BO')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Cantidad</p>
            <p className="text-lg font-semibold" data-testid={`text-quantity-${sale.id}`}>{sale.quantity}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Precio Unit.</p>
            <p className="text-lg font-semibold" data-testid={`text-unit-price-${sale.id}`}>{sale.price.toFixed(2)} Bs</p>
          </div>
        </div>
        <div className="border-t pt-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Venta:</span>
            <span className="font-medium" data-testid={`text-sale-total-${sale.id}`}>{total.toFixed(2)} Bs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Costo Total:</span>
            <span className="font-medium" data-testid={`text-sale-cost-${sale.id}`}>{totalCost.toFixed(2)} Bs</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="font-medium">Utilidad:</span>
            <span className="font-bold text-chart-2" data-testid={`text-sale-profit-${sale.id}`}>{profit.toFixed(2)} Bs</span>
          </div>
        </div>
        <div className="border-t pt-3">
          <p className="text-xs text-muted-foreground mb-2">Distribución 50/50:</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-xs text-muted-foreground">José Eduardo</p>
              <p className="font-semibold" data-testid={`text-jose-profit-${sale.id}`}>{profitPerPartner.toFixed(2)} Bs</p>
            </div>
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-xs text-muted-foreground">Jhonatan</p>
              <p className="font-semibold" data-testid={`text-jhonatan-profit-${sale.id}`}>{profitPerPartner.toFixed(2)} Bs</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Pencil } from "lucide-react";

interface Sale {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  cost: number;
  baseCost?: number;
  capitalIncrease?: number;
  date: string;
}

interface ReportCardProps {
  sale: Sale;
  onEditDate?: (id: string, newDate: string) => void;
}

function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const monthName = months[parseInt(month) - 1];
  return `${parseInt(day)} de ${monthName} de ${year}`;
}

export default function ReportCard({ sale, onEditDate }: ReportCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newDate, setNewDate] = useState(sale.date);
  
  const total = sale.price * sale.quantity;
  const totalCost = sale.cost * sale.quantity;
  const profit = total - totalCost;
  const profitPerPartner = profit / 2;
  const hasBreakdown = sale.baseCost !== undefined && sale.baseCost !== null;

  const handleSaveDate = () => {
    if (onEditDate && newDate) {
      onEditDate(sale.id, newDate);
      setIsOpen(false);
    }
  };

  return (
    <Card data-testid={`card-sale-${sale.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{sale.productName}</CardTitle>
          <div className="flex items-center gap-2">
            {onEditDate && (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-edit-date-${sale.id}`}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cambiar Fecha de Venta</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      Producto: <span className="font-medium">{sale.productName}</span>
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="newDate">Nueva Fecha</Label>
                      <Input
                        id="newDate"
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        data-testid="input-new-date"
                      />
                    </div>
                    <Button onClick={handleSaveDate} className="w-full" data-testid="button-save-date">
                      Guardar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Badge variant="outline" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDateString(sale.date)}
            </Badge>
          </div>
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
          {hasBreakdown && (
            <>
              <div className="flex justify-between pl-4">
                <span className="text-xs text-muted-foreground">↳ Bruto:</span>
                <span className="text-xs" data-testid={`text-base-cost-total-${sale.id}`}>{(sale.baseCost! * sale.quantity).toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between pl-4">
                <span className="text-xs text-muted-foreground">↳ Capital:</span>
                <span className="text-xs" data-testid={`text-capital-increase-total-${sale.id}`}>{((sale.capitalIncrease || 0) * sale.quantity).toFixed(2)} Bs</span>
              </div>
            </>
          )}
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

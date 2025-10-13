import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
}

interface SalesFormProps {
  products: Product[];
  onSubmit: (data: { productId: string; quantity: number; date: string }) => void;
}

export default function SalesForm({ products, onSubmit }: SalesFormProps) {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedProduct = products.find(p => p.id === productId);
  const total = selectedProduct ? selectedProduct.price * parseInt(quantity || "0") : 0;
  const totalCost = selectedProduct ? selectedProduct.cost * parseInt(quantity || "0") : 0;
  const profit = total - totalCost;
  const profitPerPartner = profit / 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ productId, quantity: parseInt(quantity), date });
    setQuantity("1");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Registrar Venta</CardTitle>
          <CardDescription>Ingresa los detalles de la venta realizada</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Producto</Label>
              <Select value={productId} onValueChange={setProductId} required>
                <SelectTrigger id="product" data-testid="select-product">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {product.price} Bs
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                data-testid="input-quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Fecha de Venta</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  data-testid="input-date"
                  type="date"
                  className="pl-10"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" data-testid="button-submit-sale">
              Registrar Venta
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-primary/5">
        <CardHeader>
          <CardTitle>Cálculo de Utilidad</CardTitle>
          <CardDescription>Distribución 50/50 entre socios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Venta:</span>
              <span className="text-lg font-semibold" data-testid="text-total-sale">{total.toFixed(2)} Bs</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Costo Total:</span>
              <span className="text-lg" data-testid="text-total-cost">{totalCost.toFixed(2)} Bs</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Utilidad Total:</span>
                <span className="text-xl font-bold text-chart-2" data-testid="text-total-profit">{profit.toFixed(2)} Bs</span>
              </div>
            </div>
          </div>
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-medium text-sm">Distribución por Socio:</h4>
            <div className="grid grid-cols-2 gap-2">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">José Eduardo</p>
                  <p className="text-lg font-semibold" data-testid="text-profit-jose">{profitPerPartner.toFixed(2)} Bs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Jhonatan</p>
                  <p className="text-lg font-semibold" data-testid="text-profit-jhonatan">{profitPerPartner.toFixed(2)} Bs</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

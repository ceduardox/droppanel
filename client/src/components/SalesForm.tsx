import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  baseCost?: number | null;
}

interface SalesFormProps {
  products: Product[];
  onSubmit: (data: { productId: string; quantity: number; date: string; unitPrice: number }) => void;
}

export default function SalesForm({ products, onSubmit }: SalesFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const parsedQuantity = Number.parseInt(quantity || "0", 10);
  const safeQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 0;
  const selectedProduct = products.find((product) => product.id === productId);
  const safeProductCost =
    selectedProduct && Number.isFinite(selectedProduct.cost) ? selectedProduct.cost : 0;
  const parsedUnitPrice = Number.parseFloat(unitPrice || "0");
  const safeUnitPrice = Number.isFinite(parsedUnitPrice) && parsedUnitPrice > 0 ? parsedUnitPrice : 0;
  const minUnitPrice = selectedProduct
    ? Number.isFinite(selectedProduct.baseCost as number) && Number(selectedProduct.baseCost) > 0
      ? Number(selectedProduct.baseCost)
      : safeProductCost
    : 0;
  const total = safeUnitPrice * safeQuantity;
  const totalCost = selectedProduct ? safeProductCost * safeQuantity : 0;
  const profit = total - totalCost;
  const profitPerPartner = profit / 2;
  const isAccountant = user?.role?.trim().toLowerCase() === "contador";

  useEffect(() => {
    if (selectedProduct) {
      setUnitPrice(selectedProduct.price.toFixed(2));
    }
  }, [selectedProduct?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      toast({ title: "Error", description: "Selecciona un producto", variant: "destructive" });
      return;
    }

    if (!Number.isFinite(safeUnitPrice) || safeUnitPrice <= 0) {
      toast({ title: "Error", description: "Ingresa un precio unitario valido", variant: "destructive" });
      return;
    }

    if (Number.isFinite(minUnitPrice) && safeUnitPrice < minUnitPrice) {
      toast({
        title: "Precio invalido",
        description: `El precio no puede ser menor al capital bruto (${minUnitPrice.toFixed(2)} Bs)`,
        variant: "destructive",
      });
      return;
    }

    onSubmit({ productId, quantity: safeQuantity, date, unitPrice: safeUnitPrice });
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
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {product.price.toFixed(2)} Bs
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
              <Label htmlFor="unitPrice">Precio Unitario Vendido (Bs)</Label>
              <Input
                id="unitPrice"
                data-testid="input-unit-price"
                type="number"
                step="0.01"
                min={minUnitPrice > 0 ? minUnitPrice.toFixed(2) : "0"}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
              />
              {selectedProduct && (
                <p className="text-xs text-muted-foreground">
                  Minimo permitido: {minUnitPrice.toFixed(2)} Bs (capital bruto)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha de Venta</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
          <CardTitle>{isAccountant ? "Resumen de Venta" : "Calculo de Utilidad"}</CardTitle>
          <CardDescription>
            {isAccountant
              ? "Vista operativa de la venta seleccionada"
              : "Distribucion 50/50 entre socios"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Venta:</span>
              <span className="text-lg font-semibold" data-testid="text-total-sale">
                {total.toFixed(2)} Bs
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Costo Total:</span>
              <span className="text-lg" data-testid="text-total-cost">
                {totalCost.toFixed(2)} Bs
              </span>
            </div>

            {!isAccountant && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Utilidad Total:</span>
                  <span className="text-xl font-bold text-chart-2" data-testid="text-total-profit">
                    {profit.toFixed(2)} Bs
                  </span>
                </div>
              </div>
            )}
          </div>

          {!isAccountant && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-medium">Distribucion por Socio:</h4>
              <div className="grid grid-cols-2 gap-2">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Jose Eduardo</p>
                    <p className="text-lg font-semibold" data-testid="text-profit-jose">
                      {profitPerPartner.toFixed(2)} Bs
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Jhonatan</p>
                    <p className="text-lg font-semibold" data-testid="text-profit-jhonatan">
                      {profitPerPartner.toFixed(2)} Bs
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

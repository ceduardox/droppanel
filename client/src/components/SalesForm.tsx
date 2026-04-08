import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getEffectiveUnitCostForProduct, getMinUnitPriceForProduct } from "@/lib/sales-pricing";

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  baseCost?: number | null;
  costTransport?: number | null;
}

interface Director {
  id: string;
  name: string;
}

interface Seller {
  id: string;
  name: string;
  directorId?: string | null;
}

interface Delivery {
  id: string;
  name: string;
}

interface SalesFormProps {
  products: Product[];
  directors: Director[];
  sellers: Seller[];
  deliveries: Delivery[];
  onSubmit: (data: {
    productId: string;
    quantity: number;
    date: string;
    unitPrice: number;
    unitTransport: number;
    sellerId?: string | null;
    directorId?: string | null;
    deliveryId?: string | null;
  }) => void;
}

export default function SalesForm({ products, directors, sellers, deliveries, onSubmit }: SalesFormProps) {
  const { user } = useAuth();
  const isAccountant = user?.role?.trim().toLowerCase() === "contador";
  const visibleFrom = isAccountant ? user?.visibleFrom ?? null : null;
  const { toast } = useToast();
  const [productId, setProductId] = useState("");
  const [directorId, setDirectorId] = useState("none");
  const [sellerId, setSellerId] = useState("none");
  const [deliveryId, setDeliveryId] = useState("none");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [unitTransport, setUnitTransport] = useState("");
  const todayIso = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayIso);

  const parsedQuantity = Number.parseInt(quantity || "0", 10);
  const safeQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 0;
  const selectedProduct = products.find((product) => product.id === productId);
  const selectedSeller = sellers.find((seller) => seller.id === sellerId);
  const selectedDirector = directors.find((director) => director.id === directorId);
  const selectedDelivery = deliveries.find((delivery) => delivery.id === deliveryId);
  const sellersForSelection =
    directorId === "none" ? sellers : sellers.filter((seller) => seller.directorId === directorId);
  const parsedUnitPrice = Number.parseFloat(unitPrice || "0");
  const safeUnitPrice = Number.isFinite(parsedUnitPrice) && parsedUnitPrice > 0 ? parsedUnitPrice : 0;
  const parsedUnitTransport = Number.parseFloat(unitTransport || "0");
  const safeUnitTransport =
    Number.isFinite(parsedUnitTransport) && parsedUnitTransport >= 0 ? parsedUnitTransport : 0;
  const minUnitPrice = selectedProduct
    ? getMinUnitPriceForProduct(selectedProduct, safeUnitTransport)
    : 0;
  const effectiveUnitCost = selectedProduct
    ? getEffectiveUnitCostForProduct(selectedProduct, safeUnitTransport)
    : 0;
  const total = safeUnitPrice * safeQuantity;
  const totalCost = effectiveUnitCost * safeQuantity;
  const profit = total - totalCost;
  const profitPerPartner = profit / 2;

  useEffect(() => {
    if (selectedProduct) {
      setUnitPrice(selectedProduct.price.toFixed(2));
      setUnitTransport((selectedProduct.costTransport ?? 0).toFixed(2));
    }
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (!visibleFrom) return;
    if (!date || date < visibleFrom) {
      setDate(visibleFrom);
    }
  }, [visibleFrom, date]);

  useEffect(() => {
    if (sellerId === "none") return;
    const seller = sellers.find((item) => item.id === sellerId);
    if (!seller) {
      setSellerId("none");
      return;
    }

    const sellerDirector = seller.directorId || "none";
    if (directorId !== sellerDirector) {
      setDirectorId(sellerDirector);
    }
  }, [sellerId, sellers, directorId]);

  useEffect(() => {
    if (sellerId === "none") return;
    if (directorId === "none") return;

    const seller = sellers.find((item) => item.id === sellerId);
    if (!seller) {
      setSellerId("none");
      return;
    }

    if ((seller.directorId || "none") !== directorId) {
      setSellerId("none");
    }
  }, [directorId, sellerId, sellers]);

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

    if (!Number.isFinite(safeUnitTransport) || safeUnitTransport < 0) {
      toast({ title: "Error", description: "Ingresa un transporte valido", variant: "destructive" });
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

    if (visibleFrom && date < visibleFrom) {
      toast({
        title: "Fecha invalida",
        description: `Solo puedes registrar ventas desde ${visibleFrom}`,
        variant: "destructive",
      });
      setDate(visibleFrom);
      return;
    }

    let finalDirectorId = directorId === "none" ? null : directorId;
    const finalSellerId = sellerId === "none" ? null : sellerId;
    const finalDeliveryId = deliveryId === "none" ? null : deliveryId;

    if (finalSellerId && !finalDirectorId && selectedSeller?.directorId) {
      finalDirectorId = selectedSeller.directorId;
    }

    onSubmit({
      productId,
      quantity: safeQuantity,
      date,
      unitPrice: safeUnitPrice,
      unitTransport: safeUnitTransport,
      sellerId: finalSellerId,
      directorId: finalDirectorId,
      deliveryId: finalDeliveryId,
    });
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

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="director">Director (opcional)</Label>
                <Select value={directorId} onValueChange={setDirectorId}>
                  <SelectTrigger id="director" data-testid="select-sale-director">
                    <SelectValue placeholder="Sin director" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin director</SelectItem>
                    {directors.map((director) => (
                      <SelectItem key={director.id} value={director.id}>
                        {director.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seller">Vendedor (opcional)</Label>
                <Select value={sellerId} onValueChange={setSellerId}>
                  <SelectTrigger id="seller" data-testid="select-sale-seller">
                    <SelectValue placeholder="Sin vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vendedor</SelectItem>
                    {sellersForSelection.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery">Delivery (opcional)</Label>
                <Select value={deliveryId} onValueChange={setDeliveryId}>
                  <SelectTrigger id="delivery" data-testid="select-sale-delivery">
                    <SelectValue placeholder="Sin delivery" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin delivery</SelectItem>
                    {deliveries.map((delivery) => (
                      <SelectItem key={delivery.id} value={delivery.id}>
                        {delivery.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(selectedDirector || selectedSeller || selectedDelivery) && (
              <div className="rounded-lg border border-[#d2def1] bg-[#f4f8ff] px-3 py-2 text-xs text-[#24406f]">
                <span className="font-semibold">Venta atribuida:</span>{" "}
                {selectedDirector ? selectedDirector.name : "Sin director"} /{" "}
                {selectedSeller ? selectedSeller.name : "Sin vendedor"} /{" "}
                {selectedDelivery ? selectedDelivery.name : "Sin delivery"}
              </div>
            )}

            {sellers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay vendedores activos en Equipo Comercial.
              </p>
            )}

            {deliveries.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay deliveries registrados en Gestion de Delivery.
              </p>
            )}

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
                  min={visibleFrom ?? undefined}
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
          <div className="rounded-lg border border-border/60 bg-white/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responsable</p>
            <p className="mt-1 text-sm">
              {selectedSeller ? selectedSeller.name : "Sin vendedor"}{" "}
              <span className="text-muted-foreground">|</span>{" "}
              {selectedDirector ? selectedDirector.name : "Sin director"}{" "}
              <span className="text-muted-foreground">|</span>{" "}
              {selectedDelivery ? selectedDelivery.name : "Sin delivery"}
            </p>
          </div>

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

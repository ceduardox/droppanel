import { useState } from "react";
import { useSellers, useCreateSeller, useProducts, useSellerSales, useCreateSellerSale } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, UserPlus, Send, ShoppingCart } from "lucide-react";

interface Seller {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: string;
}

interface SellerSale {
  id: string;
  sellerId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  saleDate: string;
}

function formatDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

export default function SellerReport() {
  const { data: sellers = [], isLoading: loadingSellers } = useSellers();
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: sellerSales = [], isLoading: loadingSales } = useSellerSales();
  const createSeller = useCreateSeller();
  const createSale = useCreateSellerSale();
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(today);
  const [newSellerName, setNewSellerName] = useState("");
  
  const [selectedSeller, setSelectedSeller] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saleDate, setSaleDate] = useState(today);

  const handleAddSeller = async () => {
    if (!newSellerName.trim()) {
      toast({ title: "Error", description: "Ingresa el nombre del vendedor", variant: "destructive" });
      return;
    }
    try {
      await createSeller.mutateAsync({ name: newSellerName.trim() });
      toast({ title: "Éxito", description: "Vendedor agregado" });
      setNewSellerName("");
    } catch {
      toast({ title: "Error", description: "No se pudo agregar el vendedor", variant: "destructive" });
    }
  };

  const handleAddSale = async () => {
    if (!selectedSeller || !selectedProduct) {
      toast({ title: "Error", description: "Selecciona vendedor y producto", variant: "destructive" });
      return;
    }
    const product = (products as Product[]).find(p => p.id === selectedProduct);
    if (!product) return;

    try {
      await createSale.mutateAsync({
        sellerId: selectedSeller,
        productId: selectedProduct,
        quantity: parseInt(quantity),
        unitPrice: product.price,
        saleDate,
      });
      toast({ title: "Éxito", description: "Venta registrada" });
      setQuantity("1");
    } catch {
      toast({ title: "Error", description: "No se pudo registrar la venta", variant: "destructive" });
    }
  };

  const filteredSales = (sellerSales as SellerSale[]).filter(s => s.saleDate === filterDate);

  const salesByDay = filteredSales.reduce((acc, sale) => {
    const seller = (sellers as Seller[]).find(s => s.id === sale.sellerId);
    const product = (products as Product[]).find(p => p.id === sale.productId);
    if (!seller || !product) return acc;

    const total = parseFloat(sale.unitPrice) * sale.quantity;
    if (!acc[seller.name]) {
      acc[seller.name] = { sales: [], total: 0 };
    }
    acc[seller.name].sales.push({ product: product.name, quantity: sale.quantity, unitPrice: sale.unitPrice, total });
    acc[seller.name].total += total;
    return acc;
  }, {} as Record<string, { sales: { product: string; quantity: number; unitPrice: string; total: number }[]; total: number }>);

  const grandTotal = Object.values(salesByDay).reduce((sum, s) => sum + s.total, 0);

  const generateWhatsAppText = () => {
    let text = `📊 *REPORTE VENDEDORES*\n`;
    text += `📅 Fecha: ${formatDateString(filterDate)}\n\n`;

    Object.entries(salesByDay).forEach(([sellerName, data]) => {
      text += `👤 *${sellerName}*\n`;
      data.sales.forEach(sale => {
        text += `  • ${sale.product} x${sale.quantity} = ${sale.total.toFixed(2)} Bs\n`;
      });
      text += `  💰 Subtotal: ${data.total.toFixed(2)} Bs\n\n`;
    });

    text += `═══════════════════\n`;
    text += `💵 *TOTAL DEL DÍA: ${grandTotal.toFixed(2)} Bs*`;

    return text;
  };

  const handleWhatsApp = () => {
    const text = generateWhatsAppText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const selectedProductPrice = selectedProduct 
    ? (products as Product[]).find(p => p.id === selectedProduct)?.price || "0"
    : "0";
  const saleTotal = parseFloat(selectedProductPrice) * parseInt(quantity || "0");

  if (loadingSellers || loadingProducts || loadingSales) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reporte Vendedores</h1>
        <p className="text-muted-foreground mt-1">Registro y seguimiento de ventas por vendedor</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Agregar Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del vendedor"
                value={newSellerName}
                onChange={(e) => setNewSellerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSeller()}
                data-testid="input-seller-name"
              />
              <Button onClick={handleAddSeller} disabled={createSeller.isPending} data-testid="button-add-seller">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(sellers as Seller[]).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(sellers as Seller[]).map((s) => (
                  <span key={s.id} className="px-2 py-1 bg-muted rounded text-sm" data-testid={`badge-seller-${s.id}`}>
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Registrar Venta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                  <SelectTrigger data-testid="select-seller">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {(sellers as Seller[]).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Producto</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger data-testid="select-product">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {(products as Product[]).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} - {parseFloat(p.price).toFixed(2)} Bs</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  data-testid="input-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  data-testid="input-sale-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Total</Label>
                <div className="h-9 flex items-center px-3 border rounded-md bg-muted font-bold">
                  {saleTotal.toFixed(2)} Bs
                </div>
              </div>
            </div>
            <Button onClick={handleAddSale} className="mt-4 w-full" disabled={createSale.isPending} data-testid="button-add-sale">
              <Plus className="h-4 w-4 mr-2" />
              {createSale.isPending ? "Guardando..." : "Registrar Venta"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg">Ventas del Día</CardTitle>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-auto"
              data-testid="input-filter-date"
            />
            <Button variant="outline" onClick={handleWhatsApp} disabled={filteredSales.length === 0} data-testid="button-whatsapp">
              <Send className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(salesByDay).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay ventas para esta fecha</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(salesByDay).map(([sellerName, data]) => (
                <div key={sellerName} className="border rounded-lg p-4" data-testid={`card-seller-sales-${sellerName}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg">{sellerName}</h3>
                    <span className="text-lg font-bold text-primary">{data.total.toFixed(2)} Bs</span>
                  </div>
                  <div className="space-y-2">
                    {data.sales.map((sale, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-muted-foreground">
                        <span>{sale.product} x{sale.quantity}</span>
                        <span>{sale.total.toFixed(2)} Bs</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="text-xl font-bold">Total del Día</span>
                <span className="text-2xl font-bold text-primary" data-testid="text-grand-total">{grandTotal.toFixed(2)} Bs</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

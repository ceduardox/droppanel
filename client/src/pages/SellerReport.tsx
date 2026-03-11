import { useState } from "react";
import { useSellers, useCreateSeller, useProducts, useSellerSales, useCreateSellerSale, useUpdateSellerSale, useDeleteSellerSale } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, UserPlus, ShoppingCart, X, Save, Pencil, Trash2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import WhatsAppReport from "@/components/WhatsAppReport";

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

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  total: number;
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
  const updateSale = useUpdateSellerSale();
  const deleteSale = useDeleteSellerSale();
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const [filterMode, setFilterMode] = useState<"day" | "range">("day");
  const [filterDate, setFilterDate] = useState(today);
  const [filterDateFrom, setFilterDateFrom] = useState(today);
  const [filterDateTo, setFilterDateTo] = useState(today);
  const [newSellerName, setNewSellerName] = useState("");
  
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editProductId, setEditProductId] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  
  const [selectedSeller, setSelectedSeller] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saleDate, setSaleDate] = useState(today);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);

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

  const handleAddToCart = () => {
    if (!selectedProduct) {
      toast({ title: "Error", description: "Selecciona un producto", variant: "destructive" });
      return;
    }
    const product = (products as Product[]).find(p => p.id === selectedProduct);
    if (!product) return;

    const qty = parseInt(quantity) || 1;
    const existingIdx = cart.findIndex(c => c.productId === selectedProduct);
    
    if (existingIdx >= 0) {
      const newCart = [...cart];
      newCart[existingIdx].quantity += qty;
      newCart[existingIdx].total = parseFloat(newCart[existingIdx].unitPrice) * newCart[existingIdx].quantity;
      setCart(newCart);
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.price,
        total: parseFloat(product.price) * qty,
      }]);
    }
    setSelectedProduct("");
    setQuantity("1");
  };

  const removeFromCart = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const handleSaveAll = async () => {
    if (!selectedSeller) {
      toast({ title: "Error", description: "Selecciona un vendedor", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "Error", description: "Agrega al menos un producto", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      for (const item of cart) {
        await createSale.mutateAsync({
          sellerId: selectedSeller,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          saleDate,
        });
      }
      toast({ title: "Éxito", description: `${cart.length} ventas registradas` });
      setCart([]);
    } catch {
      toast({ title: "Error", description: "No se pudieron guardar las ventas", variant: "destructive" });
    }
    setSaving(false);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const handleStartEdit = (sale: SellerSale) => {
    setEditingSaleId(sale.id);
    setEditProductId(sale.productId);
    setEditQuantity(sale.quantity.toString());
  };

  const handleCancelEdit = () => {
    setEditingSaleId(null);
    setEditProductId("");
    setEditQuantity("");
  };

  const handleSaveEdit = async (saleId: string) => {
    const product = (products as Product[]).find(p => p.id === editProductId);
    if (!product) return;
    
    try {
      await updateSale.mutateAsync({
        id: saleId,
        data: {
          productId: editProductId,
          quantity: parseInt(editQuantity),
          unitPrice: product.price,
        },
      });
      toast({ title: "Éxito", description: "Venta actualizada" });
      handleCancelEdit();
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    try {
      await deleteSale.mutateAsync(saleId);
      toast({ title: "Éxito", description: "Venta eliminada" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const filteredSales = (sellerSales as SellerSale[]).filter(s => {
    if (filterMode === "day") {
      return s.saleDate === filterDate;
    } else {
      return s.saleDate >= filterDateFrom && s.saleDate <= filterDateTo;
    }
  });

  const salesByDay = filteredSales.reduce((acc, sale) => {
    const seller = (sellers as Seller[]).find(s => s.id === sale.sellerId);
    const product = (products as Product[]).find(p => p.id === sale.productId);
    if (!seller || !product) return acc;

    const total = parseFloat(sale.unitPrice) * sale.quantity;
    if (!acc[seller.name]) {
      acc[seller.name] = { sales: [], total: 0, totalProducts: 0 };
    }
    acc[seller.name].sales.push({ 
      id: sale.id, 
      productId: sale.productId,
      product: product.name, 
      quantity: sale.quantity, 
      unitPrice: sale.unitPrice, 
      total 
    });
    acc[seller.name].total += total;
    acc[seller.name].totalProducts += sale.quantity;
    return acc;
  }, {} as Record<string, { sales: { id: string; productId: string; product: string; quantity: number; unitPrice: string; total: number }[]; total: number; totalProducts: number }>);

  const grandTotal = Object.values(salesByDay).reduce((sum, s) => sum + s.total, 0);
  const grandTotalProducts = Object.values(salesByDay).reduce((sum, s) => sum + s.totalProducts, 0);

  const generateWhatsAppText = () => {
    let text = `📊 *REPORTE VENDEDORES*\n`;
    if (filterMode === "day") {
      text += `📅 Fecha: ${formatDateString(filterDate)}\n\n`;
    } else {
      text += `📅 Desde: ${formatDateString(filterDateFrom)} hasta ${formatDateString(filterDateTo)}\n\n`;
    }

    Object.entries(salesByDay).forEach(([sellerName, data]) => {
      text += `👤 *${sellerName}*\n`;
      data.sales.forEach(sale => {
        text += `  • ${sale.product} x${sale.quantity} = ${sale.total.toFixed(2)} Bs\n`;
      });
      text += `  💰 Subtotal: ${data.total.toFixed(2)} Bs\n\n`;
    });

    text += `═══════════════════\n`;
    text += `💵 *TOTAL${filterMode === "range" ? " DEL PERÍODO" : " DEL DÍA"}: ${grandTotal.toFixed(2)} Bs*`;

    return text;
  };

  
  const selectedProductData = selectedProduct 
    ? (products as Product[]).find(p => p.id === selectedProduct)
    : null;
  const currentItemTotal = selectedProductData ? parseFloat(selectedProductData.price) * parseInt(quantity || "0") : 0;

  if (loadingSellers || loadingProducts || loadingSales) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Reporte Vendedores</h1>
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
                className="min-w-0 flex-1"
                placeholder="Nombre del vendedor"
                value={newSellerName}
                onChange={(e) => setNewSellerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSeller()}
                data-testid="input-seller-name"
              />
              <Button
                onClick={handleAddSeller}
                disabled={createSeller.isPending}
                size="icon"
                className="shrink-0"
                data-testid="button-add-seller"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(sellers as Seller[]).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(sellers as Seller[]).map((s) => (
                  <span
                    key={s.id}
                    className="max-w-full break-words rounded bg-muted px-2 py-1 text-sm leading-tight"
                    data-testid={`badge-seller-${s.id}`}
                  >
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
              Registrar Ventas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
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
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  data-testid="input-sale-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Carrito</Label>
                <div className="h-9 flex items-center px-3 border rounded-md bg-primary/10 font-bold text-primary">
                  {cartTotal.toFixed(2)} Bs
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm text-muted-foreground mb-2 block">Agregar productos:</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_6rem_auto] sm:items-end">
                <div className="min-w-0">
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger data-testid="select-product">
                      <SelectValue placeholder="Producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {(products as Product[]).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} - {parseFloat(p.price).toFixed(2)} Bs</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:w-20">
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Cant."
                    data-testid="input-quantity"
                  />
                </div>
                <div className="text-sm font-medium sm:w-24 sm:text-right">
                  {currentItemTotal.toFixed(2)} Bs
                </div>
                <Button onClick={handleAddToCart} size="icon" className="w-full sm:w-10" data-testid="button-add-to-cart">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {cart.length > 0 && (
              <div className="border rounded-lg p-3 bg-muted/50 space-y-2">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-sm" data-testid={`cart-item-${idx}`}>
                    <span className="min-w-0 break-words">{item.productName} x{item.quantity}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.total.toFixed(2)} Bs</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromCart(idx)} data-testid={`button-remove-${idx}`}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleSaveAll} className="w-full" disabled={saving || cart.length === 0} data-testid="button-save-all">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Guardando..." : `Guardar ${cart.length} producto${cart.length !== 1 ? 's' : ''}`}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <CardTitle className="text-lg">Ventas {filterMode === "day" ? "del Día" : "por Rango"}</CardTitle>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:flex-wrap">
              <Select value={filterMode} onValueChange={(v: "day" | "range") => setFilterMode(v)}>
                <SelectTrigger className="w-full sm:w-32" data-testid="select-filter-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Por día</SelectItem>
                  <SelectItem value="range">Por rango</SelectItem>
                </SelectContent>
              </Select>
              {filterMode === "day" ? (
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full sm:w-auto"
                  data-testid="input-filter-date"
                />
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full sm:w-auto"
                    data-testid="input-filter-date-from"
                  />
                  <span className="text-muted-foreground hidden sm:inline">a</span>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full sm:w-auto"
                    data-testid="input-filter-date-to"
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(salesByDay).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay ventas para esta fecha</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(salesByDay).map(([sellerName, data]) => (
                <Collapsible key={sellerName} className="border rounded-lg" data-testid={`card-seller-sales-${sellerName}`}>
                  <CollapsibleTrigger className="w-full p-3 sm:p-4 flex flex-wrap justify-between items-center gap-2 hover-elevate rounded-lg">
                    <div className="min-w-0 flex items-center gap-2 sm:gap-3">
                      <h3 className="truncate text-base font-bold sm:text-lg">{sellerName}</h3>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:text-sm">{data.totalProducts} productos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-primary sm:text-lg">{data.total.toFixed(2)} Bs</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <div className="space-y-2 pt-2 border-t">
                      {data.sales.map((sale) => (
                        <div key={sale.id} className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between" data-testid={`row-sale-${sale.id}`}>
                          {editingSaleId === sale.id ? (
                            <div className="grid flex-1 grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-2">
                              <Select value={editProductId} onValueChange={setEditProductId}>
                                <SelectTrigger className="h-8 flex-1" data-testid="edit-select-product">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(products as Product[]).map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                min="1"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                className="h-8 sm:w-16"
                                data-testid="edit-input-quantity"
                              />
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveEdit(sale.id)} data-testid="button-save-edit">
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit} data-testid="button-cancel-edit">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="min-w-0 break-words text-muted-foreground">{sale.product} x{sale.quantity}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{sale.total.toFixed(2)} Bs</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleStartEdit({ id: sale.id, productId: sale.productId, quantity: sale.quantity } as SellerSale)} data-testid={`button-edit-${sale.id}`}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteSale(sale.id)} data-testid={`button-delete-${sale.id}`}>
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
              
              <div className="border-t pt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xl font-bold">{filterMode === "range" ? "Total del Período" : "Total del Día"}</span>
                  <span className="text-sm text-muted-foreground ml-2">({grandTotalProducts} productos)</span>
                </div>
                <span className="text-xl font-bold text-primary sm:text-2xl" data-testid="text-grand-total">{grandTotal.toFixed(2)} Bs</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredSales.length > 0 && (
        <WhatsAppReport reportText={generateWhatsAppText()} />
      )}
    </div>
  );
}

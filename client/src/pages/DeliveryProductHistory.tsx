import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, BarChart3, CalendarRange, Package2, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useProducts, useSellerSales, useSellers } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

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

const sellerChartConfig = {
  quantity: {
    label: "Cantidad vendida",
    color: "#1d63c4",
  },
} satisfies ChartConfig;

const dailyChartConfig = {
  quantity: {
    label: "Unidades por fecha",
    color: "#0f7f9f",
  },
} satisfies ChartConfig;

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
}

function getMonthStart(dateStr: string) {
  return `${dateStr.slice(0, 8)}01`;
}

export default function DeliveryProductHistory() {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(getMonthStart(today));
  const [endDate, setEndDate] = useState(today);
  const [match, params] = useRoute<{ productId: string }>("/delivery/producto/:productId");

  const { data: products = [], isLoading: loadingProducts } = useProducts() as { data: Product[]; isLoading: boolean };
  const { data: sellers = [], isLoading: loadingSellers } = useSellers() as { data: Seller[]; isLoading: boolean };
  const { data: sellerSales = [], isLoading: loadingSales } = useSellerSales() as { data: SellerSale[]; isLoading: boolean };

  if (!match) {
    return <div className="flex h-64 items-center justify-center">Producto no encontrado</div>;
  }

  const productId = params.productId;
  const product = products.find((item) => item.id === productId);
  const sellerMap = new Map(sellers.map((seller) => [seller.id, seller.name]));

  const filteredSales = sellerSales
    .filter((sale) => sale.productId === productId)
    .filter((sale) => sale.saleDate >= startDate && sale.saleDate <= endDate)
    .sort((a, b) => (a.saleDate < b.saleDate ? 1 : -1));

  const sellerTotalsRecord: Record<string, { seller: string; quantity: number; tickets: number }> = {};
  const dailyTotalsRecord: Record<string, { date: string; quantity: number; tickets: number }> = {};

  filteredSales.forEach((sale) => {
    const sellerName = sellerMap.get(sale.sellerId) || "Sin vendedor";
    if (!sellerTotalsRecord[sellerName]) {
      sellerTotalsRecord[sellerName] = { seller: sellerName, quantity: 0, tickets: 0 };
    }
    sellerTotalsRecord[sellerName].quantity += sale.quantity || 0;
    sellerTotalsRecord[sellerName].tickets += 1;

    if (!dailyTotalsRecord[sale.saleDate]) {
      dailyTotalsRecord[sale.saleDate] = { date: sale.saleDate, quantity: 0, tickets: 0 };
    }
    dailyTotalsRecord[sale.saleDate].quantity += sale.quantity || 0;
    dailyTotalsRecord[sale.saleDate].tickets += 1;
  });

  const sellerChartData = Object.values(sellerTotalsRecord)
    .sort((a, b) => b.quantity - a.quantity)
    .map((item) => ({
      ...item,
      shortName: item.seller.length > 12 ? `${item.seller.slice(0, 12)}...` : item.seller,
    }));

  const dailyChartData = Object.values(dailyTotalsRecord)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((item) => ({
      ...item,
      label: formatDateLabel(item.date),
    }));

  const totalUnits = filteredSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
  const totalTickets = filteredSales.length;
  const activeSellers = sellerChartData.length;
  const topSeller = sellerChartData[0];

  if (loadingProducts || loadingSellers || loadingSales) {
    return <div className="flex h-64 items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/delivery">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Inventario
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#102544]">
            Historial del Producto
          </h1>
          <p className="mt-1 text-muted-foreground">
            {product?.name || "Producto"} · vendedores que lo movieron y cantidad vendida
          </p>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[2rem] border-[#a9c0e4] bg-[radial-gradient(circle_at_top_left,#f5fbff_0%,#e4eefb_38%,#dbe6f6_100%)] shadow-[0_20px_50px_-28px_rgba(20,52,98,0.42)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.9fr] lg:p-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#1d4f97] shadow-sm">
              <Package2 className="h-3.5 w-3.5" />
              Historial operativo
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-[#102544] md:text-4xl">
                {product?.name || "Producto"}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-[#466488] md:text-base">
                Consulta rapido quien vendio este producto, cuantas unidades movio y como se distribuyo por fecha.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b82a5]">Unidades</p>
                <p className="mt-2 text-2xl font-bold text-[#102544]">{totalUnits}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b82a5]">Registros</p>
                <p className="mt-2 text-2xl font-bold text-[#102544]">{totalTickets}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b82a5]">Vendedor top</p>
                <p className="mt-2 truncate text-xl font-bold text-[#102544]">{topSeller?.seller || "Sin datos"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[#bcd0ee] bg-white/88 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-[#1d63c4]" />
              <div>
                <p className="text-sm font-semibold text-[#102544]">Filtrar periodo</p>
                <p className="text-xs text-[#6984a7]">Historial solo de este producto</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-history-start">Fecha inicio</Label>
                <Input
                  id="product-history-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-product-history-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-history-end">Fecha fin</Label>
                <Input
                  id="product-history-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-product-history-end"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => {
                  setStartDate(today);
                  setEndDate(today);
                }}>
                  Hoy
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => {
                  setStartDate(getMonthStart(today));
                  setEndDate(today);
                }}>
                  Este mes
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[1.75rem] border-[#b7c9e6] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#102544]">Cantidad por vendedor</CardTitle>
            <CardDescription>Quien vendio mas unidades de este producto</CardDescription>
          </CardHeader>
          <CardContent>
            {sellerChartData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#c9d8ee] text-sm text-muted-foreground">
                No hay ventas de este producto en el rango
              </div>
            ) : (
              <ChartContainer config={sellerChartConfig} className="h-[300px] w-full">
                <BarChart data={sellerChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="shortName" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={56} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => `${Number(value || 0)} unidades`}
                      />
                    }
                  />
                  <Bar dataKey="quantity" fill="var(--color-quantity)" radius={[10, 10, 4, 4]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-[#b7c9e6] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#102544]">Evolucion por fecha</CardTitle>
            <CardDescription>Unidades vendidas de este producto por dia</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyChartData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#c9d8ee] text-sm text-muted-foreground">
                Sin movimientos en este periodo
              </div>
            ) : (
              <ChartContainer config={dailyChartConfig} className="h-[300px] w-full">
                <LineChart data={dailyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={56} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelKey="label"
                        formatter={(value) => `${Number(value || 0)} unidades`}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="quantity"
                    stroke="var(--color-quantity)"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "var(--color-quantity)" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.75rem] border-[#b7c9e6] bg-white/92 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-[#102544]">
            <Users className="h-5 w-5" />
            Historial de vendedores
          </CardTitle>
          <CardDescription>Detalle de quien vendio este producto y cuanta cantidad movio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredSales.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-[#c9d8ee] text-sm text-muted-foreground">
              No hay historial para este producto en el rango seleccionado
            </div>
          ) : (
            filteredSales.map((sale) => {
              const sellerName = sellerMap.get(sale.sellerId) || "Sin vendedor";
              return (
                <div
                  key={sale.id}
                  className="flex flex-col gap-2 rounded-2xl border border-[#d5e1f1] bg-[#f8fbff] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`product-history-sale-${sale.id}`}
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-[#102544]">{sellerName}</p>
                    <p className="text-sm text-[#6984a7]">{formatDateLabel(sale.saleDate)}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:text-right">
                    <div className="rounded-xl bg-[#e9f2ff] px-3 py-2 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b82a5]">Cantidad</p>
                      <p className="text-lg font-bold text-[#163f88]">{sale.quantity}</p>
                    </div>
                    <div className="rounded-xl bg-[#eef8f6] px-3 py-2 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b82a5]">Precio</p>
                      <p className="text-lg font-bold text-[#15745a]">{parseFloat(sale.unitPrice).toFixed(2)} Bs</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { BarChart3, CalendarRange, LineChart as LineChartIcon, Trophy, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { useProducts, useSellerSales, useSellers } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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

function formatCurrency(value: number) {
  return `${value.toFixed(2)} Bs`;
}

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
}

function getMonthStart(dateStr: string) {
  return `${dateStr.slice(0, 8)}01`;
}

const pieColors = ["#103c7a", "#1d63c4", "#11a7c7", "#15b48a", "#ff8b2b", "#e04f5f"];

const sellerChartConfig = {
  total: {
    label: "Ventas",
    color: "#1d63c4",
  },
} satisfies ChartConfig;

const dailyChartConfig = {
  total: {
    label: "Total diario",
    color: "#0f7f9f",
  },
} satisfies ChartConfig;

const productChartConfig = {
  total: {
    label: "Participacion",
    color: "#103c7a",
  },
} satisfies ChartConfig;

export default function SellerSalesAnalytics() {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(getMonthStart(today));
  const [endDate, setEndDate] = useState(today);

  const { data: sellers = [], isLoading: loadingSellers } = useSellers();
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: sellerSales = [], isLoading: loadingSales } = useSellerSales();

  const filteredSales = (sellerSales as SellerSale[]).filter((sale) => {
    return sale.saleDate >= startDate && sale.saleDate <= endDate;
  });

  const sellerMap = new Map((sellers as Seller[]).map((seller) => [seller.id, seller.name]));
  const productMap = new Map((products as Product[]).map((product) => [product.id, product.name]));

  const sellerTotalsRecord: Record<string, { seller: string; total: number; units: number; tickets: number }> = {};
  const dailyTotalsRecord: Record<string, { date: string; total: number; units: number }> = {};
  const productTotalsRecord: Record<string, { product: string; total: number; units: number }> = {};

  filteredSales.forEach((sale) => {
    const sellerName = sellerMap.get(sale.sellerId) || "Sin vendedor";
    const productName = productMap.get(sale.productId) || "Producto";
    const total = (parseFloat(sale.unitPrice || "0") || 0) * (sale.quantity || 0);

    if (!sellerTotalsRecord[sellerName]) {
      sellerTotalsRecord[sellerName] = { seller: sellerName, total: 0, units: 0, tickets: 0 };
    }
    sellerTotalsRecord[sellerName].total += total;
    sellerTotalsRecord[sellerName].units += sale.quantity || 0;
    sellerTotalsRecord[sellerName].tickets += 1;

    if (!dailyTotalsRecord[sale.saleDate]) {
      dailyTotalsRecord[sale.saleDate] = { date: sale.saleDate, total: 0, units: 0 };
    }
    dailyTotalsRecord[sale.saleDate].total += total;
    dailyTotalsRecord[sale.saleDate].units += sale.quantity || 0;

    if (!productTotalsRecord[productName]) {
      productTotalsRecord[productName] = { product: productName, total: 0, units: 0 };
    }
    productTotalsRecord[productName].total += total;
    productTotalsRecord[productName].units += sale.quantity || 0;
  });

  const sellerChartData = Object.values(sellerTotalsRecord)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
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

  const productChartData = Object.values(productTotalsRecord)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const totalRevenue = filteredSales.reduce((sum, sale) => {
    return sum + (parseFloat(sale.unitPrice || "0") || 0) * (sale.quantity || 0);
  }, 0);
  const totalUnits = filteredSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
  const activeSellers = sellerChartData.length;
  const averageTicket = filteredSales.length ? totalRevenue / filteredSales.length : 0;
  const topSeller = sellerChartData[0];

  if (loadingSellers || loadingProducts || loadingSales) {
    return <div className="flex h-64 items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[2rem] border-[#a9c0e4] bg-[radial-gradient(circle_at_top_left,#f5fbff_0%,#e4eefb_38%,#dbe6f6_100%)] shadow-[0_20px_50px_-28px_rgba(20,52,98,0.42)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.35fr_0.9fr] lg:p-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#1d4f97] shadow-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              Analitica de vendedores
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-[#102544] md:text-4xl">
                Ventas de vendedores por fecha
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[#466488] md:text-base">
                Filtra por rango, detecta al mejor vendedor y revisa la distribucion de ventas con una vista mas clara y visual.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b82a5]">Total vendido</p>
                <p className="mt-2 text-2xl font-bold text-[#102544]">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b82a5]">Unidades</p>
                <p className="mt-2 text-2xl font-bold text-[#102544]">{totalUnits}</p>
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
                <p className="text-xs text-[#6984a7]">Actualiza los graficos al instante</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seller-analytics-start">Fecha inicio</Label>
                <Input
                  id="seller-analytics-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-seller-analytics-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seller-analytics-end">Fecha fin</Label>
                <Input
                  id="seller-analytics-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-seller-analytics-end"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setStartDate(today);
                    setEndDate(today);
                  }}
                >
                  Hoy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setStartDate(getMonthStart(today));
                    setEndDate(today);
                  }}
                >
                  Este mes
                </Button>
              </div>

              <div className="rounded-2xl bg-[#edf4ff] p-4 text-sm text-[#204878]">
                <p className="font-semibold">Periodo activo</p>
                <p className="mt-1">
                  {formatDateLabel(startDate)} a {formatDateLabel(endDate)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b82a5]">Ingresos</p>
                <p className="mt-2 text-2xl font-bold text-[#102544]">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="rounded-2xl bg-[#e6efff] p-3 text-[#1d63c4]">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b82a5]">Promedio ticket</p>
                <p className="mt-2 text-2xl font-bold text-[#102544]">{formatCurrency(averageTicket)}</p>
              </div>
              <div className="rounded-2xl bg-[#e8fbff] p-3 text-[#0f7f9f]">
                <LineChartIcon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b82a5]">Vendedores activos</p>
                <p className="mt-2 text-2xl font-bold text-[#102544]">{activeSellers}</p>
              </div>
              <div className="rounded-2xl bg-[#edf8f1] p-3 text-[#15815f]">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b82a5]">Lider del periodo</p>
                <p className="mt-2 truncate text-xl font-bold text-[#102544]">{topSeller?.seller || "Sin datos"}</p>
                <p className="mt-1 text-sm text-[#6984a7]">{topSeller ? formatCurrency(topSeller.total) : "0.00 Bs"}</p>
              </div>
              <div className="rounded-2xl bg-[#fff3df] p-3 text-[#d97706]">
                <Trophy className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card className="rounded-[1.75rem] border-[#b7c9e6] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#102544]">Ventas por vendedor</CardTitle>
            <CardDescription>Comparacion del total vendido en el periodo filtrado</CardDescription>
          </CardHeader>
          <CardContent>
            {sellerChartData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#c9d8ee] text-sm text-muted-foreground">
                No hay ventas para mostrar en este rango
              </div>
            ) : (
              <ChartContainer config={sellerChartConfig} className="h-[300px] w-full">
                <BarChart data={sellerChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="shortName" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={72} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={[10, 10, 4, 4]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-[#b7c9e6] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#102544]">Mix por producto</CardTitle>
            <CardDescription>Participacion de los productos mas vendidos</CardDescription>
          </CardHeader>
          <CardContent>
            {productChartData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-[#c9d8ee] text-sm text-muted-foreground">
                Sin datos para el grafico
              </div>
            ) : (
              <ChartContainer config={productChartConfig} className="mx-auto h-[300px] w-full max-w-[420px]">
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="product" formatter={(value) => formatCurrency(Number(value || 0))} />}
                  />
                  <Pie
                    data={productChartData}
                    dataKey="total"
                    nameKey="product"
                    innerRadius={62}
                    outerRadius={102}
                    paddingAngle={4}
                  >
                    {productChartData.map((entry, index) => (
                      <Cell key={entry.product} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="product" />} verticalAlign="bottom" />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[1.75rem] border-[#b7c9e6] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#102544]">Evolucion diaria</CardTitle>
            <CardDescription>Seguimiento del total vendido por fecha</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyChartData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#c9d8ee] text-sm text-muted-foreground">
                No hay movimientos diarios en este rango
              </div>
            ) : (
              <ChartContainer config={dailyChartConfig} className="h-[300px] w-full">
                <LineChart data={dailyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={72} />
                  <ChartTooltip
                    content={<ChartTooltipContent labelKey="label" formatter={(value) => formatCurrency(Number(value || 0))} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-total)"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "var(--color-total)" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-[#b7c9e6] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#102544]">Ranking del periodo</CardTitle>
            <CardDescription>Detalle rapido por vendedor dentro del rango filtrado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sellerChartData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#c9d8ee] text-sm text-muted-foreground">
                No hay vendedores activos en este rango
              </div>
            ) : (
              sellerChartData.map((item, index) => (
                <div
                  key={item.seller}
                  className="flex items-center justify-between rounded-2xl border border-[#d5e1f1] bg-[#f8fbff] px-4 py-3"
                  data-testid={`card-seller-analytics-${item.seller}`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7590b2]">#{index + 1}</p>
                    <p className="truncate text-base font-semibold text-[#102544]">{item.seller}</p>
                    <p className="text-sm text-[#6984a7]">
                      {item.units} unidades · {item.tickets} registros
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#1d63c4]">{formatCurrency(item.total)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, CalendarRange, PackageCheck, Receipt, TruckIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useDeliveries, useDeliveryAssignments, useProducts } from "@/lib/api";
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

interface Delivery {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: string;
}

interface DeliveryAssignment {
  id: string;
  deliveryId: string;
  productId: string;
  quantity: number;
  unitPriceSnapshot: string;
  assignedAt: string;
  isPaid: number;
  note?: string | null;
}

const productChartConfig = {
  quantity: {
    label: "Unidades",
    color: "#1d63c4",
  },
} satisfies ChartConfig;

const dailyChartConfig = {
  quantity: {
    label: "Movimientos",
    color: "#0f7f9f",
  },
} satisfies ChartConfig;

function toIsoDate(value: string) {
  return value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
}

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
}

function getMonthStart(dateStr: string) {
  return `${dateStr.slice(0, 8)}01`;
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} Bs`;
}

export default function DeliveryHistory() {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(getMonthStart(today));
  const [endDate, setEndDate] = useState(today);
  const [match, params] = useRoute<{ deliveryId: string }>("/delivery/historial/:deliveryId");

  const { data: deliveries = [], isLoading: loadingDeliveries } = useDeliveries() as { data: Delivery[]; isLoading: boolean };
  const { data: products = [], isLoading: loadingProducts } = useProducts() as { data: Product[]; isLoading: boolean };
  const { data: assignments = [], isLoading: loadingAssignments } = useDeliveryAssignments() as { data: DeliveryAssignment[]; isLoading: boolean };

  if (!match) {
    return <div className="flex h-64 items-center justify-center">Delivery no encontrado</div>;
  }

  const deliveryId = params.deliveryId;
  const delivery = deliveries.find((item) => item.id === deliveryId);
  const productMap = new Map(products.map((product) => [product.id, product.name]));

  const filteredAssignments = assignments
    .filter((assignment) => assignment.deliveryId === deliveryId)
    .filter((assignment) => {
      const date = toIsoDate(assignment.assignedAt);
      return date >= startDate && date <= endDate;
    })
    .sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1));

  const productTotalsRecord: Record<string, { product: string; quantity: number; total: number }> = {};
  const dailyTotalsRecord: Record<string, { date: string; quantity: number; tickets: number }> = {};

  filteredAssignments.forEach((assignment) => {
    const date = toIsoDate(assignment.assignedAt);
    const productName = productMap.get(assignment.productId) || "Producto";
    const total = assignment.quantity * (parseFloat(assignment.unitPriceSnapshot || "0") || 0);

    if (!productTotalsRecord[productName]) {
      productTotalsRecord[productName] = { product: productName, quantity: 0, total: 0 };
    }
    productTotalsRecord[productName].quantity += assignment.quantity || 0;
    productTotalsRecord[productName].total += total;

    if (!dailyTotalsRecord[date]) {
      dailyTotalsRecord[date] = { date, quantity: 0, tickets: 0 };
    }
    dailyTotalsRecord[date].quantity += assignment.quantity || 0;
    dailyTotalsRecord[date].tickets += 1;
  });

  const productChartData = Object.values(productTotalsRecord)
    .sort((a, b) => b.quantity - a.quantity)
    .map((item) => ({
      ...item,
      shortName: item.product.length > 12 ? `${item.product.slice(0, 12)}...` : item.product,
    }));

  const dailyChartData = Object.values(dailyTotalsRecord)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((item) => ({
      ...item,
      label: formatDateLabel(item.date),
    }));

  const totalUnits = filteredAssignments.reduce((sum, assignment) => sum + (assignment.quantity || 0), 0);
  const totalAmount = filteredAssignments.reduce((sum, assignment) => {
    return sum + (assignment.quantity || 0) * (parseFloat(assignment.unitPriceSnapshot || "0") || 0);
  }, 0);
  const pendingUnits = filteredAssignments
    .filter((assignment) => assignment.isPaid !== 1)
    .reduce((sum, assignment) => sum + (assignment.quantity || 0), 0);
  const paidUnits = filteredAssignments
    .filter((assignment) => assignment.isPaid === 1)
    .reduce((sum, assignment) => sum + (assignment.quantity || 0), 0);

  if (loadingDeliveries || loadingProducts || loadingAssignments) {
    return <div className="flex h-64 items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="outline" className="mb-3 rounded-xl">
          <Link href="/delivery">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Inventario
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-[#102544]">
          Historial del Delivery
        </h1>
        <p className="mt-1 text-muted-foreground">
          {delivery?.name || "Delivery"} · movimientos, productos asignados y estado del stock entregado
        </p>
      </div>

      <Card className="overflow-hidden rounded-[2rem] border-[#a9c0e4] bg-[radial-gradient(circle_at_top_left,#f5fbff_0%,#e4eefb_38%,#dbe6f6_100%)] shadow-[0_20px_50px_-28px_rgba(20,52,98,0.42)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.9fr] lg:p-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#1d4f97] shadow-sm">
              <TruckIcon className="h-3.5 w-3.5" />
              Historial del delivery
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-[#102544] md:text-4xl">
                {delivery?.name || "Delivery"}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-[#466488] md:text-base">
                Consulta cuanto stock se le asigno, que productos movio y que cantidad sigue pendiente dentro del periodo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b82a5]">Unidades</p>
                <p className="mt-2 text-2xl font-bold text-[#102544]">{totalUnits}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b82a5]">Pendiente</p>
                <p className="mt-2 text-2xl font-bold text-[#102544]">{pendingUnits}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b82a5]">Pagado</p>
                <p className="mt-2 text-2xl font-bold text-[#102544]">{paidUnits}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b82a5]">Monto</p>
                <p className="mt-2 text-2xl font-bold text-[#102544]">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[#bcd0ee] bg-white/88 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-[#1d63c4]" />
              <div>
                <p className="text-sm font-semibold text-[#102544]">Filtrar periodo</p>
                <p className="text-xs text-[#6984a7]">Historial solo de este delivery</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-history-start">Fecha inicio</Label>
                <Input
                  id="delivery-history-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-delivery-history-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-history-end">Fecha fin</Label>
                <Input
                  id="delivery-history-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-delivery-history-end"
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
            <CardTitle className="text-xl text-[#102544]">Productos asignados</CardTitle>
            <CardDescription>Unidades movidas por producto en este delivery</CardDescription>
          </CardHeader>
          <CardContent>
            {productChartData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#c9d8ee] text-sm text-muted-foreground">
                No hay asignaciones en este rango
              </div>
            ) : (
              <ChartContainer config={productChartConfig} className="h-[300px] w-full">
                <BarChart data={productChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="shortName" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={56} />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => `${Number(value || 0)} unidades`} />}
                  />
                  <Bar dataKey="quantity" fill="var(--color-quantity)" radius={[10, 10, 4, 4]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-[#b7c9e6] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#102544]">Evolucion diaria</CardTitle>
            <CardDescription>Unidades asignadas por fecha</CardDescription>
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
                    content={<ChartTooltipContent labelKey="label" formatter={(value) => `${Number(value || 0)} unidades`} />}
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
            <Receipt className="h-5 w-5" />
            Historial de asignaciones
          </CardTitle>
          <CardDescription>Detalle de cada movimiento asignado a este delivery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredAssignments.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-[#c9d8ee] text-sm text-muted-foreground">
              No hay historial para este delivery en el rango seleccionado
            </div>
          ) : (
            filteredAssignments.map((assignment) => {
              const productName = productMap.get(assignment.productId) || "Producto";
              const total = assignment.quantity * (parseFloat(assignment.unitPriceSnapshot || "0") || 0);
              return (
                <div
                  key={assignment.id}
                  className="flex flex-col gap-2 rounded-2xl border border-[#d5e1f1] bg-[#f8fbff] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`delivery-history-assignment-${assignment.id}`}
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-[#102544]">{productName}</p>
                    <p className="text-sm text-[#6984a7]">{formatDateLabel(toIsoDate(assignment.assignedAt))}</p>
                    {assignment.note ? (
                      <p className="mt-1 text-sm text-[#4e6a8d]">{assignment.note}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <div className="rounded-xl bg-[#e9f2ff] px-3 py-2 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b82a5]">Cantidad</p>
                      <p className="text-lg font-bold text-[#163f88]">{assignment.quantity}</p>
                    </div>
                    <div className="rounded-xl bg-[#eef8f6] px-3 py-2 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b82a5]">Total</p>
                      <p className="text-lg font-bold text-[#15745a]">{formatCurrency(total)}</p>
                    </div>
                    <div className={`rounded-xl px-3 py-2 text-center ${assignment.isPaid === 1 ? "bg-[#ecf9f0]" : "bg-[#fff4e8]"}`}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b82a5]">Estado</p>
                      <p className={`text-sm font-bold ${assignment.isPaid === 1 ? "text-[#15815f]" : "text-[#c16a13]"}`}>
                        {assignment.isPaid === 1 ? "Pagado" : "Pendiente"}
                      </p>
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

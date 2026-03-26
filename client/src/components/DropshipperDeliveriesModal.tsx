import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Move, RefreshCcw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FilterMode = "day" | "range";

type FilterState = {
  mode: FilterMode;
  date: string;
  from: string;
  to: string;
  city: string;
  dropshipperId: string;
};

type ReportSummary = {
  dropshippers?: number | string;
  deliveries?: number | string;
  productsSold?: number | string;
  totalSalesBs?: number | string;
  totalCommissionBs?: number | string;
};

type ReportDropshipper = {
  id?: string;
  name?: string;
  city?: string;
  deliveries?: number | string;
  productsSold?: number | string;
  totalSalesBs?: number | string;
  totalCommissionBs?: number | string;
  withdrawnAmountBs?: number | string;
  availableBalanceBs?: number | string;
};

type DeliveryItem = {
  deliveryId?: string;
  deliveredAt?: string;
  reportDate?: string;
  dropshipperId?: string;
  dropshipperName?: string;
  dropshipperCity?: string;
  deliveryUserId?: string;
  deliveryUserName?: string;
  deliveryUserCity?: string;
  productId?: string;
  productName?: string;
  quantity?: number | string;
  unitPriceBs?: number | string;
  unitCommissionBs?: number | string;
  totalPriceBs?: number | string;
  totalCommissionBs?: number | string;
};

type DropshipperReportResponse = {
  filters?: Record<string, unknown>;
  summary?: ReportSummary;
  dropshippers?: ReportDropshipper[];
  deliveryItems?: DeliveryItem[];
  deliveries?: unknown[];
  error?: string;
};

interface DropshipperDeliveriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const API_BASE_URL = "https://delivery.ryztor.store";
const DESKTOP_DEFAULT_WIDTH = 860;
const DESKTOP_MIN_WIDTH = 460;
const DESKTOP_MAX_WIDTH = 1200;

function getTodayIsoLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toNumber(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInteger(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? 0), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBs(value: unknown): string {
  return `${toNumber(value).toFixed(2)} Bs`;
}

function normalizeDateRange(from: string, to: string): { from: string; to: string } {
  return from <= to ? { from, to } : { from: to, to: from };
}

function formatDate(dateValue: unknown): string {
  if (!dateValue) return "-";
  const raw = String(dateValue);
  if (raw.includes("T")) return raw.split("T")[0];
  return raw.slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function DropshipperDeliveriesModal({
  open,
  onOpenChange,
}: DropshipperDeliveriesModalProps) {
  const today = getTodayIsoLocal();
  const [mode, setMode] = useState<FilterMode>("day");
  const [date, setDate] = useState(today);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [city, setCity] = useState("");
  const [dropshipperId, setDropshipperId] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    mode: "day",
    date: today,
    from: today,
    to: today,
    city: "",
    dropshipperId: "",
  });
  const [reportData, setReportData] = useState<DropshipperReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });
  const [position, setPosition] = useState({ x: 48, y: 28 });
  const [panelWidth, setPanelWidth] = useState(DESKTOP_DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<"left" | "right" | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({
    width: DESKTOP_DEFAULT_WIDTH,
    x: 0,
    left: 48,
    right: 48 + DESKTOP_DEFAULT_WIDTH,
  });

  const getMaxPanelWidth = () => {
    if (typeof window === "undefined") {
      return DESKTOP_DEFAULT_WIDTH;
    }
    return Math.max(DESKTOP_MIN_WIDTH, Math.min(DESKTOP_MAX_WIDTH, window.innerWidth - 24));
  };

  const clampPanelWidth = (value: number) => clamp(value, DESKTOP_MIN_WIDTH, getMaxPanelWidth());

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (!desktop) return;

      const safeWidth = clampPanelWidth(panelRef.current?.offsetWidth ?? panelWidth);
      setPanelWidth((prev) => clampPanelWidth(prev));

      const panelHeight = panelRef.current?.offsetHeight ?? 820;
      const maxX = Math.max(window.innerWidth - safeWidth - 12, 12);
      const maxY = Math.max(window.innerHeight - panelHeight - 12, 12);
      setPosition((prev) => ({
        x: clamp(prev.x, 12, maxX),
        y: clamp(prev.y, 12, maxY),
      }));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [panelWidth]);

  useEffect(() => {
    if (!open || !isDesktop || !isDragging || isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const panelHeight = panelRef.current?.offsetHeight ?? 820;
      const maxX = Math.max(window.innerWidth - panelWidth - 12, 12);
      const maxY = Math.max(window.innerHeight - panelHeight - 12, 12);
      const nextX = clamp(event.clientX - dragOffsetRef.current.x, 12, maxX);
      const nextY = clamp(event.clientY - dragOffsetRef.current.y, 12, maxY);
      setPosition({ x: nextX, y: nextY });
    };

    const stopDragging = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("blur", stopDragging);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("blur", stopDragging);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [open, isDesktop, isDragging, isResizing, panelWidth]);

  useEffect(() => {
    if (!open || !isDesktop || !isResizing || !resizeDirection) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - resizeStartRef.current.x;
      const panelHeight = panelRef.current?.offsetHeight ?? 820;

      if (resizeDirection === "right") {
        const nextWidth = clampPanelWidth(resizeStartRef.current.width + deltaX);
        const maxX = Math.max(window.innerWidth - nextWidth - 12, 12);
        const maxY = Math.max(window.innerHeight - panelHeight - 12, 12);
        setPanelWidth(nextWidth);
        setPosition((prev) => ({
          x: clamp(prev.x, 12, maxX),
          y: clamp(prev.y, 12, maxY),
        }));
        return;
      }

      const nextWidth = clampPanelWidth(resizeStartRef.current.width - deltaX);
      const candidateLeft = resizeStartRef.current.right - nextWidth;
      const maxX = Math.max(window.innerWidth - nextWidth - 12, 12);
      const nextX = clamp(candidateLeft, 12, maxX);
      const maxY = Math.max(window.innerHeight - panelHeight - 12, 12);
      setPanelWidth(nextWidth);
      setPosition((prev) => ({
        x: nextX,
        y: clamp(prev.y, 12, maxY),
      }));
    };

    const stopResizing = () => {
      setIsResizing(false);
      setResizeDirection(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
    window.addEventListener("blur", stopResizing);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("blur", stopResizing);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [open, isDesktop, isResizing, resizeDirection]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (appliedFilters.mode === "day") {
          params.set("date", appliedFilters.date);
        } else {
          params.set("from", appliedFilters.from);
          params.set("to", appliedFilters.to);
        }
        if (appliedFilters.dropshipperId) {
          params.set("dropshipperId", appliedFilters.dropshipperId);
        }
        if (appliedFilters.city) {
          params.set("city", appliedFilters.city);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/reports/dropshippers?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`No se pudo obtener el reporte (${response.status})`);
        }

        const payload = (await response.json()) as DropshipperReportResponse;
        if (payload?.error) {
          throw new Error(payload.error);
        }

        setReportData(payload);
      } catch (requestError: any) {
        if (controller.signal.aborted) return;
        setReportData(null);
        setError(requestError?.message || "Error al consultar el reporte de entregas");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchReport();

    return () => {
      controller.abort();
    };
  }, [open, appliedFilters, refreshToken]);

  const handleApplyFilters = () => {
    const normalized = normalizeDateRange(fromDate, toDate);
    setAppliedFilters({
      mode,
      date,
      from: normalized.from,
      to: normalized.to,
      city: city.trim(),
      dropshipperId: dropshipperId.trim(),
    });
  };

  const handleStartDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDesktop) return;
    if (isResizing) return;
    const panelRect = panelRef.current?.getBoundingClientRect();
    if (!panelRect) return;
    dragOffsetRef.current = {
      x: event.clientX - panelRect.left,
      y: event.clientY - panelRect.top,
    };
    setIsDragging(true);
    event.preventDefault();
  };

  const handleStartResize = (direction: "left" | "right") => (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDesktop) return;
    const panelRect = panelRef.current?.getBoundingClientRect();
    if (!panelRect) return;
    setIsDragging(false);
    resizeStartRef.current = {
      width: panelWidth,
      x: event.clientX,
      left: panelRect.left,
      right: panelRect.right,
    };
    setResizeDirection(direction);
    setIsResizing(true);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleResetPosition = () => {
    setPosition({ x: 48, y: 28 });
    setPanelWidth(clampPanelWidth(DESKTOP_DEFAULT_WIDTH));
  };

  const summary = reportData?.summary || {};
  const dropshippers = reportData?.dropshippers || [];
  const deliveryItems = reportData?.deliveryItems || [];

  const periodLabel =
    appliedFilters.mode === "day"
      ? `Fecha: ${appliedFilters.date}`
      : `Desde ${appliedFilters.from} hasta ${appliedFilters.to}`;

  const dropshipperOptions = useMemo(() => {
    const uniqueById = new Map<string, { id: string; name: string }>();
    dropshippers.forEach((item) => {
      const id = String(item.id || "").trim();
      if (!id) return;
      const name = String(item.name || "Vendedor").trim() || "Vendedor";
      if (!uniqueById.has(id)) {
        uniqueById.set(id, { id, name });
      }
    });
    return Array.from(uniqueById.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [dropshippers]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none">
      <div
        ref={panelRef}
        className={
          isDesktop
            ? "pointer-events-auto fixed z-[91] relative h-[min(90vh,860px)] overflow-hidden rounded-2xl border border-[#b7c9e6] bg-white shadow-2xl"
            : "pointer-events-auto fixed inset-2 z-[91] overflow-hidden rounded-2xl border border-[#b7c9e6] bg-white shadow-2xl"
        }
        style={isDesktop ? { left: position.x, top: position.y, width: `${panelWidth}px` } : undefined}
      >
        <div className="flex items-center justify-between border-b border-[#d1dff2] bg-[#f7fbff] px-4 py-3">
          <div
            className={isDesktop ? "flex items-center gap-2 select-none cursor-move" : "flex items-center gap-2"}
            onMouseDown={handleStartDrag}
          >
            <Move className="h-4 w-4 text-[#1f4e96]" />
            <div>
              <p className="text-sm font-semibold text-[#102544]">Reporte de entregas externas</p>
              <p className="text-xs text-muted-foreground">
                Fuente: delivery.ryztor.store {isDesktop ? "| Arrastra los bordes laterales para ajustar ancho" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDesktop && (
              <Button type="button" size="sm" variant="outline" onClick={handleResetPosition}>
                Recentrar
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-dropshipper-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="h-[calc(100%-57px)] overflow-y-auto p-4 space-y-4">
          <div className="rounded-xl border border-[#d1dff2] bg-white p-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "day" ? "default" : "outline"}
                onClick={() => setMode("day")}
              >
                Por fecha
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "range" ? "default" : "outline"}
                onClick={() => setMode("range")}
              >
                Por rango
              </Button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {mode === "day" ? (
                <div className="space-y-2">
                  <Label htmlFor="dropshipper-date">Fecha</Label>
                  <Input
                    id="dropshipper-date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    data-testid="input-dropshipper-date"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="dropshipper-from">Fecha inicial</Label>
                    <Input
                      id="dropshipper-from"
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      data-testid="input-dropshipper-from-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dropshipper-to">Fecha final</Label>
                    <Input
                      id="dropshipper-to"
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      data-testid="input-dropshipper-to-date"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="dropshipper-city">Ciudad</Label>
                <Input
                  id="dropshipper-city"
                  placeholder="Ej: La Paz"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  data-testid="input-dropshipper-city"
                />
              </div>

              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select
                  value={dropshipperId || "all"}
                  onValueChange={(value) => setDropshipperId(value === "all" ? "" : value)}
                >
                  <SelectTrigger data-testid="select-dropshipper-id">
                    <SelectValue placeholder="Todos vendedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos vendedores</SelectItem>
                    {dropshipperOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button type="button" onClick={handleApplyFilters} data-testid="button-dropshipper-apply-filters">
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefreshToken((prev) => prev + 1)}
                data-testid="button-dropshipper-refresh"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
              <span className="text-xs text-muted-foreground">
                {periodLabel} | Zona horaria: America/La_Paz
              </span>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
              <p className="text-xs text-muted-foreground">Vendedores</p>
              <p className="text-lg font-semibold text-[#1a2a43]">{toInteger(summary.dropshippers)}</p>
            </div>
            <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
              <p className="text-xs text-muted-foreground">Entregas</p>
              <p className="text-lg font-semibold text-[#1a2a43]">{toInteger(summary.deliveries)}</p>
            </div>
            <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
              <p className="text-xs text-muted-foreground">Productos vendidos</p>
              <p className="text-lg font-semibold text-[#1a2a43]">{toInteger(summary.productsSold)}</p>
            </div>
            <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
              <p className="text-xs text-muted-foreground">Total ventas</p>
              <p className="text-lg font-semibold text-[#1a2a43]">{formatBs(summary.totalSalesBs)}</p>
            </div>
            <div className="rounded-lg border border-[#d1dff2] bg-[#f7fbff] p-3">
              <p className="text-xs text-muted-foreground">Total comisiones</p>
              <p className="text-lg font-semibold text-[#1a2a43]">{formatBs(summary.totalCommissionBs)}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Consultando reporte...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : (
            <>
              <div className="rounded-xl border border-[#d1dff2] bg-white">
                <div className="border-b border-[#d1dff2] px-4 py-3">
                  <p className="text-sm font-semibold text-[#102544]">Detalle de entregas</p>
                  <p className="text-xs text-muted-foreground">
                    Se muestra desde deliveryItems para incluir producto, cantidades y comisiones.
                  </p>
                </div>
                {deliveryItems.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    No hay entregas registradas en este filtro.
                  </p>
                ) : (
                  <div className="space-y-2 p-3">
                    {deliveryItems.map((item, index) => (
                      <div
                        key={`${item.deliveryId || "delivery"}-${item.productId || "product"}-${index}`}
                        className="rounded-lg border border-[#e6eefb] bg-[#fcfdff] p-3"
                      >
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <p className="text-sm">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">Fecha:</span>{" "}
                            <span className="font-medium">{formatDate(item.reportDate || item.deliveredAt)}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">Delivery:</span>{" "}
                            <span className="font-medium">{item.deliveryUserName || "-"}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">Vendedor:</span>{" "}
                            <span className="font-medium">{item.dropshipperName || "-"}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">Ciudad:</span>{" "}
                            <span className="font-medium">{item.dropshipperCity || item.deliveryUserCity || "-"}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">Producto:</span>{" "}
                            <span className="font-medium">{item.productName || "-"}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">Cantidad:</span>{" "}
                            <span className="font-medium">{toInteger(item.quantity)}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">P. Unit:</span>{" "}
                            <span className="font-medium">{formatBs(item.unitPriceBs)}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">Total:</span>{" "}
                            <span className="font-semibold">{formatBs(item.totalPriceBs)}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">Comision:</span>{" "}
                            <span className="font-semibold text-[#b94141]">{formatBs(item.totalCommissionBs)}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#d1dff2] bg-white">
                <div className="border-b border-[#d1dff2] px-4 py-3">
                  <p className="text-sm font-semibold text-[#102544]">Resumen por vendedor</p>
                </div>
                {dropshippers.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    Sin datos de vendedores para el filtro seleccionado.
                  </p>
                ) : (
                  <div className="divide-y">
                    {dropshippers.map((seller, index) => (
                      <div
                        key={`${seller.id || seller.name || "seller"}-${index}`}
                        className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(180px,1fr)_2fr]"
                      >
                        <div>
                          <p className="font-medium text-[#1a2a43]">{seller.name || "Vendedor"}</p>
                          <p className="text-xs text-muted-foreground">{seller.city || "-"}</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <p>Entregas: {toInteger(seller.deliveries)}</p>
                          <p>Productos: {toInteger(seller.productsSold)}</p>
                          <p>Ventas: {formatBs(seller.totalSalesBs)}</p>
                          <p>Comision: {formatBs(seller.totalCommissionBs)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {isDesktop && (
          <>
            <div
              className="absolute inset-y-0 left-0 z-[92] w-2 cursor-ew-resize bg-transparent hover:bg-[#d6e4f9]"
              onMouseDown={handleStartResize("left")}
              data-testid="dropshipper-modal-resize-handle-left"
              aria-label="Ajustar ancho izquierda"
              role="separator"
            />
            <div
              className="absolute inset-y-0 right-0 z-[92] w-2 cursor-ew-resize bg-transparent hover:bg-[#d6e4f9]"
              onMouseDown={handleStartResize("right")}
              data-testid="dropshipper-modal-resize-handle-right"
              aria-label="Ajustar ancho derecha"
              role="separator"
            />
          </>
        )}
      </div>
    </div>
  );
}

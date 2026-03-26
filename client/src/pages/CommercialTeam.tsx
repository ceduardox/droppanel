import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, Link2, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  useAssignSellerDirector,
  useCreateDirector,
  useCreateSeller,
  useDirectors,
  useSellers,
  useUpdateDirectorStatus,
  useUpdateSellerStatus,
} from "@/lib/api";

type DirectorRecord = {
  id: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
};

type SellerRecord = {
  id: string;
  name: string;
  isActive?: boolean;
  directorId?: string | null;
  directorAssignedFrom?: string | null;
  createdAt?: string;
};

type SellerDraft = {
  directorId: string;
  effectiveFrom: string;
};

function getTodayIsoLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export default function CommercialTeam() {
  const { toast } = useToast();
  const todayIso = getTodayIsoLocal();
  const { data: directorsRaw = [], isLoading: loadingDirectors } = useDirectors();
  const { data: sellersRaw = [], isLoading: loadingSellers } = useSellers();
  const createDirector = useCreateDirector();
  const createSeller = useCreateSeller();
  const assignSellerDirector = useAssignSellerDirector();
  const updateDirectorStatus = useUpdateDirectorStatus();
  const updateSellerStatus = useUpdateSellerStatus();

  const [newDirectorName, setNewDirectorName] = useState("");
  const [newSellerName, setNewSellerName] = useState("");
  const [newSellerDirectorId, setNewSellerDirectorId] = useState("none");
  const [newSellerEffectiveFrom, setNewSellerEffectiveFrom] = useState(todayIso);
  const [sellerDrafts, setSellerDrafts] = useState<Record<string, SellerDraft>>({});

  const directors = useMemo(() => {
    return (directorsRaw as DirectorRecord[])
      .map((director) => ({
        ...director,
        isActive: director.isActive !== false,
      }))
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      });
  }, [directorsRaw]);

  const sellers = useMemo(() => {
    return (sellersRaw as SellerRecord[])
      .map((seller) => ({
        ...seller,
        isActive: seller.isActive !== false,
      }))
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      });
  }, [sellersRaw]);

  useEffect(() => {
    setSellerDrafts((prev) => {
      const next: Record<string, SellerDraft> = { ...prev };
      let changed = false;

      sellers.forEach((seller) => {
        const fallbackDraft: SellerDraft = {
          directorId: seller.directorId || "none",
          effectiveFrom: seller.directorAssignedFrom || todayIso,
        };

        if (!next[seller.id]) {
          next[seller.id] = fallbackDraft;
          changed = true;
          return;
        }

        if (!prev[seller.id]?.effectiveFrom) {
          next[seller.id] = {
            ...next[seller.id],
            effectiveFrom: fallbackDraft.effectiveFrom,
          };
          changed = true;
        }
      });

      Object.keys(next).forEach((sellerId) => {
        if (!sellers.some((seller) => seller.id === sellerId)) {
          delete next[sellerId];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [sellers, todayIso]);

  const directorNameMap = useMemo(() => {
    return new Map(directors.map((director) => [director.id, director.name]));
  }, [directors]);

  const activeDirectors = directors.filter((director) => director.isActive).length;
  const activeSellers = sellers.filter((seller) => seller.isActive).length;
  const sellersWithDirector = sellers.filter((seller) => seller.directorId).length;
  const sellersWithoutDirector = sellers.length - sellersWithDirector;

  const activeDirectorsForSelection = directors.filter((director) => director.isActive);

  const handleCreateDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDirectorName.trim();
    if (name.length < 2) {
      toast({
        title: "Nombre invalido",
        description: "Ingresa al menos 2 caracteres para el director.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createDirector.mutateAsync({ name });
      setNewDirectorName("");
      toast({
        title: "Director creado",
        description: "El director fue registrado correctamente.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo crear el director.",
        variant: "destructive",
      });
    }
  };

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSellerName.trim();
    if (name.length < 2) {
      toast({
        title: "Nombre invalido",
        description: "Ingresa al menos 2 caracteres para el vendedor.",
        variant: "destructive",
      });
      return;
    }

    try {
      const seller = (await createSeller.mutateAsync({ name })) as SellerRecord;
      if (newSellerDirectorId !== "none") {
        const effectiveFrom = newSellerEffectiveFrom || todayIso;
        const response = await assignSellerDirector.mutateAsync({
          sellerId: seller.id,
          data: {
            directorId: newSellerDirectorId,
            effectiveFrom,
          },
        });
        toast({
          title: "Vendedor creado y asignado",
          description: `Ventas afectadas desde ${formatDate(effectiveFrom)}: ${response.affectedSales}`,
        });
      } else {
        toast({
          title: "Vendedor creado",
          description: "El vendedor fue registrado correctamente.",
        });
      }

      setNewSellerName("");
      setNewSellerDirectorId("none");
      setNewSellerEffectiveFrom(todayIso);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo crear el vendedor.",
        variant: "destructive",
      });
    }
  };

  const handleToggleDirector = async (director: DirectorRecord, nextActive: boolean) => {
    try {
      await updateDirectorStatus.mutateAsync({ directorId: director.id, isActive: nextActive });
      toast({
        title: "Estado de director actualizado",
        description: `${director.name} ahora esta ${nextActive ? "activo" : "inactivo"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar el estado del director.",
        variant: "destructive",
      });
    }
  };

  const handleToggleSeller = async (seller: SellerRecord, nextActive: boolean) => {
    try {
      await updateSellerStatus.mutateAsync({ sellerId: seller.id, isActive: nextActive });
      toast({
        title: "Estado de vendedor actualizado",
        description: `${seller.name} ahora esta ${nextActive ? "activo" : "inactivo"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar el estado del vendedor.",
        variant: "destructive",
      });
    }
  };

  const handleDraftChange = (sellerId: string, patch: Partial<SellerDraft>) => {
    setSellerDrafts((prev) => ({
      ...prev,
      [sellerId]: {
        directorId: prev[sellerId]?.directorId || "none",
        effectiveFrom: prev[sellerId]?.effectiveFrom || todayIso,
        ...patch,
      },
    }));
  };

  const handleSaveSellerDirector = async (seller: SellerRecord) => {
    const draft = sellerDrafts[seller.id];
    if (!draft) return;

    const effectiveFrom = draft.effectiveFrom || todayIso;

    try {
      const response = await assignSellerDirector.mutateAsync({
        sellerId: seller.id,
        data: {
          directorId: draft.directorId === "none" ? null : draft.directorId,
          effectiveFrom,
        },
      });

      toast({
        title: "Asignacion actualizada",
        description: `${seller.name}: ventas afectadas desde ${formatDate(effectiveFrom)}: ${response.affectedSales}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar el director del vendedor.",
        variant: "destructive",
      });
    }
  };

  if (loadingDirectors || loadingSellers) {
    return <div className="flex h-64 items-center justify-center">Cargando equipo comercial...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-5 px-1 sm:px-4 lg:px-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-[#102544]">Equipo Comercial</h1>
        <p className="mt-1 text-lg text-muted-foreground">
          Gestiona directores y vendedores con estado activo/inactivo y asignacion por fecha.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#1a2a43]">Directores activos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold text-[#183f82]">{activeDirectors}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#1a2a43]">Vendedores activos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold text-[#183f82]">{activeSellers}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#1a2a43]">Con director</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold text-[#183f82]">{sellersWithDirector}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#1a2a43]">Sin director</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold text-[#183f82]">{sellersWithoutDirector}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-2xl text-[#102544]">
              <Building2 className="h-5 w-5" />
              Nuevo Director
            </CardTitle>
            <CardDescription>Registra un director y habilitalo desde el inicio.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateDirector} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-director-name">Nombre</Label>
                <Input
                  id="new-director-name"
                  value={newDirectorName}
                  onChange={(e) => setNewDirectorName(e.target.value)}
                  placeholder="Ej: Director Norte"
                  data-testid="input-team-new-director"
                />
              </div>
              <Button
                type="submit"
                disabled={createDirector.isPending}
                data-testid="button-team-create-director"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {createDirector.isPending ? "Guardando..." : "Crear director"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-2xl text-[#102544]">
              <Users className="h-5 w-5" />
              Nuevo Vendedor
            </CardTitle>
            <CardDescription>Agrega vendedor y, opcionalmente, asigna director desde una fecha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSeller} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-seller-name">Nombre</Label>
                <Input
                  id="new-seller-name"
                  value={newSellerName}
                  onChange={(e) => setNewSellerName(e.target.value)}
                  placeholder="Ej: Vendedor Centro"
                  data-testid="input-team-new-seller"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Director inicial</Label>
                  <Select value={newSellerDirectorId} onValueChange={setNewSellerDirectorId}>
                    <SelectTrigger data-testid="select-team-new-seller-director">
                      <SelectValue placeholder="Sin director" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin director</SelectItem>
                      {activeDirectorsForSelection.map((director) => (
                        <SelectItem key={director.id} value={director.id}>
                          {director.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-seller-effective-from">Desde fecha</Label>
                  <Input
                    id="new-seller-effective-from"
                    type="date"
                    value={newSellerEffectiveFrom}
                    onChange={(e) => setNewSellerEffectiveFrom(e.target.value)}
                    data-testid="input-team-new-seller-effective-from"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={createSeller.isPending || assignSellerDirector.isPending}
                data-testid="button-team-create-seller"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {createSeller.isPending || assignSellerDirector.isPending ? "Guardando..." : "Crear vendedor"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-[#b7c9e6] bg-white/90">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl text-[#102544]">Directores</CardTitle>
          <CardDescription>Control de estado y equipos asignados por director.</CardDescription>
        </CardHeader>
        <CardContent>
          {directors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavia no hay directores registrados.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {directors.map((director) => {
                const team = sellers.filter((seller) => seller.directorId === director.id);
                const activeTeam = team.filter((seller) => seller.isActive).length;

                return (
                  <div
                    key={director.id}
                    className="rounded-xl border border-[#c8d7ed] bg-[#f8fbff] p-4"
                    data-testid={`card-team-director-${director.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-[#1a2a43]">{director.name}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${director.isActive ? "bg-green-500" : "bg-red-500"}`}
                            aria-hidden="true"
                          />
                          <span className={`text-xs font-medium ${director.isActive ? "text-green-700" : "text-red-700"}`}>
                            {director.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">Estado</span>
                        <Switch
                          checked={director.isActive}
                          disabled={updateDirectorStatus.isPending}
                          onCheckedChange={(checked) => handleToggleDirector(director, checked === true)}
                          data-testid={`switch-team-director-status-${director.id}`}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="border border-[#c9d7ea] bg-white text-[#1a2a43]">
                        {team.length} vendedores
                      </Badge>
                      <Badge variant="secondary" className="border border-[#c9d7ea] bg-white text-[#1a2a43]">
                        {activeTeam} activos
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {team.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sin vendedores asignados.</p>
                      ) : (
                        team.slice(0, 5).map((seller) => (
                          <div key={seller.id} className="flex items-center justify-between rounded-md bg-white px-2 py-1">
                            <span className="truncate text-xs font-medium text-[#1a2a43]">{seller.name}</span>
                            <span
                              className={`text-[11px] font-medium ${seller.isActive ? "text-green-700" : "text-red-700"}`}
                            >
                              {seller.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        ))
                      )}
                      {team.length > 5 && (
                        <p className="text-xs text-muted-foreground">+{team.length - 5} vendedores mas</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#b7c9e6] bg-white/90">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl text-[#102544]">Vendedores</CardTitle>
          <CardDescription>Activa/desactiva y administra a que director reporta cada vendedor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavia no hay vendedores registrados.</p>
          ) : (
            sellers.map((seller) => {
              const draft = sellerDrafts[seller.id] || {
                directorId: seller.directorId || "none",
                effectiveFrom: seller.directorAssignedFrom || todayIso,
              };
              const hasInactiveAssignedDirector =
                draft.directorId !== "none" &&
                !activeDirectorsForSelection.some((director) => director.id === draft.directorId);
              const inactiveAssignedDirectorName =
                draft.directorId !== "none" ? directorNameMap.get(draft.directorId) || "Director" : "Director";

              return (
                <div
                  key={seller.id}
                  className="rounded-xl border border-[#c8d7ed] bg-[#f8fbff] p-4"
                  data-testid={`card-team-seller-${seller.id}`}
                >
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#1a2a43]">{seller.name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${seller.isActive ? "bg-green-500" : "bg-red-500"}`}
                          aria-hidden="true"
                        />
                        <span className={`text-xs font-medium ${seller.isActive ? "text-green-700" : "text-red-700"}`}>
                          {seller.isActive ? "Activo" : "Inactivo"}
                        </span>
                        <span className="mx-1 text-xs text-muted-foreground">|</span>
                        <span className="text-xs text-muted-foreground">
                          Director actual:{" "}
                          <span className="font-medium text-[#1a2a43]">
                            {seller.directorId ? directorNameMap.get(seller.directorId) || "Director" : "Sin director"}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Estado</span>
                      <Switch
                        checked={seller.isActive}
                        disabled={updateSellerStatus.isPending}
                        onCheckedChange={(checked) => handleToggleSeller(seller, checked === true)}
                        data-testid={`switch-team-seller-status-${seller.id}`}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Link2 className="h-3.5 w-3.5" />
                        Asignar director
                      </Label>
                      <Select
                        value={draft.directorId}
                        onValueChange={(value) => handleDraftChange(seller.id, { directorId: value })}
                      >
                        <SelectTrigger data-testid={`select-team-seller-director-${seller.id}`}>
                          <SelectValue placeholder="Sin director" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin director</SelectItem>
                          {hasInactiveAssignedDirector && (
                            <SelectItem value={draft.directorId}>
                              {inactiveAssignedDirectorName} (inactivo)
                            </SelectItem>
                          )}
                          {activeDirectorsForSelection.map((director) => (
                            <SelectItem key={director.id} value={director.id}>
                              {director.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Vigente desde
                      </Label>
                      <Input
                        type="date"
                        value={draft.effectiveFrom}
                        onChange={(e) => handleDraftChange(seller.id, { effectiveFrom: e.target.value })}
                        data-testid={`input-team-seller-effective-from-${seller.id}`}
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={() => handleSaveSellerDirector(seller)}
                        disabled={assignSellerDirector.isPending}
                        data-testid={`button-team-save-seller-director-${seller.id}`}
                      >
                        Guardar director
                      </Button>
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

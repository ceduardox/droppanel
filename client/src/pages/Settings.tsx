import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, CalendarDays, Globe2, Save, ShieldPlus, Upload, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminCreateUser,
  useAdminUpdateUserAccess,
  useAdminUsers,
  useBusinessSettings,
  useAdminResetUserPassword,
  useSaveBusinessSettings,
  useUploadBusinessLogo,
  type BusinessSettingsPayload,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  appPermissionKeys,
  getPermissionsTemplate,
  getRolePresetPermissions,
  normalizePermissions,
  permissionLabels,
  type AppPermissions,
} from "@/lib/permissions";

const defaultForm: BusinessSettingsPayload = {
  businessName: "Mi Negocio",
  logoUrl: "",
  currency: "Bs",
  timeZone: "America/La_Paz",
  dateFormat: "dd/MM/yyyy",
};

const currencyOptions = ["Bs", "USD", "EUR", "ARS", "CLP", "PEN"];
const timeZoneOptions = [
  "America/La_Paz",
  "America/Lima",
  "America/Santiago",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
];
const dateFormatOptions: BusinessSettingsPayload["dateFormat"][] = [
  "dd/MM/yyyy",
  "MM/dd/yyyy",
  "yyyy-MM-dd",
];

type AccessEditorState = {
  role: string;
  permissions: AppPermissions;
};

function resolveLogoPreviewUrl(logoUrl: string): string {
  const clean = logoUrl.trim();
  if (!clean) return "";
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  if (clean.startsWith("/uploads/")) return clean;
  if (clean.startsWith("/api/storage/")) return clean;
  if (clean.startsWith("/")) return clean;
  return `/api/storage/${clean}`;
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const { data, isLoading } = useBusinessSettings() as {
    data?: BusinessSettingsPayload;
    isLoading: boolean;
  };
  const { data: adminUsers = [], isLoading: loadingAdminUsers } = useAdminUsers(isAdmin);
  const createAdminUser = useAdminCreateUser();
  const updateAdminAccess = useAdminUpdateUserAccess();
  const resetUserPassword = useAdminResetUserPassword();
  const saveBusinessSettings = useSaveBusinessSettings();
  const uploadBusinessLogo = useUploadBusinessLogo();
  const [form, setForm] = useState<BusinessSettingsPayload>(defaultForm);
  const [logoError, setLogoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("vendedor");
  const [newPermissions, setNewPermissions] = useState<AppPermissions>(() => getPermissionsTemplate(false));
  const [accessEditors, setAccessEditors] = useState<Record<string, AccessEditorState>>({});
  const [passwordEdits, setPasswordEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    setForm({
      businessName: data.businessName || defaultForm.businessName,
      logoUrl: data.logoUrl || "",
      currency: data.currency || defaultForm.currency,
      timeZone: data.timeZone || defaultForm.timeZone,
      dateFormat: data.dateFormat || defaultForm.dateFormat,
    });
  }, [data]);

  useEffect(() => {
    setLogoError(false);
  }, [form.logoUrl]);

  useEffect(() => {
    if (!isAdmin || adminUsers.length === 0) return;
    const nextState: Record<string, AccessEditorState> = {};
    adminUsers.forEach((adminUser) => {
      nextState[adminUser.id] = {
        role: adminUser.role || "viewer",
        permissions: normalizePermissions(adminUser.permissions, true),
      };
    });
    setAccessEditors(nextState);
  }, [isAdmin, adminUsers]);

  const initials = useMemo(() => {
    const cleaned = form.businessName.trim();
    if (!cleaned) return "MN";
    const words = cleaned.split(/\s+/).slice(0, 2);
    return words.map((word) => word[0]?.toUpperCase() || "").join("") || "MN";
  }, [form.businessName]);
  const logoPreviewUrl = useMemo(() => resolveLogoPreviewUrl(form.logoUrl), [form.logoUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: BusinessSettingsPayload = {
        ...form,
        businessName: form.businessName.trim(),
        logoUrl: form.logoUrl.trim(),
      };
      await saveBusinessSettings.mutateAsync(payload);
      toast({
        title: "Configuracion guardada",
        description: "Los datos del negocio fueron actualizados.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo guardar la configuracion.",
        variant: "destructive",
      });
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadBusinessLogo.mutateAsync(file);
      setForm((prev) => ({ ...prev, logoUrl: result.logoUrl }));
      toast({
        title: "Logo subido",
        description: "El archivo se subio correctamente.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo subir el logo.",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const toggleNewPermission = (key: keyof AppPermissions, checked: boolean) => {
    setNewPermissions((prev) => ({ ...prev, [key]: checked }));
  };

  const toggleEditorPermission = (userId: string, key: keyof AppPermissions, checked: boolean) => {
    setAccessEditors((prev) => ({
      ...prev,
      [userId]: {
        role: prev[userId]?.role || "viewer",
        permissions: {
          ...(prev[userId]?.permissions || getPermissionsTemplate(false)),
          [key]: checked,
        },
      },
    }));
  };

  const applyPresetToNewRole = (role: string) => {
    const preset = getRolePresetPermissions(role);
    if (!preset) return;
    setNewPermissions(preset);
  };

  const applyPresetToExistingRole = (userId: string, role: string) => {
    const preset = getRolePresetPermissions(role);
    if (!preset) return;
    setAccessEditors((prev) => ({
      ...prev,
      [userId]: {
        role: role.trim(),
        permissions: preset,
      },
    }));
  };

  const handleCreateUserWithAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const roleValue = newRole.trim();
      const preset = getRolePresetPermissions(roleValue);
      await createAdminUser.mutateAsync({
        name: newUserName.trim(),
        username: newUsername.trim(),
        password: newPassword,
        role: roleValue,
        permissions: preset || newPermissions,
      });
      setNewUserName("");
      setNewUsername("");
      setNewPassword("");
      setNewRole("vendedor");
      setNewPermissions(getPermissionsTemplate(false));
      toast({
        title: "Usuario creado",
        description: "Se creo el usuario con su rol y permisos.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo crear el usuario.",
        variant: "destructive",
      });
    }
  };

  const handleSaveUserAccess = async (userId: string) => {
    const draft = accessEditors[userId];
    if (!draft) return;
    try {
      const roleValue = draft.role.trim();
      const preset = getRolePresetPermissions(roleValue);
      await updateAdminAccess.mutateAsync({
        id: userId,
        data: {
          role: roleValue,
          permissions: preset || draft.permissions,
        },
      });
      toast({
        title: "Acceso actualizado",
        description: "Rol y permisos guardados.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar el acceso.",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (userId: string) => {
    const password = (passwordEdits[userId] || "").trim();
    if (password.length < 6) {
      toast({
        title: "Contrasena invalida",
        description: "Minimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      await resetUserPassword.mutateAsync({ id: userId, password });
      setPasswordEdits((prev) => ({ ...prev, [userId]: "" }));
      toast({
        title: "Contrasena actualizada",
        description: "La nueva contrasena fue guardada.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar la contrasena.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-5 px-1 sm:px-4 lg:px-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-[#102544]">Configuracion</h1>
        <p className="mt-1 text-lg text-muted-foreground">Datos base de tu negocio</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90 shadow-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="flex items-center gap-2 text-2xl text-[#102544]">
              <Building2 className="h-5 w-5" />
              Negocio
            </CardTitle>
            <CardDescription>Configura nombre, logo, moneda, zona horaria y formato de fecha.</CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={handleSave}>
              <div className="space-y-2">
                <Label htmlFor="businessName">Nombre del negocio</Label>
                <Input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Ej: Dropanel Bolivia"
                  maxLength={120}
                  data-testid="input-business-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo (URL o archivo)</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="logoUrl"
                    type="text"
                    value={form.logoUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://... o ruta subida"
                    className="flex-1"
                    data-testid="input-logo-url"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadBusinessLogo.isPending}
                    data-testid="button-upload-logo"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadBusinessLogo.isPending ? "Subiendo..." : "Subir archivo"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleUploadLogo}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Despues de subir el logo, presiona "Guardar configuracion".</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger id="currency" data-testid="select-currency">
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Formato de fecha</Label>
                  <Select
                    value={form.dateFormat}
                    onValueChange={(value: BusinessSettingsPayload["dateFormat"]) =>
                      setForm((prev) => ({ ...prev, dateFormat: value }))
                    }
                  >
                    <SelectTrigger id="dateFormat" data-testid="select-date-format">
                      <SelectValue placeholder="Seleccionar formato" />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFormatOptions.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeZone">Zona horaria</Label>
                <Select
                  value={form.timeZone}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, timeZone: value }))}
                >
                  <SelectTrigger id="timeZone" data-testid="select-timezone">
                    <SelectValue placeholder="Seleccionar zona horaria" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeZoneOptions.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={saveBusinessSettings.isPending}
                data-testid="button-save-business-settings"
              >
                <Save className="mr-2 h-4 w-4" />
                {saveBusinessSettings.isPending ? "Guardando..." : "Guardar configuracion"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-[#102544]">Vista previa</CardTitle>
            <CardDescription>Asi se vera la identidad principal en el panel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-[#ccd8ec] bg-[#f2f7ff] p-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[#d9e7ff] text-sm font-bold text-[#19438a]">
                {logoPreviewUrl && !logoError ? (
                  <img
                    src={logoPreviewUrl}
                    alt={form.businessName || "Logo"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[#1a2a43]">{form.businessName || "Mi Negocio"}</p>
                <p className="text-xs text-muted-foreground">Panel operativo</p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-[#ccd8ec] bg-white p-3">
              <div className="flex items-center gap-2 text-sm">
                <Globe2 className="h-4 w-4 text-[#1d4f97]" />
                <span className="font-medium text-[#1a2a43]">Moneda:</span>
                <span>{form.currency}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-[#1d4f97]" />
                <span className="font-medium text-[#1a2a43]">Fecha:</span>
                <span>{form.dateFormat}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Globe2 className="h-4 w-4 text-[#1d4f97]" />
                <span className="font-medium text-[#1a2a43]">Zona:</span>
                <span className="truncate">{form.timeZone}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card className="rounded-2xl border-[#b7c9e6] bg-white/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-2xl text-[#102544]">
              <ShieldPlus className="h-5 w-5" />
              Usuarios, Roles y Permisos
            </CardTitle>
            <CardDescription>
              Crea usuarios y define que modulos pueden usar. Solo disponible para la cuenta admin principal.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleCreateUserWithAccess} className="space-y-4 rounded-xl border border-[#ccd8ec] bg-[#f7fbff] p-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#1d4f97]" />
                <p className="text-sm font-semibold text-[#1a2a43]">Crear nuevo usuario</p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="admin-new-name">Nombre</Label>
                  <Input
                    id="admin-new-name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Nombre completo"
                    required
                    data-testid="input-admin-new-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-new-username">Usuario</Label>
                  <Input
                    id="admin-new-username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="usuario"
                    required
                    data-testid="input-admin-new-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-new-password">Contrasena</Label>
                  <Input
                    id="admin-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimo 6 caracteres"
                    required
                    minLength={6}
                    data-testid="input-admin-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-new-role">Rol</Label>
                  <div className="flex gap-2">
                    <Input
                      id="admin-new-role"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      onBlur={() => applyPresetToNewRole(newRole)}
                      placeholder="vendedor, supervisor, contador..."
                      required
                      data-testid="input-admin-new-role"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => applyPresetToNewRole(newRole)}
                      data-testid="button-apply-new-role-preset"
                    >
                      Preset
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Si el rol es <span className="font-semibold">contador</span>, usa Preset para aplicar permisos recomendados.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-[#1a2a43]">Permisos iniciales</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {appPermissionKeys.map((key) => (
                    <label key={key} className="flex items-center gap-2 rounded-md border border-[#d4e0f1] bg-white px-3 py-2 text-sm">
                      <Checkbox
                        checked={newPermissions[key]}
                        onCheckedChange={(checked) => toggleNewPermission(key, checked === true)}
                        data-testid={`checkbox-new-permission-${key}`}
                      />
                      <span>{permissionLabels[key]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={createAdminUser.isPending} data-testid="button-admin-create-user">
                {createAdminUser.isPending ? "Creando..." : "Crear usuario con permisos"}
              </Button>
            </form>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#1a2a43]">Usuarios existentes</p>
              {loadingAdminUsers ? (
                <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
              ) : (
                <div className="space-y-3">
                  {adminUsers.map((adminUser) => {
                    const editor = accessEditors[adminUser.id];
                    const editorPermissions = editor?.permissions || normalizePermissions(adminUser.permissions, true);
                    const isLocked = adminUser.isSystemAdmin;
                    return (
                      <div key={adminUser.id} className="rounded-xl border border-[#ccd8ec] bg-white p-4">
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#1a2a43]">
                              {adminUser.name} ({adminUser.username})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isLocked ? "Admin principal (acceso fijo)" : "Usuario configurable"}
                            </p>
                          </div>
                          <div className="w-full space-y-1 sm:w-72">
                            <div className="flex gap-2">
                              <Input
                                value={editor?.role || adminUser.role}
                                disabled={isLocked}
                                onChange={(e) =>
                                  setAccessEditors((prev) => ({
                                    ...prev,
                                    [adminUser.id]: {
                                      role: e.target.value,
                                      permissions: editorPermissions,
                                    },
                                  }))
                                }
                                onBlur={() => applyPresetToExistingRole(adminUser.id, editor?.role || adminUser.role)}
                                data-testid={`input-role-${adminUser.id}`}
                              />
                              {!isLocked && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => applyPresetToExistingRole(adminUser.id, editor?.role || adminUser.role)}
                                  data-testid={`button-role-preset-${adminUser.id}`}
                                >
                                  Preset
                                </Button>
                              )}
                            </div>
                            {(editor?.role || adminUser.role).trim().toLowerCase() === "contador" && adminUser.visibleFrom && (
                              <p className="text-xs text-muted-foreground">
                                Inicio visible: <span className="font-semibold">{adminUser.visibleFrom}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {appPermissionKeys.map((key) => (
                            <label key={`${adminUser.id}-${key}`} className="flex items-center gap-2 rounded-md border border-[#d4e0f1] bg-[#f9fbff] px-3 py-2 text-sm">
                              <Checkbox
                                checked={editorPermissions[key]}
                                disabled={isLocked}
                                onCheckedChange={(checked) => toggleEditorPermission(adminUser.id, key, checked === true)}
                                data-testid={`checkbox-permission-${adminUser.id}-${key}`}
                              />
                              <span>{permissionLabels[key]}</span>
                            </label>
                          ))}
                        </div>

                        {!isLocked && (
                          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
                            <Input
                              type="password"
                              value={passwordEdits[adminUser.id] || ""}
                              onChange={(e) =>
                                setPasswordEdits((prev) => ({
                                  ...prev,
                                  [adminUser.id]: e.target.value,
                                }))
                              }
                              placeholder="Nueva contrasena"
                              data-testid={`input-password-reset-${adminUser.id}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleResetPassword(adminUser.id)}
                              disabled={resetUserPassword.isPending}
                              data-testid={`button-reset-password-${adminUser.id}`}
                            >
                              {resetUserPassword.isPending ? "Guardando..." : "Cambiar contrasena"}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleSaveUserAccess(adminUser.id)}
                              disabled={updateAdminAccess.isPending}
                              data-testid={`button-save-access-${adminUser.id}`}
                            >
                              {updateAdminAccess.isPending ? "Guardando..." : "Guardar acceso"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

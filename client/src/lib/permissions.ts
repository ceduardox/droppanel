export const appPermissionKeys = [
  "dashboard",
  "products",
  "sales",
  "reports",
  "salesReport",
  "capitalIncrease",
  "grossCapital",
  "sellerReport",
  "expenses",
  "expensesReport",
  "delivery",
  "settings",
  "userAdmin",
] as const;

export type AppPermissionKey = (typeof appPermissionKeys)[number];
export type AppPermissions = Record<AppPermissionKey, boolean>;

export const permissionLabels: Record<AppPermissionKey, string> = {
  dashboard: "Dashboard",
  products: "Productos",
  sales: "Ventas",
  reports: "Reportes",
  salesReport: "Reporte Ventas",
  capitalIncrease: "Aumento Capital",
  grossCapital: "Capital Bruto",
  sellerReport: "Reporte Vendedores",
  expenses: "Gastos",
  expensesReport: "Reporte Gastos",
  delivery: "Delivery",
  settings: "Configuracion",
  userAdmin: "Administrar Usuarios",
};

export const routePermissionMap: Record<string, AppPermissionKey> = {
  "/dashboard": "dashboard",
  "/productos": "products",
  "/ventas": "sales",
  "/reportes": "reports",
  "/reporte-ventas": "salesReport",
  "/aumento-capital": "capitalIncrease",
  "/capital-bruto": "grossCapital",
  "/reporte-vendedores": "sellerReport",
  "/gastos": "expenses",
  "/reporte-gastos": "expensesReport",
  "/delivery": "delivery",
  "/configuracion": "settings",
};

export const getPermissionsTemplate = (value: boolean): AppPermissions =>
  appPermissionKeys.reduce((acc, key) => {
    acc[key] = value;
    return acc;
  }, {} as AppPermissions);

export const normalizePermissions = (
  input?: Partial<AppPermissions> | null,
  fallbackValue = true
): AppPermissions => ({
  ...getPermissionsTemplate(fallbackValue),
  ...(input || {}),
});

export const hasPermission = (
  permissions: Partial<AppPermissions> | null | undefined,
  key: AppPermissionKey | undefined,
  isAdmin?: boolean
) => {
  if (!key) return true;
  if (isAdmin) return true;
  return Boolean(permissions?.[key]);
};

export const getRolePresetPermissions = (role: string): AppPermissions | null => {
  const roleKey = role.trim().toLowerCase();
  if (roleKey !== "contador") return null;

  return {
    dashboard: true,
    products: false,
    sales: false,
    reports: true,
    salesReport: true,
    capitalIncrease: false,
    grossCapital: false,
    sellerReport: true,
    expenses: true,
    expensesReport: true,
    delivery: true,
    settings: false,
    userAdmin: false,
  };
};

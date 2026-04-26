import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, pool } from "./db";
import multer from "multer";
import { insertProductSchema, insertSaleSchema, insertDailyPaymentSchema, insertExpenseCategorySchema, insertExpenseSchema, insertDeliverySchema, insertDeliveryStockEntrySchema, insertDeliveryAssignmentSchema, insertCapitalMovementSchema, insertGrossCapitalMovementSchema, insertProfitSettlementSchema, insertDirectorSchema, insertDirectorExpenseSchema, insertSellerSchema, insertSellerSaleSchema } from "@shared/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import fs from "fs/promises";
import { Client } from "@replit/object-storage";

// Configure session
declare module 'express-session' {
  interface SessionData {
    userId: string;
    impersonateUserId?: string;
    isAdmin?: boolean;
  }
}

// Configure multer for image uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
});

// Middleware to check authentication
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
};

// Helper to get effective user ID (for admin impersonation)
const getEffectiveUserId = (req: any): string => {
  return req.session.impersonateUserId || req.session.userId;
};

const permissionKeys = [
  "dashboard",
  "products",
  "sales",
  "reports",
  "financialStatus",
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

type AppPermissions = Record<(typeof permissionKeys)[number], boolean>;

const getPermissionsTemplate = (value: boolean): AppPermissions =>
  permissionKeys.reduce((acc, key) => {
    acc[key] = value;
    return acc;
  }, {} as AppPermissions);

const permissionSchema = z.object({
  dashboard: z.boolean(),
  products: z.boolean(),
  sales: z.boolean(),
  reports: z.boolean(),
  financialStatus: z.boolean(),
  salesReport: z.boolean(),
  capitalIncrease: z.boolean(),
  grossCapital: z.boolean(),
  sellerReport: z.boolean(),
  expenses: z.boolean(),
  expensesReport: z.boolean(),
  delivery: z.boolean(),
  settings: z.boolean(),
  userAdmin: z.boolean(),
});

const adminUserCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(60),
  password: z.string().min(6).max(100),
  role: z.string().trim().min(2).max(40),
  permissions: permissionSchema,
});

const adminUserAccessUpdateSchema = z.object({
  role: z.string().trim().min(2).max(40),
  permissions: permissionSchema,
});

const adminUserNameUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha invalida. Usa YYYY-MM-DD");

const parseOptionalIsoDate = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw.split("T")[0] : raw.slice(0, 10);
  const iso = isoDateSchema.parse(normalized);
  return {
    iso,
    date: new Date(`${iso}T00:00:00.000`),
  };
};

const deliveryAssignmentUpdateSchema = z.object({
  deliveryId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceSnapshot: z.string().min(1),
  note: z.string().trim().max(1000).nullable().optional(),
  assignedAt: isoDateSchema.optional(),
});

const sellerDirectorUpdateSchema = z.object({
  directorId: z.string().trim().min(1).nullable().optional(),
  effectiveFrom: isoDateSchema,
});

const directorReportVisibilitySchema = z.object({
  showProfitInReport: z.boolean(),
});

const entityStatusSchema = z.object({
  isActive: z.boolean(),
});

const profitSettlementPayloadSchema = z.object({
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
  settlementDate: isoDateSchema,
  payableProfitSnapshot: z.coerce.number().positive(),
  note: z.string().trim().max(1000).optional().nullable(),
});

const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "No autenticado" });
  }
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: "Permisos insuficientes" });
  }
  next();
};

const mergePermissions = (
  stored: Partial<AppPermissions> | null | undefined,
  defaultValue: boolean
): AppPermissions => {
  const merged: AppPermissions = {
    ...getPermissionsTemplate(defaultValue),
    ...(stored || {}),
  };

  if (stored?.financialStatus === undefined) {
    merged.financialStatus = stored?.reports ?? defaultValue;
  }

  return merged;
};

const normalizeRoleKey = (value: string | null | undefined) => (value || "").trim().toLowerCase();
const isAccountantRole = (value: string | null | undefined) => normalizeRoleKey(value) === "contador";

const enforceRolePermissions = (role: string, permissions: AppPermissions): AppPermissions => {
  if (!isAccountantRole(role)) return permissions;

  return {
    ...permissions,
    dashboard: true,
    products: false,
    capitalIncrease: false,
    grossCapital: false,
    settings: false,
    userAdmin: false,
  };
};

const toIsoDate = (value: unknown): string | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    if (value.includes("T")) return value.split("T")[0];
    return value.slice(0, 10);
  }
  return null;
};

const isOnOrAfterDate = (value: unknown, minDate?: string | null) => {
  if (!minDate) return true;
  const dateValue = toIsoDate(value);
  if (!dateValue) return false;
  return dateValue >= minDate;
};

const clampStartDate = (startDate: string, minDate?: string | null): string => {
  if (!minDate) return startDate;
  return startDate < minDate ? minDate : startDate;
};

const normalizeOptionalId = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized.toLowerCase() === "none") return null;
  return normalized;
};

const parseSafeInteger = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? 0), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getDeliveryProductAvailability = async (params: {
  userId: string;
  deliveryId: string;
  productId: string;
  excludeSaleId?: string;
}) => {
  const { userId, deliveryId, productId, excludeSaleId } = params;
  const [assignments, sales] = await Promise.all([
    storage.getDeliveryAssignments(userId),
    storage.getSales(userId),
  ]);

  const assignedTotal = assignments.reduce((sum, assignment) => {
    if (assignment.deliveryId !== deliveryId) return sum;
    if (assignment.productId !== productId) return sum;
    return sum + parseSafeInteger(assignment.quantity);
  }, 0);

  const sold = sales.reduce((sum, sale) => {
    if (excludeSaleId && sale.id === excludeSaleId) return sum;
    if (sale.deliveryId !== deliveryId) return sum;
    if (sale.productId !== productId) return sum;
    return sum + parseSafeInteger(sale.quantity);
  }, 0);

  return {
    assignedTotal,
    sold,
    available: assignedTotal - sold,
  };
};

type AccessContext = {
  role: string;
  isAccountant: boolean;
  visibleFrom: string | null;
  commissionRate: number;
  commissionSeller: string;
};

const getAccessContext = async (req: any): Promise<AccessContext> => {
  if (req._accessContext) {
    return req._accessContext as AccessContext;
  }

  if (req.session?.isAdmin) {
    const context: AccessContext = {
      role: "owner",
      isAccountant: false,
      visibleFrom: null,
      commissionRate: 0,
      commissionSeller: "",
    };
    req._accessContext = context;
    return context;
  }

  const access = await storage.getUserAccessControl(req.session.userId);
  const role = access?.role || "viewer";
  const context: AccessContext = {
    role,
    isAccountant: isAccountantRole(role),
    visibleFrom: access?.visibleFrom || null,
    commissionRate: parseFloat(access?.commissionRate || "0"),
    commissionSeller: access?.commissionSeller || "Jose Eduardo",
  };
  req._accessContext = context;
  return context;
};

const sanitizeProductForRestrictedRole = (product: any) => ({
  id: product.id,
  name: product.name,
  isActive: product.isActive,
  price: product.price,
  imageUrl: product.imageUrl,
  userId: product.userId,
  createdAt: product.createdAt,
});

const resolvePrimaryDataOwner = async () => {
  const configuredOwner = process.env.DATA_OWNER_USERNAME?.trim();
  const allUsers = await storage.getAllUsers();

  const findByUsername = (username: string) =>
    allUsers.find((candidate) => candidate.username.trim().toLowerCase() === username.trim().toLowerCase());

  if (configuredOwner) {
    const exact = await storage.getUserByUsername(configuredOwner);
    if (exact) return exact;
    const normalized = findByUsername(configuredOwner);
    if (normalized) return await storage.getUser(normalized.id);
  }

  // Common owner usernames used in this project history.
  for (const fallback of ["jhonattan", "jhoanttan"]) {
    const normalized = findByUsername(fallback);
    if (normalized) {
      return await storage.getUser(normalized.id);
    }
  }

  // Heuristic fallback: find first non-admin/non-accountant user with business data.
  const operationalCandidates = allUsers.filter(
    (candidate) => candidate.username.trim().toLowerCase() !== "arely"
  );
  for (const candidate of operationalCandidates) {
    const access = await storage.getUserAccessControl(candidate.id);
    if (isAccountantRole(access?.role)) continue;

    const [candidateProducts, candidateDeliveries, candidateSales] = await Promise.all([
      storage.getProducts(candidate.id),
      storage.getDeliveries(candidate.id),
      storage.getSales(candidate.id),
    ]);
    if (candidateProducts.length || candidateDeliveries.length || candidateSales.length) {
      return await storage.getUser(candidate.id);
    }
  }

  // Last resort: first non-admin user.
  const fallbackUser = operationalCandidates[0];
  if (fallbackUser) {
    return await storage.getUser(fallbackUser.id);
  }

  return null;
};

const buildAuthPayload = async (userId: string, isAdmin: boolean) => {
  const user = await storage.getUser(userId);
  if (!user) return null;

  if (isAdmin) {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      isAdmin: true,
      role: "owner",
      permissions: getPermissionsTemplate(true),
      visibleFrom: null,
      commissionRate: 0,
      commissionSeller: "",
    };
  }

  const access = await storage.getUserAccessControl(user.id);
  const role = access?.role || "viewer";
  const rawPermissions = mergePermissions(access?.permissions as Partial<AppPermissions> | undefined, !access);
  const permissions = enforceRolePermissions(role, rawPermissions);
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    isAdmin: false,
    role,
    permissions,
    visibleFrom: access?.visibleFrom || null,
    commissionRate: parseFloat(access?.commissionRate || "0"),
    commissionSeller: access?.commissionSeller || "Jose Eduardo",
  };
};

const businessSettingsPayloadSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  logoUrl: z.string().trim().max(500).optional(),
  currency: z.string().trim().min(1).max(10),
  timeZone: z.string().trim().min(3).max(100),
  dateFormat: z.enum(["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd"]),
});

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");
const STORAGE_BACKFILL_MARKER = path.join(
  UPLOADS_ROOT,
  ".object-storage-backfill-complete",
);
let storageBackfillStarted = false;
let objectStorageClient: Client | null = null;
let objectStorageDisabled = false;

const sanitizeFileName = (fileName: string): string =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const normalizeStorageKey = (key: string): string =>
  key
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");

const buildStorageKey = (folder: string, originalName: string): string =>
  `${normalizeStorageKey(folder)}/${Date.now()}-${sanitizeFileName(originalName)}`;

const resolveUploadPath = (key: string): string => {
  const normalized = normalizeStorageKey(key);
  const resolvedPath = path.resolve(UPLOADS_ROOT, normalized);
  const uploadsBase = path.resolve(UPLOADS_ROOT);
  if (!resolvedPath.startsWith(uploadsBase)) {
    throw new Error("Invalid storage path");
  }
  return resolvedPath;
};

const shouldSkipStorageKey = (key: string): boolean =>
  !key || /^https?:\/\//i.test(key);

const getErrorMessage = (error: unknown): string => {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return String(error);
};

const parseOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return undefined;
  if (["true", "1", "yes", "on", "active", "activo"].includes(normalized)) return true;
  if (["false", "0", "no", "off", "inactive", "inactivo"].includes(normalized)) return false;
  return undefined;
};

const isReplitObjectStorageUnavailable = (error: unknown): boolean => {
  const message = getErrorMessage(error);
  return (
    message.includes("127.0.0.1:1106") ||
    message.includes("credential failed") ||
    message.includes("running on Replit")
  );
};

function markObjectStorageUnavailable(error: unknown): void {
  if (isReplitObjectStorageUnavailable(error) && !objectStorageDisabled) {
    objectStorageDisabled = true;
    console.warn(
      "Replit Object Storage unavailable in this runtime; using local uploads only.",
    );
  }
}

function getObjectStorageClient(): Client | null {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim();
  if (!bucketId || objectStorageDisabled) return null;
  if (!objectStorageClient) {
    objectStorageClient = new Client({ bucketId });
  }
  return objectStorageClient;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeLocalUpload(key: string, bytes: Buffer): Promise<boolean> {
  try {
    const localFilePath = resolveUploadPath(key);
    await fs.mkdir(path.dirname(localFilePath), { recursive: true });
    await fs.writeFile(localFilePath, bytes);
    return true;
  } catch (error) {
    console.error("Local upload write failed:", error);
    return false;
  }
}

async function readLocalUpload(key: string): Promise<Buffer | null> {
  try {
    const localFilePath = resolveUploadPath(key);
    return await fs.readFile(localFilePath);
  } catch {
    return null;
  }
}

async function uploadToStorage(key: string, bytes: Buffer): Promise<boolean> {
  const normalizedKey = normalizeStorageKey(key);
  if (shouldSkipStorageKey(normalizedKey)) return false;

  const localOk = await writeLocalUpload(normalizedKey, bytes);
  let remoteOk = false;

  const objectStorage = getObjectStorageClient();
  if (objectStorage) {
    try {
      const result = await objectStorage.uploadFromBytes(normalizedKey, bytes);
      remoteOk = result.ok;
      if (!result.ok) {
        markObjectStorageUnavailable(result.error);
        console.warn(
          "Object storage upload failed; local copy was kept.",
          result.error,
        );
      }
    } catch (error) {
      markObjectStorageUnavailable(error);
      console.warn("Object storage upload failed; local copy was kept.");
      console.warn(error);
    }
  }

  return localOk || remoteOk;
}

async function downloadFromStorage(key: string): Promise<Buffer | null> {
  const normalizedKey = normalizeStorageKey(key);
  if (shouldSkipStorageKey(normalizedKey)) return null;

  const localFile = await readLocalUpload(normalizedKey);
  if (localFile) return localFile;

  const objectStorage = getObjectStorageClient();
  if (objectStorage) {
    try {
      const result = await objectStorage.downloadAsBytes(normalizedKey);
      if (result.ok) {
        const bytes = Buffer.from(result.value[0]);
        const cached = await writeLocalUpload(normalizedKey, bytes);
        if (!cached) {
          console.warn(
            "Downloaded from object storage but failed to cache locally:",
            normalizedKey,
          );
        }
        return bytes;
      }
      markObjectStorageUnavailable(result.error);
      if (result.error?.statusCode !== 404) {
        console.warn(
          "Object storage download returned non-404 error:",
          result.error,
        );
      }
    } catch (error) {
      markObjectStorageUnavailable(error);
      console.warn(
        "Object storage download failed, trying local uploads fallback.",
      );
      console.warn(error);
    }
  }

  return null;
}

const storageReferenceQueries: Array<{ label: string; query: string }> = [
  {
    label: "business_settings.logo_url",
    query:
      "SELECT DISTINCT logo_url AS key FROM business_settings WHERE logo_url IS NOT NULL AND btrim(logo_url) <> ''",
  },
  {
    label: "products.image_url",
    query:
      "SELECT DISTINCT image_url AS key FROM products WHERE image_url IS NOT NULL AND btrim(image_url) <> ''",
  },
  {
    label: "daily_payments.image_comision_url",
    query:
      "SELECT DISTINCT image_comision_url AS key FROM daily_payments WHERE image_comision_url IS NOT NULL AND btrim(image_comision_url) <> ''",
  },
  {
    label: "daily_payments.image_costo_url",
    query:
      "SELECT DISTINCT image_costo_url AS key FROM daily_payments WHERE image_costo_url IS NOT NULL AND btrim(image_costo_url) <> ''",
  },
  {
    label: "expenses.image_url",
    query:
      "SELECT DISTINCT image_url AS key FROM expenses WHERE image_url IS NOT NULL AND btrim(image_url) <> ''",
  },
  {
    label: "capital_movements.image_url",
    query:
      "SELECT DISTINCT image_url AS key FROM capital_movements WHERE image_url IS NOT NULL AND btrim(image_url) <> ''",
  },
  {
    label: "gross_capital_movements.image_url",
    query:
      "SELECT DISTINCT image_url AS key FROM gross_capital_movements WHERE image_url IS NOT NULL AND btrim(image_url) <> ''",
  },
  {
    label: "profit_settlements.image_url",
    query:
      "SELECT DISTINCT image_url AS key FROM profit_settlements WHERE image_url IS NOT NULL AND btrim(image_url) <> ''",
  },
];

async function collectReferencedStorageKeys(): Promise<{
  keys: string[];
  failedQueries: number;
}> {
  const keys = new Set<string>();
  let failedQueries = 0;

  for (const { label, query } of storageReferenceQueries) {
    try {
      const result = await pool.query<{ key: string }>(query);
      for (const row of result.rows) {
        const value = (row.key || "").trim();
        if (!value || shouldSkipStorageKey(value)) continue;
        keys.add(normalizeStorageKey(value));
      }
    } catch (error) {
      failedQueries += 1;
      console.warn(`Storage key query skipped (${label})`, error);
    }
  }

  return { keys: Array.from(keys), failedQueries };
}

async function runObjectStorageBackfill(): Promise<void> {
  if (!getObjectStorageClient()) return;

  if (await fileExists(STORAGE_BACKFILL_MARKER)) {
    return;
  }

  try {
    const { keys, failedQueries } = await collectReferencedStorageKeys();

    if (failedQueries === storageReferenceQueries.length) {
      console.warn(
        "[StorageBackfill] all storage key queries failed, will retry on next boot.",
      );
      return;
    }

    if (keys.length === 0) {
      await fs.mkdir(path.dirname(STORAGE_BACKFILL_MARKER), { recursive: true });
      await fs.writeFile(
        STORAGE_BACKFILL_MARKER,
        JSON.stringify(
          {
            completedAt: new Date().toISOString(),
            totalKeys: 0,
            downloaded: 0,
            missing: 0,
            skippedLocal: 0,
            failedQueries,
          },
          null,
          2,
        ),
      );
      return;
    }

    let downloaded = 0;
    let missing = 0;
    let skippedLocal = 0;

    for (const key of keys) {
      const localFilePath = resolveUploadPath(key);
      if (await fileExists(localFilePath)) {
        skippedLocal += 1;
        continue;
      }

      const file = await downloadFromStorage(key);
      if (file) downloaded += 1;
      else missing += 1;
    }

    console.log(
      `[StorageBackfill] scanned=${keys.length} downloaded=${downloaded} local=${skippedLocal} missing=${missing} failedQueries=${failedQueries}`,
    );

    if (missing === 0 && failedQueries === 0) {
      await fs.mkdir(path.dirname(STORAGE_BACKFILL_MARKER), {
        recursive: true,
      });
      await fs.writeFile(
        STORAGE_BACKFILL_MARKER,
        JSON.stringify(
          {
            completedAt: new Date().toISOString(),
            totalKeys: keys.length,
            downloaded,
            missing,
            skippedLocal,
            failedQueries,
          },
          null,
          2,
        ),
      );
    }
  } catch (error) {
    console.warn("[StorageBackfill] failed:", error);
  }
}

function startObjectStorageBackfillOnce(): void {
  if (storageBackfillStarted) return;
  storageBackfillStarted = true;
  setTimeout(() => {
    void runObjectStorageBackfill();
  }, 0);
}

async function ensureSystemTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_access_controls (
      user_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      role text NOT NULL DEFAULT 'viewer',
      permissions jsonb,
      visible_from date,
      commission_rate numeric(5,4) NOT NULL DEFAULT 0.1000,
      commission_seller text NOT NULL DEFAULT 'Jose Eduardo',
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    ALTER TABLE user_access_controls
    ADD COLUMN IF NOT EXISTS visible_from date;
  `);
  await db.execute(sql`
    ALTER TABLE user_access_controls
    ADD COLUMN IF NOT EXISTS commission_rate numeric(5,4) NOT NULL DEFAULT 0.1000;
  `);
  await db.execute(sql`
    ALTER TABLE user_access_controls
    ADD COLUMN IF NOT EXISTS commission_seller text NOT NULL DEFAULT 'Jose Eduardo';
  `);
  await db.execute(sql`
    UPDATE user_access_controls
    SET visible_from = CURRENT_DATE
    WHERE lower(trim(role)) = 'contador'
      AND visible_from IS NULL;
  `);

  await db.execute(sql`
    ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS unit_price numeric(10,2);
  `);

  await db.execute(sql`
    ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS unit_transport numeric(10,2);
  `);

  await db.execute(sql`
    ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS seller_id varchar;
  `);

  await db.execute(sql`
    ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS director_id varchar;
  `);

  await db.execute(sql`
    ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS delivery_id varchar;
  `);

  await db.execute(sql`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS directors (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      show_profit_in_report integer NOT NULL DEFAULT 1,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    ALTER TABLE directors
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
  `);

  await db.execute(sql`
    ALTER TABLE directors
    ADD COLUMN IF NOT EXISTS show_profit_in_report integer NOT NULL DEFAULT 1;
  `);

  await db.execute(sql`
    ALTER TABLE sellers
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
  `);

  await db.execute(sql`
    ALTER TABLE sellers
    ADD COLUMN IF NOT EXISTS director_id varchar;
  `);

  await db.execute(sql`
    ALTER TABLE sellers
    ADD COLUMN IF NOT EXISTS director_assigned_from date;
  `);

  await db.execute(sql`
    ALTER TABLE seller_sales
    ADD COLUMN IF NOT EXISTS director_id varchar;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS director_expenses (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      director_id varchar REFERENCES directors(id) ON DELETE SET NULL,
      description text NOT NULL,
      amount numeric(10,2) NOT NULL,
      expense_date date NOT NULL,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS delivery_assignment_audit_logs (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      assignment_id varchar NOT NULL,
      action text NOT NULL,
      delivery_id varchar NOT NULL,
      product_id varchar NOT NULL,
      quantity integer NOT NULL,
      unit_price_snapshot numeric(10,2) NOT NULL,
      note text,
      assigned_at timestamp,
      is_paid integer NOT NULL DEFAULT 0,
      next_state jsonb,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    ALTER TABLE delivery_assignment_audit_logs
    ADD COLUMN IF NOT EXISTS assignment_id varchar;
  `);
  await db.execute(sql`
    ALTER TABLE delivery_assignment_audit_logs
    ADD COLUMN IF NOT EXISTS action text;
  `);
  await db.execute(sql`
    ALTER TABLE delivery_assignment_audit_logs
    ADD COLUMN IF NOT EXISTS delivery_id varchar;
  `);
  await db.execute(sql`
    ALTER TABLE delivery_assignment_audit_logs
    ADD COLUMN IF NOT EXISTS product_id varchar;
  `);
  await db.execute(sql`
    ALTER TABLE delivery_assignment_audit_logs
    ADD COLUMN IF NOT EXISTS quantity integer;
  `);
  await db.execute(sql`
    ALTER TABLE delivery_assignment_audit_logs
    ADD COLUMN IF NOT EXISTS unit_price_snapshot numeric(10,2);
  `);
  await db.execute(sql`
    ALTER TABLE delivery_assignment_audit_logs
    ADD COLUMN IF NOT EXISTS note text;
  `);
  await db.execute(sql`
    ALTER TABLE delivery_assignment_audit_logs
    ADD COLUMN IF NOT EXISTS assigned_at timestamp;
  `);
  await db.execute(sql`
    ALTER TABLE delivery_assignment_audit_logs
    ADD COLUMN IF NOT EXISTS is_paid integer NOT NULL DEFAULT 0;
  `);
  await db.execute(sql`
    ALTER TABLE delivery_assignment_audit_logs
    ADD COLUMN IF NOT EXISTS next_state jsonb;
  `);
  await db.execute(sql`
    ALTER TABLE delivery_assignment_audit_logs
    ADD COLUMN IF NOT EXISTS user_id varchar;
  `);
  await db.execute(sql`
    ALTER TABLE delivery_assignment_audit_logs
    ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS profit_settlements (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      period_start date NOT NULL,
      period_end date NOT NULL,
      settlement_date date NOT NULL,
      payable_profit_snapshot numeric(10,2) NOT NULL,
      jose_amount numeric(10,2) NOT NULL,
      jhonatan_amount numeric(10,2) NOT NULL,
      note text,
      image_url text,
      user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    ALTER TABLE profit_settlements
    ADD COLUMN IF NOT EXISTS image_url text;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS profit_settlements_user_period_idx
    ON profit_settlements (user_id, period_start, period_end);
  `);
}

export async function registerRoutes(app: Express): Promise<Server> {
  await ensureSystemTables();
  startObjectStorageBackfillOnce();

  const PgSessionStore = connectPgSimple(session);
  const sessionStore = new PgSessionStore({
    pool,
    createTableIfMissing: true,
    tableName: "user_sessions",
    pruneSessionInterval: 60 * 15,
  });

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Session middleware
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      proxy: process.env.NODE_ENV === "production",
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Ensure operational sessions always use shared business data scope.
  app.use(async (req: any, _res, next) => {
    try {
      if (!req.session?.userId || req.session.isAdmin || req.session.impersonateUserId) {
        return next();
      }

      const primaryDataOwner = await resolvePrimaryDataOwner();
      if (primaryDataOwner && primaryDataOwner.id !== req.session.userId) {
        req.session.impersonateUserId = primaryDataOwner.id;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (_req, res) => {
    return res.status(403).json({
      error: "Registro deshabilitado. Solicita una cuenta al administrador.",
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.verifyPassword(username?.trim(), password);
      if (!user) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      req.session.userId = user.id;

      // Clear admin flags first
      req.session.impersonateUserId = undefined;
      req.session.isAdmin = false;

      const normalizedUsername = username?.trim().toLowerCase();
      const primaryDataOwner = await resolvePrimaryDataOwner();

      // Admin impersonation: "arely" sees all data from primary owner.
      if (normalizedUsername === "arely") {
        if (primaryDataOwner) {
          req.session.impersonateUserId = primaryDataOwner.id;
          req.session.isAdmin = true;
        }
      } else {
        // All operational users work over shared business data, while
        // permissions continue being enforced by their own access profile.
        if (primaryDataOwner && user.id !== primaryDataOwner.id) {
          req.session.impersonateUserId = primaryDataOwner.id;
        }
      }
      
      // Guardar sesión antes de enviar respuesta
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const payload = await buildAuthPayload(user.id, req.session.isAdmin || false);
      res.json(payload);
    } catch (error) {
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const payload = await buildAuthPayload(req.session.userId!, req.session.isAdmin || false);
      if (!payload) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      res.json(payload);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener usuario" });
    }
  });

	  // Admin users and permissions
	  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
	    try {
	      const users = await storage.getAllUsers();
      const list = await Promise.all(
        users.map(async (user) => {
          const isSystemAdmin = user.username.trim().toLowerCase() === "arely";
	          if (isSystemAdmin) {
	            return {
	              id: user.id,
	              name: user.name,
	              username: user.username,
	              isSystemAdmin: true,
	              role: "owner",
	              permissions: getPermissionsTemplate(true),
	              visibleFrom: null,
	              commissionRate: 0,
	              commissionSeller: "",
	            };
	          }

	          const access = await storage.getUserAccessControl(user.id);
	          const role = access?.role || "viewer";
	          const rawPermissions = mergePermissions(access?.permissions as Partial<AppPermissions> | undefined, !access);
	          const permissions = enforceRolePermissions(role, rawPermissions);
	          return {
	            id: user.id,
	            name: user.name,
	            username: user.username,
	            isSystemAdmin: false,
	            role,
	            permissions,
	            visibleFrom: access?.visibleFrom || null,
	            commissionRate: parseFloat(access?.commissionRate || "0"),
	            commissionSeller: access?.commissionSeller || "Jose Eduardo",
	          };
	        })
	      );

      res.json(list);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener usuarios" });
    }
  });

	  app.post("/api/admin/users", requireAdmin, async (req, res) => {
	    try {
	      const data = adminUserCreateSchema.parse(req.body);
	      const normalizedUsername = data.username.trim();
	      const role = data.role.trim();
	      const isAccountant = isAccountantRole(role);

	      const existing = await storage.getUserByUsername(normalizedUsername);
	      if (existing) {
	        return res.status(400).json({ error: "El nombre de usuario ya existe" });
	      }

      const user = await storage.createUser({
        name: data.name.trim(),
        username: normalizedUsername,
        password: data.password,
      });

		      const safePermissions = enforceRolePermissions(role, data.permissions);
		      await storage.upsertUserAccessControl({
		        userId: user.id,
		        role,
		        permissions: safePermissions,
		        visibleFrom: isAccountant ? new Date().toISOString().slice(0, 10) : null,
		        commissionRate: isAccountant ? "0.1000" : "0.0000",
		        commissionSeller: isAccountant ? "Jose Eduardo" : "Jose Eduardo",
		      });

	      res.status(201).json({
	        id: user.id,
	        name: user.name,
	        username: user.username,
	        isSystemAdmin: false,
	        role,
		        permissions: safePermissions,
		        visibleFrom: isAccountant ? new Date().toISOString().slice(0, 10) : null,
		        commissionRate: isAccountant ? 0.1 : 0,
		        commissionSeller: "Jose Eduardo",
	      });
	    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al crear usuario con permisos" });
    }
  });

  app.patch("/api/admin/users/:id/access", requireAdmin, async (req, res) => {
	    try {
	      const { id } = req.params;
	      const data = adminUserAccessUpdateSchema.parse(req.body);
	      const role = data.role.trim();
	      const user = await storage.getUser(id);

	      if (!user) {
	        return res.status(404).json({ error: "Usuario no encontrado" });
	      }

      if (user.username.trim().toLowerCase() === "arely") {
        return res.status(400).json({ error: "No se puede modificar el acceso del usuario admin principal" });
      }

	      const safePermissions = enforceRolePermissions(role, data.permissions);
	      const previousAccess = await storage.getUserAccessControl(id);
	      const saved = await storage.upsertUserAccessControl({
	        userId: id,
	        role,
	        permissions: safePermissions,
	        visibleFrom:
	          isAccountantRole(role) && !previousAccess?.visibleFrom
	            ? new Date().toISOString().slice(0, 10)
	            : previousAccess?.visibleFrom || null,
	        commissionRate: isAccountantRole(role) ? (previousAccess?.commissionRate || "0.1000") : "0.0000",
	        commissionSeller: previousAccess?.commissionSeller || "Jose Eduardo",
	      });

	      res.json({
	        id,
	        role: saved.role,
	        permissions: enforceRolePermissions(
	          saved.role,
	          mergePermissions(saved.permissions as Partial<AppPermissions> | undefined, false)
	        ),
	        visibleFrom: saved.visibleFrom || null,
	        commissionRate: parseFloat(saved.commissionRate || "0"),
	        commissionSeller: saved.commissionSeller || "Jose Eduardo",
	      });
	    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al actualizar permisos de usuario" });
    }
  });

  app.patch("/api/admin/users/:id/name", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const body = adminUserNameUpdateSchema.parse(req.body);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const updated = await storage.updateUserName(id, body.name.trim());
      if (!updated) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      res.json({
        id: updated.id,
        name: updated.name,
        username: updated.username,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al actualizar nombre de usuario" });
    }
  });

  app.patch("/api/admin/users/:id/password", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const body = z.object({ password: z.string().min(6).max(100) }).parse(req.body);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      await storage.setUserPassword(id, body.password);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al actualizar contrasena" });
    }
  });

  // Business Settings
  app.get("/api/business-settings", requireAuth, async (req, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const settings = await storage.getBusinessSettings(userId);

      if (!settings) {
        return res.json({
          businessName: "Mi Negocio",
          logoUrl: "",
          currency: "Bs",
          timeZone: "America/La_Paz",
          dateFormat: "dd/MM/yyyy",
        });
      }

      res.json({
        businessName: settings.businessName,
        logoUrl: settings.logoUrl ?? "",
        currency: settings.currency,
        timeZone: settings.timeZone,
        dateFormat: settings.dateFormat,
      });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener configuracion del negocio" });
    }
  });

  app.post("/api/business-settings/logo", requireAuth, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se envio archivo" });
      }

      const userId = getEffectiveUserId(req);
      const fileName = buildStorageKey(`business-logos/${userId}`, req.file.originalname);
      const ok = await uploadToStorage(fileName, req.file.buffer);

      if (!ok) {
        return res.status(500).json({ error: "No se pudo subir el logo" });
      }

      res.json({ logoUrl: fileName });
    } catch (error) {
      res.status(500).json({ error: "Error al subir logo del negocio" });
    }
  });

  app.put("/api/business-settings", requireAuth, async (req, res) => {
    try {
      const parsed = businessSettingsPayloadSchema.parse(req.body);
      const saved = await storage.upsertBusinessSettings({
        userId: getEffectiveUserId(req),
        businessName: parsed.businessName,
        logoUrl: parsed.logoUrl || null,
        currency: parsed.currency,
        timeZone: parsed.timeZone,
        dateFormat: parsed.dateFormat,
      });

      res.json({
        businessName: saved.businessName,
        logoUrl: saved.logoUrl ?? "",
        currency: saved.currency,
        timeZone: saved.timeZone,
        dateFormat: saved.dateFormat,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al guardar configuracion del negocio" });
    }
  });

  // Product routes
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      const products = await storage.getProducts(getEffectiveUserId(req));
      if (access.isAccountant) {
        return res.json(products.map((product) => sanitizeProductForRestrictedRole(product)));
      }
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener productos" });
    }
  });

  app.get("/api/product-images", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts(getEffectiveUserId(req));
      const usageMap = new Map<string, number>();

      products.forEach((product) => {
        const key = (product.imageUrl || "").trim();
        if (!key) return;
        usageMap.set(key, (usageMap.get(key) || 0) + 1);
      });

      const images = Array.from(usageMap.entries())
        .map(([imageUrl, usageCount]) => ({ imageUrl, usageCount }))
        .sort((a, b) => b.usageCount - a.usageCount || a.imageUrl.localeCompare(b.imageUrl));

      res.json(images);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener imagenes de productos" });
    }
  });

  app.delete("/api/product-images", requireAuth, async (req, res) => {
    try {
      const imageUrl = String(req.body?.imageUrl || "").trim();
      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl es requerido" });
      }

      const userId = getEffectiveUserId(req);
      const products = await storage.getProducts(userId);
      const targets = products.filter((product) => (product.imageUrl || "").trim() === imageUrl);

      if (targets.length === 0) {
        return res.json({ success: true, affectedProducts: 0 });
      }

      await Promise.all(
        targets.map((product) =>
          storage.updateProduct(product.id, {
            imageUrl: null,
          })
        )
      );

      res.json({ success: true, affectedProducts: targets.length });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar imagen de productos" });
    }
  });

  app.post("/api/products", requireAuth, upload.single("image"), async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede crear productos" });
      }

      const { name, price, baseCost, capitalIncrease, costProduct, costTransport, costLabel, costShrink, costBag, costLabelRemover, costExtras, imageUrl: selectedImageUrl, isActive } = req.body;
      
      // Calcular cost total
      const base = parseFloat(baseCost || '0');
      const capital = parseFloat(capitalIncrease || '0');
      const cost = base + capital;
      
      // Parse costExtras from JSON string if present
      let parsedCostExtras = null;
      if (costExtras) {
        try {
          parsedCostExtras = typeof costExtras === 'string' ? JSON.parse(costExtras) : costExtras;
        } catch (e) {
          parsedCostExtras = null;
        }
      }
      
      const parsedIsActive = parseOptionalBoolean(isActive);
      let imageUrl: string | undefined;
      
      if (req.file) {
        const filename = buildStorageKey("products", req.file.originalname);
        const ok = await uploadToStorage(filename, req.file.buffer);
        if (ok) {
          imageUrl = filename;
        }
      } else if (selectedImageUrl && typeof selectedImageUrl === "string" && selectedImageUrl.trim()) {
        imageUrl = selectedImageUrl.trim();
      }
      
      const product = await storage.createProduct({
        name,
        isActive: parsedIsActive ?? true,
        price,
        cost: cost.toString(),
        baseCost: baseCost || null,
        capitalIncrease: capitalIncrease || null,
        costProduct: costProduct || null,
        costTransport: costTransport || null,
        costLabel: costLabel || null,
        costShrink: costShrink || null,
        costBag: costBag || null,
        costLabelRemover: costLabelRemover || null,
        costExtras: parsedCostExtras,
        imageUrl,
        userId: getEffectiveUserId(req),
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Error al crear producto" });
    }
  });

  app.put("/api/products/:id", requireAuth, upload.single("image"), async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede editar productos" });
      }

      const { id } = req.params;
      const { name, price, baseCost, capitalIncrease, costProduct, costTransport, costLabel, costShrink, costBag, costLabelRemover, costExtras, imageUrl: selectedImageUrl, isActive } = req.body;
      
      const existingProduct = await storage.getProduct(id);
      if (!existingProduct || existingProduct.userId !== getEffectiveUserId(req)) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      // Calcular cost total
      const base = parseFloat(baseCost || '0');
      const capital = parseFloat(capitalIncrease || '0');
      const cost = base + capital;

      // Parse costExtras from JSON string if present
      let parsedCostExtras = null;
      if (costExtras) {
        try {
          parsedCostExtras = typeof costExtras === 'string' ? JSON.parse(costExtras) : costExtras;
        } catch (e) {
          parsedCostExtras = null;
        }
      }

      const parsedIsActive = parseOptionalBoolean(isActive);
      let imageUrl = existingProduct.imageUrl;
      
      if (req.file) {
        const filename = buildStorageKey("products", req.file.originalname);
        const ok = await uploadToStorage(filename, req.file.buffer);
        if (ok) {
          imageUrl = filename;
        }
      } else if (selectedImageUrl && typeof selectedImageUrl === "string" && selectedImageUrl.trim()) {
        imageUrl = selectedImageUrl.trim();
      }
      
      const product = await storage.updateProduct(id, {
        name,
        isActive: parsedIsActive ?? existingProduct.isActive,
        price,
        cost: cost.toString(),
        baseCost: baseCost || null,
        capitalIncrease: capitalIncrease || null,
        costProduct: costProduct || null,
        costTransport: costTransport || null,
        costLabel: costLabel || null,
        costShrink: costShrink || null,
        costBag: costBag || null,
        costLabelRemover: costLabelRemover || null,
        costExtras: parsedCostExtras,
        imageUrl,
      });
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar producto" });
    }
  });

  app.patch("/api/products/:id/status", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede editar productos" });
      }

      const { id } = req.params;
      const product = await storage.getProduct(id);
      if (!product || product.userId !== getEffectiveUserId(req)) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const parsedIsActive = parseOptionalBoolean(req.body?.isActive);
      if (parsedIsActive === undefined) {
        return res.status(400).json({ error: "isActive es requerido" });
      }

      const updated = await storage.updateProduct(id, { isActive: parsedIsActive });
      if (!updated) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar estado del producto" });
    }
  });

  app.delete("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede eliminar productos" });
      }

      const { id } = req.params;
      
      const product = await storage.getProduct(id);
      if (!product || product.userId !== getEffectiveUserId(req)) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      await storage.deleteProduct(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar producto" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    const uploadsDir = path.join(process.cwd(), "uploads");
    return (req as any).app._router.handle(req, res, next);
  });

  // Sales routes
  app.get("/api/sales", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      const sales = await storage.getSales(getEffectiveUserId(req));
      const visibleSales = access.isAccountant && access.visibleFrom
        ? sales.filter((sale) => isOnOrAfterDate(sale.saleDate, access.visibleFrom))
        : sales;
      res.json(visibleSales);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener ventas" });
    }
  });

  app.post("/api/sales", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      const { productId, quantity, date: saleDate, unitPrice, unitTransport, sellerId, directorId, deliveryId } = req.body;
      const userId = getEffectiveUserId(req);

      if (access.isAccountant && access.visibleFrom && saleDate && String(saleDate) < access.visibleFrom) {
        return res.status(400).json({ error: `Solo puedes registrar ventas desde ${access.visibleFrom}` });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product || product.userId !== userId) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      if (product.isActive === false) {
        return res.status(400).json({ error: "El producto seleccionado esta inactivo" });
      }

      const parsedQuantity = parseInt(String(quantity), 10);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({ error: "Cantidad invalida" });
      }

      const parsedBaseCost = parseFloat(String(product.baseCost ?? ""));
      const parsedCost = parseFloat(String(product.cost ?? 0));
      const parsedProductTransport = parseFloat(String(product.costTransport ?? 0));
      const safeProductTransport =
        Number.isFinite(parsedProductTransport) && parsedProductTransport >= 0
          ? parsedProductTransport
          : 0;
      const rawReferenceBaseCost =
        Number.isFinite(parsedBaseCost) && parsedBaseCost > 0 ? parsedBaseCost : parsedCost;
      const referenceBaseCost = Number.isFinite(rawReferenceBaseCost) ? rawReferenceBaseCost : 0;

      const parsedUnitTransport =
        unitTransport !== undefined && unitTransport !== null && unitTransport !== ""
          ? parseFloat(String(unitTransport))
          : safeProductTransport;

      if (!Number.isFinite(parsedUnitTransport) || parsedUnitTransport < 0) {
        return res.status(400).json({ error: "Transporte unitario invalido" });
      }

      const minimumUnitPrice = Math.max(
        referenceBaseCost - safeProductTransport + parsedUnitTransport,
        0
      );

      const parsedUnitPrice =
        unitPrice !== undefined && unitPrice !== null && unitPrice !== ""
          ? parseFloat(String(unitPrice))
          : parseFloat(String(product.price ?? 0));

      if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) {
        return res.status(400).json({ error: "Precio unitario invalido" });
      }

      if (Number.isFinite(minimumUnitPrice) && parsedUnitPrice < minimumUnitPrice) {
        return res.status(400).json({
          error: `El precio unitario no puede ser menor al capital bruto (${minimumUnitPrice.toFixed(2)} Bs)`,
        });
      }

      const normalizedSellerId = normalizeOptionalId(sellerId);
      const normalizedDirectorIdInput = normalizeOptionalId(directorId);
      const normalizedDeliveryId = normalizeOptionalId(deliveryId);

      let seller: Awaited<ReturnType<typeof storage.getSeller>> | null = null;
      if (normalizedSellerId) {
        seller = await storage.getSeller(normalizedSellerId);
        if (!seller || seller.userId !== userId) {
          return res.status(404).json({ error: "Vendedor no encontrado" });
        }
        if (seller.isActive === false) {
          return res.status(400).json({ error: "El vendedor seleccionado esta inactivo" });
        }
      }

      let finalDirectorId: string | null = normalizedDirectorIdInput;
      if (seller?.directorId && !finalDirectorId) {
        finalDirectorId = seller.directorId;
      }

      if (seller?.directorId && finalDirectorId && seller.directorId !== finalDirectorId) {
        return res.status(400).json({ error: "El vendedor no pertenece al director seleccionado" });
      }

      if (finalDirectorId) {
        const director = await storage.getDirector(finalDirectorId);
        if (!director || director.userId !== userId) {
          return res.status(404).json({ error: "Director no encontrado" });
        }
        if (director.isActive === false) {
          return res.status(400).json({ error: "El director seleccionado esta inactivo" });
        }
      }

      if (normalizedDeliveryId) {
        const deliveries = await storage.getDeliveries(userId);
        const exists = deliveries.some((delivery) => delivery.id === normalizedDeliveryId);
        if (!exists) {
          return res.status(404).json({ error: "Delivery no encontrado" });
        }

        const availability = await getDeliveryProductAvailability({
          userId,
          deliveryId: normalizedDeliveryId,
          productId,
        });

        if (parsedQuantity > availability.available) {
          return res.status(400).json({
            error: `Ese delivery no tiene stock para esta venta. Disponible: ${availability.available} und`,
          });
        }
      }

      const sale = await storage.createSale({
        productId,
        quantity: parsedQuantity,
        unitPrice: parsedUnitPrice.toFixed(2),
        unitTransport: parsedUnitTransport.toFixed(2),
        sellerId: normalizedSellerId,
        directorId: finalDirectorId,
        deliveryId: normalizedDeliveryId,
        saleDate: saleDate,
        userId,
      });
      
      res.json(sale);
    } catch (error) {
      console.error("Error creating sale:", error);
      res.status(500).json({ error: "Error al registrar venta" });
    }
  });

  // Serve images from object storage
  app.get("/api/storage/:path(*)", requireAuth, async (req, res) => {
    try {
      const storageKey = normalizeStorageKey(req.params.path);
      const file = await downloadFromStorage(storageKey);

      if (!file) {
        return res.status(404).json({ error: "Imagen no encontrada" });
      }
      
      // Determine content type based on file extension
      const ext = storageKey.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      
      res.setHeader('Content-Type', contentTypes[ext || 'jpg'] || 'image/jpeg');
      res.send(file);
    } catch (error) {
      console.error("Error fetching image:", error);
      res.status(500).json({ error: "Error al obtener imagen" });
    }
  });

  // Daily payments routes
  app.get("/api/daily-payment/:date", requireAuth, async (req, res) => {
    try {
      const { date } = req.params;
      const access = await getAccessContext(req);
      if (access.isAccountant && access.visibleFrom && date < access.visibleFrom) {
        return res.json(null);
      }
      const payment = await storage.getDailyPayment(getEffectiveUserId(req), date);
      res.json(payment || null);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener pago" });
    }
  });

  app.post("/api/daily-payment", requireAuth, upload.fields([
    { name: 'imageComision', maxCount: 1 },
    { name: 'imageCosto', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { paymentDate, isPaid } = req.body;
      const access = await getAccessContext(req);
      if (access.isAccountant && access.visibleFrom && paymentDate < access.visibleFrom) {
        return res.status(400).json({ error: `Solo puedes registrar pagos desde ${access.visibleFrom}` });
      }
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      let imageComisionUrl: string | undefined;
      let imageCostoUrl: string | undefined;

      // Upload comision image if provided
      if (files?.imageComision?.[0]) {
        const file = files.imageComision[0];
        const filename = buildStorageKey("payments", `comision-${file.originalname}`);
        const ok = await uploadToStorage(filename, file.buffer);
        if (ok) {
          imageComisionUrl = filename;
        }
      }

      // Upload costo image if provided
      if (files?.imageCosto?.[0]) {
        const file = files.imageCosto[0];
        const filename = buildStorageKey("payments", `costo-${file.originalname}`);
        const ok = await uploadToStorage(filename, file.buffer);
        if (ok) {
          imageCostoUrl = filename;
        }
      }

      // Get existing payment to preserve URLs if new images not provided
      const existing = await storage.getDailyPayment(getEffectiveUserId(req), paymentDate);
      
      const payment = await storage.upsertDailyPayment({
        paymentDate,
        imageComisionUrl: imageComisionUrl || existing?.imageComisionUrl,
        imageCostoUrl: imageCostoUrl || existing?.imageCostoUrl,
        isPaid: parseInt(isPaid || '0'),
        userId: getEffectiveUserId(req),
      });

      res.json(payment);
    } catch (error) {
      console.error("Error saving payment:", error);
      res.status(500).json({ error: "Error al guardar pago" });
    }
  });

  // Reports route - get sales with product details
  // Update sale date
  app.patch("/api/sales/:id", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      const { id } = req.params;
      const userId = getEffectiveUserId(req);
      const currentSale = await storage.getSale(id);
      if (!currentSale || currentSale.userId !== userId) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }
      if (access.isAccountant && access.visibleFrom && !isOnOrAfterDate(currentSale.saleDate, access.visibleFrom)) {
        return res.status(403).json({ error: `Solo puedes editar ventas desde ${access.visibleFrom}` });
      }

      const hasSellerId = Object.prototype.hasOwnProperty.call(req.body, "sellerId");
      const hasDirectorId = Object.prototype.hasOwnProperty.call(req.body, "directorId");
      const hasDeliveryId = Object.prototype.hasOwnProperty.call(req.body, "deliveryId");

      const nextProductId =
        req.body.productId !== undefined && req.body.productId !== null && String(req.body.productId).trim() !== ""
          ? String(req.body.productId).trim()
          : currentSale.productId;

      const product = await storage.getProduct(nextProductId);
      if (!product || product.userId !== userId) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      if (product.isActive === false && nextProductId !== currentSale.productId) {
        return res.status(400).json({ error: "El producto seleccionado esta inactivo" });
      }

      const parsedQuantity =
        req.body.quantity !== undefined && req.body.quantity !== null && String(req.body.quantity).trim() !== ""
          ? parseInt(String(req.body.quantity), 10)
          : Number(currentSale.quantity);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({ error: "Cantidad invalida" });
      }

      const parsedBaseCost = parseFloat(String(product.baseCost ?? ""));
      const parsedCost = parseFloat(String(product.cost ?? 0));
      const parsedProductTransport = parseFloat(String(product.costTransport ?? 0));
      const safeProductTransport =
        Number.isFinite(parsedProductTransport) && parsedProductTransport >= 0
          ? parsedProductTransport
          : 0;
      const rawReferenceBaseCost =
        Number.isFinite(parsedBaseCost) && parsedBaseCost > 0 ? parsedBaseCost : parsedCost;
      const referenceBaseCost = Number.isFinite(rawReferenceBaseCost) ? rawReferenceBaseCost : 0;

      const parsedUnitTransport =
        req.body.unitTransport !== undefined && req.body.unitTransport !== null && String(req.body.unitTransport).trim() !== ""
          ? parseFloat(String(req.body.unitTransport))
          : parseFloat(String(currentSale.unitTransport ?? safeProductTransport));
      if (!Number.isFinite(parsedUnitTransport) || parsedUnitTransport < 0) {
        return res.status(400).json({ error: "Transporte unitario invalido" });
      }

      const minimumUnitPrice = Math.max(
        referenceBaseCost - safeProductTransport + parsedUnitTransport,
        0
      );

      const parsedUnitPrice =
        req.body.unitPrice !== undefined && req.body.unitPrice !== null && String(req.body.unitPrice).trim() !== ""
          ? parseFloat(String(req.body.unitPrice))
          : parseFloat(String(currentSale.unitPrice ?? product.price ?? 0));
      if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) {
        return res.status(400).json({ error: "Precio unitario invalido" });
      }
      if (Number.isFinite(minimumUnitPrice) && parsedUnitPrice < minimumUnitPrice) {
        return res.status(400).json({
          error: `El precio unitario no puede ser menor al capital bruto (${minimumUnitPrice.toFixed(2)} Bs)`,
        });
      }

      const normalizedSellerIdInput = normalizeOptionalId(req.body.sellerId);
      const normalizedDirectorIdInput = normalizeOptionalId(req.body.directorId);
      const normalizedDeliveryIdInput = normalizeOptionalId(req.body.deliveryId);

      let finalSellerId: string | null = hasSellerId
        ? normalizedSellerIdInput
        : (currentSale.sellerId as string | null) ?? null;
      let finalDirectorId: string | null = hasDirectorId
        ? normalizedDirectorIdInput
        : (currentSale.directorId as string | null) ?? null;
      const finalDeliveryId: string | null = hasDeliveryId
        ? normalizedDeliveryIdInput
        : (currentSale.deliveryId as string | null) ?? null;
      const currentSellerId = (currentSale.sellerId as string | null) ?? null;
      const currentDirectorId = (currentSale.directorId as string | null) ?? null;

      let seller: Awaited<ReturnType<typeof storage.getSeller>> | null = null;
      if (finalSellerId) {
        seller = await storage.getSeller(finalSellerId);
        if (!seller || seller.userId !== userId) {
          return res.status(404).json({ error: "Vendedor no encontrado" });
        }
        if (seller.isActive === false && finalSellerId !== currentSellerId) {
          return res.status(400).json({ error: "El vendedor seleccionado esta inactivo" });
        }
      }

      if (seller?.directorId && !hasDirectorId) {
        finalDirectorId = seller.directorId;
      }
      if (seller?.directorId && finalDirectorId && seller.directorId !== finalDirectorId) {
        return res.status(400).json({ error: "El vendedor no pertenece al director seleccionado" });
      }

      if (finalDirectorId) {
        const director = await storage.getDirector(finalDirectorId);
        if (!director || director.userId !== userId) {
          return res.status(404).json({ error: "Director no encontrado" });
        }
        if (director.isActive === false && finalDirectorId !== currentDirectorId) {
          return res.status(400).json({ error: "El director seleccionado esta inactivo" });
        }
      }

      if (finalDeliveryId) {
        const deliveries = await storage.getDeliveries(userId);
        const exists = deliveries.some((delivery) => delivery.id === finalDeliveryId);
        if (!exists) {
          return res.status(404).json({ error: "Delivery no encontrado" });
        }

        const availability = await getDeliveryProductAvailability({
          userId,
          deliveryId: finalDeliveryId,
          productId: nextProductId,
          excludeSaleId: id,
        });

        if (parsedQuantity > availability.available) {
          return res.status(400).json({
            error: `Ese delivery no tiene stock para esta venta. Disponible: ${availability.available} und`,
          });
        }
      }

      const saleDate =
        req.body.saleDate !== undefined && req.body.saleDate !== null && String(req.body.saleDate).trim() !== ""
          ? String(req.body.saleDate)
          : String(currentSale.saleDate);
      if (access.isAccountant && access.visibleFrom && saleDate < access.visibleFrom) {
        return res.status(400).json({ error: `Solo puedes editar ventas desde ${access.visibleFrom}` });
      }

      const sale = await storage.updateSale(id, {
        productId: nextProductId,
        quantity: parsedQuantity,
        unitPrice: parsedUnitPrice.toFixed(2),
        unitTransport: parsedUnitTransport.toFixed(2),
        saleDate,
        sellerId: finalSellerId,
        directorId: finalDirectorId,
        deliveryId: finalDeliveryId,
      });
      if (!sale) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar la venta" });
    }
  });

  app.delete("/api/sales/:id", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede eliminar ventas directas" });
      }
      const { id } = req.params;
      const deleted = await storage.deleteSale(id);
      if (!deleted) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar la venta" });
    }
  });

  app.get("/api/reports", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      const sales = await storage.getSales(getEffectiveUserId(req));
      const products = await storage.getProducts(getEffectiveUserId(req));
      const visibleSales = access.isAccountant && access.visibleFrom
        ? sales.filter((sale) => isOnOrAfterDate(sale.saleDate, access.visibleFrom))
        : sales;
      
      const productMap = new Map(products.map(p => [p.id, p]));
      
      const salesWithDetails = visibleSales.map(sale => {
        const product = productMap.get(sale.productId);
        const safeProduct = access.isAccountant && product
          ? sanitizeProductForRestrictedRole(product)
          : product;
        const effectiveUnitPrice = sale.unitPrice ?? safeProduct?.price ?? product?.price ?? null;
        const effectiveUnitTransport = sale.unitTransport ?? product?.costTransport ?? null;
        // Normalize date to YYYY-MM-DD format
        const dateValue: any = sale.saleDate;
        const saleDate = dateValue instanceof Date 
          ? dateValue.toISOString().split('T')[0]
          : typeof dateValue === 'string' && dateValue.includes('T')
            ? dateValue.split('T')[0]
            : dateValue;
        return {
          ...sale,
          unitPrice: effectiveUnitPrice,
          unitTransport: effectiveUnitTransport,
          saleDate,
          product: safeProduct,
        };
      });
      
      res.json(salesWithDetails);
    } catch (error) {
      res.status(500).json({ error: "Error al generar reporte" });
    }
  });

  // Expense Categories routes
  app.get("/api/expense-categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getExpenseCategories(getEffectiveUserId(req));
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener categorías" });
    }
  });

  app.post("/api/expense-categories", requireAuth, async (req, res) => {
    try {
      const data = insertExpenseCategorySchema.parse({
        ...req.body,
        userId: getEffectiveUserId(req),
      });
      const category = await storage.createExpenseCategory(data);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al crear categoría" });
    }
  });

  app.put("/api/expense-categories/:id", requireAuth, async (req, res) => {
    try {
      const name = z.string().trim().min(1, "El nombre es obligatorio").parse(req.body?.name);
      const category = await storage.updateExpenseCategory(req.params.id, getEffectiveUserId(req), { name });

      if (!category) {
        return res.status(404).json({ error: "Categoria no encontrada" });
      }

      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al actualizar categoria" });
    }
  });

  // Expenses routes
  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      const expenses = await storage.getExpenses(getEffectiveUserId(req));
      const categories = await storage.getExpenseCategories(getEffectiveUserId(req));
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      const visibleExpenses = access.isAccountant && access.visibleFrom
        ? expenses.filter((expense) => isOnOrAfterDate(expense.expenseDate, access.visibleFrom))
        : expenses;
      
      const expensesWithCategory = visibleExpenses.map(expense => ({
        ...expense,
        category: categoryMap.get(expense.categoryId) || "Sin categoría",
      }));
      res.json(expensesWithCategory);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener gastos" });
    }
  });

  app.post("/api/expenses", requireAuth, upload.single("image"), async (req, res) => {
    try {
      console.log("Creating expense, body:", req.body, "file:", req.file?.originalname);
      const access = await getAccessContext(req);
      if (access.isAccountant && access.visibleFrom && req.body.expenseDate < access.visibleFrom) {
        return res.status(400).json({ error: `Solo puedes registrar gastos desde ${access.visibleFrom}` });
      }
      
      let imageUrl = null;
      
      if (req.file) {
        const fileName = buildStorageKey("expenses", req.file.originalname);
        const ok = await uploadToStorage(fileName, req.file.buffer);
        if (ok) imageUrl = fileName;
      }

      const dataToValidate = {
        categoryId: req.body.categoryId,
        amount: req.body.amount,
        expenseDate: req.body.expenseDate,
        imageUrl,
        userId: getEffectiveUserId(req),
      };
      console.log("Data to validate:", dataToValidate);
      
      const data = insertExpenseSchema.parse(dataToValidate);
      const expense = await storage.createExpense(data);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", error.errors);
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating expense:", error);
      res.status(500).json({ error: "Error al crear gasto" });
    }
  });

  app.put("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { categoryId, expenseDate } = req.body;
      const expense = await storage.updateExpense(id, { categoryId, expenseDate });
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ error: "Error al actualizar gasto" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteExpense(id);
      if (!deleted) {
        return res.status(404).json({ error: "Gasto no encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: "Error al eliminar gasto" });
    }
  });

  // Expenses summary with date filter
  app.get("/api/expenses/summary", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const access = await getAccessContext(req);
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Se requieren fechas de inicio y fin" });
      }

      if (access.isAccountant && access.visibleFrom && String(endDate) < access.visibleFrom) {
        return res.json({
          expenses: [],
          total: "0.00",
        });
      }

      const effectiveStartDate = access.isAccountant
        ? clampStartDate(String(startDate), access.visibleFrom)
        : String(startDate);

      const expenses = await storage.getExpensesByDateRange(
        getEffectiveUserId(req),
        effectiveStartDate,
        endDate as string
      );

      const categories = await storage.getExpenseCategories(getEffectiveUserId(req));
      const categoryMap = new Map(categories.map(c => [c.id, c]));

      const expensesWithCategory = expenses.map(expense => ({
        ...expense,
        category: categoryMap.get(expense.categoryId),
      }));

      const total = expenses.reduce((sum, expense) => {
        return sum + parseFloat(expense.amount as any);
      }, 0);

      res.json({
        expenses: expensesWithCategory,
        total: total.toFixed(2),
      });
    } catch (error) {
      res.status(500).json({ error: "Error al generar reporte de gastos" });
    }
  });

  // Deliveries routes
  app.get("/api/deliveries", requireAuth, async (req, res) => {
    try {
      const deliveries = await storage.getDeliveries(getEffectiveUserId(req));
      res.json(deliveries);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener deliveries" });
    }
  });

  app.post("/api/deliveries", requireAuth, async (req, res) => {
    try {
      const data = insertDeliverySchema.parse({
        ...req.body,
        userId: getEffectiveUserId(req),
      });
      const delivery = await storage.createDelivery(data);
      res.json(delivery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al crear delivery" });
    }
  });

  // Delivery Stock Entries routes
  app.get("/api/delivery-stock", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      const entries = await storage.getDeliveryStockEntries(getEffectiveUserId(req));
      const visibleEntries = access.isAccountant && access.visibleFrom
        ? entries.filter((entry) => isOnOrAfterDate(entry.entryDate || entry.recordedAt, access.visibleFrom))
        : entries;
      res.json(visibleEntries);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener entradas de stock" });
    }
  });

  app.post("/api/delivery-stock", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant && access.visibleFrom && req.body.entryDate && req.body.entryDate < access.visibleFrom) {
        return res.status(400).json({ error: `Solo puedes registrar stock desde ${access.visibleFrom}` });
      }

      const data = insertDeliveryStockEntrySchema.parse({
        ...req.body,
        userId: getEffectiveUserId(req),
      });
      const entry = await storage.createDeliveryStockEntry(data);
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al crear entrada de stock" });
    }
  });

  app.put("/api/delivery-stock/:id", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      const { id } = req.params;
      const { productId, quantity, entryDate } = req.body;
      if (access.isAccountant && access.visibleFrom && entryDate && entryDate < access.visibleFrom) {
        return res.status(400).json({ error: `Solo puedes registrar stock desde ${access.visibleFrom}` });
      }
      const entry = await storage.updateDeliveryStockEntry(id, { productId, quantity, entryDate });
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar entrada de stock" });
    }
  });

  app.delete("/api/delivery-stock/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDeliveryStockEntry(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar entrada de stock" });
    }
  });

  // Delivery Assignments routes
  app.get("/api/delivery-assignments", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      const assignments = await storage.getDeliveryAssignments(getEffectiveUserId(req));
      const visibleAssignments = access.isAccountant && access.visibleFrom
        ? assignments.filter((assignment) => isOnOrAfterDate(assignment.assignedAt, access.visibleFrom))
        : assignments;
      res.json(visibleAssignments);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener asignaciones" });
    }
  });

  app.post("/api/delivery-assignments", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      const assignedAtInput = parseOptionalIsoDate(req.body.assignedAt);
      if (access.isAccountant && access.visibleFrom && assignedAtInput?.iso && assignedAtInput.iso < access.visibleFrom) {
        return res.status(400).json({ error: `Solo puedes asignar stock desde ${access.visibleFrom}` });
      }

      const data = insertDeliveryAssignmentSchema.parse({
        ...req.body,
        ...(assignedAtInput?.date ? { assignedAt: assignedAtInput.date } : {}),
        userId: getEffectiveUserId(req),
      });
      const assignment = await storage.createDeliveryAssignment(data);
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al crear asignación" });
    }
  });

  app.put("/api/delivery-assignments/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const access = await getAccessContext(req);
      const assignment = await storage.getDeliveryAssignment(id);
      if (!assignment || assignment.userId !== getEffectiveUserId(req)) {
        return res.status(404).json({ error: "Asignacion no encontrada" });
      }

      const data = deliveryAssignmentUpdateSchema.parse({
        ...req.body,
        note: req.body.note ?? null,
      });
      const assignedAtInput = parseOptionalIsoDate(data.assignedAt);
      if (access.isAccountant && access.visibleFrom && assignedAtInput?.iso && assignedAtInput.iso < access.visibleFrom) {
        return res.status(400).json({ error: `Solo puedes asignar stock desde ${access.visibleFrom}` });
      }

      const updateData = {
        deliveryId: data.deliveryId,
        productId: data.productId,
        quantity: data.quantity,
        unitPriceSnapshot: data.unitPriceSnapshot,
        note: data.note ?? null,
        ...(assignedAtInput?.date ? { assignedAt: assignedAtInput.date } : {}),
      };

      await storage.createDeliveryAssignmentAuditLog({
        assignmentId: assignment.id,
        action: "edited",
        deliveryId: assignment.deliveryId,
        productId: assignment.productId,
        quantity: assignment.quantity,
        unitPriceSnapshot: String(assignment.unitPriceSnapshot),
        note: assignment.note ?? null,
        assignedAt: assignment.assignedAt,
        isPaid: assignment.isPaid,
        nextState: {
          deliveryId: data.deliveryId,
          productId: data.productId,
          quantity: data.quantity,
          unitPriceSnapshot: data.unitPriceSnapshot,
          note: data.note ?? null,
          ...(assignedAtInput?.date ? { assignedAt: assignedAtInput.date.toISOString() } : {}),
          isPaid: assignment.isPaid,
        },
        userId: assignment.userId,
      });

      const updated = await storage.updateDeliveryAssignment(id, updateData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al actualizar asignacion" });
    }
  });

  app.delete("/api/delivery-assignments/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const assignment = await storage.getDeliveryAssignment(id);
      if (!assignment || assignment.userId !== getEffectiveUserId(req)) {
        return res.status(404).json({ error: "Asignacion no encontrada" });
      }

      await storage.createDeliveryAssignmentAuditLog({
        assignmentId: assignment.id,
        action: "deleted",
        deliveryId: assignment.deliveryId,
        productId: assignment.productId,
        quantity: assignment.quantity,
        unitPriceSnapshot: String(assignment.unitPriceSnapshot),
        note: assignment.note ?? null,
        assignedAt: assignment.assignedAt,
        isPaid: assignment.isPaid,
        nextState: null,
        userId: assignment.userId,
      });

      await storage.deleteDeliveryAssignment(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar asignacion" });
    }
  });

  app.patch("/api/delivery-assignments/:id/paid", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { isPaid } = req.body;
      const assignment = await storage.updateDeliveryAssignmentPaid(id, isPaid);
      if (!assignment) {
        return res.status(404).json({ error: "Asignación no encontrada" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar estado de pago" });
    }
  });

  app.get("/api/delivery-assignments/audit", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const access = await getAccessContext(req);

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Se requieren fechas de inicio y fin" });
      }

      if (access.isAccountant && access.visibleFrom && String(endDate) < access.visibleFrom) {
        return res.json([]);
      }

      const effectiveStartDate = access.isAccountant
        ? clampStartDate(String(startDate), access.visibleFrom)
        : String(startDate);

      const [auditLogs, deliveries, products] = await Promise.all([
        storage.getDeliveryAssignmentAuditLogsByDateRange(
          getEffectiveUserId(req),
          effectiveStartDate,
          String(endDate)
        ),
        storage.getDeliveries(getEffectiveUserId(req)),
        storage.getProducts(getEffectiveUserId(req)),
      ]);

      const deliveryMap = new Map(deliveries.map((delivery) => [delivery.id, delivery]));
      const productMap = new Map(products.map((product) => [product.id, product]));

      res.json(
        auditLogs.map((log) => ({
          ...log,
          delivery: deliveryMap.get(log.deliveryId) || null,
          product: productMap.get(log.productId) || null,
          nextDelivery: log.nextState?.deliveryId ? deliveryMap.get(log.nextState.deliveryId) || null : null,
          nextProduct: log.nextState?.productId ? productMap.get(log.nextState.productId) || null : null,
        }))
      );
    } catch (error) {
      res.status(500).json({ error: "Error al obtener historial de cambios" });
    }
  });

  // Delivery Assignments Report
  app.get("/api/delivery-assignments/report", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const access = await getAccessContext(req);
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Se requieren fechas de inicio y fin" });
      }

      if (access.isAccountant && access.visibleFrom && String(endDate) < access.visibleFrom) {
        return res.json({
          assignments: [],
          byDelivery: [],
          grandTotal: "0.00",
        });
      }

      const effectiveStartDate = access.isAccountant
        ? clampStartDate(String(startDate), access.visibleFrom)
        : String(startDate);

      const assignments = await storage.getDeliveryAssignmentsByDateRange(
        getEffectiveUserId(req),
        effectiveStartDate,
        endDate as string
      );

      const deliveries = await storage.getDeliveries(getEffectiveUserId(req));
      const products = await storage.getProducts(getEffectiveUserId(req));

      const deliveryMap = new Map(deliveries.map(d => [d.id, d]));
      const productMap = new Map(products.map(p => [p.id, p]));

      const assignmentsWithDetails = assignments.map(assignment => ({
        ...assignment,
        delivery: deliveryMap.get(assignment.deliveryId),
        product: productMap.get(assignment.productId),
      }));

      // Group by delivery
      const byDelivery = new Map<string, any>();
      assignmentsWithDetails.forEach(assignment => {
        const deliveryId = assignment.deliveryId;
        if (!byDelivery.has(deliveryId)) {
          byDelivery.set(deliveryId, {
            delivery: assignment.delivery,
            assignments: [],
            total: 0,
          });
        }
        const deliveryData = byDelivery.get(deliveryId);
        deliveryData.assignments.push(assignment);
        deliveryData.total += assignment.quantity * parseFloat(assignment.unitPriceSnapshot as any);
      });

      const grandTotal = Array.from(byDelivery.values()).reduce((sum, d) => sum + d.total, 0);

      res.json({
        assignments: assignmentsWithDetails,
        byDelivery: Array.from(byDelivery.values()),
        grandTotal: grandTotal.toFixed(2),
      });
    } catch (error) {
      console.error("Error generating delivery assignments report:", error);
      res.status(500).json({ error: "Error al generar reporte de deliveries" });
    }
  });

  // Capital Movements routes
  app.get("/api/capital-movements", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede acceder a capital" });
      }
      const movements = await storage.getCapitalMovements(getEffectiveUserId(req));
      res.json(movements);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener movimientos de capital" });
    }
  });

  app.post("/api/capital-movements", requireAuth, upload.single("image"), async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede registrar movimientos de capital" });
      }
      let imageUrl = null;
      
      if (req.file) {
        const fileName = buildStorageKey("capital", req.file.originalname);
        const ok = await uploadToStorage(fileName, req.file.buffer);
        if (ok) imageUrl = fileName;
      }

      const data = insertCapitalMovementSchema.parse({
        type: req.body.type,
        description: req.body.description || null,
        amount: req.body.amount,
        movementDate: req.body.movementDate,
        imageUrl,
        userId: getEffectiveUserId(req),
      });
      
      const movement = await storage.createCapitalMovement(data);
      res.json(movement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al crear movimiento de capital" });
    }
  });

  // Gross Capital Movements routes (retiros de capital bruto)
  app.get("/api/gross-capital-movements", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede acceder a capital bruto" });
      }
      const movements = await storage.getGrossCapitalMovements(getEffectiveUserId(req));
      res.json(movements);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener movimientos de capital bruto" });
    }
  });

  app.post("/api/gross-capital-movements", requireAuth, upload.single("image"), async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede registrar retiros de capital bruto" });
      }
      let imageUrl = null;
      
      if (req.file) {
        const fileName = buildStorageKey("gross-capital", req.file.originalname);
        const ok = await uploadToStorage(fileName, req.file.buffer);
        if (ok) imageUrl = fileName;
      }

      const data = insertGrossCapitalMovementSchema.parse({
        description: req.body.description || null,
        amount: req.body.amount,
        movementDate: req.body.movementDate,
        imageUrl,
        userId: getEffectiveUserId(req),
      });
      
      const movement = await storage.createGrossCapitalMovement(data);
      res.json(movement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating gross capital movement:", error);
      res.status(500).json({ error: "Error al crear movimiento de capital bruto" });
    }
  });

  app.put("/api/gross-capital-movements/:id", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede editar retiros de capital bruto" });
      }
      const { id } = req.params;
      const { description, amount, movementDate } = req.body;
      const movement = await storage.updateGrossCapitalMovement(id, { description, amount, movementDate });
      if (!movement) {
        return res.status(404).json({ error: "Retiro no encontrado" });
      }
      res.json(movement);
    } catch (error) {
      console.error("Error updating gross capital movement:", error);
      res.status(500).json({ error: "Error al actualizar retiro" });
    }
  });

  app.delete("/api/gross-capital-movements/:id", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede eliminar retiros de capital bruto" });
      }
      const { id } = req.params;
      const deleted = await storage.deleteGrossCapitalMovement(id);
      if (!deleted) {
        return res.status(404).json({ error: "Retiro no encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting gross capital movement:", error);
      res.status(500).json({ error: "Error al eliminar retiro" });
    }
  });

  // Profit Settlements routes (cierres 50/50 de utilidad)
  app.get("/api/profit-settlements", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede acceder a cierres de utilidad" });
      }
      const settlements = await storage.getProfitSettlements(getEffectiveUserId(req));
      res.json(settlements);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener cierres de utilidad" });
    }
  });

  app.post("/api/profit-settlements", requireAuth, upload.single("image"), async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede registrar cierres de utilidad" });
      }

      const parsed = profitSettlementPayloadSchema.parse(req.body);
      if (parsed.periodEnd < parsed.periodStart) {
        return res.status(400).json({ error: "La fecha final no puede ser anterior a la inicial" });
      }

      const userId = getEffectiveUserId(req);
      const existingSettlements = await storage.getProfitSettlements(userId);
      const overlapping = existingSettlements.find((settlement) => {
        const existingStart = toIsoDate(settlement.periodStart);
        const existingEnd = toIsoDate(settlement.periodEnd);
        if (!existingStart || !existingEnd) return false;
        return parsed.periodStart <= existingEnd && parsed.periodEnd >= existingStart;
      });

      if (overlapping) {
        return res.status(409).json({
          error: `Ya existe un cierre entre ${toIsoDate(overlapping.periodStart)} y ${toIsoDate(overlapping.periodEnd)}`,
        });
      }

      const payableProfit = Math.round(parsed.payableProfitSnapshot * 100) / 100;
      const joseAmount = Math.round((payableProfit / 2) * 100) / 100;
      const jhonatanAmount = Math.round((payableProfit - joseAmount) * 100) / 100;
      let imageUrl = null;

      if (req.file) {
        const fileName = buildStorageKey("profit-settlements", req.file.originalname);
        const ok = await uploadToStorage(fileName, req.file.buffer);
        if (ok) imageUrl = fileName;
      }

      const data = insertProfitSettlementSchema.parse({
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        settlementDate: parsed.settlementDate,
        payableProfitSnapshot: payableProfit.toFixed(2),
        joseAmount: joseAmount.toFixed(2),
        jhonatanAmount: jhonatanAmount.toFixed(2),
        note: parsed.note?.trim() || null,
        imageUrl,
        userId,
      });

      const settlement = await storage.createProfitSettlement(data);
      res.json(settlement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al registrar cierre de utilidad" });
    }
  });

  app.delete("/api/profit-settlements/:id", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant) {
        return res.status(403).json({ error: "El rol contador no puede eliminar cierres de utilidad" });
      }
      const deleted = await storage.deleteProfitSettlement(req.params.id, getEffectiveUserId(req));
      if (!deleted) {
        return res.status(404).json({ error: "Cierre no encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar cierre de utilidad" });
    }
  });

  // Directors routes
  app.get("/api/directors", requireAuth, async (req, res) => {
    try {
      const directorsList = await storage.getDirectors(getEffectiveUserId(req));
      res.json(directorsList);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener directores" });
    }
  });

  app.post("/api/directors", requireAuth, async (req, res) => {
    try {
      const data = insertDirectorSchema.parse({
        name: req.body.name,
        isActive: req.body.isActive ?? true,
        userId: getEffectiveUserId(req),
      });
      const director = await storage.createDirector(data);
      res.json(director);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al crear director" });
    }
  });

  app.patch("/api/directors/:id/status", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getEffectiveUserId(req);
      const parsed = entityStatusSchema.parse(req.body);
      const updated = await storage.updateDirectorStatus(id, userId, parsed.isActive);
      if (!updated) {
        return res.status(404).json({ error: "Director no encontrado" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al actualizar estado de director" });
    }
  });

  app.patch("/api/directors/:id/report-visibility", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getEffectiveUserId(req);
      const parsed = directorReportVisibilitySchema.parse(req.body);
      const updated = await storage.updateDirectorReportVisibility(
        id,
        userId,
        parsed.showProfitInReport ? 1 : 0,
      );
      if (!updated) {
        return res.status(404).json({ error: "Director no encontrado" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al actualizar visibilidad de utilidad" });
    }
  });

  // Director Expenses routes
  app.get("/api/director-expenses", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      const expenses = await storage.getDirectorExpenses(getEffectiveUserId(req));
      const visibleExpenses = access.isAccountant && access.visibleFrom
        ? expenses.filter((expense) => isOnOrAfterDate(expense.expenseDate, access.visibleFrom))
        : expenses;
      res.json(visibleExpenses);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener gastos de director" });
    }
  });

  app.post("/api/director-expenses", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant && access.visibleFrom && req.body.expenseDate < access.visibleFrom) {
        return res.status(400).json({ error: `Solo puedes registrar gastos desde ${access.visibleFrom}` });
      }

      const userId = getEffectiveUserId(req);
      const directorId =
        req.body.directorId === null || req.body.directorId === undefined || `${req.body.directorId}`.trim() === ""
          ? null
          : `${req.body.directorId}`.trim();

      if (directorId) {
        const director = await storage.getDirector(directorId);
        if (!director || director.userId !== userId) {
          return res.status(404).json({ error: "Director no encontrado" });
        }
      }

      const data = insertDirectorExpenseSchema.parse({
        directorId,
        description: req.body.description,
        amount: req.body.amount,
        expenseDate: req.body.expenseDate,
        userId,
      });

      const expense = await storage.createDirectorExpense(data);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al crear gasto de director" });
    }
  });

  app.delete("/api/director-expenses/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDirectorExpense(id, getEffectiveUserId(req));
      if (!deleted) {
        return res.status(404).json({ error: "Gasto no encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar gasto de director" });
    }
  });

  // Sellers routes
  app.get("/api/sellers", requireAuth, async (req, res) => {
    try {
      const sellersList = await storage.getSellers(getEffectiveUserId(req));
      res.json(sellersList);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener vendedores" });
    }
  });

  app.post("/api/sellers", requireAuth, async (req, res) => {
    try {
      const data = insertSellerSchema.parse({
        name: req.body.name,
        isActive: req.body.isActive ?? true,
        userId: getEffectiveUserId(req),
      });
      const seller = await storage.createSeller(data);
      res.json(seller);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al crear vendedor" });
    }
  });

  app.patch("/api/sellers/:id/status", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getEffectiveUserId(req);
      const parsed = entityStatusSchema.parse(req.body);
      const updated = await storage.updateSellerStatus(id, userId, parsed.isActive);
      if (!updated) {
        return res.status(404).json({ error: "Vendedor no encontrado" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al actualizar estado de vendedor" });
    }
  });

  app.patch("/api/sellers/:id/director", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getEffectiveUserId(req);
      const parsed = sellerDirectorUpdateSchema.parse({
        directorId:
          req.body.directorId === null || req.body.directorId === undefined || `${req.body.directorId}`.trim() === ""
            ? null
            : `${req.body.directorId}`.trim(),
        effectiveFrom: req.body.effectiveFrom,
      });

      const seller = await storage.getSeller(id);
      if (!seller || seller.userId !== userId) {
        return res.status(404).json({ error: "Vendedor no encontrado" });
      }

      if (parsed.directorId) {
        const director = await storage.getDirector(parsed.directorId);
        if (!director || director.userId !== userId) {
          return res.status(404).json({ error: "Director no encontrado" });
        }
        if (director.isActive === false) {
          return res.status(400).json({ error: "No se puede asignar un director inactivo" });
        }
      }

      const updatedSeller = await storage.updateSellerDirector(id, userId, {
        directorId: parsed.directorId ?? null,
        directorAssignedFrom: parsed.effectiveFrom,
      });

      if (!updatedSeller) {
        return res.status(404).json({ error: "Vendedor no encontrado" });
      }

      const affectedSales = await storage.updateSellerSalesDirectorFromDate(
        id,
        userId,
        parsed.directorId ?? null,
        parsed.effectiveFrom,
      );

      res.json({
        seller: updatedSeller,
        affectedSales,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Error al asignar director al vendedor" });
    }
  });

  // Seller Sales routes
  app.get("/api/seller-sales", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      const sales = await storage.getSellerSales(getEffectiveUserId(req));
      const visibleSales = access.isAccountant && access.visibleFrom
        ? sales.filter((sale) => isOnOrAfterDate(sale.saleDate, access.visibleFrom))
        : sales;
      res.json(visibleSales);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener ventas de vendedores" });
    }
  });

  app.post("/api/seller-sales", requireAuth, async (req, res) => {
    try {
      const access = await getAccessContext(req);
      if (access.isAccountant && access.visibleFrom && req.body.saleDate < access.visibleFrom) {
        return res.status(400).json({ error: `Solo puedes registrar ventas desde ${access.visibleFrom}` });
      }

      const userId = getEffectiveUserId(req);
      const seller = await storage.getSeller(req.body.sellerId);
      if (!seller || seller.userId !== userId) {
        return res.status(404).json({ error: "Vendedor no encontrado" });
      }
      if (seller.isActive === false) {
        return res.status(400).json({ error: "El vendedor seleccionado esta inactivo" });
      }

      const product = await storage.getProduct(req.body.productId);
      if (!product || product.userId !== userId) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      if (product.isActive === false) {
        return res.status(400).json({ error: "El producto seleccionado esta inactivo" });
      }

      const parsedQuantity = parseInt(String(req.body.quantity), 10);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({ error: "Cantidad invalida" });
      }

      const parsedUnitPrice = parseFloat(String(req.body.unitPrice));
      if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) {
        return res.status(400).json({ error: "Precio unitario invalido" });
      }

      const parsedBaseCost = parseFloat(String(product.baseCost ?? ""));
      const parsedCost = parseFloat(String(product.cost ?? 0));
      const minimumUnitPrice =
        Number.isFinite(parsedBaseCost) && parsedBaseCost > 0
          ? parsedBaseCost
          : parsedCost;

      if (Number.isFinite(minimumUnitPrice) && parsedUnitPrice < minimumUnitPrice) {
        return res.status(400).json({
          error: `El precio unitario no puede ser menor al capital bruto (${minimumUnitPrice.toFixed(2)} Bs)`,
        });
      }

      const data = insertSellerSaleSchema.parse({
        sellerId: req.body.sellerId,
        productId: req.body.productId,
        quantity: parsedQuantity,
        unitPrice: parsedUnitPrice.toFixed(2),
        saleDate: req.body.saleDate,
        directorId: seller.directorId || null,
        userId,
      });
      const sale = await storage.createSellerSale(data);
      res.json(sale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating seller sale:", error);
      res.status(500).json({ error: "Error al crear venta de vendedor" });
    }
  });

  app.put("/api/seller-sales/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getEffectiveUserId(req);
      const { productId, quantity, unitPrice } = req.body;

      const existingSale = await storage.getSellerSale(id);
      if (!existingSale || existingSale.userId !== userId) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }

      const targetProductId = productId || existingSale.productId;
      const product = await storage.getProduct(targetProductId);
      if (!product || product.userId !== userId) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      const isChangingProduct = productId !== undefined && productId !== null && productId !== "";
      if (isChangingProduct && product.isActive === false) {
        return res.status(400).json({ error: "El producto seleccionado esta inactivo" });
      }

      const parsedQuantity =
        quantity !== undefined && quantity !== null && quantity !== ""
          ? parseInt(String(quantity), 10)
          : existingSale.quantity;
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({ error: "Cantidad invalida" });
      }

      const parsedUnitPrice =
        unitPrice !== undefined && unitPrice !== null && unitPrice !== ""
          ? parseFloat(String(unitPrice))
          : parseFloat(String(existingSale.unitPrice));
      if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) {
        return res.status(400).json({ error: "Precio unitario invalido" });
      }

      const parsedBaseCost = parseFloat(String(product.baseCost ?? ""));
      const parsedCost = parseFloat(String(product.cost ?? 0));
      const minimumUnitPrice =
        Number.isFinite(parsedBaseCost) && parsedBaseCost > 0
          ? parsedBaseCost
          : parsedCost;

      if (Number.isFinite(minimumUnitPrice) && parsedUnitPrice < minimumUnitPrice) {
        return res.status(400).json({
          error: `El precio unitario no puede ser menor al capital bruto (${minimumUnitPrice.toFixed(2)} Bs)`,
        });
      }

      const sale = await storage.updateSellerSale(id, { 
        productId: productId ?? undefined,
        quantity:
          quantity !== undefined && quantity !== null && quantity !== ""
            ? parsedQuantity
            : undefined,
        unitPrice:
          unitPrice !== undefined && unitPrice !== null && unitPrice !== ""
            ? parsedUnitPrice.toFixed(2)
            : undefined,
      });
      if (!sale) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }
      res.json(sale);
    } catch (error) {
      console.error("Error updating seller sale:", error);
      res.status(500).json({ error: "Error al actualizar venta" });
    }
  });

  app.delete("/api/seller-sales/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSellerSale(id);
      if (!deleted) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting seller sale:", error);
      res.status(500).json({ error: "Error al eliminar venta" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}


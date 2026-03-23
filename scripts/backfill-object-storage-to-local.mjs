import { Client } from "@replit/object-storage";
import { Pool } from "pg";
import fs from "node:fs/promises";
import path from "node:path";

const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const databaseUrl = process.env.DATABASE_URL;
const uploadsRoot = process.env.UPLOADS_ROOT
  ? path.resolve(process.env.UPLOADS_ROOT)
  : path.join(process.cwd(), "uploads");

if (!bucketId) {
  console.error("Falta DEFAULT_OBJECT_STORAGE_BUCKET_ID en variables de entorno.");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("Falta DATABASE_URL en variables de entorno.");
  process.exit(1);
}

const isLocalHost = /localhost|127\.0\.0\.1/i.test(databaseUrl);
const disableSsl =
  process.env.PGSSL?.toLowerCase() === "disable" ||
  process.env.PGSSLMODE?.toLowerCase() === "disable";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: disableSsl || isLocalHost ? false : { rejectUnauthorized: false },
});

const objectStorage = new Client({ bucketId });

const storageReferenceQueries = [
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
];

const normalizeStorageKey = (key) =>
  String(key)
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");

const shouldSkipStorageKey = (key) => !key || /^https?:\/\//i.test(key);

const resolveUploadPath = (key) => {
  const normalized = normalizeStorageKey(key);
  const resolvedPath = path.resolve(uploadsRoot, normalized);
  const uploadsBase = path.resolve(uploadsRoot);
  if (!resolvedPath.startsWith(uploadsBase)) {
    throw new Error(`Invalid storage path for key: ${key}`);
  }
  return resolvedPath;
};

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeLocalUpload(key, bytes) {
  const localFilePath = resolveUploadPath(key);
  await fs.mkdir(path.dirname(localFilePath), { recursive: true });
  await fs.writeFile(localFilePath, bytes);
}

async function collectReferencedStorageKeys() {
  const keys = new Set();
  let failedQueries = 0;

  for (const { label, query } of storageReferenceQueries) {
    try {
      const result = await pool.query(query);
      for (const row of result.rows) {
        const value = String(row.key || "").trim();
        if (shouldSkipStorageKey(value)) continue;
        keys.add(normalizeStorageKey(value));
      }
    } catch (error) {
      failedQueries += 1;
      console.warn(`Consulta omitida (${label}):`, error?.message || error);
    }
  }

  return { keys: Array.from(keys), failedQueries };
}

async function main() {
  try {
    const { keys, failedQueries } = await collectReferencedStorageKeys();
    console.log(
      `Claves detectadas en BD: ${keys.length} (consultas fallidas: ${failedQueries})`,
    );
    if (failedQueries === storageReferenceQueries.length) {
      throw new Error(
        "No se pudo consultar ninguna tabla para detectar imágenes (revisar DATABASE_URL/conectividad).",
      );
    }
    if (keys.length === 0) {
      console.log("No hay imágenes para migrar.");
      return;
    }

    let downloaded = 0;
    let skipped = 0;
    let missing = 0;
    let failed = 0;

    for (const key of keys) {
      const localPath = resolveUploadPath(key);
      if (await fileExists(localPath)) {
        skipped += 1;
        continue;
      }

      try {
        const result = await objectStorage.downloadAsBytes(key);
        if (!result.ok) {
          if (result.error?.statusCode === 404) {
            missing += 1;
          } else {
            failed += 1;
            console.warn(`No se pudo descargar ${key}:`, result.error);
          }
          continue;
        }

        await writeLocalUpload(key, Buffer.from(result.value[0]));
        downloaded += 1;
      } catch (error) {
        failed += 1;
        console.warn(`Error migrando ${key}:`, error?.message || error);
      }
    }

    console.log(
      `Migración finalizada. descargadas=${downloaded} locales=${skipped} faltantes=${missing} fallidas=${failed} consultasFallidas=${failedQueries}`,
    );

    if (failed > 0) {
      process.exitCode = 2;
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Fallo en migración de object storage:", error);
  process.exit(1);
});

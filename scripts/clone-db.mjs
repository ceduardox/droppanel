import { Pool } from "pg";
import util from "node:util";

function formatError(error) {
  if (!error) return "unknown error";
  if (error instanceof Error) return error.stack || error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    return util.inspect(error, { depth: 8, colors: false, compact: false });
  }
  return String(error);
}

const sourceUrl = process.env.OLD_DATABASE_URL || process.env.DATABASE_URL;
const targetUrl = process.env.NEW_DATABASE_URL || process.env.TARGET_DATABASE_URL;

if (!sourceUrl) {
  console.error("Falta OLD_DATABASE_URL o DATABASE_URL");
  process.exit(1);
}

if (!targetUrl) {
  console.error("Falta NEW_DATABASE_URL o TARGET_DATABASE_URL");
  process.exit(1);
}

function createPool(connectionString) {
  const isLocalHost = /localhost|127\.0\.0\.1/i.test(connectionString);
  const disableSsl =
    process.env.PGSSL?.toLowerCase() === "disable" ||
    process.env.PGSSLMODE?.toLowerCase() === "disable";

  return new Pool({
    connectionString,
    ssl: disableSsl || isLocalHost ? false : { rejectUnauthorized: false },
  });
}

const defaultTableOrder = [
  "users",
  "user_access_controls",
  "business_settings",
  "products",
  "sales",
  "daily_payments",
  "expense_categories",
  "expenses",
  "deliveries",
  "delivery_stock_entries",
  "delivery_assignments",
  "delivery_assignment_audit_logs",
  "capital_movements",
  "gross_capital_movements",
  "profit_settlements",
  "sellers",
  "seller_sales",
];

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

async function getTableNames(client) {
  const { rows } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  return rows.map((r) => r.table_name);
}

async function getTableColumns(client, tableName) {
  const { rows } = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position;
    `,
    [tableName]
  );
  return rows.map((r) => r.column_name);
}

async function getTableColumnTypes(client, tableName) {
  const { rows } = await client.query(
    `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1;
    `,
    [tableName]
  );
  return new Map(rows.map((r) => [r.column_name, r.data_type]));
}

async function getPrimaryKeyColumns(client, tableName) {
  const { rows } = await client.query(
    `
    SELECT a.attname AS column_name
    FROM pg_index i
    JOIN pg_attribute a
      ON a.attrelid = i.indrelid
     AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = $1::regclass
      AND i.indisprimary
    ORDER BY array_position(i.indkey, a.attnum);
    `,
    [`public.${tableName}`]
  );
  return rows.map((r) => r.column_name);
}

async function getSerialColumns(client, tableName) {
  const { rows } = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_default LIKE 'nextval(%';
    `,
    [tableName]
  );
  return rows.map((r) => r.column_name);
}

function splitBatches(items, size) {
  const output = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

async function cloneTable(sourceClient, targetClient, tableName) {
  const sourceColumns = await getTableColumns(sourceClient, tableName);
  const targetColumns = await getTableColumns(targetClient, tableName);
  const targetColumnTypes = await getTableColumnTypes(targetClient, tableName);
  const commonColumns = sourceColumns.filter((c) => targetColumns.includes(c));

  if (commonColumns.length === 0) {
    return { inserted: 0, skipped: 0, reason: "sin columnas comunes" };
  }

  const { rows } = await sourceClient.query(
    `SELECT ${commonColumns.map(quoteIdent).join(", ")} FROM public.${quoteIdent(tableName)};`
  );

  if (rows.length === 0) {
    return { inserted: 0, skipped: 0, reason: "sin filas" };
  }

  const pkColumns = await getPrimaryKeyColumns(targetClient, tableName);
  const conflictClause =
    pkColumns.length > 0
      ? ` ON CONFLICT (${pkColumns.map(quoteIdent).join(", ")}) DO NOTHING`
      : "";

  let inserted = 0;
  let skipped = 0;
  const batches = splitBatches(rows, 250);

  for (const batch of batches) {
    const values = [];
    const valueGroups = [];
    let paramIndex = 1;

    for (const row of batch) {
      const params = [];
      for (const column of commonColumns) {
        const type = targetColumnTypes.get(column);
        let value = row[column];
        if (value !== null && value !== undefined && (type === "json" || type === "jsonb")) {
          if (typeof value !== "string") {
            value = JSON.stringify(value);
          }
        }
        values.push(value);
        params.push(`$${paramIndex++}`);
      }
      valueGroups.push(`(${params.join(", ")})`);
    }

    const sql = `
      INSERT INTO public.${quoteIdent(tableName)} (${commonColumns.map(quoteIdent).join(", ")})
      VALUES ${valueGroups.join(", ")}
      ${conflictClause};
    `;

    const result = await targetClient.query(sql, values);
    const affected = Number(result.rowCount || 0);
    inserted += affected;
    skipped += batch.length - affected;
  }

  return { inserted, skipped, reason: "ok" };
}

async function syncSerialSequences(targetClient, tableName) {
  const serialColumns = await getSerialColumns(targetClient, tableName);
  for (const column of serialColumns) {
    const sql = `
      SELECT setval(
        pg_get_serial_sequence($1, $2),
        COALESCE((SELECT MAX(${quoteIdent(column)}) FROM public.${quoteIdent(tableName)}), 1),
        true
      );
    `;
    await targetClient.query(sql, [`public.${tableName}`, column]);
  }
}

async function main() {
  const sourcePool = createPool(sourceUrl);
  const targetPool = createPool(targetUrl);

  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();

  try {
    const sourceTables = await getTableNames(sourceClient);
    const targetTables = new Set(await getTableNames(targetClient));
    const sortedTables = [
      ...defaultTableOrder.filter((t) => sourceTables.includes(t)),
      ...sourceTables.filter((t) => !defaultTableOrder.includes(t)).sort(),
    ];

    console.log(`Tablas origen: ${sourceTables.length}`);
    console.log(`Tablas a procesar: ${sortedTables.length}`);

    for (const tableName of sortedTables) {
      if (!targetTables.has(tableName)) {
        console.log(`- ${tableName}: omitida (no existe en destino)`);
        continue;
      }

      try {
        const result = await cloneTable(sourceClient, targetClient, tableName);
        await syncSerialSequences(targetClient, tableName);
        console.log(
          `- ${tableName}: inserted=${result.inserted}, skipped=${result.skipped}, ${result.reason}`
        );
      } catch (error) {
        const message = formatError(error);
        console.error(`- ${tableName}: ERROR -> ${message}`);
      }
    }

    console.log("Clonado finalizado.");
  } finally {
    sourceClient.release();
    targetClient.release();
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch((error) => {
  const message = formatError(error);
  console.error(message);
  process.exit(1);
});

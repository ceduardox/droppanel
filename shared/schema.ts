import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, timestamp, integer, date, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type AppPermissions = {
  dashboard: boolean;
  products: boolean;
  sales: boolean;
  reports: boolean;
  financialStatus: boolean;
  salesReport: boolean;
  capitalIncrease: boolean;
  grossCapital: boolean;
  sellerReport: boolean;
  expenses: boolean;
  expensesReport: boolean;
  delivery: boolean;
  settings: boolean;
  userAdmin: boolean;
};

export const userAccessControls = pgTable("user_access_controls", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  role: text("role").notNull().default("viewer"),
  permissions: jsonb("permissions").$type<AppPermissions>(),
  visibleFrom: date("visible_from"),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.1000"),
  commissionSeller: text("commission_seller").notNull().default("Jose Eduardo"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserAccessControlSchema = createInsertSchema(userAccessControls).omit({
  updatedAt: true,
});

export type InsertUserAccessControl = z.infer<typeof insertUserAccessControlSchema>;
export type UserAccessControl = typeof userAccessControls.$inferSelect;

export const businessSettings = pgTable("business_settings", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  businessName: text("business_name").notNull().default("Mi Negocio"),
  logoUrl: text("logo_url"),
  currency: text("currency").notNull().default("Bs"),
  timeZone: text("time_zone").notNull().default("America/La_Paz"),
  dateFormat: text("date_format").notNull().default("dd/MM/yyyy"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({
  updatedAt: true,
});

export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;
export type BusinessSettings = typeof businessSettings.$inferSelect;

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  baseCost: numeric("base_cost", { precision: 10, scale: 2 }),
  capitalIncrease: numeric("capital_increase", { precision: 10, scale: 2 }),
  costProduct: numeric("cost_product", { precision: 10, scale: 2 }),
  costTransport: numeric("cost_transport", { precision: 10, scale: 2 }),
  costLabel: numeric("cost_label", { precision: 10, scale: 2 }),
  costShrink: numeric("cost_shrink", { precision: 10, scale: 2 }),
  costBag: numeric("cost_bag", { precision: 10, scale: 2 }),
  costLabelRemover: numeric("cost_label_remover", { precision: 10, scale: 2 }),
  costExtras: jsonb("cost_extras").$type<{ name: string; amount: number }[]>(),
  imageUrl: text("image_url"),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
  unitTransport: numeric("unit_transport", { precision: 10, scale: 2 }),
  sellerId: varchar("seller_id"),
  directorId: varchar("director_id"),
  deliveryId: varchar("delivery_id"),
  saleDate: date("sale_date").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
});

export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

export const dailyPayments = pgTable("daily_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentDate: date("payment_date").notNull(),
  imageComisionUrl: text("image_comision_url"),
  imageCostoUrl: text("image_costo_url"),
  isPaid: integer("is_paid").default(0).notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDailyPaymentSchema = createInsertSchema(dailyPayments).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyPayment = z.infer<typeof insertDailyPaymentSchema>;
export type DailyPayment = typeof dailyPayments.$inferSelect;

export const expenseCategories = pgTable("expense_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => expenseCategories.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  imageUrl: varchar("image_url"),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export const deliveries = pgTable("deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeliverySchema = createInsertSchema(deliveries).omit({
  id: true,
  createdAt: true,
});

export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveries.$inferSelect;

export const deliveryStockEntries = pgTable("delivery_stock_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  note: text("note"),
  entryDate: date("entry_date"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
});

export const insertDeliveryStockEntrySchema = createInsertSchema(deliveryStockEntries).omit({
  id: true,
  recordedAt: true,
});

export type InsertDeliveryStockEntry = z.infer<typeof insertDeliveryStockEntrySchema>;
export type DeliveryStockEntry = typeof deliveryStockEntries.$inferSelect;

export const deliveryAssignments = pgTable("delivery_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deliveryId: varchar("delivery_id").notNull().references(() => deliveries.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  isPaid: integer("is_paid").default(0).notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
});

export const insertDeliveryAssignmentSchema = createInsertSchema(deliveryAssignments).omit({
  id: true,
});

export type InsertDeliveryAssignment = z.infer<typeof insertDeliveryAssignmentSchema>;
export type DeliveryAssignment = typeof deliveryAssignments.$inferSelect;

export const deliveryAssignmentAuditLogs = pgTable("delivery_assignment_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull(),
  action: text("action").notNull(),
  deliveryId: varchar("delivery_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  assignedAt: timestamp("assigned_at"),
  isPaid: integer("is_paid").default(0).notNull(),
  nextState: jsonb("next_state").$type<{
    deliveryId: string;
    productId: string;
    quantity: number;
    unitPriceSnapshot: string;
    note?: string | null;
    assignedAt?: string | null;
    isPaid: number;
  } | null>(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeliveryAssignmentAuditLogSchema = createInsertSchema(deliveryAssignmentAuditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertDeliveryAssignmentAuditLog = z.infer<typeof insertDeliveryAssignmentAuditLogSchema>;
export type DeliveryAssignmentAuditLog = typeof deliveryAssignmentAuditLogs.$inferSelect;

export const capitalMovements = pgTable("capital_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "credito" o "retiro"
  description: text("description"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  movementDate: date("movement_date").notNull(),
  imageUrl: text("image_url"),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCapitalMovementSchema = createInsertSchema(capitalMovements).omit({
  id: true,
  createdAt: true,
});

export type InsertCapitalMovement = z.infer<typeof insertCapitalMovementSchema>;
export type CapitalMovement = typeof capitalMovements.$inferSelect;

// Movimientos de Capital Bruto (retiros del costo bruto de productos)
export const grossCapitalMovements = pgTable("gross_capital_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  movementDate: date("movement_date").notNull(),
  imageUrl: text("image_url"),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGrossCapitalMovementSchema = createInsertSchema(grossCapitalMovements).omit({
  id: true,
  createdAt: true,
});

export type InsertGrossCapitalMovement = z.infer<typeof insertGrossCapitalMovementSchema>;
export type GrossCapitalMovement = typeof grossCapitalMovements.$inferSelect;

// Cierres de utilidad pagada 50/50 entre socios
export const profitSettlements = pgTable("profit_settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  settlementDate: date("settlement_date").notNull(),
  payableProfitSnapshot: numeric("payable_profit_snapshot", { precision: 10, scale: 2 }).notNull(),
  joseAmount: numeric("jose_amount", { precision: 10, scale: 2 }).notNull(),
  jhonatanAmount: numeric("jhonatan_amount", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  imageUrl: text("image_url"),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProfitSettlementSchema = createInsertSchema(profitSettlements).omit({
  id: true,
  createdAt: true,
});

export type InsertProfitSettlement = z.infer<typeof insertProfitSettlementSchema>;
export type ProfitSettlement = typeof profitSettlements.$inferSelect;

// Directores
export const directors = pgTable("directors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  showProfitInReport: integer("show_profit_in_report").notNull().default(1),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDirectorSchema = createInsertSchema(directors).omit({
  id: true,
  createdAt: true,
});

export type InsertDirector = z.infer<typeof insertDirectorSchema>;
export type Director = typeof directors.$inferSelect;

// Gastos por director (para reporte de vendedores)
export const directorExpenses = pgTable("director_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directorId: varchar("director_id").references(() => directors.id),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDirectorExpenseSchema = createInsertSchema(directorExpenses).omit({
  id: true,
  createdAt: true,
});

export type InsertDirectorExpense = z.infer<typeof insertDirectorExpenseSchema>;
export type DirectorExpense = typeof directorExpenses.$inferSelect;

// Vendedores
export const sellers = pgTable("sellers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  directorId: varchar("director_id").references(() => directors.id),
  directorAssignedFrom: date("director_assigned_from"),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSellerSchema = createInsertSchema(sellers).omit({
  id: true,
  createdAt: true,
});

export type InsertSeller = z.infer<typeof insertSellerSchema>;
export type Seller = typeof sellers.$inferSelect;

// Ventas de vendedores
export const sellerSales = pgTable("seller_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => sellers.id),
  directorId: varchar("director_id").references(() => directors.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  saleDate: date("sale_date").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSellerSaleSchema = createInsertSchema(sellerSales).omit({
  id: true,
  createdAt: true,
});

export type InsertSellerSale = z.infer<typeof insertSellerSaleSchema>;
export type SellerSale = typeof sellerSales.$inferSelect;

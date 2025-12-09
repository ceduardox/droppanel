import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, timestamp, integer, date } from "drizzle-orm/pg-core";
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

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  baseCost: numeric("base_cost", { precision: 10, scale: 2 }),
  capitalIncrease: numeric("capital_increase", { precision: 10, scale: 2 }),
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
  assignedAt: true,
});

export type InsertDeliveryAssignment = z.infer<typeof insertDeliveryAssignmentSchema>;
export type DeliveryAssignment = typeof deliveryAssignments.$inferSelect;

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

// Vendedores
export const sellers = pgTable("sellers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
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
